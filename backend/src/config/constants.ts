// hello this is vishal project
// =============================================================================
// Business Constants & Enums
// =============================================================================

export const ENQUIRY_STATUS = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  MEASUREMENT_PENDING: 'MEASUREMENT_PENDING',
  MEASURED: 'MEASURED',
  QUOTATION_PENDING: 'QUOTATION_PENDING',
  QUOTATION_SENT: 'QUOTATION_SENT',
  WON: 'WON',
  LOST: 'LOST',
} as const;

export const LOST_REASONS = [
  'Price',
  'Customer cancelled',
  'Competitor',
  'Product unavailable',
  'Timeline',
  'Customer unreachable',
  'Other',
] as const;

export const ORDER_STATUS = {
  CONFIRMED: 'CONFIRMED',
  PROCUREMENT_PENDING: 'PROCUREMENT_PENDING',
  MATERIAL_AVAILABLE: 'MATERIAL_AVAILABLE',
  TAILORING: 'TAILORING',
  READY_FOR_QC: 'READY_FOR_QC',
  QC_FAILED: 'QC_FAILED',
  QC_PASSED: 'QC_PASSED',
  PACKED: 'PACKED',
  INSTALLATION_SCHEDULED: 'INSTALLATION_SCHEDULED',
  INSTALLATION_IN_PROGRESS: 'INSTALLATION_IN_PROGRESS',
  PARTIALLY_DELIVERED: 'PARTIALLY_DELIVERED',
  DELIVERED: 'DELIVERED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
} as const;

export const ORDER_ITEM_STATUS = {
  PENDING: 'PENDING',
  PROCUREMENT_PENDING: 'PROCUREMENT_PENDING',
  MATERIAL_AVAILABLE: 'MATERIAL_AVAILABLE',
  TAILORING: 'TAILORING',
  QC_PENDING: 'QC_PENDING',
  QC_PASSED: 'QC_PASSED',
  QC_FAILED: 'QC_FAILED',
  PACKED: 'PACKED',
  INSTALLED: 'INSTALLED',
  RESIZING: 'RESIZING',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
} as const;

export const DELIVERY_STATUS = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  DELIVERED: 'DELIVERED',
} as const;

export const QUOTATION_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  NEGOTIATION: 'NEGOTIATION',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

export const QUOTATION_VERSION_STATUS = {
  DRAFT: 'DRAFT',
  FINALIZED: 'FINALIZED',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  SUPERSEDED: 'SUPERSEDED',
} as const;

export const STOCK_REQUEST_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  ISSUED: 'ISSUED',
  COMPLETED: 'COMPLETED',
} as const;

export const PO_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  SENT: 'SENT',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  FULLY_RECEIVED: 'FULLY_RECEIVED',
  CLOSED: 'CLOSED',
} as const;

export const TAILORING_STATUS = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  IN_PRODUCTION: 'IN_PRODUCTION',
  COMPLETED: 'COMPLETED',
  DISPATCHED: 'DISPATCHED',
} as const;

export const QC_RESULT = {
  PASS: 'PASS',
  FAIL: 'FAIL',
} as const;

export const INSTALLATION_STATUS = {
  SCHEDULED: 'SCHEDULED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DELAYED: 'DELAYED',
  CANCELLED: 'CANCELLED',
} as const;

export const MEASUREMENT_STATUS = {
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export const MATERIAL_STATUS = {
  WAREHOUSE: 'WAREHOUSE',
  ISSUED_TO_TAILORING: 'ISSUED_TO_TAILORING',
  AT_TAILORING: 'AT_TAILORING',
  PRODUCTION_COMPLETED: 'PRODUCTION_COMPLETED',
  DISPATCHED: 'DISPATCHED',
  STORE: 'STORE',
} as const;

export const RESIZING_REASONS = [
  'Wrong measurement',
  'Wrong stitching',
  'Installation issue',
  'Customer requirement changed',
  'Other',
] as const;

export const RESIZING_STATUS = {
  CREATED: 'CREATED',
  TAILORING: 'TAILORING',
  QC: 'QC',
  PACKED: 'PACKED',
  REINSTALLATION_SCHEDULED: 'REINSTALLATION_SCHEDULED',
  COMPLETED: 'COMPLETED',
} as const;

export const FOLLOWUP_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const FOLLOWUP_PRIORITY = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export const FOLLOWUP_CHANNEL = {
  CALL: 'CALL',
  WHATSAPP: 'WHATSAPP',
  EMAIL: 'EMAIL',
  VISIT: 'VISIT',
} as const;

export const FOLLOWUP_PURPOSES = [
  'Quotation follow-up',
  'Measurement confirmation',
  'Price negotiation',
  'Payment reminder',
  'Installation confirmation',
  'Requotation discussion',
  'General enquiry follow-up',
] as const;

export const PAYMENT_TYPE = {
  ADVANCE: 'ADVANCE',
  PARTIAL: 'PARTIAL',
  FULL: 'FULL',
  BALANCE: 'BALANCE',
} as const;

export const PAYMENT_METHOD = {
  CASH: 'CASH',
  UPI: 'UPI',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CHEQUE: 'CHEQUE',
  CARD: 'CARD',
} as const;

export const COMMUNICATION_TYPE = {
  WHATSAPP: 'WHATSAPP',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  CALL: 'CALL',
  NOTE: 'NOTE',
} as const;

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  PRICE_CHANGE: 'PRICE_CHANGE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
} as const;

export const PRODUCT_CATEGORIES = [
  'Curtains',
  'Blinds',
  'Rods',
  'Accessories',
  'Services',
] as const;

export const BUSINESS_ID_PREFIXES: Record<string, string> = {
  user: 'USR',
  customer: 'CUS',
  vendor: 'VND',
  enquiry: 'ENQ',
  measurement: 'MSR',
  quotation: 'QUO',
  order: 'ORD',
  stockRequest: 'STK',
  purchaseOrder: 'PO',
  goodsReceipt: 'GRN',
  tailoringOrder: 'TLR',
  qcInspection: 'QC',
  packingSlip: 'PKG',
  installation: 'INS',
  payment: 'PAY',
  resizingRequest: 'RSZ',
  fieldEmployee: 'FLD',
  vehicle: 'VEH',
  followUp: 'FUP',
  branch: 'BR',
};

// Order status valid transitions (state machine)
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  CONFIRMED: ['PROCUREMENT_PENDING', 'MATERIAL_AVAILABLE'],
  PROCUREMENT_PENDING: ['MATERIAL_AVAILABLE'],
  MATERIAL_AVAILABLE: ['TAILORING'],
  TAILORING: ['READY_FOR_QC'],
  READY_FOR_QC: ['QC_PASSED', 'QC_FAILED'],
  QC_FAILED: ['TAILORING'],
  QC_PASSED: ['PACKED'],
  PACKED: ['INSTALLATION_SCHEDULED'],
  INSTALLATION_SCHEDULED: ['INSTALLATION_IN_PROGRESS'],
  INSTALLATION_IN_PROGRESS: ['PARTIALLY_DELIVERED', 'DELIVERED'],
  PARTIALLY_DELIVERED: ['DELIVERED', 'INSTALLATION_SCHEDULED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: ['CLOSED'],
};

// Permissions by module
export const PERMISSIONS = {
  // Auth
  'auth.login': 'Login to the system',
  // Users
  'users.read': 'View users',
  'users.create': 'Create users',
  'users.update': 'Update users',
  'users.delete': 'Delete users',
  // Customers
  'customers.read': 'View customers',
  'customers.create': 'Create customers',
  'customers.update': 'Update customers',
  'customers.delete': 'Delete customers',
  // Enquiries
  'enquiries.read': 'View enquiries',
  'enquiries.create': 'Create enquiries',
  'enquiries.update': 'Update enquiries',
  'enquiries.delete': 'Delete enquiries',
  // Measurements
  'measurements.read': 'View measurements',
  'measurements.create': 'Create measurements',
  'measurements.update': 'Update measurements',
  'measurements.delete': 'Delete measurements',
  // Products
  'products.read': 'View products',
  'products.create': 'Create products',
  'products.update': 'Update products',
  'products.delete': 'Delete products',
  // SKUs
  'skus.read': 'View SKUs',
  'skus.create': 'Create SKUs',
  'skus.update': 'Update SKUs',
  'skus.update_price': 'Update SKU prices',
  'skus.delete': 'Delete SKUs',
  // Vendors
  'vendors.read': 'View vendors',
  'vendors.create': 'Create vendors',
  'vendors.update': 'Update vendors',
  'vendors.delete': 'Delete vendors',
  // Quotations
  'quotations.read': 'View quotations',
  'quotations.create': 'Create quotations',
  'quotations.update': 'Update quotations',
  'quotations.approve': 'Approve quotations',
  'quotations.delete': 'Delete quotations',
  // Orders
  'orders.read': 'View orders',
  'orders.create': 'Create orders',
  'orders.update': 'Update orders',
  'orders.approve': 'Approve orders',
  'orders.delete': 'Delete orders',
  // Inventory
  'inventory.read': 'View inventory',
  'inventory.update': 'Update inventory',
  // Stock Requests
  'stock_requests.read': 'View stock requests',
  'stock_requests.create': 'Create stock requests',
  'stock_requests.approve': 'Approve stock requests',
  // Purchase Orders
  'purchase_orders.read': 'View purchase orders',
  'purchase_orders.create': 'Create purchase orders',
  'purchase_orders.update': 'Update purchase orders',
  'purchase_orders.approve': 'Approve purchase orders',
  // Goods Receipts
  'goods_receipts.read': 'View goods receipts',
  'goods_receipts.create': 'Create goods receipts',
  // Tailoring
  'tailoring.read': 'View tailoring orders',
  'tailoring.create': 'Create tailoring orders',
  'tailoring.update': 'Update tailoring orders',
  // QC
  'qc.read': 'View QC inspections',
  'qc.create': 'Create QC inspections',
  // Packing
  'packing.read': 'View packing slips',
  'packing.create': 'Create packing slips',
  // Installations
  'installations.read': 'View installations',
  'installations.create': 'Create installations',
  'installations.update': 'Update installations',
  // Payments
  'payments.read': 'View payments',
  'payments.create': 'Create payments',
  'payments.update': 'Update payments',
  // Resizing
  'resizing.read': 'View resizing requests',
  'resizing.create': 'Create resizing requests',
  'resizing.update': 'Update resizing requests',
  // Communications
  'communications.read': 'View communications',
  'communications.create': 'Create communications',
  // Follow-ups
  'follow_ups.read': 'View follow-ups',
  'follow_ups.create': 'Create follow-ups',
  'follow_ups.update': 'Update follow-ups',
  // Branches
  'branches.read': 'View branches',
  'branches.create': 'Create branches',
  'branches.update': 'Update branches',
  'branches.delete': 'Delete branches',
  // Reports
  'reports.read': 'View reports',
  // Audit
  'audit.read': 'View audit logs',
  // Notifications
  'notifications.read': 'View notifications',
  'notifications.manage': 'Manage notification settings',
  // Administration
  'admin.roles': 'Manage roles and permissions',
  'admin.settings': 'Manage system settings',
} as const;

// Role → Permission mappings
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: Object.keys(PERMISSIONS),
  'Sales / Enquiry User': [
    'customers.read', 'customers.create', 'customers.update',
    'enquiries.read', 'enquiries.create', 'enquiries.update',
    'measurements.read',
    'quotations.read', 'quotations.create', 'quotations.update',
    'orders.read',
    'communications.read', 'communications.create',
    'follow_ups.read', 'follow_ups.create', 'follow_ups.update',
    'branches.read',
    'reports.read',
    'notifications.read',
  ],
  'Order Manager': [
    'customers.read',
    'enquiries.read',
    'measurements.read',
    'quotations.read', 'quotations.approve',
    'orders.read', 'orders.create', 'orders.update', 'orders.approve',
    'inventory.read',
    'stock_requests.read', 'stock_requests.create', 'stock_requests.approve',
    'purchase_orders.read',
    'tailoring.read',
    'qc.read',
    'packing.read',
    'installations.read',
    'payments.read',
    'resizing.read',
    'communications.read', 'communications.create',
    'follow_ups.read', 'follow_ups.create', 'follow_ups.update',
    'branches.read',
    'reports.read',
    'notifications.read',
  ],
  'Measurement Team': [
    'customers.read',
    'enquiries.read',
    'measurements.read', 'measurements.create', 'measurements.update',
    'follow_ups.read',
    'branches.read',
    'notifications.read',
  ],
  'Warehouse User': [
    'inventory.read', 'inventory.update',
    'stock_requests.read', 'stock_requests.create',
    'goods_receipts.read', 'goods_receipts.create',
    'products.read', 'skus.read',
    'orders.read',
    'notifications.read',
  ],
  'Procurement User': [
    'purchase_orders.read', 'purchase_orders.create', 'purchase_orders.update',
    'vendors.read', 'vendors.create', 'vendors.update',
    'goods_receipts.read', 'goods_receipts.create',
    'inventory.read',
    'skus.read',
    'orders.read',
    'notifications.read',
  ],
  'Tailoring User': [
    'tailoring.read', 'tailoring.update',
    'orders.read',
    'measurements.read',
    'notifications.read',
  ],
  'QC User': [
    'qc.read', 'qc.create',
    'tailoring.read',
    'orders.read',
    'resizing.create',
    'notifications.read',
  ],
  'Installation / Field Team': [
    'installations.read', 'installations.update',
    'customers.read',
    'orders.read',
    'packing.read',
    'notifications.read',
  ],
  'Finance User': [
    'payments.read', 'payments.create', 'payments.update',
    'orders.read',
    'customers.read',
    'follow_ups.read', 'follow_ups.create',
    'branches.read',
    'reports.read',
    'notifications.read',
  ],
};
