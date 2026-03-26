const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { users, warehouses, materials, inventory, transactions, requisitions, vendors, purchaseOrders, transfers } = require('./layers/mockData/nodejs/mockData');

const STAGE  = process.argv[2] || 'prod';
const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-south-1' }));

const seed = async (tableName, items) => {
  console.log(`Seeding ${tableName} (${items.length} items)...`);
  await Promise.all(items.map(Item => client.send(new PutCommand({ TableName: tableName, Item }))));
  console.log(`✓ ${tableName} done`);
};

(async () => {
  await seed(`inventory-users-${STAGE}`,           users);
  await seed(`inventory-warehouses-${STAGE}`,      warehouses);
  await seed(`inventory-materials-${STAGE}`,       materials);
  await seed(`inventory-stock-${STAGE}`,           inventory);
  await seed(`inventory-transactions-${STAGE}`,    transactions);
  await seed(`inventory-requisitions-${STAGE}`,    requisitions);
  await seed(`inventory-vendors-${STAGE}`,         vendors);
  await seed(`inventory-purchase-orders-${STAGE}`, purchaseOrders);
  await seed(`inventory-transfers-${STAGE}`,       transfers);
  console.log('\n✅ All tables seeded!');
})();