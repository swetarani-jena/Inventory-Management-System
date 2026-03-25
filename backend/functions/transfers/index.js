const { transfers, inventory, materials, warehouses } = require('/opt/nodejs/mockData');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');

const enrich = (t) => ({
  ...t,
  fromWarehouseName: warehouses.find(w => w.warehouseId === t.fromWarehouse)?.name,
  toWarehouseName:   warehouses.find(w => w.warehouseId === t.toWarehouse)?.name,
  items: t.items.map(item => ({
    ...item,
    materialName: materials.find(m => m.materialId === item.materialId)?.name,
  })),
});

exports.handler = async (event) => {
  const method     = event.httpMethod;
  const transferId = event.pathParameters?.transferId;
  const action     = event.pathParameters?.action;   // approve
  const qs         = event.queryStringParameters || {};

  // GET /transfers  (?status=pending)
  if (method === 'GET' && !transferId) {
    const result = qs.status ? transfers.filter(t => t.status === qs.status) : transfers;
    return ok(result.map(enrich));
  }

  // GET /transfers/{transferId}
  if (method === 'GET' && transferId && !action) {
    const t = transfers.find(t => t.transferId === transferId);
    return t ? ok(enrich(t)) : notFound('Transfer not found');
  }

  // POST /transfers — request a transfer
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { fromWarehouse, toWarehouse, items, requestedBy } = body;
    if (!fromWarehouse || !toWarehouse || !items?.length) return badReq('fromWarehouse, toWarehouse and items are required');
    if (fromWarehouse === toWarehouse) return badReq('Source and destination cannot be the same warehouse');

    const newTransfer = {
      transferId:   `TR${String(transfers.length + 1).padStart(3, '0')}`,
      transferNo:   `TRF-2025-${String(transfers.length + 1).padStart(3, '0')}`,
      date:         new Date().toISOString().split('T')[0],
      fromWarehouse, toWarehouse,
      status:       'pending',
      requestedBy:  requestedBy || 'U001',
      approvedBy:   null,
      items:        items.map((item, i) => ({
        itemId:     `TI${String(Date.now() + i).slice(-4)}`,
        materialId: item.materialId,
        quantity:   item.quantity,
        unit:       item.unit || '',
      })),
    };
    transfers.push(newTransfer);
    return created(enrich(newTransfer));
  }

  // PUT /transfers/{transferId}/approve — moves stock between warehouses
  if (method === 'PUT' && action === 'approve') {
    const idx = transfers.findIndex(t => t.transferId === transferId);
    if (idx === -1) return notFound('Transfer not found');
    if (transfers[idx].status !== 'pending') return badReq(`Cannot approve — current status: ${transfers[idx].status}`);

    const { fromWarehouse, toWarehouse, items } = transfers[idx];

    // Validate sufficient stock first
    for (const item of items) {
      const src = inventory.find(i => i.warehouseId === fromWarehouse && i.materialId === item.materialId);
      if (!src || src.quantity < item.quantity) {
        return badReq(`Insufficient stock for ${item.materialId} in warehouse ${fromWarehouse}`);
      }
    }

    // Move stock
    for (const item of items) {
      const srcIdx = inventory.findIndex(i => i.warehouseId === fromWarehouse && i.materialId === item.materialId);
      inventory[srcIdx].quantity -= item.quantity;

      const dstIdx = inventory.findIndex(i => i.warehouseId === toWarehouse && i.materialId === item.materialId);
      if (dstIdx === -1) {
        inventory.push({ warehouseId: toWarehouse, materialId: item.materialId, quantity: item.quantity, lastUpdated: new Date().toISOString().split('T')[0], status: 'normal' });
      } else {
        inventory[dstIdx].quantity += item.quantity;
      }
    }

    const { approvedBy } = JSON.parse(event.body || '{}');
    transfers[idx].status     = 'completed';
    transfers[idx].approvedBy = approvedBy || 'U002';
    return ok(enrich(transfers[idx]));
  }

  return badReq('Method not supported');
};