const { db } = require('../../lib/db');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');
const { ScanCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE     = process.env.TRANSFERS_TABLE;
const INV_TABLE = process.env.INVENTORY_TABLE;
const MAT_TABLE = process.env.MATERIALS_TABLE;

exports.handler = async (event) => {
  const method  = event.httpMethod;
  const path    = event.path;
  const poId    = event.pathParameters?.poId;
  const action  = event.pathParameters?.action
                  || path.split('/').filter(Boolean).pop();
  const qs      = event.queryStringParameters || {};

  if (method === 'GET' && !transferId) {
    const { Items } = await db.send(new ScanCommand({ TableName: TABLE }));
    return ok(Items);
  }

  if (method === 'GET' && transferId) {
    const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: { transferId } }));
    return Item ? ok(Item) : notFound('Transfer not found');
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    if (!body.fromWarehouse || !body.toWarehouse || !body.items?.length)
      return badReq('fromWarehouse, toWarehouse, items are required');
    const transfer = {
      transferId: `TR${Date.now()}`,
      transferNo: `TRF-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      date:       new Date().toISOString().split('T')[0],
      status:     'pending',
      approvedBy: null,
      ...body,
    };
    await db.send(new PutCommand({ TableName: TABLE, Item: transfer }));
    return created(transfer);
  }

  // ← approve and reject are now at the same level, not nested
  if (method === 'PUT' && transferId && subPath === 'approve') {
    const body     = JSON.parse(event.body || '{}');
    const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: { transferId } }));
    if (!Item) return notFound('Transfer not found');
    if (Item.status !== 'pending') return badReq('Only pending transfers can be approved');

    for (const item of Item.items) {
      const { materialId, quantity } = item;
      const [srcRes, dstRes, matRes] = await Promise.all([
        db.send(new GetCommand({ TableName: INV_TABLE, Key: { warehouseId: Item.fromWarehouse, materialId } })),
        db.send(new GetCommand({ TableName: INV_TABLE, Key: { warehouseId: Item.toWarehouse,   materialId } })),
        db.send(new GetCommand({ TableName: MAT_TABLE, Key: { materialId } })),
      ]);
      if (!srcRes.Item || srcRes.Item.quantity < quantity)
        return badReq(`Insufficient stock for ${materialId} in source warehouse`);

      const reorderLevel = matRes.Item?.reorderLevel || 0;
      const srcQty = srcRes.Item.quantity - quantity;
      const dstQty = (dstRes.Item?.quantity || 0) + quantity;

      await Promise.all([
        db.send(new UpdateCommand({
          TableName: INV_TABLE, Key: { warehouseId: Item.fromWarehouse, materialId },
          UpdateExpression: 'SET quantity = :q, #s = :s',
          ExpressionAttributeNames:  { '#s': 'status' },
          ExpressionAttributeValues: { ':q': srcQty, ':s': srcQty <= reorderLevel ? 'low' : 'normal' },
        })),
        db.send(new PutCommand({
          TableName: INV_TABLE,
          Item: { warehouseId: Item.toWarehouse, materialId, quantity: dstQty, status: dstQty <= reorderLevel ? 'low' : 'normal', lastUpdated: new Date().toISOString().split('T')[0] },
        })),
      ]);
    }

    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLE, Key: { transferId },
      UpdateExpression: 'SET #s = :s, approvedBy = :a',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'completed', ':a': body.approvedBy || 'unknown' },
      ReturnValues: 'ALL_NEW',
    }));
    return ok(Attributes);
  }

  // ← reject is now a separate top-level block
  if (method === 'PUT' && transferId && subPath === 'reject') {
    const body = JSON.parse(event.body || '{}');
    const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: { transferId } }));
    if (!Item) return notFound('Transfer not found');
    if (Item.status !== 'pending') return badReq('Only pending transfers can be rejected');

    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLE, Key: { transferId },
      UpdateExpression: 'SET #s = :s, rejectedBy = :r, rejectionReason = :rr',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: {
        ':s':  'rejected',
        ':r':  body.rejectedBy || 'unknown',
        ':rr': body.reason     || '',
      },
      ReturnValues: 'ALL_NEW',
    }));
    return ok(Attributes);
  }

  return badReq('Method not supported');
};