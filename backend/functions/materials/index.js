const { db } = require('../../lib/db');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');
const { ScanCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE = process.env.MATERIALS_TABLE;

exports.handler = async (event) => {
  const method     = event.httpMethod;
  const materialId = event.pathParameters?.materialId;

  if (method === 'GET' && !materialId) {
    const { Items } = await db.send(new ScanCommand({ TableName: TABLE }));
    return ok(Items);
  }

  if (method === 'GET' && materialId) {
    const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: { materialId } }));
    return Item ? ok(Item) : notFound('Material not found');
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    if (!body.name || !body.unit) return badReq('name, unit are required');
    const material = { materialId: `M${Date.now()}`, ...body };
    await db.send(new PutCommand({ TableName: TABLE, Item: material }));
    return created(material);
  }

  if (method === 'PUT' && materialId) {
    const body = JSON.parse(event.body || '{}');
    const { materialId: _skip, ...updateFields } = body;
    const updates = Object.entries(updateFields);
    if (!updates.length) return badReq('No fields to update');  // ← add this
    const expr   = 'SET ' + updates.map(([k], i) => `#k${i} = :v${i}`).join(', ');
    const names  = Object.fromEntries(updates.map(([k], i) => [`#k${i}`, k]));
    const values = Object.fromEntries(updates.map(([k, v], i) => [`:v${i}`, v]));
    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLE, Key: { materialId },
      UpdateExpression: expr, ExpressionAttributeNames: names,
      ExpressionAttributeValues: values, ReturnValues: 'ALL_NEW',
    }));
    return ok(Attributes);
  }

  return badReq('Method not supported');
};