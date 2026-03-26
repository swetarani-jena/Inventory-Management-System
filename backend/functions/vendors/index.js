const { db } = require('../../lib/db');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');
const { ScanCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE = process.env.VENDORS_TABLE;

exports.handler = async (event) => {
  const method   = event.httpMethod;
  const vendorId = event.pathParameters?.vendorId;

  if (method === 'GET' && !vendorId) {
    const { Items } = await db.send(new ScanCommand({ TableName: TABLE }));
    return ok(Items);
  }

  if (method === 'GET' && vendorId) {
    const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: { vendorId } }));
    return Item ? ok(Item) : notFound('Vendor not found');
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    if (!body.name || !body.contactPerson) return badReq('name, contactPerson are required');
    const vendor = { vendorId: `V${Date.now()}`, status: 'active', rating: 0, ...body };
    await db.send(new PutCommand({ TableName: TABLE, Item: vendor }));
    return created(vendor);
  }

  if (method === 'PUT' && vendorId) {
    const body = JSON.parse(event.body || '{}');
    const { vendorId: _skip, ...updateFields } = body;
    const updates = Object.entries(updateFields);
    if (!updates.length) return badReq('No fields to update');
    const expr   = 'SET ' + updates.map(([k], i) => `#k${i} = :v${i}`).join(', ');
    const names  = Object.fromEntries(updates.map(([k], i) => [`#k${i}`, k]));
    const values = Object.fromEntries(updates.map(([k, v], i) => [`:v${i}`, v]));
    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLE, Key: { vendorId },
      UpdateExpression: expr, ExpressionAttributeNames: names,
      ExpressionAttributeValues: values, ReturnValues: 'ALL_NEW',
    }));
    return ok(Attributes);
  }

  return badReq('Method not supported');
};