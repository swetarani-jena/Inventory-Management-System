const { users }            = require('/opt/nodejs/mockData');
const { ok, created, badReq, notFound } = require('/opt/nodejs/response');

exports.handler = async (event) => {
  const method = event.httpMethod;
  const userId = event.pathParameters?.userId;

  // GET /users
  if (method === 'GET' && !userId) {
    return ok(users);
  }

  // GET /users/{userId}
  if (method === 'GET' && userId) {
    const user = users.find(u => u.userId === userId);
    return user ? ok(user) : notFound('User not found');
  }

  // POST /users
  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { username, email, role, warehouseId, phone } = body;
    if (!username || !email || !role) return badReq('username, email, role are required');

    const newUser = {
      userId:      `U${String(users.length + 1).padStart(3, '0')}`,
      username, email, role,
      warehouseId: warehouseId || null,
      phone:       phone || '',
      status:      'active',
    };
    users.push(newUser);
    return created(newUser);
  }

  // PUT /users/{userId}
  if (method === 'PUT' && userId) {
    const idx = users.findIndex(u => u.userId === userId);
    if (idx === -1) return notFound('User not found');
    const body = JSON.parse(event.body || '{}');
    users[idx] = { ...users[idx], ...body, userId };
    return ok(users[idx]);
  }

  return badReq('Method not supported');
};