const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const get  = (path)       => fetch(`${BASE}${path}`).then(r => r.json());
const post = (path, body) => fetch(`${BASE}${path}`, { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const put  = (path, body) => fetch(`${BASE}${path}`, { method: 'PUT',   headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

export const api = {
  // Analytics
  dashboard:           () => get('/analytics/dashboard'),
  stockSummary:        () => get('/analytics/stock-summary'),
  consumption:         () => get('/analytics/consumption'),
  procurementSummary:  () => get('/analytics/procurement-summary'),
  requisitionSummary:  () => get('/analytics/requisition-summary'),

  // Inventory
  getInventory:        (params = '') => get(`/inventory${params}`),
  getLowStock:         () => get('/inventory/low-stock'),
  getTransactions:     (wId) => get(`/inventory/transactions/${wId}`),
  recordGRN:           (body) => post('/inventory/grn', body),
  recordMIN:           (body) => post('/inventory/min', body),

  // Warehouses
  getWarehouses:       () => get('/warehouses'),
  createWarehouse:     (body) => post('/warehouses', body),
  updateWarehouse:     (id, body) => put(`/warehouses/${id}`, body),

  // Materials
  getMaterials:        () => get('/materials'),
  createMaterial:      (body) => post('/materials', body),
  updateMaterial:      (id, body) => put(`/materials/${id}`, body),

  // Requisitions
  getRequisitions:     (params = '') => get(`/requisitions${params}`),
  createRequisition:   (body) => post('/requisitions', body),
  approveRequisition:  (id, body) => put(`/requisitions/${id}/approve`, body),
  rejectRequisition:   (id, body) => put(`/requisitions/${id}/reject`, body),

  // Vendors
  getVendors:          () => get('/vendors'),
  createVendor:        (body) => post('/vendors', body),
  updateVendor:        (id, body) => put(`/vendors/${id}`, body),

  // Purchase Orders
  getPurchaseOrders:   (params = '') => get(`/purchase-orders${params}`),
  createPurchaseOrder: (body) => post('/purchase-orders', body),
  sendPO:              (id) => put(`/purchase-orders/${id}/send`, {}),
  deliverPO:           (id) => put(`/purchase-orders/${id}/deliver`, {}),

  // Transfers
  getTransfers:        (params = '') => get(`/transfers${params}`),
  createTransfer:      (body) => post('/transfers', body),
  approveTransfer:     (id, body) => put(`/transfers/${id}/approve`, body),

  // Users
  getUsers:            () => get('/users'),
};
