const { inventory, transactions, materials, warehouses } = require('../../layers/mockData/nodejs/mockData');
const { ok, created, badReq, notFound } = require('../../layers/mockData/nodejs/response');

// Enriches a stock row with human-readable names
const enrich = (i) => ({
  ...i,
  materialName:  materials.find(m => m.materialId  === i.materialId)?.name,
  unit:          materials.find(m => m.materialId  === i.materialId)?.unit,
  reorderLevel:  materials.find(m => m.materialId  === i.materialId)?.reorderLevel,
  warehouseName: warehouses.find(w => w.warehouseId === i.warehouseId)?.name,
});

// Recompute low/normal based on reorder level
const computeStatus = (materialId, quantity) => {
  const mat = materials.find(m => m.materialId === materialId);
  return mat && quantity <= mat.reorderLevel ? 'low' : 'normal';
};

exports.handler = async (event) => {
  const method  = event.httpMethod;
  const subPath = event.pathParameters?.subPath;   // captures "grn" / "min" / "low-stock"
  const warehouseId = event.pathParameters?.warehouseId;
  const materialId  = event.pathParameters?.materialId;
  const qs = event.queryStringParameters || {};

  // ── GET /inventory/low-stock ──────────────────────────────
  if (method === 'GET' && subPath === 'low-stock') {
    return ok(inventory.filter(i => i.status === 'low').map(enrich));
  }

  // ── GET /inventory/transactions/{warehouseId} ─────────────
  if (method === 'GET' && subPath === 'transactions' && warehouseId) {
    let txns = transactions.filter(t => t.warehouseId === warehouseId);
    if (qs.type) txns = txns.filter(t => t.type === qs.type);
    return ok(txns.map(t => ({
      ...t,
      materialName: materials.find(m => m.materialId === t.materialId)?.name,
    })));
  }

  // ── GET /inventory/{warehouseId}/{materialId} ─────────────
  if (method === 'GET' && warehouseId && materialId) {
    const item = inventory.find(i => i.warehouseId === warehouseId && i.materialId === materialId);
    return item ? ok(enrich(item)) : notFound('Inventory record not found');
  }

  // ── GET /inventory  (?warehouseId=W001 &status=low) ───────
  if (method === 'GET') {
    let result = [...inventory];
    if (qs.warehouseId) result = result.filter(i => i.warehouseId === qs.warehouseId);
    if (qs.status)      result = result.filter(i => i.status      === qs.status);
    return ok(result.map(enrich));
  }

  // ── POST /inventory/grn  (Goods Receipt — stock IN) ───────
  if (method === 'POST' && subPath === 'grn') {
    const body = JSON.parse(event.body || '{}');
    const { warehouseId: wId, materialId: mId, quantity, referenceNo, remarks } = body;
    if (!wId || !mId || !quantity) return badReq('warehouseId, materialId, quantity are required');

    const idx = inventory.findIndex(i => i.warehouseId === wId && i.materialId === mId);
    if (idx === -1) {
      inventory.push({ warehouseId: wId, materialId: mId, quantity: Number(quantity), lastUpdated: new Date().toISOString().split('T')[0], status: computeStatus(mId, Number(quantity)) });
    } else {
      inventory[idx].quantity   += Number(quantity);
      inventory[idx].lastUpdated = new Date().toISOString().split('T')[0];
      inventory[idx].status      = computeStatus(mId, inventory[idx].quantity);
    }

    const txn = { txnId: `T${String(transactions.length + 1).padStart(3,'0')}`, warehouseId: wId, materialId: mId, type: 'GRN', quantity: Number(quantity), referenceNo: referenceNo || '', remarks: remarks || '', createdAt: new Date().toISOString() };
    transactions.push(txn);
    return created({ message: 'GRN recorded', transaction: txn });
  }

  // ── POST /inventory/min  (Material Issue — stock OUT) ─────
  if (method === 'POST' && subPath === 'min') {
    const body = JSON.parse(event.body || '{}');
    const { warehouseId: wId, materialId: mId, quantity, referenceNo, remarks } = body;
    if (!wId || !mId || !quantity) return badReq('warehouseId, materialId, quantity are required');

    const idx = inventory.findIndex(i => i.warehouseId === wId && i.materialId === mId);
    if (idx === -1) return notFound('No stock found for this material in this warehouse');
    if (inventory[idx].quantity < Number(quantity)) return badReq(`Insufficient stock. Available: ${inventory[idx].quantity}`);

    inventory[idx].quantity   -= Number(quantity);
    inventory[idx].lastUpdated = new Date().toISOString().split('T')[0];
    inventory[idx].status      = computeStatus(mId, inventory[idx].quantity);

    const txn = { txnId: `T${String(transactions.length + 1).padStart(3,'0')}`, warehouseId: wId, materialId: mId, type: 'MIN', quantity: Number(quantity), referenceNo: referenceNo || '', remarks: remarks || '', createdAt: new Date().toISOString() };
    transactions.push(txn);
    return created({ message: 'Material issued', transaction: txn });
  }

  return badReq('Method not supported');
};