const { requisitions, materials, warehouses } = require('../../layers/mockData/nodejs/mockData');
const { ok, created, badReq, notFound } = require('../../layers/mockData/nodejs/response');

const enrich = (r) => ({
  ...r,
  warehouseName: warehouses.find(w => w.warehouseId === r.warehouseId)?.name,
  items: r.items.map(item => ({
    ...item,
    materialName: materials.find(m => m.materialId === item.materialId)?.name,
  })),
});

exports.handler = async (event) => {
  const method        = event.httpMethod;
  const requisitionId = event.pathParameters?.requisitionId;
  const action        = event.pathParameters?.action;   // approve | reject
  const qs            = event.queryStringParameters || {};

  // GET /requisitions  (?status=pending &warehouseId=W001)
  if (method === 'GET' && !requisitionId) {
    let result = [...requisitions];
    if (qs.status)      result = result.filter(r => r.status      === qs.status);
    if (qs.warehouseId) result = result.filter(r => r.warehouseId === qs.warehouseId);
    if (qs.requestedBy) result = result.filter(r => r.requestedBy === qs.requestedBy);
    return ok(result.map(enrich));
  }

  // GET /requisitions/{requisitionId}
  if (method === 'GET' && requisitionId && !action) {
    const req = requisitions.find(r => r.requisitionId === requisitionId);
    return req ? ok(enrich(req)) : notFound('Requisition not found');
  }

  // POST /requisitions — create new
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { warehouseId, project, priority, items, requestedBy } = body;
    if (!warehouseId || !project || !items?.length) return badReq('warehouseId, project and items are required');

    const newReq = {
      requisitionId: `REQ${String(requisitions.length + 1).padStart(3, '0')}`,
      requisitionNo: `REQ-2025-${String(requisitions.length + 1).padStart(3, '0')}`,
      date:          new Date().toISOString().split('T')[0],
      requestedBy:   requestedBy || 'U001',
      warehouseId,
      project,
      priority:      priority || 'medium',
      status:        'pending',
      approvedBy:    null,
      items:         items.map((item, i) => ({
        itemId:     `RI${String(Date.now() + i).slice(-4)}`,
        materialId: item.materialId,
        quantity:   item.quantity,
        unit:       item.unit || '',
        remarks:    item.remarks || '',
      })),
    };
    requisitions.push(newReq);
    return created(enrich(newReq));
  }

  // PUT /requisitions/{requisitionId}/approve
  if (method === 'PUT' && action === 'approve') {
    const idx = requisitions.findIndex(r => r.requisitionId === requisitionId);
    if (idx === -1) return notFound('Requisition not found');
    if (requisitions[idx].status !== 'pending') return badReq(`Cannot approve — current status: ${requisitions[idx].status}`);

    const { stockAvailable, approvedBy } = JSON.parse(event.body || '{}');
    requisitions[idx].status     = stockAvailable ? 'approved' : 'awaiting_procurement';
    requisitions[idx].approvedBy = approvedBy || 'U002';
    return ok(enrich(requisitions[idx]));
  }

  // PUT /requisitions/{requisitionId}/reject
  if (method === 'PUT' && action === 'reject') {
    const idx = requisitions.findIndex(r => r.requisitionId === requisitionId);
    if (idx === -1) return notFound('Requisition not found');
    if (requisitions[idx].status !== 'pending') return badReq(`Cannot reject — current status: ${requisitions[idx].status}`);

    const { reason, approvedBy } = JSON.parse(event.body || '{}');
    requisitions[idx].status       = 'rejected';
    requisitions[idx].approvedBy   = approvedBy || 'U002';
    requisitions[idx].rejectReason = reason || '';
    return ok(enrich(requisitions[idx]));
  }

  return badReq('Method not supported');
};