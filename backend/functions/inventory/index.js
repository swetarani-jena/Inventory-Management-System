const { db } = require('../../lib/db');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');
const { ScanCommand, GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const INV_TABLE = process.env.INVENTORY_TABLE;
const TXN_TABLE = process.env.TRANSACTIONS_TABLE;
const MAT_TABLE = process.env.MATERIALS_TABLE;
const WH_TABLE  = process.env.WAREHOUSES_TABLE;

const computeStatus = (reorderLevel, quantity) =>
  quantity <= reorderLevel ? 'low' : 'normal';

const enrich = async (item) => {
  const [mat, wh] = await Promise.all([
    db.send(new GetCommand({ TableName: MAT_TABLE, Key: { materialId: item.materialId } })),
    db.send(new GetCommand({ TableName: WH_TABLE,  Key: { warehouseId: item.warehouseId } })),
  ]);
  return {
    ...item,
    materialName:  mat.Item?.name,
    unit:          mat.Item?.unit,
    reorderLevel:  mat.Item?.reorderLevel,
    warehouseName: wh.Item?.name,
  };
};

exports.handler = async (event) => {
  const method      = event.httpMethod;
  const path        = event.path;
  const subPath     = event.pathParameters?.subPath
                      || path.split('/').filter(Boolean).pop();
  const warehouseId = event.pathParameters?.warehouseId;
  const materialId  = event.pathParameters?.materialId;
  const qs          = event.queryStringParameters || {};

  // GET /inventory/low-stock
  if (method === 'GET' && subPath === 'low-stock') {
    const { Items } = await db.send(new ScanCommand({
      TableName: INV_TABLE,
      FilterExpression: '#s = :low',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':low': 'low' },
    }));
    const enriched = await Promise.all(Items.map(enrich));
    return ok(enriched);
  }

  // GET /inventory/transactions/{warehouseId}
  if (method === 'GET' && subPath === 'transactions' && warehouseId) {
    const params = {
      TableName: TXN_TABLE,
      IndexName: 'warehouseId-index',
      KeyConditionExpression: 'warehouseId = :wId',
      ExpressionAttributeValues: { ':wId': warehouseId },
    };
    if (qs.type) {
      params.FilterExpression = '#t = :type';
      params.ExpressionAttributeNames = { '#t': 'type' };
      params.ExpressionAttributeValues[':type'] = qs.type;
    }
    const { Items } = await db.send(new QueryCommand(params));
    const mats = await db.send(new ScanCommand({ TableName: MAT_TABLE }));
    const matMap = Object.fromEntries(mats.Items.map(m => [m.materialId, m.name]));
    return ok(Items.map(t => ({ ...t, materialName: matMap[t.materialId] })));
  }

  // GET /inventory/{warehouseId}/{materialId}
  if (method === 'GET' && warehouseId && materialId) {
    const { Item } = await db.send(new GetCommand({
      TableName: INV_TABLE, Key: { warehouseId, materialId },
    }));
    return Item ? ok(await enrich(Item)) : notFound('Inventory record not found');
  }

  // GET /inventory
  if (method === 'GET') {
    let params = { TableName: INV_TABLE };
    const filters = [];
    const names   = {};
    const values  = {};
    if (qs.warehouseId) { filters.push('warehouseId = :wId'); values[':wId'] = qs.warehouseId; }
    if (qs.status)      { filters.push('#s = :status'); names['#s'] = 'status'; values[':status'] = qs.status; }
    if (filters.length) {
      params.FilterExpression = filters.join(' AND ');
      if (Object.keys(names).length)  params.ExpressionAttributeNames  = names;
      if (Object.keys(values).length) params.ExpressionAttributeValues = values;
    }
    const { Items } = await db.send(new ScanCommand(params));
    const enriched = await Promise.all(Items.map(enrich));
    return ok(enriched);
  }

  // POST /inventory/grn
  if (method === 'POST' && subPath === 'grn') {
    const { warehouseId: wId, materialId: mId, quantity, referenceNo, remarks } = JSON.parse(event.body || '{}');
    if (!wId || !mId || !quantity) return badReq('warehouseId, materialId, quantity are required');

    const { Item: mat } = await db.send(new GetCommand({ TableName: MAT_TABLE, Key: { materialId: mId } }));
    if (!mat) return notFound('Material not found');

    const { Item: existing } = await db.send(new GetCommand({ TableName: INV_TABLE, Key: { warehouseId: wId, materialId: mId } }));
    const newQty = (existing?.quantity || 0) + Number(quantity);
    const status = computeStatus(mat.reorderLevel, newQty);

    await db.send(new PutCommand({
      TableName: INV_TABLE,
      Item: { warehouseId: wId, materialId: mId, quantity: newQty, status, lastUpdated: new Date().toISOString().split('T')[0] },
    }));

    const txn = { txnId: `T${Date.now()}`, warehouseId: wId, materialId: mId, type: 'GRN', quantity: Number(quantity), referenceNo: referenceNo || '', remarks: remarks || '', createdAt: new Date().toISOString() };
    await db.send(new PutCommand({ TableName: TXN_TABLE, Item: txn }));
    return created({ message: 'GRN recorded', transaction: txn });
  }

  // POST /inventory/min
  if (method === 'POST' && subPath === 'min') {
    const { warehouseId: wId, materialId: mId, quantity, referenceNo, remarks } = JSON.parse(event.body || '{}');
    if (!wId || !mId || !quantity) return badReq('warehouseId, materialId, quantity are required');

    const { Item: existing } = await db.send(new GetCommand({ TableName: INV_TABLE, Key: { warehouseId: wId, materialId: mId } }));
    if (!existing) return notFound('No stock found for this material in this warehouse');
    if (existing.quantity < Number(quantity)) return badReq(`Insufficient stock. Available: ${existing.quantity}`);

    const { Item: mat } = await db.send(new GetCommand({ TableName: MAT_TABLE, Key: { materialId: mId } }));
    const newQty = existing.quantity - Number(quantity);
    const status = computeStatus(mat?.reorderLevel || 0, newQty);

    await db.send(new UpdateCommand({
      TableName: INV_TABLE, Key: { warehouseId: wId, materialId: mId },
      UpdateExpression: 'SET quantity = :q, #s = :s, lastUpdated = :d',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':q': newQty, ':s': status, ':d': new Date().toISOString().split('T')[0] },
    }));

    const txn = { txnId: `T${Date.now()}`, warehouseId: wId, materialId: mId, type: 'MIN', quantity: Number(quantity), referenceNo: referenceNo || '', remarks: remarks || '', createdAt: new Date().toISOString() };
    await db.send(new PutCommand({ TableName: TXN_TABLE, Item: txn }));
    return created({ message: 'Material issued', transaction: txn });
  }

  return badReq('Method not supported');
};