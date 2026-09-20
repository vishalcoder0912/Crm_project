// hello this is vishal project
// Shared helpers + data context for seeding.

export const d = (daysAgo: number, hour = 10): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date;
};

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface Line {
  quantity: number;
  rate: number;
  serviceCharge?: number;
  discountPercent?: number;
  taxPercent?: number;
}

export function lineTotals(line: Line) {
  const quantity = Number(line.quantity) || 0;
  const rate = Number(line.rate) || 0;
  const serviceCharge = Number(line.serviceCharge) || 0;
  const discountPercent = Number(line.discountPercent) || 0;
  const taxPercent = Number(line.taxPercent) ?? 18;

  const subtotal = quantity * rate + serviceCharge;
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = (taxable * taxPercent) / 100;
  const amount = taxable + taxAmount;

  return { quantity, rate, serviceCharge, discountPercent, taxPercent, subtotal, discountAmount, taxAmount, amount };
}

export function docTotals(lines: Line[]) {
  const t = lines.map(lineTotals);
  return {
    subtotal: r2(t.reduce((s, x) => s + x.subtotal, 0)),
    discountAmount: r2(t.reduce((s, x) => s + x.discountAmount, 0)),
    taxAmount: r2(t.reduce((s, x) => s + x.taxAmount, 0)),
    totalAmount: r2(t.reduce((s, x) => s + x.amount, 0)),
  };
}

export interface SkuPrice {
  name: string;
  unit: string;
  cost: number;
  sell: number;
  service: number;
  tax: number;
}

export interface SeedContext {
  users: Record<string, number>;
  productIds: number[];
  vendorIds: Record<string, number>;
  skuIds: Record<string, number>;
  skuPrices: Record<string, SkuPrice>;
  customerIds: number[];
  siteIds: number[];
  enquiryIds: number[];
  measurementIds: number[];
  measurementItemIds: number[][];
  fieldEmpIds: number[];
  vehicleIds: number[];
  branchIds: number[];
  // extras populated by seedCore
  customerBranch: number[];
  sitesByCustomer: number[][];
  enquiryCustomer: number[];
  enquirySite: number[];
  enquiryStatus: string[];
  measurementCustomer: number[];
}

export interface OrderItemSeedInfo {
  id: number;
  skuId: number;
  skuKey: string;
  productName: string;
  quantity: number;
  status: string;
}

export interface OrderSeedInfo {
  id: number;
  businessId: string;
  customerId: number;
  siteId: number;
  total: number;
  advance: number;
  balance: number;
  status: string;
  items: OrderItemSeedInfo[];
}

export interface OpsContext {
  orders: OrderSeedInfo[];
  quotationIds: number[];
}
