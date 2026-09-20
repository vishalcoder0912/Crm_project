// hello this is vishal project
import { Router } from 'express';
import authRouter from './auth.routes';
import usersRouter from './users.routes';
import rolesRouter from './roles.routes';
import permissionsRouter from './permissions.routes';
import customersRouter from './customers.routes';
import sitesRouter from './sites.routes';
import enquiriesRouter from './enquiries.routes';
import measurementsRouter from './measurements.routes';
import measurementItemsRouter from './measurement-items.routes';
import measurementSchedulesRouter from './measurement-schedules.routes';
import productsRouter from './products.routes';
import skusRouter from './skus.routes';
import vendorsRouter from './vendors.routes';
import quotationsRouter from './quotations.routes';
import ordersRouter from './orders.routes';
import inventoryRouter from './inventory.routes';
import stockRequestsRouter from './stockRequests.routes';
import purchaseOrdersRouter from './purchaseOrders.routes';
import goodsReceiptsRouter from './goodsReceipts.routes';
import tailoringRouter from './tailoring.routes';
import qcRouter from './qc.routes';
import packingRouter from './packing.routes';
import installationsRouter from './installations.routes';
import paymentsRouter from './payments.routes';
import resizingRouter from './resizing.routes';
import communicationsRouter from './communications.routes';
import notificationsRouter from './notifications.routes';
import auditRouter from './audit.routes';
import dashboardRouter from './dashboard.routes';
import branchesRouter from './branches.routes';
import followUpsRouter from './follow-ups.routes';
import fieldEmployeesRouter from './fieldEmployees.routes';
import vehiclesRouter from './vehicles.routes';
import searchRouter from './search.routes';

const router = Router();

const API = {
  'Auth & Users': {
    'POST /auth/login': 'Login (email + password)',
    'POST /auth/refresh': 'Refresh access token',
    'POST /auth/logout': 'Logout (auth)',
    'GET /auth/me': 'Current user + permissions (auth)',
    'GET/POST/PATCH/DELETE /users': 'User management (admin)',
    'GET /roles': 'List roles + assigned permissions',
    'GET /permissions': 'List all permissions',
  },
  'Customers & Sales': {
    'CRUD /customers': 'Customers with sites & assigned employee',
    'CRUD /sites': 'Customer drop/install sites',
    'CRUD /enquiries': 'Enquiries with line items',
    'POST /enquiries/:id/status': 'Enquiry state machine (NEW -> WON/LOST)',
    'CRUD /measurements': 'Measurement visits with items',
    'CRUD /measurement-items': 'Room/window measurements',
    'CRUD /measurement-schedules': 'Measurement visit schedules',
    'POST /measurement-schedules/:id/status': 'Schedule lifecycle',
  },
  'Quotations & Orders': {
    'CRUD /quotations': 'Quotations + auto version creation',
    'GET /quotations/:id/versions': 'All versions of a quotation',
    'POST /quotations/:id/versions': 'Create revision (R1, R2...)',
    'POST /quotations/:id/send': 'Send latest version -> SENT',
    'POST /quotations/:id/accept': 'Accept quote -> creates Order',
    'POST /quotations/:id/reject': 'Reject quote',
    'CRUD /orders': 'Orders with line items + payment status',
    'POST /orders/:id/status': 'Order state machine transition',
    'GET /orders/:id/status-history': 'Order status history',
    'POST /orders/:id/items': 'Add line item to order',
  },
  'Catalog & Vendors': {
    'CRUD /products': 'Product catalog (curtains, blinds, rods...)',
    'CRUD /skus': 'SKUs (prices, taxes, vendor)',
    'POST /skus/:id/price': 'Price change -> records PriceHistory',
    'GET /skus/:id/price-history': 'SKU price history',
    'GET /products/:id/skus': 'SKUs of a product',
    'CRUD /vendors': 'Vendor master',
  },
  'Inventory & Procurement': {
    'GET /inventory + POST /inventory/:id/adjust': 'Stock levels & adjustments',
    'CRUD /stock-requests': 'Stock requests linked to orders',
    'POST /stock-requests/:id/{submit,approve,issue,cancel}': 'Stock request workflow',
    'CRUD /purchase-orders': 'POs with items',
    'POST /purchase-orders/:id/{approve,send,complete}': 'PO workflow',
    'CRUD /goods-receipts': 'GRN receive -> updates PO + stock',
  },
  'Production & Field': {
    'CRUD /tailoring': 'Tailoring orders',
    'POST /tailoring/:id/{assign,start,complete}': 'Tailoring workflow',
    'CRUD /qc': 'QC inspections',
    'POST /qc/:id/apply': 'Apply PASS/FAIL to order item',
    'CRUD /packing + POST /packing': 'Packing slips with packets',
    'CRUD /installations': 'Installation jobs',
    'POST /installations/:id/{employees,assign,start,complete}': 'Field operations',
    'CRUD /resizing': 'Resizing / rectification requests',
    'POST /resizing/:id/status': 'Rework state machine',
  },
  'Finance & Intelligence': {
    'CRUD /payments': 'Payments against orders',
    'POST /payments/:id/{confirm,refund}': 'Payment confirmation',
    'CRUD /communications': 'WhatsApp/Email/SMS log',
    'GET /notifications': 'My notifications',
    'POST /notifications/read-all': 'Mark all read',
    'GET /audit': 'Audit log (admin)',
    'GET /dashboard/summary': 'Business KPIs, funnel, follow-ups, charts',
    'GET/POST/PATCH /follow-ups + POST /follow-ups/:id/complete': 'Sales follow-up tasks',
    'GET /follow-ups/stats': 'Follow-up bucket counts',
    'CRUD /branches': 'Branch master',
    'GET /search': 'Grouped global search',
  },
  'System': {
    'GET /health': 'Service health check',
    'GET /': 'API index (this page)',
  },
};

router.get('/', (_req, res) => {
  res.json({
    name: 'Digital Order & Operations Management System',
    version: '1.0.0',
    meta: {
      health: '/health',
      dashboard: '/dashboard/summary',
      defaultAdmin: 'admin@furnishops.com / Admin@123',
      defaultSales: 'sales@furnishops.com / Sales@123',
    },
    modules: API,
  });
});

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/roles', rolesRouter);
router.use('/permissions', permissionsRouter);
router.use('/customers', customersRouter);
router.use('/sites', sitesRouter);
router.use('/enquiries', enquiriesRouter);
router.use('/measurements', measurementsRouter);
router.use('/measurement-items', measurementItemsRouter);
router.use('/measurement-schedules', measurementSchedulesRouter);
router.use('/products', productsRouter);
router.use('/skus', skusRouter);
router.use('/vendors', vendorsRouter);
router.use('/quotations', quotationsRouter);
router.use('/orders', ordersRouter);
router.use('/inventory', inventoryRouter);
router.use('/stock-requests', stockRequestsRouter);
router.use('/purchase-orders', purchaseOrdersRouter);
router.use('/goods-receipts', goodsReceiptsRouter);
router.use('/tailoring', tailoringRouter);
router.use('/qc', qcRouter);
router.use('/packing', packingRouter);
router.use('/installations', installationsRouter);
router.use('/payments', paymentsRouter);
router.use('/resizing', resizingRouter);
router.use('/communications', communicationsRouter);
router.use('/notifications', notificationsRouter);
router.use('/audit', auditRouter);
router.use('/dashboard', dashboardRouter);
router.use('/branches', branchesRouter);
router.use('/follow-ups', followUpsRouter);
router.use('/field-employees', fieldEmployeesRouter);
router.use('/vehicles', vehiclesRouter);
router.use('/search', searchRouter);

export default router;