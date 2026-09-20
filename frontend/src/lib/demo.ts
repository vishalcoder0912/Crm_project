import { Session } from '../types';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const demoUsers = [
  { id: 1, firstName: 'Arjun', lastName: 'Mehta', email: 'arjun@furnishops.com', roleName: 'Admin', isActive: true, createdAt: daysAgo(120) },
  { id: 2, firstName: 'Sneha', lastName: 'Iyer', email: 'sneha@furnishops.com', roleName: 'Sales', isActive: true, createdAt: daysAgo(100) },
  { id: 3, firstName: 'Rahul', lastName: 'Desai', email: 'rahul@furnishops.com', roleName: 'Production', isActive: true, createdAt: daysAgo(90) },
  { id: 4, firstName: 'Priya', lastName: 'Nair', email: 'priya@furnishops.com', roleName: 'Installation', isActive: false, createdAt: daysAgo(60) },
  { id: 5, firstName: 'Vikram', lastName: 'Sharma', email: 'vikram@furnishops.com', roleName: 'Admin', isActive: true, createdAt: daysAgo(30) },
];

const demoCustomers = [
  { id: 1, businessId: 'CUS-0001', name: 'Kapoor Residence', phone: '+91 98200 11223', email: 'kapoor.living@gmail.com', city: 'Mumbai', type: 'Individual', leadSource: 'Referral', assignedEmployee: 'Sneha Iyer', createdAt: daysAgo(45) },
  { id: 2, businessId: 'CUS-0002', name: 'Blue Lotus Interiors', phone: '+91 98111 44556', email: 'sales@bluelotus.in', city: 'Pune', type: 'Firm', leadSource: 'Website', assignedEmployee: 'Sneha Iyer', createdAt: daysAgo(38) },
  { id: 3, businessId: 'CUS-0003', name: 'Mehta Family', phone: '+91 90040 77889', email: 'mehta.house@yahoo.in', city: 'Mumbai', type: 'Individual', leadSource: 'Walk-in', assignedEmployee: 'Arjun Mehta', createdAt: daysAgo(29) },
  { id: 4, businessId: 'CUS-0004', name: 'The Grand Hotel', phone: '+91 98339 22001', email: 'procurement@grandhotel.in', city: 'Goa', type: 'Firm', leadSource: 'Tender', assignedEmployee: 'Vikram Sharma', createdAt: daysAgo(22) },
  { id: 5, businessId: 'CUS-0005', name: 'Agarwal Villa', phone: '+91 97690 33445', email: 'agarwal.villa@hotmail.com', city: 'Navi Mumbai', type: 'Individual', leadSource: 'Referral', assignedEmployee: 'Rahul Desai', createdAt: daysAgo(14) },
  { id: 6, businessId: 'CUS-0006', name: 'Skyline Offices', phone: '+91 99875 66770', email: 'fm@skylineoffices.com', city: 'Mumbai', type: 'Firm', leadSource: 'Website', assignedEmployee: 'Priya Nair', createdAt: daysAgo(8) },
];

const demoEnquiries = [
  { id: 1, businessId: 'ENQ-0104', customerName: 'Kapoor Residence', productType: 'Full-height curtains', status: 'WON', budget: 85000, notes: 'Velvet drapes, 8 windows', createdAt: daysAgo(44) },
  { id: 2, businessId: 'ENQ-0105', customerName: 'Blue Lotus Interiors', productType: 'Motorised roller blinds', status: 'MEASURED', budget: 140000, notes: 'Showroom re-modelling', createdAt: daysAgo(36) },
  { id: 3, businessId: 'ENQ-0106', customerName: 'Mehta Family', productType: 'Blackout curtains', status: 'QUOTATION_SENT', budget: 42000, notes: 'Bedrooms + living room', createdAt: daysAgo(27) },
  { id: 4, businessId: 'ENQ-0107', customerName: 'The Grand Hotel', productType: 'Fire-retardant drapes', status: 'MEASUREMENT_PENDING', budget: 320000, notes: 'Lobby + 40 guest rooms', createdAt: daysAgo(20) },
  { id: 5, businessId: 'ENQ-0108', customerName: 'Agarwal Villa', productType: 'Wooden blinds', status: 'CONTACTED', budget: 65000, notes: 'Sundeck shutters', createdAt: daysAgo(12) },
  { id: 6, businessId: 'ENQ-0109', customerName: 'Skyline Offices', productType: 'Cubicle mesh blinds', status: 'NEW', budget: 95000, notes: '4th floor fit-out', createdAt: daysAgo(3) },
];

const demoQuotations = [
  { id: 1, businessId: 'QTN-0052', customerName: 'Kapoor Residence', version: 'R1', status: 'ACCEPTED', itemsCount: 8, totalAmount: 82640, validUntil: daysAgo(5), createdAt: daysAgo(25) },
  { id: 2, businessId: 'QTN-0053', customerName: 'Blue Lotus Interiors', version: 'R2', status: 'SENT', itemsCount: 24, totalAmount: 137800, validUntil: daysAgo(28), createdAt: daysAgo(14) },
  { id: 3, businessId: 'QTN-0054', customerName: 'Mehta Family', version: 'R1', status: 'SENT', itemsCount: 6, totalAmount: 41300, validUntil: daysAgo(20), createdAt: daysAgo(12) },
  { id: 4, businessId: 'QTN-0055', customerName: 'Agarwal Villa', version: 'R1', status: 'DRAFT', itemsCount: 9, totalAmount: 63850, validUntil: daysAgo(30), createdAt: daysAgo(4) },
  { id: 5, businessId: 'QTN-0056', customerName: 'The Grand Hotel', version: 'R1', status: 'DRAFT', itemsCount: 40, totalAmount: 318000, validUntil: daysAgo(32), createdAt: daysAgo(2) },
  { id: 6, businessId: 'QTN-0057', customerName: 'Skyline Offices', version: 'R0', status: 'REJECTED', itemsCount: 12, totalAmount: 88900, validUntil: daysAgo(9), createdAt: daysAgo(10) },
];

const demoOrders = [
  { id: 1, businessId: 'ORD-0031', customerName: 'Kapoor Residence', itemsCount: 8, totalAmount: 82640, advanceAmount: 25000, balanceAmount: 57640, status: 'DELIVERED', paymentStatus: 'PARTIAL', deliveryStatus: 'DELIVERED', createdAt: daysAgo(24) },
  { id: 2, businessId: 'ORD-0032', customerName: 'Blue Lotus Interiors', itemsCount: 24, totalAmount: 137800, advanceAmount: 40000, balanceAmount: 97800, status: 'CONFIRMED', paymentStatus: 'PARTIAL', deliveryStatus: 'PENDING', createdAt: daysAgo(13) },
  { id: 3, businessId: 'ORD-0033', customerName: 'Mehta Family', itemsCount: 6, totalAmount: 41300, advanceAmount: 15000, balanceAmount: 26300, status: 'IN_PRODUCTION', paymentStatus: 'PARTIAL', deliveryStatus: 'PENDING', createdAt: daysAgo(9) },
  { id: 4, businessId: 'ORD-0034', customerName: 'The Grand Hotel', itemsCount: 40, totalAmount: 318000, advanceAmount: 0, balanceAmount: 318000, status: 'CONFIRMED', paymentStatus: 'UNPAID', deliveryStatus: 'PENDING', createdAt: daysAgo(6) },
  { id: 5, businessId: 'ORD-0035', customerName: 'Agarwal Villa', itemsCount: 9, totalAmount: 63850, advanceAmount: 20000, balanceAmount: 43850, status: 'READY', paymentStatus: 'PARTIAL', deliveryStatus: 'READY', createdAt: daysAgo(3) },
  { id: 6, businessId: 'ORD-0036', customerName: 'Skyline Offices', itemsCount: 12, totalAmount: 88900, advanceAmount: 45000, balanceAmount: 43900, status: 'TAILORING', paymentStatus: 'PARTIAL', deliveryStatus: 'IN_PRODUCTION', createdAt: daysAgo(2) },
];

const demoPayments = [
  { id: 1, paymentNo: 'PAY-0101', orderBusinessId: 'ORD-0031', customerName: 'Kapoor Residence', amount: 25000, method: 'UPI', type: 'ADVANCE', status: 'CONFIRMED', paidAt: daysAgo(24) },
  { id: 2, paymentNo: 'PAY-0102', orderBusinessId: 'ORD-0032', customerName: 'Blue Lotus Interiors', amount: 40000, method: 'Bank Transfer', type: 'ADVANCE', status: 'CONFIRMED', paidAt: daysAgo(13) },
  { id: 3, paymentNo: 'PAY-0103', orderBusinessId: 'ORD-0031', customerName: 'Kapoor Residence', amount: 20000, method: 'Cheque', type: 'INSTALLMENT', status: 'PENDING', paidAt: daysAgo(3) },
  { id: 4, paymentNo: 'PAY-0104', orderBusinessId: 'ORD-0036', customerName: 'Skyline Offices', amount: 45000, method: 'UPI', type: 'ADVANCE', status: 'CONFIRMED', paidAt: daysAgo(2) },
  { id: 5, paymentNo: 'PAY-0105', orderBusinessId: 'ORD-0035', customerName: 'Agarwal Villa', amount: 20000, method: 'Credit Card', type: 'ADVANCE', status: 'CONFIRMED', paidAt: daysAgo(3) },
];

const demoProducts = [
  { id: 1, name: 'Supreme Velvet Drape', category: 'Curtains', material: 'Polyester Velvet', unit: 'Meter' },
  { id: 2, name: 'Classic Roller Blind', category: 'Blinds', material: 'Fabric 280gms', unit: 'Sq Meter' },
  { id: 3, name: 'Wooden Venetian', category: 'Blinds', material: 'Basswood', unit: 'Sq Meter' },
  { id: 4, name: 'Blackout Lining', category: 'Fabric', material: '3-pass Coated', unit: 'Meter' },
  { id: 5, name: 'Adjustable Curtain Rod', category: 'Hardware', material: 'Aluminium', unit: 'Piece' },
  { id: 6, name: 'Motorised Track System', category: 'Motorisation', material: 'SOMFY', unit: 'Set' },
];

const demoSkus = [
  { id: 1, sku: 'DRP-VLV-BRN', productName: 'Supreme Velvet Drape', vendorName: 'Sayona Fabrics', costPrice: 480, sellingPrice: 780, serviceCharge: 120, taxPercent: 18, unit: 'Meter', isActive: true },
  { id: 2, sku: 'BLM-RLR-WHT', productName: 'Classic Roller Blind', vendorName: 'Squint Blinds Co', costPrice: 620, sellingPrice: 990, serviceCharge: 150, taxPercent: 18, unit: 'Sq Meter', isActive: true },
  { id: 3, sku: 'BLM-VEN-TEAK', productName: 'Wooden Venetian', vendorName: 'Squint Blinds Co', costPrice: 840, sellingPrice: 1290, serviceCharge: 180, taxPercent: 18, unit: 'Sq Meter', isActive: true },
  { id: 4, sku: 'FBR-BLC-CHR', productName: 'Blackout Lining', vendorName: 'Sayona Fabrics', costPrice: 210, sellingPrice: 340, serviceCharge: 40, taxPercent: 18, unit: 'Meter', isActive: true },
  { id: 5, sku: 'HWD-ROD-28', productName: 'Adjustable Curtain Rod', vendorName: 'Metro Hardware', costPrice: 320, sellingPrice: 540, serviceCharge: 60, taxPercent: 18, unit: 'Piece', isActive: true },
  { id: 6, sku: 'MTR-SOMFY-IO', productName: 'Motorised Track System', vendorName: 'Metro Hardware', costPrice: 2400, sellingPrice: 3650, serviceCharge: 350, taxPercent: 18, unit: 'Set', isActive: true },
];

const demoInventory = [
  { id: 1, sku: 'DRP-VLV-BRN', productName: 'Supreme Velvet Drape', availableQty: 480, unit: 'Meter', location: 'Main Store', reorderLevel: 100 },
  { id: 2, sku: 'BLM-RLR-WHT', productName: 'Classic Roller Blind', availableQty: 160, unit: 'Sq Meter', location: 'Main Store', reorderLevel: 80 },
  { id: 3, sku: 'BLM-VEN-TEAK', productName: 'Wooden Venetian', availableQty: 24, unit: 'Sq Meter', location: 'Main Store', reorderLevel: 40 },
  { id: 4, sku: 'FBR-BLC-CHR', productName: 'Blackout Lining', availableQty: 1300, unit: 'Meter', location: 'Ground Floor', reorderLevel: 300 },
  { id: 5, sku: 'HWD-ROD-28', productName: 'Adjustable Curtain Rod', availableQty: 12, unit: 'Piece', location: 'Hardware Rack', reorderLevel: 25 },
  { id: 6, sku: 'MTR-SOMFY-IO', productName: 'Motorised Track System', availableQty: 6, unit: 'Set', location: 'Secure Store', reorderLevel: 10 },
];

const demoStockRequests = [
  { id: 1, businessId: 'SRQ-0021', orderBusinessId: 'ORD-0035', skuName: 'Supreme Velvet Drape', qty: 32, status: 'APPROVED', createdAt: daysAgo(2) },
  { id: 2, businessId: 'SRQ-0022', orderBusinessId: 'ORD-0036', skuName: 'Wooden Venetian', qty: 14, status: 'PENDING', createdAt: daysAgo(1) },
  { id: 3, businessId: 'SRQ-0023', orderBusinessId: 'ORD-0036', skuName: 'Adjustable Curtain Rod', qty: 12, status: 'ISSUED', createdAt: daysAgo(1) },
  { id: 4, businessId: 'SRQ-0024', orderBusinessId: 'ORD-0032', skuName: 'Classic Roller Blind', qty: 160, status: 'CANCELLED', createdAt: daysAgo(4) },
];

const demoPurchaseOrders = [
  { id: 1, businessId: 'PUR-0009', vendorName: 'Sayona Fabrics', status: 'APPROVED', itemsCount: 3, totalAmount: 482600, expectedDate: daysAgo(10), createdAt: daysAgo(15) },
  { id: 2, businessId: 'PUR-0010', vendorName: 'Squint Blinds Co', status: 'PARTIALLY_RECEIVED', itemsCount: 5, totalAmount: 642500, expectedDate: daysAgo(4), createdAt: daysAgo(18) },
  { id: 3, businessId: 'PUR-0011', vendorName: 'Metro Hardware', status: 'DRAFT', itemsCount: 2, totalAmount: 118000, expectedDate: daysAgo(20), createdAt: daysAgo(2) },
  { id: 4, businessId: 'PUR-0012', vendorName: 'Sayona Fabrics', status: 'SENT', itemsCount: 4, totalAmount: 386200, expectedDate: daysAgo(12), createdAt: daysAgo(6) },
];

const demoGoodsReceipts = [
  { id: 1, businessId: 'GRN-0006', poBusinessId: 'PUR-0009', vendorName: 'Sayona Fabrics', status: 'RECEIVED', itemsCount: 3, receivedAt: daysAgo(9) },
  { id: 2, businessId: 'GRN-0007', poBusinessId: 'PUR-0010', vendorName: 'Squint Blinds Co', status: 'PARTIAL', itemsCount: 2, receivedAt: daysAgo(3) },
];

const demoTailoring = [
  { id: 1, businessId: 'TLR-0007', orderBusinessId: 'ORD-0035', assignedTo: 'Rahul Desai', status: 'IN_PROGRESS', itemsCount: 6, createdAt: daysAgo(2) },
  { id: 2, businessId: 'TLR-0008', orderBusinessId: 'ORD-0036', assignedTo: 'Rahul Desai', status: 'PENDING', itemsCount: 12, createdAt: daysAgo(1) },
  { id: 3, businessId: 'TLR-0009', orderBusinessId: 'ORD-0032', assignedTo: 'Priya Nair', status: 'COMPLETED', itemsCount: 24, createdAt: daysAgo(6) },
];

const demoQc = [
  { id: 1, businessId: 'QCI-0004', tailoringBusinessId: 'TLR-0009', result: 'PASS', inspectedAt: daysAgo(5) },
  { id: 2, businessId: 'QCI-0005', tailoringBusinessId: 'TLR-0007', result: 'PENDING', inspectedAt: null },
  { id: 3, businessId: 'QCI-0006', tailoringBusinessId: 'TLR-0008', result: 'PENDING', inspectedAt: null },
];

const demoPacking = [
  { id: 1, businessId: 'PCK-0004', orderBusinessId: 'ORD-0031', status: 'PACKED', packets: 4, packedAt: daysAgo(2) },
  { id: 2, businessId: 'PCK-0005', orderBusinessId: 'ORD-0035', status: 'PACKED', packets: 3, packedAt: daysAgo(1) },
  { id: 3, businessId: 'PCK-0006', orderBusinessId: 'ORD-0036', status: 'DRAFT', packets: 2, packedAt: null },
];

const demoInstallations = [
  { id: 1, businessId: 'INS-0003', orderBusinessId: 'ORD-0031', customerName: 'Kapoor Residence', siteCity: 'Mumbai', scheduledDate: daysAgo(1), status: 'COMPLETED', assignedEmployees: ['Vikram Sharma', 'Rahul Desai'] },
  { id: 2, businessId: 'INS-0004', orderBusinessId: 'ORD-0035', customerName: 'Agarwal Villa', siteCity: 'Navi Mumbai', scheduledDate: daysAgo(2), status: 'SCHEDULED', assignedEmployees: ['Vikram Sharma'] },
  { id: 3, businessId: 'INS-0005', orderBusinessId: 'ORD-0036', customerName: 'Skyline Offices', siteCity: 'Mumbai', scheduledDate: null, status: 'IN_PROGRESS', assignedEmployees: ['Priya Nair', 'Vikram Sharma'] },
];

const demoResizing = [
  { id: 1, businessId: 'RSZ-0002', orderBusinessId: 'ORD-0031', reason: 'Curtain hem too long by 3cm', status: 'IN_PROGRESS', createdAt: daysAgo(4) },
  { id: 2, businessId: 'RSZ-0003', orderBusinessId: 'ORD-0035', reason: 'Width mismatch on roller blind', status: 'OPEN', createdAt: daysAgo(1) },
];

const demoNotifications = [
  { id: 1, title: 'Quote accepted', message: 'QTN-0052 accepted by Kapoor Residence — order ORD-0031 created.', type: 'ORDER_CREATED', read: false, createdAt: daysAgo(24) },
  { id: 2, title: 'Low stock alert', message: 'HWD-ROD-28 has only 12 units left.', type: 'LOW_STOCK', read: false, createdAt: daysAgo(1) },
  { id: 3, title: 'QC pending', message: 'TLR-0007 finished tailoring, QC inspection is pending.', type: 'QC_PENDING', read: true, createdAt: daysAgo(1) },
  { id: 4, title: 'New enquiry', message: 'ENQ-0109 from Skyline Offices (cubicle mesh blinds).', type: 'ENQUIRY', read: false, createdAt: daysAgo(3) },
];

function summary() {
  const confirmed = demoPayments.filter((p) => p.status === 'CONFIRMED').reduce((s, p) => s + p.amount, 0);
  const pb = (cnt: number, total: number) => (total ? Math.round((cnt / total) * 100) : 0);
  return {
    counts: {
      customers: demoCustomers.length,
      enquiries: demoEnquiries.length,
      openEnquiries: demoEnquiries.filter((e) => !['WON', 'LOST'].includes(e.status)).length,
      quotations: demoQuotations.length,
      acceptedQuotations: demoQuotations.filter((q) => q.status === 'ACCEPTED').length,
      orders: demoOrders.length,
      activeOrders: demoOrders.filter((o) => !['COMPLETED', 'CLOSED', 'DELIVERED'].includes(o.status)).length,
      deliveriesPending: demoOrders.filter((o) => o.deliveryStatus !== 'DELIVERED').length,
      activeUsers: demoUsers.filter((u) => u.isActive).length,
      pendingPayments: demoPayments.filter((p) => p.status === 'PENDING').length,
      lowStock: demoInventory.filter((s) => s.availableQty <= s.reorderLevel).length,
    },
    revenue: {
      confirmedPaymentTotal: confirmed,
      totalOrderValue: demoOrders.reduce((s, o) => s + o.totalAmount, 0),
      outstanding: demoOrders.reduce((s, o) => s + o.balanceAmount, 0),
      stockValue: demoInventory.reduce((s, i) => {
        const cost = demoSkus.find((k) => k.sku === i.sku)?.costPrice ?? 0;
        return s + i.availableQty * cost;
      }, 0),
      stockUnits: demoInventory.reduce((s, i) => s + Number(i.availableQty), 0),
      pipeline: demoQuotations.filter((q) => ['DRAFT', 'SENT'].includes(q.status)).reduce((s, q) => s + q.totalAmount, 0),
    },
    salesFunnel: ['NEW', 'CONTACTED', 'MEASUREMENT_PENDING', 'MEASURED', 'QUOTATION_SENT', 'WON'].map((st) => ({
      status: st,
      count: demoEnquiries.filter((e) => e.status === st).length,
    })),
    paymentBreakdown: {
      pending: demoPayments.filter((p) => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0),
      confirmed: confirmed,
    },
    recentOrders: demoOrders.slice(0, 6).map((o) => ({ ...o, customer: { name: o.customerName } })),
    lowStockItems: demoInventory
      .filter((s) => s.availableQty <= s.reorderLevel)
      .map((s) => ({ ...s, sku: { id: s.id, sku: s.sku, name: s.productName } })),
  };
}

const demoBranches = [
  { id: 1, businessId: 'BRN-0001', name: 'Head Office & Flagship Store', code: 'BLR-HQ', city: 'Bengaluru', isActive: true, _count: { customers: 18, users: 8, followUps: 12 } },
  { id: 2, businessId: 'BRN-0002', name: 'Bengaluru South Studio', code: 'BLR-JYN', city: 'Bengaluru', isActive: true, _count: { customers: 9, users: 4, followUps: 6 } },
  { id: 3, businessId: 'BRN-0003', name: 'Mangaluru Experience Center', code: 'IXE-MLR', city: 'Mangaluru', isActive: true, _count: { customers: 6, users: 3, followUps: 3 } },
];

const demoFieldEmployees = [
  { id: 1, businessId: 'EMP-0001', name: 'Vikram Sharma', role: 'Installer', phone: '+91 98450 11223', email: 'vikram.field@furnishops.com', isActive: true, _count: { installations: 6, vehicleTrips: 8 } },
  { id: 2, businessId: 'EMP-0002', name: 'Rahul Desai', role: 'Measurer', phone: '+91 98451 22334', email: 'rahul.field@furnishops.com', isActive: true, _count: { installations: 4, vehicleTrips: 6 } },
  { id: 3, businessId: 'EMP-0003', name: 'Priya Nair', role: 'Installer', phone: '+91 98452 33445', email: 'priya.field@furnishops.com', isActive: true, _count: { installations: 5, vehicleTrips: 5 } },
  { id: 4, businessId: 'EMP-0004', name: 'Suresh Kumar', role: 'Driver', phone: '+91 98453 44556', email: 'suresh.driver@furnishops.com', isActive: true, _count: { installations: 2, vehicleTrips: 12 } },
];

const demoVehicles = [
  {
    id: 1,
    businessId: 'VEH-0001',
    registrationNo: 'KA-01-MJ-2044',
    vehicleType: 'Tata Ace (Delivery Van)',
    assignedTeam: 'Central Installation Team',
    status: 'AVAILABLE',
    _count: { trips: 14, installations: 8 },
    trips: [
      { id: 1, purpose: 'Site delivery & curtains fitting', taskType: 'INSTALLATION', fieldEmployee: { name: 'Vikram Sharma' }, startTime: daysAgo(1) + 'T09:30:00Z', endTime: daysAgo(1) + 'T14:00:00Z' },
      { id: 2, purpose: 'Window measurement visit', taskType: 'MEASUREMENT', fieldEmployee: { name: 'Rahul Desai' }, startTime: daysAgo(2) + 'T10:00:00Z', endTime: daysAgo(2) + 'T12:30:00Z' },
    ],
  },
  {
    id: 2,
    businessId: 'VEH-0002',
    registrationNo: 'KA-05-NB-7821',
    vehicleType: 'Mahindra Bolero Maxi Truck',
    assignedTeam: 'Fabric & Hardware Logistics',
    status: 'IN_USE',
    _count: { trips: 22, installations: 11 },
    trips: [
      { id: 3, purpose: 'Track motor & blinds delivery', taskType: 'DELIVERY', fieldEmployee: { name: 'Suresh Kumar' }, startTime: daysAgo(0) + 'T08:00:00Z', endTime: daysAgo(0) + 'T16:00:00Z' },
    ],
  },
  {
    id: 3,
    businessId: 'VEH-0003',
    registrationNo: 'KA-03-HA-4419',
    vehicleType: 'Maruti Eeco Cargo',
    assignedTeam: 'Rapid Response & Resizing',
    status: 'AVAILABLE',
    _count: { trips: 9, installations: 4 },
    trips: [
      { id: 4, purpose: 'Hem rectification visit', taskType: 'RESIZING', fieldEmployee: { name: 'Rahul Desai' }, startTime: daysAgo(3) + 'T11:00:00Z', endTime: daysAgo(3) + 'T13:00:00Z' },
    ],
  },
];

const demoVendors = [
  { id: 1, name: 'Sayona Fabrics', code: 'SAY-TX', contactPerson: 'Nitin Patel', phone: '+91 98250 11990', email: 'orders@sayonafabrics.in' },
  { id: 2, name: 'Squint Blinds Co', code: 'SQN-BL', contactPerson: 'Alok Verma', phone: '+91 98110 55443', email: 'trade@squintblinds.com' },
  { id: 3, name: 'Metro Hardware & Motors', code: 'MTR-HW', contactPerson: 'Hitesh Shah', phone: '+91 98200 44321', email: 'sales@metrohardware.co.in' },
];

const demoCommunications = [
  { id: 1, businessId: 'COM-0001', type: 'WHATSAPP', direction: 'OUTBOUND', customerId: 1, customer: { id: 1, name: 'Kapoor Residence', phone: '+91 98200 11223' }, order: { businessId: 'ORD-0031' }, subject: 'Quotation QTN-0052 Sent', message: 'Hello Mr. Kapoor, please review your customized drape quotation QTN-0052.', deliveryStatus: 'DELIVERED', createdAt: daysAgo(25) },
  { id: 2, businessId: 'COM-0002', type: 'CALL', direction: 'INBOUND', customerId: 2, customer: { id: 2, name: 'Blue Lotus Interiors', phone: '+91 98111 44556' }, order: { businessId: 'ORD-0032' }, subject: 'Measurement confirmation', message: 'Discussed roller blind dimensions for Pune showroom site.', deliveryStatus: 'COMPLETED', createdAt: daysAgo(14) },
  { id: 3, businessId: 'COM-0003', type: 'EMAIL', direction: 'OUTBOUND', customerId: 3, customer: { id: 3, name: 'Mehta Family', phone: '+91 90040 77889' }, order: { businessId: 'ORD-0033' }, subject: 'Advance payment receipt', message: 'Thank you for your advance payment of ₹15,000 for order ORD-0033.', deliveryStatus: 'DELIVERED', createdAt: daysAgo(9) },
  { id: 4, businessId: 'COM-0004', type: 'WHATSAPP', direction: 'OUTBOUND', customerId: 4, customer: { id: 4, name: 'The Grand Hotel', phone: '+91 98339 22001' }, order: null, subject: 'Site measurement scheduled', message: 'Installation engineer Rahul Desai scheduled to visit site on Friday 10 AM.', deliveryStatus: 'DELIVERED', createdAt: daysAgo(4) },
];

const demoAudit = [
  { id: 1, action: 'CREATE', entityType: 'ORDER', entityId: 1, user: { firstName: 'Sneha', lastName: 'Iyer', email: 'sneha@furnishops.com' }, oldValue: null, newValue: JSON.stringify({ businessId: 'ORD-0031', totalAmount: 82640 }), ipAddress: '192.168.1.10', createdAt: daysAgo(24) },
  { id: 2, action: 'STATUS_CHANGE', entityType: 'ORDER', entityId: 1, user: { firstName: 'Arjun', lastName: 'Mehta', email: 'arjun@furnishops.com' }, oldValue: JSON.stringify({ status: 'CONFIRMED' }), newValue: JSON.stringify({ status: 'DELIVERED' }), ipAddress: '192.168.1.1', createdAt: daysAgo(1) },
  { id: 3, action: 'CREATE', entityType: 'PAYMENT', entityId: 1, user: { firstName: 'Arjun', lastName: 'Mehta', email: 'arjun@furnishops.com' }, oldValue: null, newValue: JSON.stringify({ paymentNo: 'PAY-0101', amount: 25000 }), ipAddress: '192.168.1.1', createdAt: daysAgo(24) },
  { id: 4, action: 'PRICE_CHANGE', entityType: 'SKU', entityId: 1, user: { firstName: 'Vikram', lastName: 'Sharma', email: 'vikram@furnishops.com' }, oldValue: JSON.stringify({ sellingPrice: 750 }), newValue: JSON.stringify({ sellingPrice: 780 }), ipAddress: '192.168.1.15', createdAt: daysAgo(10) },
];

const demoFollowUps = [
  { id: 1, businessId: 'FLW-0001', customerId: 1, customer: { id: 1, name: 'Kapoor Residence', phone: '+91 98200 11223' }, purpose: 'Quotation follow-up', channel: 'CALL', dueAt: daysAgo(1) + 'T10:00:00Z', priority: 'HIGH', status: 'PENDING', assignedTo: { firstName: 'Sneha', lastName: 'Iyer' }, notes: 'Follow up on fabric selection', createdAt: daysAgo(3) },
  { id: 2, businessId: 'FLW-0002', customerId: 2, customer: { id: 2, name: 'Blue Lotus Interiors', phone: '+91 98111 44556' }, purpose: 'Payment reminder', channel: 'WHATSAPP', dueAt: new Date().toISOString().slice(0, 10) + 'T14:00:00Z', priority: 'HIGH', status: 'PENDING', assignedTo: { firstName: 'Sneha', lastName: 'Iyer' }, notes: 'Balance payment due before installation', createdAt: daysAgo(2) },
  { id: 3, businessId: 'FLW-0003', customerId: 3, customer: { id: 3, name: 'Mehta Family', phone: '+91 90040 77889' }, purpose: 'Installation confirmation', channel: 'CALL', dueAt: new Date(Date.now() + 86400000).toISOString(), priority: 'MEDIUM', status: 'PENDING', assignedTo: { firstName: 'Rahul', lastName: 'Desai' }, notes: 'Confirm time for living room rod fitting', createdAt: daysAgo(1) },
  { id: 4, businessId: 'FLW-0004', customerId: 4, customer: { id: 4, name: 'The Grand Hotel', phone: '+91 98339 22001' }, purpose: 'Price negotiation', channel: 'VISIT', dueAt: new Date(Date.now() + 172800000).toISOString(), priority: 'HIGH', status: 'PENDING', assignedTo: { firstName: 'Arjun', lastName: 'Mehta' }, notes: 'Meet procurement committee for bulk hotel quote', createdAt: daysAgo(1) },
  { id: 5, businessId: 'FLW-0005', customerId: 5, customer: { id: 5, name: 'Agarwal Villa', phone: '+91 97690 33445' }, purpose: 'Measurement confirmation', channel: 'CALL', dueAt: daysAgo(4) + 'T11:00:00Z', priority: 'MEDIUM', status: 'COMPLETED', assignedTo: { firstName: 'Rahul', lastName: 'Desai' }, notes: 'Measurement completed on terrace', createdAt: daysAgo(5) },
];

const stores: Record<string, any[]> = {
  '/customers': demoCustomers,
  '/enquiries': demoEnquiries,
  '/quotations': demoQuotations,
  '/orders': demoOrders,
  '/payments': demoPayments,
  '/products': demoProducts,
  '/skus': demoSkus,
  '/inventory': demoInventory,
  '/stock-requests': demoStockRequests,
  '/purchase-orders': demoPurchaseOrders,
  '/goods-receipts': demoGoodsReceipts,
  '/tailoring': demoTailoring,
  '/qc': demoQc,
  '/packing': demoPacking,
  '/installations': demoInstallations,
  '/resizing': demoResizing,
  '/users': demoUsers,
  '/notifications': demoNotifications,
  '/branches': demoBranches,
  '/field-employees': demoFieldEmployees,
  '/vehicles': demoVehicles,
  '/vendors': demoVendors,
  '/communications': demoCommunications,
  '/audit': demoAudit,
  '/follow-ups': demoFollowUps,
};

export function demoSearch(q: string) {
  const term = (q || '').trim().toLowerCase();
  if (!term) return { groups: [] };

  const hitsCustomers = demoCustomers
    .filter((c) => c.name.toLowerCase().includes(term) || c.businessId.toLowerCase().includes(term) || c.phone.includes(term))
    .slice(0, 4)
    .map((c) => ({
      id: c.id,
      businessId: c.businessId,
      title: c.name,
      subtitle: `${c.city || ''} · ${c.phone}`,
      route: `/customers/${c.id}`,
    }));

  const hitsOrders = demoOrders
    .filter((o) => o.businessId.toLowerCase().includes(term) || (o.customerName && o.customerName.toLowerCase().includes(term)))
    .slice(0, 4)
    .map((o) => ({
      id: o.id,
      businessId: o.businessId,
      title: o.businessId,
      subtitle: `${o.customerName} · ${o.status}`,
      route: `/orders?open=${o.businessId}`,
    }));

  const hitsEnquiries = demoEnquiries
    .filter((e) => e.businessId.toLowerCase().includes(term) || (e.customerName && e.customerName.toLowerCase().includes(term)))
    .slice(0, 4)
    .map((e) => ({
      id: e.id,
      businessId: e.businessId,
      title: e.businessId,
      subtitle: `${e.customerName} · ${e.status}`,
      route: `/enquiries`,
    }));

  const hitsQuotations = demoQuotations
    .filter((q) => q.businessId.toLowerCase().includes(term) || (q.customerName && q.customerName.toLowerCase().includes(term)))
    .slice(0, 4)
    .map((q) => ({
      id: q.id,
      businessId: q.businessId,
      title: q.businessId,
      subtitle: `${q.customerName} · ${q.status}`,
      route: `/quotations`,
    }));

  const groups: any[] = [];
  if (hitsCustomers.length) groups.push({ type: 'Customers', icon: 'customers', items: hitsCustomers });
  if (hitsOrders.length) groups.push({ type: 'Orders', icon: 'orders', items: hitsOrders });
  if (hitsEnquiries.length) groups.push({ type: 'Enquiries', icon: 'enquiries', items: hitsEnquiries });
  if (hitsQuotations.length) groups.push({ type: 'Quotations', icon: 'quotations', items: hitsQuotations });

  return { groups };
}

export function demoGet(path: string): any {
  const clean = path.split('?')[0];
  if (clean === '/dashboard/summary') return summary();
  if (clean === '/roles') return [{ id: 1, name: 'Admin' }, { id: 2, name: 'Sales' }, { id: 3, name: 'Production' }, { id: 4, name: 'Installation' }];
  if (clean === '/permissions') {
    return [
      { module: 'customers', action: 'read', code: 'customers.read' },
      { module: 'customers', action: 'create', code: 'customers.create' },
      { module: 'customers', action: 'update', code: 'customers.update' },
      { module: 'customers', action: 'delete', code: 'customers.delete' },
      { module: 'orders', action: 'read', code: 'orders.read' },
      { module: 'orders', action: 'create', code: 'orders.create' },
      { module: 'orders', action: 'update', code: 'orders.update' },
      { module: 'quotations', action: 'read', code: 'quotations.read' },
      { module: 'quotations', action: 'create', code: 'quotations.create' },
      { module: 'quotations', action: 'approve', code: 'quotations.approve' },
      { module: 'inventory', action: 'read', code: 'inventory.read' },
      { module: 'tailoring', action: 'read', code: 'tailoring.read' },
      { module: 'installations', action: 'read', code: 'installations.read' },
      { module: 'reports', action: 'read', code: 'reports.read' },
    ];
  }
  if (clean === '/follow-ups/stats') {
    return { overdue: 1, today: 1, upcoming: 2, completedThisWeek: 1 };
  }

  const prefix = '/' + clean.split('/')[1];
  const rows = stores[prefix];
  if (!rows) return [];
  const match = clean.match(/\/(\d+)/);
  if (match) {
    return rows.find((r) => String(r.id) === match[1]) ?? null;
  }
  return rows;
}

export function demoPost(path: string, body?: any): any {
  const clean = path.split('?')[0];
  if (clean === '/follow-ups/complete' || clean.endsWith('/complete')) {
    return { success: true };
  }
  const prefix = '/' + clean.split('/')[1];
  const rows = stores[prefix];
  const id = Date.now();
  const prefixLabel = prefix.replace('/', '').replace(/-/g, '_').toUpperCase();
  const record = {
    ...(body ?? {}),
    id,
    businessId: `${prefixLabel}-${String(id).slice(-4)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (rows) rows.unshift(record);
  return record;
}

export function demoPatch(path: string, body?: any): any {
  const clean = path.split('?')[0];
  const prefix = '/' + clean.split('/')[1];
  const rows = stores[prefix];
  const match = clean.match(/\/(\d+)/);
  if (rows && match) {
    const id = Number(match[1]);
    const idx = rows.findIndex((r) => String(r.id) === String(id));
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...(body ?? {}), id, updatedAt: new Date().toISOString() };
      return rows[idx];
    }
  }
  return { ...(body ?? {}), id: Number(match?.[1] ?? Date.now()) };
}

export function demoDelete(path: string): any {
  const clean = path.split('?')[0];
  const prefix = '/' + clean.split('/')[1];
  const rows = stores[prefix];
  const match = clean.match(/\/(\d+)/);
  if (rows && match) {
    const id = Number(match[1]);
    const idx = rows.findIndex((r) => String(r.id) === String(id));
    if (idx >= 0) rows.splice(idx, 1);
  }
  return { success: true };
}

export function demoLogin(): Session {
  return {
    accessToken: 'demo-token',
    refreshToken: 'demo-refresh',
    user: {
      id: 1,
      firstName: 'Arjun',
      lastName: 'Mehta',
      email: 'admin@furnishops.com',
      roleName: 'Admin',
      permissions: ['*'],
    },
    demo: true,
  };
}