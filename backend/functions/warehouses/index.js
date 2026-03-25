const { warehouses }       = require('/opt/nodejs/mockData');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');

exports.handler = async (event) => {
  const method      = event.httpMethod;
  const warehouseId = event.pathParameters?.warehouseId;

  // GET /warehouses
  if (method === 'GET' && !warehouseId) {
    return ok(warehouses.filter(w => w.status === 'active'));
  }

  // GET /warehouses/{warehouseId}
  if (method === 'GET' && warehouseId) {
    const wh = warehouses.find(w => w.warehouseId === warehouseId);
    return wh ? ok(wh) : notFound('Warehouse not found');
  }

  // POST /warehouses
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { name, location, address, capacity, managerId } = body;
    if (!name || !location) return badReq('name and location are required');

    const newWh = {
      warehouseId: `W${String(warehouses.length + 1).padStart(3, '0')}`,
      name, location,
      address:   address || '',
      capacity:  capacity || 0,
      managerId: managerId || null,
      status:    'active',
    };
    warehouses.push(newWh);
    return created(newWh);
  }

  // PUT /warehouses/{warehouseId}
  if (method === 'PUT' && warehouseId) {
    const idx = warehouses.findIndex(w => w.warehouseId === warehouseId);
    if (idx === -1) return notFound('Warehouse not found');
    const body = JSON.parse(event.body || '{}');
    warehouses[idx] = { ...warehouses[idx], ...body, warehouseId };
    return ok(warehouses[idx]);
  }

  return badReq('Method not supported');
};