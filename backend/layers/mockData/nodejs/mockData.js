// ─────────────────────────────────────────────────────────────
//  MOCK DATA  —  swap each section's return with DynamoDB later
// ─────────────────────────────────────────────────────────────

const users = [
  { userId: 'U001', username: 'swetarani', email: 'swetaranijena.sr@gmail.com', role: 'site_engineer',      warehouseId: 'W001', phone: '9439097824', status: 'active' },
  { userId: 'U002', username: 'ramesh',    email: 'ramesh@example.com',         role: 'warehouse_manager',  warehouseId: 'W001', phone: '9876543210', status: 'active' },
  { userId: 'U003', username: 'priya',     email: 'priya@example.com',          role: 'procurement_officer',warehouseId: null,   phone: '9123456780', status: 'active' },
  { userId: 'U004', username: 'admin',     email: 'admin@example.com',          role: 'admin',              warehouseId: null,   phone: '9000000000', status: 'active' },
];

const warehouses = [
  { warehouseId: 'W001', name: 'Bhadrak Central Warehouse', location: 'Bhadrak', address: 'Charampa Road, Bhadrak, Odisha 756101', capacity: 5000, managerId: 'U002', status: 'active' },
  { warehouseId: 'W002', name: 'Jajpur Road Depot',         location: 'Jajpur',  address: 'NH-16, Jajpur Road, Odisha 755026',    capacity: 3000, managerId: 'U002', status: 'active' },
  { warehouseId: 'W003', name: 'Cuttack Site Store',        location: 'Cuttack', address: 'Bidanasi, Cuttack, Odisha 753014',      capacity: 2000, managerId: 'U002', status: 'active' },
];

const materials = [
  { materialId: 'M001', name: 'Cement (OPC 53)',  category: 'Binding Material', unit: 'bags',   reorderLevel: 100, reorderQty: 500  },
  { materialId: 'M002', name: 'River Sand',       category: 'Aggregate',        unit: 'tons',   reorderLevel: 50,  reorderQty: 200  },
  { materialId: 'M003', name: 'Coarse Aggregate', category: 'Aggregate',        unit: 'tons',   reorderLevel: 40,  reorderQty: 150  },
  { materialId: 'M004', name: 'TMT Steel Bars',   category: 'Steel',            unit: 'tons',   reorderLevel: 10,  reorderQty: 50   },
  { materialId: 'M005', name: 'Bricks',           category: 'Masonry',          unit: 'pieces', reorderLevel: 5000,reorderQty: 20000},
  { materialId: 'M006', name: 'Gravel',           category: 'Aggregate',        unit: 'tons',   reorderLevel: 30,  reorderQty: 100  },
];

const inventory = [
  { warehouseId: 'W001', materialId: 'M001', quantity: 450,   lastUpdated: '2025-03-18', status: 'normal' },
  { warehouseId: 'W001', materialId: 'M002', quantity: 80,    lastUpdated: '2025-03-18', status: 'normal' },
  { warehouseId: 'W001', materialId: 'M003', quantity: 35,    lastUpdated: '2025-03-17', status: 'low'    },
  { warehouseId: 'W001', materialId: 'M004', quantity: 22,    lastUpdated: '2025-03-16', status: 'normal' },
  { warehouseId: 'W001', materialId: 'M005', quantity: 12000, lastUpdated: '2025-03-15', status: 'normal' },
  { warehouseId: 'W002', materialId: 'M001', quantity: 90,    lastUpdated: '2025-03-18', status: 'low'    },
  { warehouseId: 'W002', materialId: 'M002', quantity: 120,   lastUpdated: '2025-03-17', status: 'normal' },
  { warehouseId: 'W002', materialId: 'M006', quantity: 25,    lastUpdated: '2025-03-16', status: 'low'    },
  { warehouseId: 'W003', materialId: 'M003', quantity: 60,    lastUpdated: '2025-03-18', status: 'normal' },
  { warehouseId: 'W003', materialId: 'M004', quantity: 8,     lastUpdated: '2025-03-17', status: 'low'    },
];

const transactions = [
  { txnId: 'T001', warehouseId: 'W001', type: 'GRN', materialId: 'M001', quantity: 200, referenceNo: 'PO-2025-001', remarks: 'Received from vendor',   createdBy: 'U002', createdAt: '2025-03-10T09:00:00Z' },
  { txnId: 'T002', warehouseId: 'W001', type: 'MIN', materialId: 'M001', quantity: 50,  referenceNo: 'REQ-2025-003',remarks: 'Issued to site A',       createdBy: 'U002', createdAt: '2025-03-12T11:00:00Z' },
  { txnId: 'T003', warehouseId: 'W001', type: 'GRN', materialId: 'M002', quantity: 100, referenceNo: 'PO-2025-002', remarks: 'Received sand delivery',  createdBy: 'U002', createdAt: '2025-03-14T14:00:00Z' },
  { txnId: 'T004', warehouseId: 'W001', type: 'MIN', materialId: 'M002', quantity: 20,  referenceNo: 'REQ-2025-004',remarks: 'Issued to site B',       createdBy: 'U001', createdAt: '2025-03-15T10:00:00Z' },
  { txnId: 'T005', warehouseId: 'W002', type: 'GRN', materialId: 'M001', quantity: 150, referenceNo: 'PO-2025-003', remarks: 'Monthly stock replenish', createdBy: 'U002', createdAt: '2025-03-16T08:00:00Z' },
  { txnId: 'T006', warehouseId: 'W002', type: 'MIN', materialId: 'M001', quantity: 60,  referenceNo: 'REQ-2025-005',remarks: 'Issued to road work',    createdBy: 'U001', createdAt: '2025-03-18T09:30:00Z' },
];

const requisitions = [
  {
    requisitionId: 'REQ001', requisitionNo: 'REQ-2025-001', date: '2025-03-01',
    requestedBy: 'U001', warehouseId: 'W001', project: 'NH-16 Road Widening',
    priority: 'high', status: 'approved', approvedBy: 'U002',
    items: [
      { itemId: 'RI001', materialId: 'M001', quantity: 100, unit: 'bags', remarks: 'For foundation work' },
      { itemId: 'RI002', materialId: 'M004', quantity: 5,   unit: 'tons', remarks: 'For column reinforcement' },
    ]
  },
  {
    requisitionId: 'REQ002', requisitionNo: 'REQ-2025-002', date: '2025-03-05',
    requestedBy: 'U001', warehouseId: 'W002', project: 'Bridge Construction Jajpur',
    priority: 'medium', status: 'pending', approvedBy: null,
    items: [
      { itemId: 'RI003', materialId: 'M002', quantity: 30, unit: 'tons', remarks: 'For concrete mix' },
      { itemId: 'RI004', materialId: 'M003', quantity: 20, unit: 'tons', remarks: 'For concrete mix' },
    ]
  },
  {
    requisitionId: 'REQ003', requisitionNo: 'REQ-2025-003', date: '2025-03-10',
    requestedBy: 'U001', warehouseId: 'W001', project: 'School Building Bhadrak',
    priority: 'low', status: 'awaiting_procurement', approvedBy: 'U002',
    items: [
      { itemId: 'RI005', materialId: 'M005', quantity: 10000, unit: 'pieces', remarks: 'For brick masonry' },
    ]
  },
  {
    requisitionId: 'REQ004', requisitionNo: 'REQ-2025-004', date: '2025-03-15',
    requestedBy: 'U001', warehouseId: 'W003', project: 'NH-16 Road Widening',
    priority: 'high', status: 'rejected', approvedBy: 'U002',
    items: [
      { itemId: 'RI006', materialId: 'M006', quantity: 50, unit: 'tons', remarks: 'For sub-base layer' },
    ]
  },
];

const vendors = [
  { vendorId: 'V001', name: 'Odisha Cement Traders',   contactPerson: 'Bijoy Nayak',  email: 'bijoy@oct.com',  phone: '9437000001', address: 'Bhubaneswar', rating: 4.5, status: 'active'   },
  { vendorId: 'V002', name: 'Mahanadi Sand & Gravel',  contactPerson: 'Ravi Mohanty', email: 'ravi@msg.com',   phone: '9437000002', address: 'Cuttack',     rating: 4.0, status: 'active'   },
  { vendorId: 'V003', name: 'Tata Steel Distributors', contactPerson: 'Amit Das',     email: 'amit@tsd.com',   phone: '9437000003', address: 'Jajpur',      rating: 4.8, status: 'active'   },
  { vendorId: 'V004', name: 'Brick World Suppliers',   contactPerson: 'Sita Devi',    email: 'sita@bws.com',   phone: '9437000004', address: 'Khurda',      rating: 3.5, status: 'inactive' },
];

const purchaseOrders = [
  {
    poId: 'PO001', poNumber: 'PO-2025-001', date: '2025-03-02',
    vendorId: 'V001', requisitionId: 'REQ001', totalAmount: 80000,
    status: 'delivered', createdBy: 'U003',
    expectedDeliveryDate: '2025-03-08', actualDeliveryDate: '2025-03-09',
    items: [{ itemId: 'PI001', materialId: 'M001', quantity: 200, unitPrice: 400, totalPrice: 80000 }]
  },
  {
    poId: 'PO002', poNumber: 'PO-2025-002', date: '2025-03-07',
    vendorId: 'V002', requisitionId: 'REQ001', totalAmount: 85000,
    status: 'in_transit', createdBy: 'U003',
    expectedDeliveryDate: '2025-03-25', actualDeliveryDate: null,
    items: [
      { itemId: 'PI002', materialId: 'M002', quantity: 50, unitPrice: 1000, totalPrice: 50000 },
      { itemId: 'PI003', materialId: 'M003', quantity: 35, unitPrice: 1000, totalPrice: 35000 },
    ]
  },
  {
    poId: 'PO003', poNumber: 'PO-2025-003', date: '2025-03-12',
    vendorId: 'V003', requisitionId: 'REQ003', totalAmount: 175000,
    status: 'sent', createdBy: 'U003',
    expectedDeliveryDate: '2025-03-25', actualDeliveryDate: null,
    items: [{ itemId: 'PI004', materialId: 'M004', quantity: 10, unitPrice: 17500, totalPrice: 175000 }]
  },
];

const transfers = [
  {
    transferId: 'TR001', transferNo: 'TRF-2025-001', date: '2025-03-05',
    fromWarehouse: 'W001', toWarehouse: 'W002', status: 'completed',
    requestedBy: 'U001', approvedBy: 'U002',
    items: [{ itemId: 'TI001', materialId: 'M001', quantity: 50, unit: 'bags' }]
  },
  {
    transferId: 'TR002', transferNo: 'TRF-2025-002', date: '2025-03-16',
    fromWarehouse: 'W001', toWarehouse: 'W003', status: 'pending',
    requestedBy: 'U001', approvedBy: null,
    items: [
      { itemId: 'TI002', materialId: 'M004', quantity: 5,  unit: 'tons' },
      { itemId: 'TI003', materialId: 'M002', quantity: 20, unit: 'tons' },
    ]
  },
];

module.exports = { users, warehouses, materials, inventory, transactions, requisitions, vendors, purchaseOrders, transfers };