const { db } = require('../../lib/db');
const { ok, badReq } = require('/opt/nodejs/response');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

const T = {
  warehouses:     process.env.WAREHOUSES_TABLE,
  materials:      process.env.MATERIALS_TABLE,
  inventory:      process.env.INVENTORY_TABLE,
  transactions:   process.env.TRANSACTIONS_TABLE,
  requisitions:   process.env.REQUISITIONS_TABLE,
  purchaseOrders: process.env.PURCHASE_ORDERS_TABLE,
};

const scan = (TableName, filter) => db.send(new ScanCommand({ TableName, ...filter })).then(r => r.Items);

exports.handler = async (event) => {
  const report = event.pathParameters?.report;

  if (report === 'dashboard') {
    const [warehouses, materials, inventory, requisitions, purchaseOrders] = await Promise.all([
      scan(T.warehouses,   { FilterExpression: '#s = :a', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':a': 'active' } }),
      scan(T.materials),
      scan(T.inventory,    { FilterExpression: '#s = :l', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':l': 'low' } }),
      scan(T.requisitions, { FilterExpression: '#s = :p', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':p': 'pending' } }),
      scan(T.purchaseOrders),
    ]);
    return ok({
      totalWarehouses:     warehouses.length,
      totalMaterials:      materials.length,
      lowStockItems:       inventory.length,
      pendingRequisitions: requisitions.length,
      activePOs:           purchaseOrders.filter(p => !['delivered', 'cancelled'].includes(p.status)).length,
      totalInventoryValue: purchaseOrders.filter(p => p.status === 'delivered').reduce((s, po) => s + (po.totalAmount || 0), 0),
    });
  }

  if (report === 'stock-summary') {
    const [warehouses, inventory, materials] = await Promise.all([
      scan(T.warehouses), scan(T.inventory), scan(T.materials),
    ]);
    const matMap = Object.fromEntries(materials.map(m => [m.materialId, m]));
    return ok(warehouses.map(wh => {
      const whStock = inventory.filter(i => i.warehouseId === wh.warehouseId);
      return {
        warehouseId:   wh.warehouseId,
        warehouseName: wh.name,
        totalItems:    whStock.length,
        lowStockCount: whStock.filter(i => i.status === 'low').length,
        items: whStock.map(i => ({
          materialId:   i.materialId,
          materialName: matMap[i.materialId]?.name,
          unit:         matMap[i.materialId]?.unit,
          quantity:     i.quantity,
          status:       i.status,
        })),
      };
    }));
  }

  if (report === 'consumption') {
    const [transactions, materials] = await Promise.all([
      scan(T.transactions, { FilterExpression: '#t = :min', ExpressionAttributeNames: { '#t': 'type' }, ExpressionAttributeValues: { ':min': 'MIN' } }),
      scan(T.materials),
    ]);
    const matMap = Object.fromEntries(materials.map(m => [m.materialId, m]));
    const map = {};
    transactions.forEach(t => {
      if (!map[t.materialId]) map[t.materialId] = { materialId: t.materialId, totalConsumed: 0, count: 0 };
      map[t.materialId].totalConsumed += t.quantity;
      map[t.materialId].count         += 1;
    });
    return ok(Object.values(map).map(c => ({
      ...c,
      materialName: matMap[c.materialId]?.name,
      unit:         matMap[c.materialId]?.unit,
    })));
  }

  if (report === 'procurement-summary') {
    const pos = await scan(T.purchaseOrders);
    const statusGroups = pos.reduce((acc, po) => { acc[po.status] = (acc[po.status] || 0) + 1; return acc; }, {});
    return ok({
      statusGroups,
      totalOrders:    pos.length,
      totalSpend:     pos.reduce((s, po) => s + (po.totalAmount || 0), 0),
      deliveredSpend: pos.filter(p => p.status === 'delivered').reduce((s, po) => s + (po.totalAmount || 0), 0),
    });
  }

  if (report === 'requisition-summary') {
    const reqs = await scan(T.requisitions);
    const statusGroups = reqs.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
    return ok({ statusGroups, total: reqs.length });
  }

  return badReq(`Unknown report: ${report}`);
};