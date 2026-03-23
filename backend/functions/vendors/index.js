const { vendors }          = require('../../layers/mockData/nodejs/mockData');
const { ok, created, badReq, notFound } = require('../../layers/mockData/nodejs/response');

exports.handler = async (event) => {
  const method   = event.httpMethod;
  const vendorId = event.pathParameters?.vendorId;
  const { status } = event.queryStringParameters || {};

  // GET /vendors
  if (method === 'GET' && !vendorId) {
    const result = status ? vendors.filter(v => v.status === status) : vendors;
    return ok(result);
  }

  // GET /vendors/{vendorId}
  if (method === 'GET' && vendorId) {
    const vendor = vendors.find(v => v.vendorId === vendorId);
    return vendor ? ok(vendor) : notFound('Vendor not found');
  }

  // POST /vendors
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { name, contactPerson, email, phone, address } = body;
    if (!name || !email) return badReq('name and email are required');

    const newVendor = {
      vendorId:      `V${String(vendors.length + 1).padStart(3, '0')}`,
      name,
      contactPerson: contactPerson || '',
      email,
      phone:         phone   || '',
      address:       address || '',
      rating:        0,
      status:        'active',
    };
    vendors.push(newVendor);
    return created(newVendor);
  }

  // PUT /vendors/{vendorId}
  if (method === 'PUT' && vendorId) {
    const idx = vendors.findIndex(v => v.vendorId === vendorId);
    if (idx === -1) return notFound('Vendor not found');
    const body = JSON.parse(event.body || '{}');
    vendors[idx] = { ...vendors[idx], ...body, vendorId };
    return ok(vendors[idx]);
  }

  return badReq('Method not supported');
};