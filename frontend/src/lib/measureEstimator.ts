// hello this is vishal project
// Client-side mirror of the backend measurement-estimator for Aradhana Furnishing.
// Computes live quantities, prices, and GST (CGST/SGST intra-state or IGST inter-state)
// across Curtains, Blinds, Wallpapers, Mattresses, and Upholstery.

export type TaxMode = 'INTRA' | 'INTER';

export const FULLNESS = 2;
export const FABRIC_MARGIN = 0.2;
export const DROP_ALLOWANCE = 0.15;

export interface SkuOption {
  id: number;
  sku: string;
  name: string;
  unit: string;
  category: string;
  sellingPrice: number;
  serviceCharge: number;
  taxPercent: number;
}

export interface MeasurementDraft {
  room: string;
  windowArea: string;
  width: number;
  height: number;
  depth?: number;
  quantity: number;
  unit: string;
  measurementType: string;
  category?: string; // 'curtain' | 'blind-venetian' | 'blind-honeycomb' | 'blind-roller' | 'wallpaper' | 'mattress' | 'upholstery'
  notes?: string;
}

export function toMeters(value: number, unit: string): number {
  const v = Number(value) || 0;
  switch ((unit || 'inches').toLowerCase()) {
    case 'feet':
    case 'ft':
      return v * 0.3048;
    case 'inches':
    case 'in':
      return v * 0.0254;
    case 'cm':
      return v / 100;
    case 'meters':
    case 'metre':
    case 'm':
      return v;
    default:
      return v * 0.0254;
  }
}

export function roundUp(value: number, step: number): number {
  return Math.ceil((Number(value) + 1e-9) / step) * step;
}

const PRIORITY = [
  'curtain',
  'rod',
  'blind',
  'wallpaper',
  'upholstery',
  'bed linen',
  'bath linen',
  'rug',
  'mattress',
  'accessor',
  'service',
];

function rank(category: string | null | undefined): number {
  const c = (category ?? '').toLowerCase();
  const idx = PRIORITY.findIndex((p) => c.includes(p));
  return idx >= 0 ? idx : PRIORITY.length;
}

export function computeQuantity(item: MeasurementDraft, sku: SkuOption): { qty: number; unit: string } {
  const widthM = toMeters(Number(item.width), item.unit);
  const heightM = toMeters(Number(item.height), item.unit);
  const pieces = Math.max(1, Number(item.quantity ?? 1));
  const cat = (sku.category ?? '').toLowerCase();
  const skuUnit = (sku.unit ?? '').toLowerCase();

  if (cat.includes('curtain') || ['mtr', 'meter', 'metre', 'm'].includes(skuUnit)) {
    return { qty: roundUp(widthM * FULLNESS + FABRIC_MARGIN, 0.5) * pieces, unit: 'mtr' };
  }
  if (cat.includes('rod') || cat.includes('track')) {
    return { qty: roundUp(widthM * pieces, 0.1), unit: 'mtr' };
  }
  if (cat.includes('blind')) {
    const sqft = roundUp(widthM * heightM * pieces * 10.7639, 0.1);
    return { qty: sqft, unit: 'sqft' };
  }
  if (cat.includes('wallpaper')) {
    const areaSqft = widthM * heightM * pieces * 10.7639;
    const rolls = Math.max(1, Math.ceil(areaSqft / 50));
    return { qty: rolls, unit: 'rolls' };
  }
  if (cat.includes('upholstery') || cat.includes('fabric')) {
    const wInches = Number(item.width) || 72;
    const seats = wInches >= 72 ? 3 : wInches >= 48 ? 2 : 1;
    return { qty: roundUp(seats * 4.5 * pieces, 0.5), unit: 'mtr' };
  }
  if (cat.includes('mattress')) {
    return { qty: pieces, unit: 'piece' };
  }
  if (cat.includes('service')) {
    return { qty: pieces, unit: 'job' };
  }
  if (['sqft', 'sq meter', 'sq.m', 'sqm'].includes(skuUnit)) {
    return { qty: roundUp(widthM * heightM * pieces, 0.01), unit: 'sq.m' };
  }
  return { qty: pieces, unit: sku.unit || 'piece' };
}

/** Suggest SKUs that best match the item's category/room/window. */
export function suggestSkus(item: MeasurementDraft, skus: SkuOption[], limit = 4): SkuOption[] {
  const target = `${item.category ?? ''} ${item.room ?? ''} ${item.windowArea ?? ''}`.toLowerCase();

  let filtered = skus.filter((s) => {
    const c = s.category.toLowerCase();
    if ((target.includes('venetian') || target.includes('honeycomb') || target.includes('roller') || target.includes('blind')) && c.includes('blind')) return true;
    if (target.includes('wallpaper') && c.includes('wallpaper')) return true;
    if (target.includes('mattress') && c.includes('mattress')) return true;
    if ((target.includes('sofa') || target.includes('upholstery')) && (c.includes('upholstery') || c.includes('fabric'))) return true;
    if (target.includes('curtain') && c.includes('curtain')) return true;
    return false;
  });

  if (filtered.length === 0) filtered = skus;

  return [...filtered]
    .sort((a, b) => rank(a.category) - rank(b.category) || a.sellingPrice - b.sellingPrice)
    .slice(0, limit);
}

export function lineComputed(item: MeasurementDraft, sku: SkuOption, taxMode: TaxMode = 'INTRA') {
  const { qty, unit } = computeQuantity(item, sku);
  const rate = sku.sellingPrice;
  const serviceCharge = sku.serviceCharge;
  const taxPercent = sku.taxPercent;
  const taxable = qty * rate + serviceCharge;
  const taxAmount = (taxable * taxPercent) / 100;
  const cgst = taxMode === 'INTRA' ? taxAmount / 2 : 0;
  const sgst = taxMode === 'INTRA' ? taxAmount / 2 : 0;
  const igst = taxMode === 'INTER' ? taxAmount : 0;
  return {
    qty,
    qtyUnit: unit,
    rate,
    serviceCharge,
    taxPercent,
    taxable,
    taxAmount,
    cgst,
    sgst,
    igst,
    amount: taxable + taxAmount,
  };
}

export function itemTotals(items: { item: MeasurementDraft; sku: SkuOption | null; taxMode: TaxMode }[]) {
  let subtotal = 0;
  let serviceCharges = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let tax = 0;
  for (const { item, sku, taxMode } of items) {
    if (!sku) continue;
    const l = lineComputed(item, sku, taxMode);
    subtotal += l.qty * l.rate;
    serviceCharges += l.serviceCharge;
    cgst += l.cgst;
    sgst += l.sgst;
    igst += l.igst;
    tax += l.taxAmount;
  }
  const taxable = subtotal + serviceCharges;
  return { subtotal, serviceCharges, taxable, cgst, sgst, igst, tax, grandTotal: taxable + tax };
}

export const fmtINR = (n: number, digits = 0) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: digits });

export const fmtQty = (qty: number) => Number(qty || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });