const { materials }        = require('/opt/nodejs/mockData');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');

exports.handler = async (event) => {
  const method     = event.httpMethod;
  const materialId = event.pathParameters?.materialId;
  const { category } = event.queryStringParameters || {};

  // GET /materials  (optional ?category=Aggregate)
  if (method === 'GET' && !materialId) {
    const result = category
      ? materials.filter(m => m.category.toLowerCase() === category.toLowerCase())
      : materials;
    return ok(result);
  }

  // GET /materials/{materialId}
  if (method === 'GET' && materialId) {
    const mat = materials.find(m => m.materialId === materialId);
    return mat ? ok(mat) : notFound('Material not found');
  }

  // POST /materials
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { name, category: cat, unit, reorderLevel, reorderQty, specifications } = body;
    if (!name || !cat || !unit) return badReq('name, category, unit are required');

    const newMat = {
      materialId:     `M${String(materials.length + 1).padStart(3, '0')}`,
      name,
      category:       cat,
      unit,
      reorderLevel:   reorderLevel || 0,
      reorderQty:     reorderQty   || 0,
      specifications: specifications || '',
    };
    materials.push(newMat);
    return created(newMat);
  }

  // PUT /materials/{materialId}
  if (method === 'PUT' && materialId) {
    const idx = materials.findIndex(m => m.materialId === materialId);
    if (idx === -1) return notFound('Material not found');
    const body = JSON.parse(event.body || '{}');
    materials[idx] = { ...materials[idx], ...body, materialId };
    return ok(materials[idx]);
  }

  return badReq('Method not supported');
};