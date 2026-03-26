const { db } = require('../../lib/db');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');
const { ScanCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE = process.env.USERS_TABLE;

exports.handler = async (event) => {
  const method = event.httpMethod;
  const userId = event.pathParameters?.userId;

  if (method === 'GET' && !userId) {
    const { Items } = await db.send(new ScanCommand({ TableName: TABLE }));
    return ok(Items);
  }

  if (method === 'GET' && userId) {
    const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: { userId } }));
    return Item ? ok(Item) : notFound('User not found');
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    if (!body.username || !body.email || !body.role) return badReq('username, email, role are required');
    const user = { userId: `U${Date.now()}`, status: 'active', ...body };
    await db.send(new PutCommand({ TableName: TABLE, Item: user }));
    return created(user);
  }

  if (method === 'PUT' && userId) {
    const body = JSON.parse(event.body || '{}');
    const updates = Object.entries(body);
    if (!updates.length) return badReq('No fields to update');
    const expr   = 'SET ' + updates.map(([k], i) => `#k${i} = :v${i}`).join(', ');
    const names  = Object.fromEntries(updates.map(([k], i) => [`#k${i}`, k]));
    const values = Object.fromEntries(updates.map(([k, v], i) => [`:v${i}`, v]));
    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLE, Key: { userId },
      UpdateExpression: expr, ExpressionAttributeNames: names,
      ExpressionAttributeValues: values, ReturnValues: 'ALL_NEW',
    }));
    return ok(Attributes);
  }

  return badReq('Method not supported');
};