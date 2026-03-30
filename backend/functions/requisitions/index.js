const { db } = require('../../lib/db');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');
const { ScanCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE = process.env.REQUISITIONS_TABLE;

exports.handler = async (event) => {
  const method        = event.httpMethod;
  const path          = event.path;                                        // ← ADD
  const requisitionId = event.pathParameters?.requisitionId;
  const subPath       = event.pathParameters?.subPath
                        || path.split('/').filter(Boolean).pop();          // ← ADD fallback
  const qs            = event.queryStringParameters || {};

  if (method === 'GET' && !requisitionId) {
    let params = { TableName: TABLE };
    if (qs.status) {
      params.FilterExpression = '#s = :status';
      params.ExpressionAttributeNames  = { '#s': 'status' };
      params.ExpressionAttributeValues = { ':status': qs.status };
    }
    const { Items } = await db.send(new ScanCommand(params));
    return ok(Items);
  }

  if (method === 'GET' && requisitionId) {
    const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: { requisitionId } }));
    return Item ? ok(Item) : notFound('Requisition not found');
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    if (!body.requestedBy || !body.warehouseId || !body.items?.length)
      return badReq('requestedBy, warehouseId, items are required');
    const req = {
      requisitionId: `REQ${Date.now()}`,
      requisitionNo: `REQ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      date:   new Date().toISOString().split('T')[0],
      status: 'pending',
      approvedBy: null,
      ...body,
    };
    await db.send(new PutCommand({ TableName: TABLE, Item: req }));
    return created(req);
  }

  if (method === 'PUT' && requisitionId && subPath === 'approve') {
    const body = JSON.parse(event.body || '{}');
    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLE, Key: { requisitionId },
      UpdateExpression: 'SET #s = :s, approvedBy = :a',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'approved', ':a': body.approvedBy || 'unknown' },
      ReturnValues: 'ALL_NEW',
    }));
    return ok(Attributes);
  }

  if (method === 'PUT' && requisitionId && subPath === 'reject') {
    const body = JSON.parse(event.body || '{}');
    const { Attributes } = await db.send(new UpdateCommand({
      TableName: TABLE, Key: { requisitionId },
      UpdateExpression: 'SET #s = :s, rejectedBy = :r, rejectionReason = :rr',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'rejected', ':r': body.rejectedBy || 'unknown', ':rr': body.reason || '' },
      ReturnValues: 'ALL_NEW',
    }));
    return ok(Attributes);
  }

  return badReq('Method not supported');
};