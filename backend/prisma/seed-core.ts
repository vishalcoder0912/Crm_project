// hello this is vishal project
import { PrismaClient } from '@prisma/client';
import { d, r2 } from './seed-helpers';
import type { SeedContext, SkuPrice } from './seed-helpers';

const pad = (n: number, len = 4) => String(n).padStart(len, '0');

export async function wipeBusinessData(prisma: PrismaClient): Promise<void> {
  await prisma.followUp.deleteMany();
  await prisma.packetItem.deleteMany();
  await prisma.packet.deleteMany();
  await prisma.packingSlip.deleteMany();
  await prisma.qCInspection.deleteMany();
  await prisma.resizingRequest.deleteMany();
  await prisma.tailoringOrder.deleteMany();
  await prisma.installationEmployee.deleteMany();
  await prisma.fieldEmployeeTracking.deleteMany();
  await prisma.vehicleTrip.deleteMany();
  await prisma.installation.deleteMany();
  await prisma.goodsReceiptItem.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockRequest.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quotation.updateMany({ data: { acceptedVersionId: null } });
  await prisma.quotationItem.deleteMany();
  await prisma.quotationVersion.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.measurementSchedule.deleteMany();
  await prisma.measurementItem.deleteMany();
  await prisma.measurement.deleteMany();
  await prisma.enquiryItem.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.sKU.deleteMany();
  await prisma.product.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.site.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.updateMany({ data: { branchId: null } });
  await prisma.branch.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.fieldEmployee.deleteMany();
}

export async function seedCore(
  prisma: PrismaClient,
  users: Record<string, number>
): Promise<SeedContext> {
  // ---- Vendors ----
  const vendorSeeds = [
    { key: 'fabrics', name: 'Shree Fabrics Pvt Ltd', contactPerson: 'Rajesh Kumar', phone: '9810011122', email: 'sales@shreefabrics.in', address: '142 Textile Market, Panipat, Haryana', gstNumber: '06AABCS1234F1Z5', paymentTerms: '30% advance, 70% on delivery' },
    { key: 'blinds', name: 'Elegant Blinds India', contactPerson: 'Meena Sharma', phone: '9820033344', email: 'orders@elegantblinds.in', address: 'Plot 22, Okhla Phase II, New Delhi', gstNumber: '07AACCE9876P1Z2', paymentTerms: 'Net 15' },
    { key: 'rods', name: 'Metro Hardware & Rods', contactPerson: 'Imran Sheikh', phone: '9891055566', email: 'metro.hardware@gmail.com', address: 'Shop 8, Sadar Bazaar, Delhi', gstNumber: '07AAECM4567R1Z9', paymentTerms: 'Cash on delivery' },
    { key: 'vinyl', name: 'Vinyl Craft Solutions', contactPerson: 'Deepak Nair', phone: '9744077788', email: 'deepak@vinylcraft.in', address: '45 Industrial Estate, Kochi, Kerala', gstNumber: '32AABCV3344L1Z1', paymentTerms: 'Net 30' },
    { key: 'soft', name: 'Soft Furnishings Warehouse', contactPerson: 'Anita Rao', phone: '9900099900', email: 'anita@softfurnish.in', address: '12 Rajajinagar, Bengaluru', gstNumber: '29AAGCS5566K1Z3', paymentTerms: 'Net 20' },
    { key: 'track', name: 'Precision Track Systems', contactPerson: 'Vikram Singh', phone: '9611122233', email: 'vikram@precisiontrack.in', address: '77 GIDC, Ahmedabad, Gujarat', gstNumber: '24AAHCP7788M1Z7', paymentTerms: '50% advance' },
  ];
  const vendorIds: Record<string, number> = {};
  for (let i = 0; i < vendorSeeds.length; i++) {
    const v = vendorSeeds[i];
    const created = await prisma.vendor.create({
      data: {
        businessId: `VND-${pad(i + 1)}`,
        name: v.name,
        contactPerson: v.contactPerson,
        phone: v.phone,
        email: v.email,
        address: v.address,
        gstNumber: v.gstNumber,
        paymentTerms: v.paymentTerms,
      },
    });
    vendorIds[v.key] = created.id;
  }

  // ---- Products ----
  const productSeeds = [
    { key: 'blackout', name: 'Blackout Curtain', category: 'Curtains', productType: 'Eyelet', description: 'Triple-weave blackout fabric curtain' },
    { key: 'sheer', name: 'Sheer Curtain', category: 'Curtains', productType: 'Pinch Pleat', description: 'Light diffusing sheer curtain' },
    { key: 'linen', name: 'Linen Curtain', category: 'Curtains', productType: 'Rod Pocket', description: 'Natural linen blend curtain' },
    { key: 'roman', name: 'Roman Blind', category: 'Blinds', productType: 'Fold', description: 'Fabric roman blind with folds' },
    { key: 'roller', name: 'Roller Blind', category: 'Blinds', productType: 'Sunscreen', description: 'Sunscreen roller blind' },
    { key: 'zebra', name: 'Zebra Blind', category: 'Blinds', productType: 'Dual Layer', description: 'Day-night dual layer blind' },
    { key: 'wooden', name: 'Wooden Blind', category: 'Blinds', productType: '50mm Slat', description: 'Basswood slat venetian blind' },
    { key: 'curtain-rod', name: 'Curtain Rod', category: 'Rods', productType: 'Single', description: 'Powder coated steel curtain rod' },
    { key: 'double-rod', name: 'Double Curtain Rod', category: 'Rods', productType: 'Double', description: 'Twin rod for sheer + main curtain' },
    { key: 'track', name: 'Motorized Track', category: 'Rods', productType: 'Motorized', description: 'Remote operated curtain track' },
    { key: 'hardware', name: 'Curtain Hardware Set', category: 'Accessories', productType: 'Brackets', description: 'Brackets, finials and rings set' },
    { key: 'install', name: 'Installation Service', category: 'Services', productType: 'On-site', description: 'Professional on-site installation' },
  ];
  const productIds: Record<string, number> = {};
  const productIdList: number[] = [];
  for (const p of productSeeds) {
    const created = await prisma.product.create({
      data: { name: p.name, category: p.category, productType: p.productType, description: p.description },
    });
    productIds[p.key] = created.id;
    productIdList.push(created.id);
  }

  // ---- SKUs ----
  const skuSeeds: Array<{ key: string; sku: string; productKey: string; vendorKey: string; name: string; unit: string; cost: number; sell: number; service: number; tax: number }> = [
    { key: 'cur-blackout', sku: 'CUR-BLK-EYE-01', productKey: 'blackout', vendorKey: 'fabrics', name: 'Blackout Eyelet Curtain', unit: 'sqft', cost: 185, sell: 340, service: 45, tax: 18 },
    { key: 'cur-sheer', sku: 'CUR-SHR-PIN-01', productKey: 'sheer', vendorKey: 'fabrics', name: 'Sheer Pinch Pleat Curtain', unit: 'sqft', cost: 120, sell: 230, service: 35, tax: 18 },
    { key: 'cur-linen', sku: 'CUR-LIN-ROD-01', productKey: 'linen', vendorKey: 'soft', name: 'Linen Rod Pocket Curtain', unit: 'sqft', cost: 150, sell: 285, service: 40, tax: 18 },
    { key: 'blind-roman', sku: 'BLD-ROM-FLD-01', productKey: 'roman', vendorKey: 'fabrics', name: 'Roman Fold Blind', unit: 'sqft', cost: 210, sell: 395, service: 50, tax: 18 },
    { key: 'blind-roller', sku: 'BLD-ROL-SUN-01', productKey: 'roller', vendorKey: 'blinds', name: 'Sunscreen Roller Blind', unit: 'sqft', cost: 160, sell: 310, service: 45, tax: 18 },
    { key: 'blind-zebra', sku: 'BLD-ZBR-DUAL-01', productKey: 'zebra', vendorKey: 'blinds', name: 'Zebra Dual Layer Blind', unit: 'sqft', cost: 230, sell: 430, service: 55, tax: 18 },
    { key: 'blind-wooden', sku: 'BLD-WDN-50MM-01', productKey: 'wooden', vendorKey: 'blinds', name: 'Wooden Venetian Blind 50mm', unit: 'sqft', cost: 270, sell: 510, service: 60, tax: 18 },
    { key: 'rod-single', sku: 'ROD-SGL-PWD-01', productKey: 'curtain-rod', vendorKey: 'rods', name: 'Powder Coated Single Rod', unit: 'piece', cost: 480, sell: 850, service: 100, tax: 18 },
    { key: 'rod-double', sku: 'ROD-DBL-PWD-01', productKey: 'double-rod', vendorKey: 'rods', name: 'Powder Coated Double Rod', unit: 'piece', cost: 760, sell: 1350, service: 150, tax: 18 },
    { key: 'track-motor', sku: 'TRK-MTR-REM-01', productKey: 'track', vendorKey: 'track', name: 'Motorized Curtain Track', unit: 'meter', cost: 3200, sell: 5400, service: 600, tax: 18 },
    { key: 'hw-bracket', sku: 'HW-BRK-SET-01', productKey: 'hardware', vendorKey: 'rods', name: 'Curtain Hardware Set', unit: 'set', cost: 260, sell: 520, service: 50, tax: 18 },
    { key: 'hw-ring', sku: 'HW-RNG-BRS-01', productKey: 'hardware', vendorKey: 'rods', name: 'Brass Curtain Rings (set of 12)', unit: 'set', cost: 140, sell: 300, service: 0, tax: 18 },
    { key: 'svc-install', sku: 'SVC-INS-STD-01', productKey: 'install', vendorKey: 'track', name: 'Standard Installation Charge', unit: 'piece', cost: 300, sell: 650, service: 0, tax: 18 },
    { key: 'svc-measure', sku: 'SVC-MSR-STD-01', productKey: 'install', vendorKey: 'track', name: 'Measurement Visit Charge', unit: 'piece', cost: 150, sell: 350, service: 0, tax: 18 },
  ];
  const skuIds: Record<string, number> = {};
  const skuPrices: Record<string, SkuPrice> = {};
  let skuIndex = 0;
  for (const s of skuSeeds) {
    skuIndex += 1;
    const created = await prisma.sKU.create({
      data: {
        sku: s.sku,
        productId: productIds[s.productKey],
        vendorId: vendorIds[s.vendorKey],
        name: s.name,
        unit: s.unit,
        costPrice: s.cost,
        sellingPrice: s.sell,
        serviceCharge: s.service,
        taxPercent: s.tax,
        effectiveDate: d(120 - skuIndex),
      },
    });
    skuIds[s.key] = created.id;
    skuPrices[s.key] = { name: s.name, unit: s.unit, cost: s.cost, sell: s.sell, service: s.service, tax: s.tax };
    if (skuIndex % 4 === 0) {
      await prisma.priceHistory.create({
        data: {
          skuId: created.id,
          oldCostPrice: r2(s.cost * 0.9),
          newCostPrice: s.cost,
          oldSellingPrice: r2(s.sell * 0.92),
          newSellingPrice: s.sell,
          oldServiceCharge: r2(s.service * 0.8),
          newServiceCharge: s.service,
          reason: 'Annual vendor rate revision',
          changedById: users.admin,
          changedAt: d(60 - skuIndex),
        },
      });
    }
  }

  // ---- Stock ----
  const warehouses = ['MAIN', 'OVERFLOW'];
  for (const s of skuSeeds) {
    for (let w = 0; w < warehouses.length; w++) {
      await prisma.stock.create({
        data: {
          skuId: skuIds[s.key],
          warehouse: warehouses[w],
          availableQty: w === 0 ? 40 + s.key.length * 6 : 10 + s.key.length * 2,
          reservedQty: w === 0 ? 5 + (s.key.length % 4) : 0,
          issuedQty: w === 0 ? 12 + (s.key.length % 7) : 0,
          unit: s.unit,
        },
      });
    }
  }

  // ---- Branches ----
  const branchSeeds = [
    { key: 'del', name: 'Delhi NCR', code: 'DEL', city: 'New Delhi' },
    { key: 'blr', name: 'Bengaluru', code: 'BLR', city: 'Bengaluru' },
    { key: 'hyd', name: 'Hyderabad', code: 'HYD', city: 'Hyderabad' },
    { key: 'koc', name: 'Kochi', code: 'KOC', city: 'Kochi' },
    { key: 'amd', name: 'Ahmedabad', code: 'AMD', city: 'Ahmedabad' },
  ];
  const branchKeyToId: Record<string, number> = {};
  const branchIds: number[] = [];
  for (let i = 0; i < branchSeeds.length; i++) {
    const b = branchSeeds[i];
    const created = await prisma.branch.create({
      data: { businessId: `BR-${pad(i + 1)}`, name: b.name, code: b.code, city: b.city },
    });
    branchKeyToId[b.key] = created.id;
    branchIds.push(created.id);
  }
  // Assign staff to branches round-robin.
  const userKeys = Object.keys(users);
  for (let i = 0; i < userKeys.length; i++) {
    await prisma.user.update({ where: { id: users[userKeys[i]] }, data: { branchId: branchIds[i % branchIds.length] } });
  }
  const cityBranchKey: Record<string, string> = {
    'New Delhi': 'del', Gurugram: 'del', Kolkata: 'del',
    Bengaluru: 'blr', Pune: 'blr',
    Hyderabad: 'hyd', Kochi: 'koc', Ahmedabad: 'amd',
  };

  // ---- Customers + Sites ----
  const customerSeeds = [
    { name: 'Aarav Mehta', phone: '9876501001', email: 'aarav.mehta@gmail.com', address: 'A-14 Green Park, New Delhi', city: 'New Delhi', pincode: '110016', assigned: 'sales', notes: 'Prefers blackout in bedrooms' },
    { name: 'Sneha Iyer', phone: '9876501002', email: 'sneha.iyer@yahoo.com', address: '22 Indiranagar 100ft Road, Bengaluru', city: 'Bengaluru', pincode: '560038', assigned: 'sales', notes: 'Interested in motorized tracks' },
    { name: 'Rohan Gupta', phone: '9876501003', email: 'rohan.gupta@outlook.com', address: 'B-7 Vasant Kunj, New Delhi', city: 'New Delhi', pincode: '110070', assigned: 'orderManager', notes: 'Big villa project' },
    { name: 'Priya Nair', phone: '9876501004', email: 'priya.nair@gmail.com', address: '5 Marine Drive, Kochi', city: 'Kochi', pincode: '682031', assigned: 'sales' },
    { name: 'Kabir Singh', phone: '9876501005', email: 'kabir.singh@gmail.com', address: '301 Sector 21, Gurugram', city: 'Gurugram', pincode: '122016', assigned: 'sales', notes: 'Referral from Aarav Mehta' },
    { name: 'Diya Patel', phone: '9876501006', email: 'diya.patel@gmail.com', address: '9 CG Road, Ahmedabad', city: 'Ahmedabad', pincode: '380009', assigned: 'measurement' },
    { name: 'Arjun Reddy', phone: '9876501007', email: 'arjun.reddy@gmail.com', address: '44 Jubilee Hills, Hyderabad', city: 'Hyderabad', pincode: '500033', assigned: 'orderManager', notes: 'Corporate office project' },
    { name: 'Meera Joshi', phone: '9876501008', email: 'meera.joshi@gmail.com', address: '12 Aundh, Pune', city: 'Pune', pincode: '411007', assigned: 'sales' },
    { name: 'Vivaan Chopra', phone: '9876501009', email: 'vivaan.chopra@gmail.com', address: '88 Salt Lake Sector 5, Kolkata', city: 'Kolkata', pincode: '700091', assigned: 'sales' },
    { name: 'Ananya Desai', phone: '9876501010', email: 'ananya.desai@gmail.com', address: '6 Banjara Hills, Hyderabad', city: 'Hyderabad', pincode: '500034', assigned: 'sales' },
  ];
  const customerIds: number[] = [];
  const customerBranch: number[] = [];
  const siteIds: number[] = [];
  const sitesByCustomer: number[][] = [];
  for (let i = 0; i < customerSeeds.length; i++) {
    const c = customerSeeds[i];
    const customer = await prisma.customer.create({
      data: {
        businessId: `CUS-${pad(i + 1)}`,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        notes: c.notes,
        assignedEmployeeId: users[c.assigned],
        branchId: branchKeyToId[cityBranchKey[c.city] ?? 'del'],
        createdAt: d(150 - i * 7),
      },
    });
    customerIds.push(customer.id);
    customerBranch.push(customer.branchId as number);
    const ownSites: number[] = [];
    const siteCount = i % 3 === 0 ? 2 : 1;
    for (let s = 0; s < siteCount; s++) {
      const site = await prisma.site.create({
        data: {
          customerId: customer.id,
          name: s === 0 ? 'Primary Home' : `Project Site ${s + 1}`,
          address: s === 0 ? c.address : `${c.address}, Block ${String.fromCharCode(65 + s)}`,
          landmark: s === 0 ? 'Near City Mall' : 'Opposite Metro Station',
          city: c.city,
          pincode: c.pincode,
        },
      });
      ownSites.push(site.id);
      siteIds.push(site.id);
    }
    sitesByCustomer.push(ownSites);
  }

  // ---- Field Employees ----
  const fieldSeeds = [
    { name: 'Suresh Yadav', phone: '9700011101', role: 'Installer' },
    { name: 'Mohan Lal', phone: '9700011102', role: 'Installer' },
    { name: 'Ramesh Pawar', phone: '9700011103', role: 'Driver' },
    { name: 'Farhan Ali', phone: '9700011104', role: 'Installer' },
    { name: 'Ganesh Kamble', phone: '9700011105', role: 'Measurer' },
    { name: 'Sanjay Verma', phone: '9700011106', role: 'Measurer' },
    { name: 'Naveen Kumar', phone: '9700011107', role: 'Installer' },
    { name: 'Prakash Rao', phone: '9700011108', role: 'Driver' },
  ];
  const fieldEmpIds: number[] = [];
  for (let i = 0; i < fieldSeeds.length; i++) {
    const f = fieldSeeds[i];
    const created = await prisma.fieldEmployee.create({
      data: { businessId: `FLD-${pad(i + 1)}`, name: f.name, phone: f.phone, email: `${f.name.split(' ')[0].toLowerCase()}@field.furnishops.com`, role: f.role },
    });
    fieldEmpIds.push(created.id);
  }

  // ---- Vehicles ----
  const vehicleSeeds = [
    { registrationNo: 'DL-01-AB-1234', vehicleType: 'Tempo', assignedTeam: 'Install Team A' },
    { registrationNo: 'DL-01-CD-5678', vehicleType: 'Pickup', assignedTeam: 'Install Team B' },
    { registrationNo: 'KA-05-EF-9012', vehicleType: 'Tempo', assignedTeam: 'Install Team C' },
    { registrationNo: 'KL-07-GH-3456', vehicleType: 'Mini Truck', assignedTeam: 'Delivery' },
    { registrationNo: 'GJ-01-IJ-7890', vehicleType: 'Pickup', assignedTeam: 'Measurement' },
  ];
  const vehicleIds: number[] = [];
  for (let i = 0; i < vehicleSeeds.length; i++) {
    const v = vehicleSeeds[i];
    const created = await prisma.vehicle.create({
      data: { businessId: `VEH-${pad(i + 1)}`, registrationNo: v.registrationNo, vehicleType: v.vehicleType, assignedTeam: v.assignedTeam, status: i % 3 === 0 ? 'MAINTENANCE' : 'AVAILABLE' },
    });
    vehicleIds.push(created.id);
  }

  // ---- Enquiries + Items ----
  const enquiryStatuses = ['NEW', 'CONTACTED', 'MEASUREMENT_PENDING', 'MEASURED', 'QUOTATION_PENDING', 'QUOTATION_SENT', 'WON', 'WON', 'LOST', 'WON', 'QUOTATION_SENT', 'NEW'];
  const sources = ['Walk-in', 'Referral', 'Online', 'Exhibition', 'Instagram', 'WhatsApp'];
  const rooms = ['Living Room', 'Master Bedroom', 'Kids Room', 'Guest Room', 'Kitchen', 'Study Room', 'Balcony'];
  const enquiryIds: number[] = [];
  const enquiryCustomer: number[] = [];
  const enquirySite: number[] = [];
  const enquiryStatus: string[] = [];
  for (let i = 0; i < 12; i++) {
    const custIdx = i % customerIds.length;
    const status = enquiryStatuses[i];
    const siteId = sitesByCustomer[custIdx][i % sitesByCustomer[custIdx].length];
    const created = await prisma.enquiry.create({
      data: {
        businessId: `ENQ-${pad(i + 1)}`,
        customerId: customerIds[custIdx],
        siteId,
        source: sources[i % sources.length],
        enquiryDate: d(90 - i * 6),
        assignedToId: users.sales,
        advanceAmount: status === 'WON' ? 5000 : status === 'MEASURED' ? 2000 : null,
        notes: status === 'LOST' ? 'Customer went with local vendor' : 'Interested in premium fabrics',
        status,
        lostReason: status === 'LOST' ? 'Price' : null,
        lostReasonDetail: status === 'LOST' ? 'Quote 12% above competitor' : null,
        createdById: users.sales,
      },
    });
    enquiryIds.push(created.id);
    enquiryCustomer.push(customerIds[custIdx]);
    enquirySite.push(siteId);
    enquiryStatus.push(status);
    const itemCount = 1 + (i % 3);
    for (let it = 0; it < itemCount; it++) {
      const room = rooms[(i + it) % rooms.length];
      await prisma.enquiryItem.create({
        data: {
          enquiryId: created.id,
          room,
          requirement: `${room} — needs ${it % 2 === 0 ? 'curtains' : 'blinds'} with installation`,
          productType: it % 2 === 0 ? 'Curtain' : 'Blind',
          quantity: 1 + ((i + it) % 3),
          notes: 'Customer to confirm fabric shade',
        },
      });
    }
  }

  // ---- Measurement Schedules ----
  for (let i = 0; i < 6; i++) {
    const eIdx = i;
    await prisma.measurementSchedule.create({
      data: {
        enquiryId: enquiryIds[eIdx],
        assignedToId: users.measurement,
        scheduledDate: d(40 - i * 5, 11),
        scheduledTime: `${11 + (i % 4)}:00`,
        customerName: customerSeeds[eIdx % customerSeeds.length].name,
        siteAddress: customerSeeds[eIdx % customerSeeds.length].address,
        phone: customerSeeds[eIdx % customerSeeds.length].phone,
        status: i < 3 ? 'COMPLETED' : i < 5 ? 'CONFIRMED' : 'SCHEDULED',
        notes: 'Measure all windows on ground floor',
        completedAt: i < 3 ? d(35 - i * 5, 13) : null,
      },
    });
  }

  // ---- Measurements + Items ----
  const measurementIds: number[] = [];
  const measurementItemIds: number[][] = [];
  const measurementCustomer: number[] = [];
  for (let i = 0; i < 9; i++) {
    const eIdx = i % enquiryIds.length;
    const measured = i < 6;
    const measurement = await prisma.measurement.create({
      data: {
        businessId: `MSR-${pad(i + 1)}`,
        customerId: enquiryCustomer[eIdx],
        enquiryId: enquiryIds[eIdx],
        siteId: enquirySite[eIdx],
        measuredById: measured ? users.measurement : null,
        measurementDate: d(60 - i * 4, 12),
        notes: measured ? 'All windows measured, rod-to-rod fitting' : 'Awaiting site access',
        status: measured ? 'COMPLETED' : i % 2 === 0 ? 'SCHEDULED' : 'PENDING',
      },
    });
    measurementIds.push(measurement.id);
    measurementCustomer.push(enquiryCustomer[eIdx]);
    const ownItems: number[] = [];
    const itemCount = 2 + (i % 2);
    for (let it = 0; it < itemCount; it++) {
      const room = rooms[(i + it) % rooms.length];
      const width = 48 + ((i + it) * 7) % 60;
      const height = 60 + ((i + it) * 5) % 48;
      const item = await prisma.measurementItem.create({
        data: {
          measurementId: measurement.id,
          room,
          windowArea: `${room} — Window ${String.fromCharCode(65 + it)}`,
          width,
          height,
          quantity: 1,
          unit: 'inches',
          measurementType: it % 2 === 0 ? 'Rod-to-rod' : 'Frame',
          notes: 'Add 2 inch overlap on each side',
        },
      });
      ownItems.push(item.id);
    }
    measurementItemIds.push(ownItems);
  }

  return {
    users,
    productIds: productIdList,
    vendorIds,
    skuIds,
    skuPrices,
    customerIds,
    siteIds,
    enquiryIds,
    measurementIds,
    measurementItemIds,
    fieldEmpIds,
    vehicleIds,
    branchIds,
    customerBranch,
    sitesByCustomer,
    enquiryCustomer,
    enquirySite,
    enquiryStatus,
    measurementCustomer,
  };
}
