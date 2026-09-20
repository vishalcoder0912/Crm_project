// hello this is vishal project
// =============================================================================
// Measurement → Product recommendation & priced estimate engine
// Turns raw window/room measurements into business-ready quantities (fabric length,
// blind/wallpaper area, rod length, mattress sizing, upholstery yardage)
// using Indian Home Furnishing GST rules (CGST + SGST intra-state, IGST inter-state).
// Includes Aradhana Furnishing brand, store details & 2D technical line draw.
// =============================================================================
import prisma from '../config/database';
import { NotFoundError } from '../utils/errors';

export type TaxMode = 'INTRA' | 'INTER';

// Curtains are typically made with a fullness factor of 2x the rod width.
const FULLNESS = 2;
const FABRIC_MARGIN = 0.2; // meters added per panel for wraps/returns
const DROP_ALLOWANCE = 0.15; // meters added to the drop for hems

export interface MeasuredSku {
  skuId: number;
  sku: string;
  name: string;
  unit: string;
  category: string;
  sellingPrice: number;
  serviceCharge: number;
  taxPercent: number;
}

export interface EstimateLine {
  measurementItemId: number;
  room: string;
  windowArea: string;
  width: number;
  height: number;
  unit: string;
  quantity: number;
  measurementType: string | null;
  recommendedSkuId: number | null;
  skuId: number | null;
  product: string | null;
  productCategory: string | null;
  qty: number;
  qtyUnit: string;
  rate: number;
  serviceCharge: number;
  taxPercent: number;
  taxable: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  amount: number;
  svgLineDraw?: string;
}

export interface EstimateResult {
  measurementId: number;
  measurementBusinessId: string | null;
  measurementDate: string;
  measuredBy: { id?: number; firstName?: string; lastName?: string } | null;
  customer: { id?: number; name: string; phone: string | null; email: string | null; address: string | null };
  taxMode: TaxMode;
  gstRate: number | null;
  lines: EstimateLine[];
  totals: {
    subtotal: number;
    serviceCharges: number;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    tax: number;
    grandTotal: number;
  };
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

const CATEGORY_PRIORITY = [
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

function categoryRank(category: string | null | undefined): number {
  const c = (category ?? '').toLowerCase();
  const idx = CATEGORY_PRIORITY.findIndex((p) => c.includes(p));
  return idx >= 0 ? idx : CATEGORY_PRIORITY.length;
}

/** Pick the most suitable active SKU for a measurement item. */
export function pickSkuForItem(
  item: { width: any; height: any; unit?: string | null; quantity?: any; room?: string; windowArea?: string },
  catalog: MeasuredSku[]
): MeasuredSku | null {
  if (catalog.length === 0) return null;
  const target = `${item.room ?? ''} ${item.windowArea ?? ''}`.toLowerCase();
  // If room/window explicitly indicates blind, wallpaper, mattress, or upholstery
  let matched = catalog.filter((s) => {
    const c = s.category.toLowerCase();
    if (target.includes('wallpaper') && c.includes('wallpaper')) return true;
    if (target.includes('blind') && c.includes('blind')) return true;
    if (target.includes('mattress') && c.includes('mattress')) return true;
    if (target.includes('sofa') && (c.includes('upholstery') || c.includes('fabric'))) return true;
    return false;
  });

  if (matched.length === 0) matched = catalog;

  const sorted = [...matched].sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || a.sellingPrice - b.sellingPrice);
  return sorted[0] ?? null;
}

/** Compute the billable quantity for a chosen SKU given a raw measurement. */
export function computeQuantity(
  item: { width: any; height: any; unit?: string | null; quantity?: any; measurementType?: string | null },
  sku: MeasuredSku
): { qty: number; unit: string } {
  const widthM = toMeters(Number(item.width), item.unit ?? 'inches');
  const heightM = toMeters(Number(item.height), item.unit ?? 'inches');
  const pieces = Math.max(1, Number(item.quantity ?? 1));
  const cat = (sku.category ?? '').toLowerCase();
  const skuUnit = (sku.unit ?? '').toLowerCase();

  if (cat.includes('curtain') || ['mtr', 'meter', 'metre', 'm'].includes(skuUnit)) {
    const fabric = roundUp(widthM * FULLNESS + FABRIC_MARGIN, 0.5) * pieces;
    return { qty: fabric, unit: 'mtr' };
  }
  if (cat.includes('rod') || cat.includes('track')) {
    const length = roundUp(widthM * pieces, 0.1);
    return { qty: length, unit: 'mtr' };
  }
  if (cat.includes('blind')) {
    const area = roundUp(widthM * heightM * pieces * 10.7639, 0.1); // sqft
    return { qty: area, unit: 'sqft' };
  }
  if (cat.includes('wallpaper')) {
    // 1 roll = approx 57 sqft (0.53m x 10m)
    const areaSqft = widthM * heightM * pieces * 10.7639;
    const rolls = Math.max(1, Math.ceil(areaSqft / 50)); // with wastage
    return { qty: rolls, unit: 'rolls' };
  }
  if (cat.includes('upholstery') || cat.includes('fabric')) {
    const wInches = Number(item.width) || 72;
    const seats = wInches >= 72 ? 3 : wInches >= 48 ? 2 : 1;
    const fabricMtr = roundUp(seats * 4.5 * pieces, 0.5);
    return { qty: fabricMtr, unit: 'mtr' };
  }
  if (cat.includes('mattress')) {
    return { qty: pieces, unit: 'piece' };
  }
  if (cat.includes('service')) {
    return { qty: pieces, unit: 'job' };
  }
  if (['sqft', 'sq meter', 'sq.m', 'sqm'].includes(skuUnit)) {
    const area = roundUp(widthM * heightM * pieces, 0.01);
    return { qty: area, unit: 'sq.m' };
  }
  return { qty: pieces, unit: sku.unit || 'piece' };
}

function asMeasuredSku(sku: any): MeasuredSku {
  return {
    skuId: sku.id,
    sku: sku.sku,
    name: sku.name,
    unit: sku.unit,
    category: sku.product?.category ?? 'Services',
    sellingPrice: Number(sku.sellingPrice ?? 0),
    serviceCharge: Number(sku.serviceCharge ?? 0),
    taxPercent: Number(sku.taxPercent ?? 0),
  };
}

export interface EstimateInput {
  picks?: Record<number, number>; // measurementItemId → skuId
  taxMode?: TaxMode;
}

/** Render a clean embedded SVG technical line draw for the print sheet. */
export function generateSvgBlueprint(item: { width: any; height: any; unit: string; category?: string }): string {
  const cat = (item.category ?? '').toLowerCase();
  const w = Number(item.width) || 60;
  const h = Number(item.height) || 72;
  const u = item.unit || 'in';

  if (cat.includes('wallpaper')) {
    return `<svg width="120" height="80" viewBox="0 0 120 80" style="display:inline-block;vertical-align:middle;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;">
      <rect x="10" y="10" width="100" height="60" fill="#f0fdfa" stroke="#0f766e" stroke-width="1.2"/>
      <line x1="43" y1="10" x2="43" y2="70" stroke="#0f766e" stroke-dasharray="2 2" stroke-width="0.8"/>
      <line x1="76" y1="10" x2="76" y2="70" stroke="#0f766e" stroke-dasharray="2 2" stroke-width="0.8"/>
      <text x="60" y="44" font-size="7" fill="#0f766e" font-weight="bold" text-anchor="middle">WALLPAPER</text>
      <text x="60" y="77" font-size="6" fill="#64748b" text-anchor="middle">${w}×${h} ${u}</text>
    </svg>`;
  }

  if (cat.includes('blind')) {
    return `<svg width="120" height="80" viewBox="0 0 120 80" style="display:inline-block;vertical-align:middle;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;">
      <rect x="15" y="12" width="90" height="8" fill="#334155" rx="1"/>
      <rect x="16" y="22" width="88" height="42" fill="#e6fffa" stroke="#5eead4" stroke-width="0.8"/>
      <line x1="16" y1="30" x2="104" y2="30" stroke="#0d9488" stroke-width="0.6"/>
      <line x1="16" y1="38" x2="104" y2="38" stroke="#0d9488" stroke-width="0.6"/>
      <line x1="16" y1="46" x2="104" y2="46" stroke="#0d9488" stroke-width="0.6"/>
      <line x1="16" y1="54" x2="104" y2="54" stroke="#0d9488" stroke-width="0.6"/>
      <rect x="15" y="64" width="90" height="5" fill="#475569" rx="1"/>
      <text x="60" y="77" font-size="6" fill="#64748b" text-anchor="middle">BLIND: ${w}×${h} ${u}</text>
    </svg>`;
  }

  if (cat.includes('mattress')) {
    return `<svg width="120" height="80" viewBox="0 0 120 80" style="display:inline-block;vertical-align:middle;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;">
      <polygon points="60,15 105,32 60,50 15,32" fill="#f0fdfa" stroke="#0f766e" stroke-width="1"/>
      <polygon points="60,50 105,32 105,44 60,62" fill="#ccfbf1" stroke="#0f766e" stroke-width="1"/>
      <polygon points="60,50 15,32 15,44 60,62" fill="#99f6e4" stroke="#0f766e" stroke-width="1"/>
      <text x="60" y="34" font-size="6" fill="#0f766e" font-weight="bold" text-anchor="middle">MATTRESS</text>
      <text x="60" y="75" font-size="6" fill="#64748b" text-anchor="middle">${w}×${h} ${u}</text>
    </svg>`;
  }

  if (cat.includes('upholstery') || cat.includes('sofa')) {
    return `<svg width="120" height="80" viewBox="0 0 120 80" style="display:inline-block;vertical-align:middle;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;">
      <rect x="25" y="15" width="70" height="15" fill="#ccfbf1" stroke="#0f766e" stroke-width="1" rx="2"/>
      <rect x="15" y="20" width="10" height="42" fill="#e0f2fe" stroke="#0284c7" stroke-width="1" rx="2"/>
      <rect x="95" y="20" width="10" height="42" fill="#e0f2fe" stroke="#0284c7" stroke-width="1" rx="2"/>
      <rect x="27" y="32" width="32" height="30" fill="#f8fafc" stroke="#0f766e" stroke-width="1" rx="1"/>
      <rect x="61" y="32" width="32" height="30" fill="#f8fafc" stroke="#0f766e" stroke-width="1" rx="1"/>
      <text x="60" y="75" font-size="6" fill="#64748b" text-anchor="middle">SOFA: ${w}×${h} ${u}</text>
    </svg>`;
  }

  // Default: Curtain with pleats & rod
  return `<svg width="120" height="80" viewBox="0 0 120 80" style="display:inline-block;vertical-align:middle;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;">
    <line x1="8" y1="12" x2="112" y2="12" stroke="#334155" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="8" cy="12" r="3" fill="#475569"/>
    <circle cx="112" cy="12" r="3" fill="#475569"/>
    <rect x="20" y="18" width="80" height="46" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>
    <path d="M14,14 Q16,20 22,22 L54,22 L54,66 L18,66 Z" fill="#ccfbf1" stroke="#0f766e" stroke-width="1"/>
    <path d="M66,22 L98,22 Q104,20 106,14 L102,66 L66,66 Z" fill="#ccfbf1" stroke="#0f766e" stroke-width="1"/>
    <text x="60" y="75" font-size="6" fill="#0f766e" font-weight="bold" text-anchor="middle">CURTAIN: ${w}×${h} ${u}</text>
  </svg>`;
}

export async function buildEstimate(measurementId: number, input?: EstimateInput): Promise<EstimateResult> {
  const measurement = await prisma.measurement.findUnique({
    where: { id: measurementId },
    include: {
      items: true,
      customer: true,
      site: true,
      measuredBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!measurement) throw new NotFoundError('Measurement', measurementId);

  const taxMode: TaxMode = input?.taxMode === 'INTER' ? 'INTER' : 'INTRA';
  const picks = input?.picks ?? {};

  const skuRows = await prisma.sKU.findMany({
    where: { isActive: true, deletedAt: null },
    include: { product: true },
    orderBy: { sellingPrice: 'asc' },
  });
  const catalog: MeasuredSku[] = skuRows.map(asMeasuredSku);
  const catalogById = new Map(catalog.map((s) => [s.skuId, s]));

  const gstRates = [...new Set(skuRows.map((s) => Number(s.taxPercent)).filter(Boolean))].sort((a, b) => a - b);
  const gstRate = gstRates.length === 1 ? gstRates[0] : 18;

  const lines: EstimateLine[] = [];
  let subtotal = 0;
  let serviceCharges = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  for (const item of measurement.items) {
    const picked = picks[item.id];
    let sku = picked ? catalogById.get(picked) ?? null : null;
    if (!sku) sku = pickSkuForItem(item, catalog);

    const chosen: MeasuredSku | null = sku;
    const { qty, unit } = computeQuantity(item, chosen ?? {
      skuId: 0, sku: '', name: '', unit: 'piece', category: 'Services',
      sellingPrice: 0, serviceCharge: 0, taxPercent: 18,
    });

    const rate = chosen?.sellingPrice ?? 0;
    const serviceCharge = chosen?.serviceCharge ?? 0;
    const taxPercent = chosen?.taxPercent ?? 18;
    const taxable = qty * rate + serviceCharge;
    const taxAmount = (taxable * taxPercent) / 100;
    const cgst = taxMode === 'INTRA' ? taxAmount / 2 : 0;
    const sgst = taxMode === 'INTRA' ? taxAmount / 2 : 0;
    const igst = taxMode === 'INTER' ? taxAmount : 0;

    subtotal += qty * rate;
    serviceCharges += serviceCharge;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;

    const svgLineDraw = generateSvgBlueprint({
      width: Number(item.width),
      height: Number(item.height),
      unit: item.unit,
      category: chosen?.category ?? item.room,
    });

    lines.push({
      measurementItemId: item.id,
      room: item.room,
      windowArea: item.windowArea,
      width: Number(item.width),
      height: Number(item.height),
      unit: item.unit,
      quantity: Number(item.quantity ?? 1),
      measurementType: item.measurementType,
      recommendedSkuId: pickSkuForItem(item, catalog)?.skuId ?? null,
      skuId: chosen?.skuId ?? null,
      product: chosen?.name ?? null,
      productCategory: chosen?.category ?? null,
      qty,
      qtyUnit: unit,
      rate,
      serviceCharge,
      taxPercent,
      taxable,
      taxAmount,
      cgst,
      sgst,
      amount: taxable + taxAmount,
      svgLineDraw,
    });
  }

  const taxableTotal = subtotal + serviceCharges;
  const tax = cgstTotal + sgstTotal + igstTotal;

  return {
    measurementId: measurement.id,
    measurementBusinessId: measurement.businessId,
    measurementDate: measurement.measurementDate.toISOString(),
    measuredBy: measurement.measuredBy ?? null,
    customer: {
      id: measurement.customer?.id,
      name: measurement.customer?.name ?? 'Guest Client',
      phone: measurement.customer?.phone ?? null,
      email: measurement.customer?.email ?? null,
      address: measurement.customer?.address ?? null,
    },
    taxMode,
    gstRate,
    lines,
    totals: {
      subtotal,
      serviceCharges,
      taxable: taxableTotal,
      cgst: cgstTotal,
      sgst: sgstTotal,
      igst: igstTotal,
      tax,
      grandTotal: taxableTotal + tax,
    },
  };
}

export function formatINR(value: number, digits = 2): string {
  return '₹' + Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Render the measurement + priced estimate as an Aradhana Furnishing print-ready / downloadable HTML sheet with embedded line drawing. */
export function renderEstimateHtml(estimate: EstimateResult): string {
  const c = estimate.customer;
  const mode = estimate.taxMode;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const rows = estimate.lines
    .map(
      (l, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td>
          <strong>${esc(l.room)}</strong><br/>
          <span style="font-size:11px;color:#64748b;">${esc(l.windowArea)} · ${esc(l.measurementType ?? 'Standard')}</span>
        </td>
        <td style="text-align:center;">
          ${l.svgLineDraw ?? ''}
        </td>
        <td class="num"><strong>${l.width} × ${l.height}</strong> ${esc(l.unit)}</td>
        <td class="num">${l.quantity}</td>
        <td>
          <strong>${esc(l.product ?? 'Custom Fabric')}</strong><br/>
          <span style="font-size:11px;color:#0f766e;">${esc(l.productCategory ?? 'Furnishing')}</span>
        </td>
        <td class="num font-bold"><strong>${l.qty}</strong> ${esc(l.qtyUnit)}</td>
        <td class="num">${formatINR(l.rate)}</td>
        <td class="num">${formatINR(l.serviceCharge)}</td>
        <td class="num">${formatINR(l.taxable)}</td>
        <td class="num font-bold" style="color:#0f766e;"><strong>${formatINR(l.amount)}</strong></td>
      </tr>`
    )
    .join('');

  const taxRows =
    mode === 'INTER'
      ? `<tr class="sub"><td colspan="2">IGST (Inter-state 18%):</td><td class="num">${formatINR(estimate.totals.igst)}</td></tr>`
      : `<tr class="sub"><td colspan="2">CGST (Central 9%):</td><td class="num">${formatINR(estimate.totals.cgst)}</td></tr>
         <tr class="sub"><td colspan="2">SGST (State 9%):</td><td class="num">${formatINR(estimate.totals.sgst)}</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Aradhana Furnishing — Measurement & Price Sheet ${esc(estimate.measurementBusinessId ?? '')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 28px; background: #f8fafc; }
  .sheet { max-width: 960px; margin: 0 auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
  .hd { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 24px 28px; border-bottom: 3px solid #0f766e; background: linear-gradient(180deg, #f0fdfa, #fff); }
  .brand { font-size: 26px; font-weight: 800; letter-spacing: .3px; color: #0f172a; }
  .brand span { color: #0f766e; }
  .tag { font-size: 12px; color: #475569; font-weight: 600; margin-top: 2px; }
  .brand-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
  .right { text-align: right; font-size: 12px; color: #475569; line-height: 1.6; }
  .doc { display: inline-block; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 6px; background: #0f766e; color: #fff; letter-spacing: 0.05em; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px 28px; border-bottom: 1px solid #f1f5f9; }
  .block h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #0f766e; }
  .block p { margin: 2px 0; font-size: 13px; color: #334155; }
  .stores-bar { background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 10px 28px; font-size: 11px; color: #475569; line-height: 1.6; }
  .stores-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .store-col strong { color: #0f766e; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { background: #f8fafc; text-align: left; padding: 10px 8px; border-bottom: 2px solid #cbd5e1; font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
  td { padding: 8px 8px; border-bottom: 1px solid #eef2f7; color: #334155; vertical-align: middle; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .font-bold { font-weight: 700; }
  .totals { padding: 18px 28px 12px; }
  .total-table { width: 340px; margin-left: auto; font-size: 12.5px; }
  .total-table td { padding: 4px 8px; border: none; }
  .sub td { color: #64748b; font-size: 11.5px; }
  .grand td { font-size: 16px; font-weight: 800; color: #065f46; border-top: 2px solid #0f766e; padding-top: 8px; }
  .foot { padding: 18px 28px 28px; font-size: 11px; color: #64748b; border-top: 1px solid #f1f5f9; }
  .sig { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig div { width: 42%; border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 11px; color: #475569; text-align: center; }
  @media print {
    body { padding: 0; background: #fff; }
    .sheet { border: none; box-shadow: none; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <!-- Header -->
    <div class="hd">
      <div>
        <div class="brand">Aradhana <span>Furnishing</span></div>
        <div class="tag">#1 Leading Home Furnishing Brand in Delhi NCR</div>
        <div class="brand-sub">Curtains · Mattresses · Wallpapers · Upholstery · Window Blinds · Rugs &amp; Linens</div>
      </div>
      <div class="right">
        <span class="doc">MEASUREMENT &amp; PRICE ESTIMATE</span><br/>
        <strong>Ref: ${esc(estimate.measurementBusinessId ?? 'EST-DRAFT')}</strong> · ${today}<br/>
        Measurement Date: ${esc(estimate.measurementDate.slice(0, 10))}<br/>
        ${estimate.measuredBy ? `Measured By: ${esc(`${estimate.measuredBy.firstName ?? ''} ${estimate.measuredBy.lastName ?? ''}`)}` : 'On-Site Team'}
      </div>
    </div>

    <!-- Store Locations -->
    <div class="stores-bar">
      <div class="stores-grid">
        <div class="store-col">
          <strong>Ghaziabad Store:</strong><br/>
          C-19 RDC Raj Nagar Opp. Yes Bank<br/>
          Ph: 0121-4519302, 96346-66617
        </div>
        <div class="store-col">
          <strong>Dehradun Store:</strong><br/>
          Ground Floor 33/30, Govind Nagar, Race Course<br/>
          Ph: 7303700284
        </div>
        <div class="store-col">
          <strong>Meerut Store:</strong><br/>
          A-182 Vidya Laxmi Complex, Abulane<br/>
          Ph: 0121-2640212, 93590-53522
        </div>
      </div>
    </div>

    <!-- Customer & Billing -->
    <div class="cols">
      <div class="block">
        <h4>Customer Details</h4>
        <p><strong>${esc(c.name)}</strong></p>
        <p>Phone: <strong>${esc(c.phone ?? 'Not provided (Draft estimate)')}</strong></p>
        ${c.email ? `<p>Email: ${esc(c.email)}</p>` : ''}
        <p>Address: ${esc(c.address ?? 'On record / Site address')}</p>
      </div>
      <div class="block">
        <h4>Billing &amp; Tax Terms</h4>
        <p>GST State Mode: <strong>${mode === 'INTER' ? 'Inter-State (IGST 18%)' : 'Intra-State (CGST 9% + SGST 9%)'}</strong></p>
        <p>GSTIN: <strong>09AABCA1234F1Z8</strong></p>
        <p>Stitching / Making: Inhouse Expert Stitching &amp; On-Site Fitting</p>
        <p>Associated Brands: <strong>LIVINGO, AikemI, Spring Fit, EXCEL</strong></p>
      </div>
    </div>

    <!-- Items Table with 2D Line Drawings -->
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Room / Area</th>
          <th style="text-align:center;">Normal 2D View</th>
          <th class="num">Size (W×H)</th>
          <th class="num">Qty</th>
          <th>Product / Fabric</th>
          <th class="num">Computed Qty</th>
          <th class="num">Rate</th>
          <th class="num">Stitching</th>
          <th class="num">Taxable</th>
          <th class="num">Amount (incl. GST)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <!-- Totals Table -->
    <div class="totals">
      <table class="total-table">
        <tbody>
          <tr><td colspan="2">Material Subtotal:</td><td class="num font-bold">${formatINR(estimate.totals.subtotal)}</td></tr>
          <tr><td colspan="2">Stitching &amp; Installation:</td><td class="num">${formatINR(estimate.totals.serviceCharges)}</td></tr>
          <tr><td colspan="2">Taxable Value:</td><td class="num font-bold">${formatINR(estimate.totals.taxable)}</td></tr>
          ${taxRows}
          <tr class="grand"><td colspan="2">Total (All Taxes Included):</td><td class="num">${formatINR(estimate.totals.grandTotal)}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Footer & Terms -->
    <div class="foot">
      <p><strong>Terms &amp; Conditions:</strong></p>
      <ol style="padding-left:18px;margin:4px 0;">
        <li>All taxes (CGST/SGST/IGST) are computed as per Indian Furnishing GST regulations.</li>
        <li>Curtain fabric includes standard 2x fullness for pinch pleating/eyelets and drop allowances.</li>
        <li>Free consultation and professional installation included across Ghaziabad, Meerut, and Dehradun.</li>
        <li>Quotation valid for 30 days from date of measurement. 50% advance required upon order confirmation.</li>
      </ol>
      <div class="sig">
        <div>Client Signature &amp; Approval</div>
        <div>For Aradhana Furnishing (Authorised Signatory)</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/** Render a downloadable blank sample measurement capture sheet for field staff visiting customer homes. */
export function renderBlankMeasurementSheetHtml(): string {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const blankRows = Array.from({ length: 8 })
    .map(
      (_, i) => `<tr>
        <td style="text-align:center;height:40px;">${i + 1}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Aradhana Furnishing — Field Measurement Capture Sheet</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; background: #fff; }
  .sheet { max-width: 960px; margin: 0 auto; border: 2px solid #0f766e; border-radius: 8px; overflow: hidden; }
  .hd { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 24px; border-bottom: 2px solid #0f766e; background: #f0fdfa; }
  .brand { font-size: 24px; font-weight: 800; color: #0f172a; }
  .brand span { color: #0f766e; }
  .tag { font-size: 11.5px; color: #475569; font-weight: 600; margin-top: 2px; }
  .right { text-align: right; font-size: 11.5px; color: #475569; }
  .badge { display: inline-block; background: #0f766e; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px 24px; border-bottom: 1px solid #cbd5e1; font-size: 12px; }
  .field-line { border-bottom: 1px dotted #64748b; height: 18px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; }
  td { border: 1px solid #cbd5e1; padding: 6px; }
  .stores { background: #f8fafc; padding: 10px 24px; font-size: 10.5px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; }
  .sig { display: flex; justify-content: space-between; padding: 24px; margin-top: 20px; }
  .sig div { width: 40%; border-top: 1px dashed #64748b; text-align: center; font-size: 11px; padding-top: 6px; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="hd">
      <div>
        <div class="brand">Aradhana <span>Furnishing</span></div>
        <div class="tag">#1 Leading Home Furnishing Brand in Delhi NCR · Free Doorstep Measurement Form</div>
      </div>
      <div class="right">
        <span class="badge">FIELD MEASUREMENT SHEET</span><br/>
        Date: ${today}
      </div>
    </div>
    <div class="meta">
      <div>
        <strong>Customer Name:</strong> <div class="field-line"></div>
        <strong>Phone / Mobile:</strong> <div class="field-line"></div>
        <strong>Site Address:</strong> <div class="field-line"></div>
      </div>
      <div>
        <strong>Measurer / Technician Name:</strong> <div class="field-line"></div>
        <strong>Branch:</strong> [ ] Ghaziabad &nbsp; [ ] Meerut &nbsp; [ ] Dehradun<br/>
        <strong>Preferred Product:</strong> [ ] Curtains &nbsp; [ ] Blinds &nbsp; [ ] Wallpapers &nbsp; [ ] Mattress &nbsp; [ ] Upholstery
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:30px;text-align:center;">#</th>
          <th style="width:120px;">Room</th>
          <th style="width:110px;">Window / Wall Area</th>
          <th style="width:80px;">Width (in/cm)</th>
          <th style="width:80px;">Height (in/cm)</th>
          <th style="width:40px;">Qty</th>
          <th style="width:120px;">Mount / Type (Rod/Track/Recess)</th>
          <th style="width:130px;">Product / Fabric Choice</th>
          <th>Special Notes</th>
        </tr>
      </thead>
      <tbody>
        ${blankRows}
      </tbody>
    </table>
    <div class="stores">
      <div><strong>Ghaziabad:</strong> C-19 RDC Raj Nagar (0121-4519302, 96346-66617)</div>
      <div><strong>Dehradun:</strong> 33/30 Govind Nagar, Race Course (7303700284)</div>
      <div><strong>Meerut:</strong> A-182 Vidya Laxmi Complex, Abulane (0121-2640212, 93590-53522)</div>
    </div>
    <div class="sig">
      <div>Customer Signature (Verification of Measurements)</div>
      <div>Technician / Measurer Signature</div>
    </div>
  </div>
</body>
</html>`;
}