// Standard Lambda response builder
const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  },
  body: JSON.stringify(body),
});

const ok      = (data)    => response(200, { success: true,  data });
const created = (data)    => response(201, { success: true,  data });
const badReq  = (message) => response(400, { success: false, message });
const notFound= (message) => response(404, { success: false, message });

module.exports = { ok, created, badReq, notFound };