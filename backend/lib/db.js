const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

let _db;

const getDb = () => {
  if (_db) return _db;

  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-south-1',
  });

  _db = DynamoDBDocumentClient.from(client, {
    marshallOptions:   { removeUndefinedValues: true, convertEmptyValues: true },
    unmarshallOptions: { wrapNumbers: false },
  });

  return _db;
};

module.exports = { db: getDb() };