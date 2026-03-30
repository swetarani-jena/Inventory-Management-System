const { db } = require('../../lib/db');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');
const { ScanCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const PO_TABLE  = process.env.PURCHASE_ORDERS_TABLE;
const VEN_TABLE = process.env.VENDORS_TABLE;
const MAT_TABLE = process.env.MATERIALS_TABLE;
const REQ_TABLE = process.env.REQUISITIONS_TABLE;

const enrich = async (po) => {
  const [venRes, matResults] = await Promise.all([
    db.send(new GetCommand({ TableName: VEN_TABLE, Key: { vendorId: po.vendorId } })),
    Promise.all(
      (po.items || []).map(item =>
        db.send(new GetCommand({ TableName: MAT_TABLE, Key: { materialId: item.materialId } }))
      )
    ),
  ]);
  return {
    ...po,
    vendorName: venRes.Item?.name,
    items: (po.items || []).map((item, i) => ({
      ...item,
      materialName: matResults[i].Item?.name,
    })),
  };
};

exports.handler = async (event) => {
  const method  = event.httpMethod;
  const poId    = event.pathParameters?.poId;
  const action  = event.pathParameters?.action;  // send | deliver
  const qs      = event.queryStringParameters || {};

  // GET /purchase-orders  (?status=sent &vendorId=V001)
  if (method === 'GET' && !poId) {
    const params = { TableName: PO_TABLE };
    const filters  = [];
    const names    = {};
    const values   = {};

    if (qs.status) {
      filters.push('#s = :status');
      names['#s']       = 'status';
      values[':status'] = qs.status;
    }
    if (qs.vendorId) {
      filters.push('vendorId = :vendorId');
      values[':vendorId'] = qs.vendorId;
    }
    if (filters.length) {
      params.FilterExpression = filters.join(' AND ');
      if (Object.keys(names).length)  params.ExpressionAttributeNames  = names;
      if (Object.keys(values).length) params.ExpressionAttributeValues = values;
    }

    const { Items } = await db.send(new ScanCommand(params));
    const enriched  = await Promise.all(Items.map(enrich));
    return ok(enriched);
  }

  // GET /purchase-orders/{poId}
  if (method === 'GET' && poId && !action) {
    const { Item } = await db.send(new GetCommand({ TableName: PO_TABLE, Key: { poId } }));
    return Item ? ok(await enrich(Item)) : notFound('Purchase Order not found');
  }

  // POST /purchase-orders
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { vendorId, requisitionId, expectedDeliveryDate, items, createdBy } = body;
    if (!vendorId || !items?.length) return badReq('vendorId and items are required');

    // Validate vendor exists
    const { Item: vendor } = await db.send(new GetCommand({ TableName: VEN_TABLE, Key: { vendorId } }));
    if (!vendor) return notFound('Vendor not found');

    const poItems = items.map((item, i) => ({
      itemId:     `PI${String(Date.now() + i).slice(-4)}`,
      materialId: item.materialId,
      quantity:   item.quantity,
      unitPrice:  item.unitPrice  || 0,
      totalPrice: (item.quantity  || 0) * (item.unitPrice || 0),
    }));

    const newPO = {
      poId:                 `PO${Date.now()}`,
      poNumber:             `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      date:                 new Date().toISOString().split('T')[0],
      vendorId,
      requisitionId:        requisitionId || null,
      totalAmount:          poItems.reduce((s, i) => s + i.totalPrice, 0),
      status:               'generated',
      createdBy:            createdBy || 'unknown',
      expectedDeliveryDate: expectedDeliveryDate || null,
      actualDeliveryDate:   null,
      items:                poItems,
    };

    await db.send(new PutCommand({ TableName: PO_TABLE, Item: newPO }));

    // Mark linked requisition as po_raised
    if (requisitionId) {
      await db.send(new UpdateCommand({
        TableName: REQ_TABLE,
        Key: { requisitionId },
        UpdateExpression: 'SET #s = :s',
        ExpressionAttributeNames:  { '#s': 'status' },
        ExpressionAttributeValues: { ':s': 'po_raised' },
      }));
    }

    return created(await enrich(newPO));
  }

  // PUT /purchase-orders/{poId}/send
  if (method === 'PUT' && poId && action === 'send') {
    const { Item } = await db.send(new GetCommand({ TableName: PO_TABLE, Key: { poId } }));
    if (!Item) return notFound('Purchase Order not found');

    const { Attributes } = await db.send(new UpdateCommand({
      TableName: PO_TABLE,
      Key: { poId },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'sent' },
      ReturnValues: 'ALL_NEW',
    }));
    return ok(await enrich(Attributes));
  }

  // PUT /purchase-orders/{poId}/deliver
  if (method === 'PUT' && poId && action === 'deliver') {
    const { Item } = await db.send(new GetCommand({ TableName: PO_TABLE, Key: { poId } }));
    if (!Item) return notFound('Purchase Order not found');

    const { Attributes } = await db.send(new UpdateCommand({
      TableName: PO_TABLE,
      Key: { poId },
      UpdateExpression: 'SET #s = :s, actualDeliveryDate = :d',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'delivered', ':d': new Date().toISOString().split('T')[0] },
      ReturnValues: 'ALL_NEW',
    }));
    return ok(await enrich(Attributes));
  }

    // PUT /purchase-orders/{poId}/transit
  if (method === 'PUT' && poId && action === 'transit') {
    const { Item } = await db.send(new GetCommand({ TableName: PO_TABLE, Key: { poId } }));
    if (!Item) return notFound('Purchase Order not found');
    if (Item.status !== 'sent') return badReq('Only sent orders can be marked in transit');

    const { Attributes } = await db.send(new UpdateCommand({
      TableName: PO_TABLE, Key: { poId },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'in_transit' },
      ReturnValues: 'ALL_NEW',
    }));
    return ok(await enrich(Attributes));
  }

  // PUT /purchase-orders/{poId}/cancel
  if (method === 'PUT' && poId && action === 'cancel') {
    const { Item } = await db.send(new GetCommand({ TableName: PO_TABLE, Key: { poId } }));
    if (!Item) return notFound('Purchase Order not found');
    if (['delivered', 'cancelled'].includes(Item.status)) return badReq(`Cannot cancel a ${Item.status} order`);

    const { Attributes } = await db.send(new UpdateCommand({
      TableName: PO_TABLE, Key: { poId },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'cancelled' },
      ReturnValues: 'ALL_NEW',
    }));
    return ok(await enrich(Attributes));
  }

  return badReq('Method not supported');
};