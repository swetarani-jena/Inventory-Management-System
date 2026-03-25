const { inventory, transactions, requisitions, purchaseOrders, materials, warehouses } = require('/opt/nodejs/mockData');
const { ok, badReq } = require('/opt/nodejs/response');

exports.handler = async (event) => {
  const report = event.pathParameters?.report;

  // GET /analytics/dashboard
  if (report === 'dashboard') {
    return ok({
      totalWarehouses:     warehouses.filter(w => w.status === 'active').length,
      totalMaterials:      materials.length,
      lowStockItems:       inventory.filter(i => i.status === 'low').length,
      pendingRequisitions: requisitions.filter(r => r.status === 'pending').length,
      activePOs:           purchaseOrders.filter(p => !['delivered', 'cancelled'].includes(p.status)).length,
      totalInventoryValue: purchaseOrders.filter(p => p.status === 'delivered').reduce((s, po) => s + po.totalAmount, 0),
    });
  }

  // GET /analytics/stock-summary
  if (report === 'stock-summary') {
    return ok(warehouses.map(wh => {
      const whStock = inventory.filter(i => i.warehouseId === wh.warehouseId);
      return {
        warehouseId:   wh.warehouseId,
        warehouseName: wh.name,
        totalItems:    whStock.length,
        lowStockCount: whStock.filter(i => i.status === 'low').length,
        items:         whStock.map(i => ({
          materialId:   i.materialId,
          materialName: materials.find(m => m.materialId === i.materialId)?.name,
          unit:         materials.find(m => m.materialId === i.materialId)?.unit,
          quantity:     i.quantity,
          status:       i.status,
        })),
      };
    }));
  }

  // GET /analytics/consumption
  if (report === 'consumption') {
    const map = {};
    transactions.filter(t => t.type === 'MIN').forEach(t => {
      if (!map[t.materialId]) map[t.materialId] = { materialId: t.materialId, totalConsumed: 0, count: 0 };
      map[t.materialId].totalConsumed += t.quantity;
      map[t.materialId].count         += 1;
    });
    return ok(Object.values(map).map(c => ({
      ...c,
      materialName: materials.find(m => m.materialId === c.materialId)?.name,
      unit:         materials.find(m => m.materialId === c.materialId)?.unit,
    })));
  }

  // GET /analytics/procurement-summary
  if (report === 'procurement-summary') {
    const statusGroups = purchaseOrders.reduce((acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    }, {});
    return ok({
      statusGroups,
      totalOrders:   purchaseOrders.length,
      totalSpend:    purchaseOrders.reduce((s, po) => s + po.totalAmount, 0),
      deliveredSpend:purchaseOrders.filter(p => p.status === 'delivered').reduce((s, po) => s + po.totalAmount, 0),
    });
  }

  // GET /analytics/requisition-summary
  if (report === 'requisition-summary') {
    const statusGroups = requisitions.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    return ok({ statusGroups, total: requisitions.length });
  }

  return badReq(`Unknown report: ${report}. Valid: dashboard, stock-summary, consumption, procurement-summary, requisition-summary`);
};