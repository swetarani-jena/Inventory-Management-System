const { purchaseOrders, vendors, materials, requisitions } = require('/opt/nodejs/mockData');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');

const enrich = (po) => ({
  ...po,
  vendorName: vendors.find(v => v.vendorId === po.vendorId)?.name,
  items: po.items.map(item => ({
    ...item,
    materialName: materials.find(m => m.materialId === item.materialId)?.name,
  })),
});

exports.handler = async (event) => {
  const method = event.httpMethod;
  const poId   = event.pathParameters?.poId;
  const action = event.pathParameters?.action;   // send | deliver
  const qs     = event.queryStringParameters || {};

  // GET /purchase-orders  (?status=sent &vendorId=V001)
  if (method === 'GET' && !poId) {
    let result = [...purchaseOrders];
    if (qs.status)   result = result.filter(p => p.status   === qs.status);
    if (qs.vendorId) result = result.filter(p => p.vendorId === qs.vendorId);
    return ok(result.map(enrich));
  }

  // GET /purchase-orders/{poId}
  if (method === 'GET' && poId && !action) {
    const po = purchaseOrders.find(p => p.poId === poId);
    return po ? ok(enrich(po)) : notFound('Purchase Order not found');
  }

  // POST /purchase-orders — create PO
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { vendorId, requisitionId, expectedDeliveryDate, items, createdBy } = body;
    if (!vendorId || !items?.length) return badReq('vendorId and items are required');

    if (!vendors.find(v => v.vendorId === vendorId)) return notFound('Vendor not found');

    const poItems = items.map((item, i) => ({
      itemId:     `PI${String(Date.now() + i).slice(-4)}`,
      materialId: item.materialId,
      quantity:   item.quantity,
      unitPrice:  item.unitPrice  || 0,
      totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
    }));

    const newPO = {
      poId:                 `PO${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      poNumber:             `PO-2025-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      date:                 new Date().toISOString().split('T')[0],
      vendorId,
      requisitionId:        requisitionId || null,
      totalAmount:          poItems.reduce((s, i) => s + i.totalPrice, 0),
      status:               'generated',
      createdBy:            createdBy || 'U003',
      expectedDeliveryDate: expectedDeliveryDate || null,
      actualDeliveryDate:   null,
      items:                poItems,
    };
    purchaseOrders.push(newPO);

    // Mark linked requisition as PO raised
    if (requisitionId) {
      const rIdx = requisitions.findIndex(r => r.requisitionId === requisitionId);
      if (rIdx !== -1) requisitions[rIdx].status = 'po_raised';
    }

    return created(enrich(newPO));
  }

  // PUT /purchase-orders/{poId}/send
  if (method === 'PUT' && action === 'send') {
    const idx = purchaseOrders.findIndex(p => p.poId === poId);
    if (idx === -1) return notFound('Purchase Order not found');
    purchaseOrders[idx].status = 'sent';
    return ok(enrich(purchaseOrders[idx]));
  }

  // PUT /purchase-orders/{poId}/deliver
  if (method === 'PUT' && action === 'deliver') {
    const idx = purchaseOrders.findIndex(p => p.poId === poId);
    if (idx === -1) return notFound('Purchase Order not found');
    purchaseOrders[idx].status             = 'delivered';
    purchaseOrders[idx].actualDeliveryDate = new Date().toISOString().split('T')[0];
    return ok(enrich(purchaseOrders[idx]));
  }

  return badReq('Method not supported');
};