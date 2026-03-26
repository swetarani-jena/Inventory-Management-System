const { db } = require('../../lib/db');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');
const { ScanCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE = process.env.WAREHOUSES_TABLE;

exports.handler = async (event) => {
  const method      = event.httpMethod;
  const warehouseId = event.pathParameters?.warehouseId;

  if (method === 'GET' && !warehouseId) {
    const { Items } = await db.send(new ScanCommand({ TableName: TABLE }));
    return ok(Items);
  }

  if (method === 'GET' && warehouseId) {
    const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: { warehouseId } }));
    return Item ? ok(Item) : notFound('Warehouse not found');
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    if (!body.name || !body.location) return badReq('name, location are required');
    const warehouse = { warehouseId: `W${Date.now()}`, status: 'active', ...body };
    await db.send(new PutCommand({ TableName: TABLE, Item: warehouse }));
    return created(warehouse);
  }

  if (method === 'PUT' && warehouseId) {
    const body = JSON.parse(event.body || '{}');
    
    const { warehouseId: _skip, ...updateFields } = body;
    
    const updates = Object.entries(updateFields);
    if (!updates.length) return badReq('No fields to update');

    const expr   = 'SET ' + updates.map(([k], i) => `#k${i} = :v${i}`).join(', ');
    const names  = Object.fromEntries(updates.map(([k], i) => [`#k${i}`, k]));
    const values = Object.fromEntries(updates.map(([k, v], i) => [`:v${i}`, v]));

    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { warehouseId },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));
    return ok(Attributes);
  }

  return badReq('Method not supported');
};