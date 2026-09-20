// hello this is vishal project
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Modal, PageHeader, Select, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu } from '../components/DataTable';
import { Icon } from '../components/icons';
import { useCollection, fmtDate } from '../lib/hooks';
import { data } from '../lib/data';
import {
  MeasurementDraft, SkuOption, TaxMode, suggestSkus, lineComputed, itemTotals, fmtINR, fmtQty,
} from '../lib/measureEstimator';
import { ProductLineDraw } from '../components/ProductLineDraw';

type Gaps = {
  counts: { missingMeasurement: number; pendingMeasurement: number; incompleteDetails: number; total: number };
  gaps: {
    missingMeasurement: any[];
    pendingMeasurement: any[];
    incompleteDetails: any[];
  };
};

const ROOMS = ['Living Room', 'Master Bedroom', 'Kids Bedroom', 'Guest Room', 'Dining Area', 'Balcony', 'Home Office', 'Lobby / Entrance'];
const UNITS = ['inches', 'feet', 'cm', 'meters'];
const MEASURE_TYPES = ['Rod-to-rod', 'Inside frame / Recess', 'Outside frame / Face fix', 'Ceiling to floor', 'Wall to wall'];
const PRODUCT_CATEGORIES = [
  { id: 'curtain', label: 'Curtains (Sheer, Blackout, Velvet, Cotton)' },
  { id: 'blind-venetian', label: 'Venetian Blinds (Horizontal Slats)' },
  { id: 'blind-honeycomb', label: 'Honeycomb Cellular Blinds' },
  { id: 'blind-roller', label: 'Roller / Zebra Blinds' },
  { id: 'wallpaper', label: 'Wallpaper (3D, Floral, Geometric, Vinyl)' },
  { id: 'mattress', label: 'Mattress (Memory Foam, Orthopedic)' },
  { id: 'upholstery', label: 'Upholstery Fabric (Sofa / Chairs)' },
];

const emptyItem = (room = 'Living Room', cat = 'curtain'): MeasurementDraft => ({
  room,
  windowArea: 'Window A',
  width: 60,
  height: 72,
  depth: 8,
  quantity: 1,
  unit: 'inches',
  measurementType: 'Rod-to-rod',
  category: cat,
  notes: '',
});

function toSkuOption(s: any): SkuOption {
  return {
    id: s.id,
    sku: s.sku,
    name: s.name,
    unit: s.unit,
    category: s.product?.category ?? 'Services',
    sellingPrice: Number(s.sellingPrice ?? 0),
    serviceCharge: Number(s.serviceCharge ?? 0),
    taxPercent: Number(s.taxPercent ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* Suggestion strip for a single measurement item                      */
/* ------------------------------------------------------------------ */
function SuggestionStrip({
  item,
  skus,
  picked,
  onPick,
  taxMode,
}: {
  item: MeasurementDraft;
  skus: SkuOption[];
  picked: SkuOption | null;
  onPick: (s: SkuOption) => void;
  taxMode: TaxMode;
}) {
  const suggestions = useMemo(() => suggestSkus(item, skus, 4), [item, skus]);
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s) => {
        const active = picked?.id === s.id;
        const l = lineComputed(item, s, taxMode);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s)}
            className={`group min-w-[180px] flex-1 rounded-xl border p-2.5 text-left transition ${
              active ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-line-soft bg-white hover:border-brand-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-semibold text-ink">{s.name}</span>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 text-transparent'}`}>
                <Icon name="check" size={11} />
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">{s.category} · {s.unit}</p>
            <p className="mt-1.5 text-[12px] text-ink-2">
              <span className="font-bold text-ink">{fmtQty(l.qty)} {l.qtyUnit}</span>{' '}
              @ {fmtINR(s.sellingPrice)} <span className="text-muted">incl. {l.taxPercent}% GST</span>
            </p>
            <p className="text-[13px] font-bold text-teal-800">{fmtINR(l.amount, 0)}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Measurements Component                                         */
/* ------------------------------------------------------------------ */
export default function Measurements() {
  const { rows, loading, refresh } = useCollection('/measurements');
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [gaps, setGaps] = useState<Gaps | null>(null);
  const [gapsLoading, setGapsLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxMode, setTaxMode] = useState<TaxMode>('INTRA');
  const [selected, setSelected] = useState<any | null>(null);

  // new measurement form state
  const [customerMode, setCustomerMode] = useState<'existing' | 'new' | 'guest'>('existing');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [items, setItems] = useState<MeasurementDraft[]>([emptyItem('Living Room', 'curtain')]);
  const [picks, setPicks] = useState<Record<number, SkuOption | null>>({});
  const [measurementDate, setMeasurementDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [stats, setStats] = useState({ missingMeasurement: 0, pendingMeasurement: 0, incompleteDetails: 0 });

  // gaps fix state
  const [fixFor, setFixFor] = useState<any | null>(null);
  const [fixForm, setFixForm] = useState<any>({});
  const [fixBusy, setFixBusy] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);

  // Schedule measurement visit modal state (Scenario A)
  const [scheduleModal, setScheduleModal] = useState<any | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })(),
    scheduledTime: '11:00 AM',
    assignedToId: '',
    siteAddress: '',
    notes: '',
  });
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);

  // Search filter across measurements table
  const [searchFilter, setSearchFilter] = useState('');

  const loadCatalog = () => {
    data.list('/skus?pageSize=100').then((s) => setSkus(s.map(toSkuOption))).catch(() => setSkus([]));
    data.list('/customers?pageSize=200').then(setCustomers).catch(() => setCustomers([]));
    data.list('/users?pageSize=50').then(setStaff).catch(() => setStaff([]));
  };

  const loadGaps = () => {
    setGapsLoading(true);
    data.one<Gaps>('/measurements/gaps')
      .then((g) => {
        const safe = (g && g.gaps && g.counts ? g : { counts: { missingMeasurement: 0, pendingMeasurement: 0, incompleteDetails: 0, total: 0 }, gaps: { missingMeasurement: [], pendingMeasurement: [], incompleteDetails: [] } }) as Gaps;
        setGaps(safe);
        setStats({
          missingMeasurement: safe.counts.missingMeasurement,
          pendingMeasurement: safe.counts.pendingMeasurement,
          incompleteDetails: safe.counts.incompleteDetails,
        });
      })
      .catch(() => {
        setGaps(null);
        setStats({ missingMeasurement: 0, pendingMeasurement: 0, incompleteDetails: 0 });
      })
      .finally(() => setGapsLoading(false));
  };

  useEffect(() => {
    loadCatalog();
    loadGaps();
  }, []);

  const openCreate = (prefill?: { customerId?: number; name?: string; phone?: string; address?: string; room?: string; guest?: boolean }) => {
    setEditing(null);
    setError(null);
    if (prefill?.guest) {
      setCustomerMode('guest');
      setCustomerId(null);
      setNewCustomer({ name: 'Guest Client', phone: '', address: '' });
    } else {
      setCustomerMode(prefill?.customerId ? 'existing' : 'new');
      setCustomerId(prefill?.customerId ?? null);
      setNewCustomer({ name: prefill?.name ?? '', phone: prefill?.phone ?? '', address: prefill?.address ?? '' });
    }
    setItems([emptyItem(prefill?.room ?? 'Living Room', 'curtain')]);
    setPicks({});
    setMeasurementDate(new Date().toISOString().slice(0, 10));
    setShow(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setError(null);
    setCustomerMode('existing');
    setCustomerId(r.customerId);
    setNewCustomer({ name: r.customer?.name ?? '', phone: r.customer?.phone ?? '', address: r.customer?.address ?? '' });
    const mapped = (r.items ?? []).map((i: any) => ({
      room: i.room,
      windowArea: i.windowArea,
      width: Number(i.width),
      height: Number(i.height),
      quantity: Number(i.quantity ?? 1),
      unit: i.unit,
      measurementType: i.measurementType ?? 'Rod-to-rod',
      notes: i.notes ?? '',
    }));
    setItems(mapped.length ? mapped : [emptyItem()]);
    setPicks({});
    setMeasurementDate(String(r.measurementDate ?? '').slice(0, 10));
    setShow(true);
  };

  const close = () => {
    setShow(false);
    setEditing(null);
    setError(null);
  };

  const resolveCustomerId = async (): Promise<number> => {
    if (customerMode === 'existing' && customerId) return customerId;
    if (customerMode === 'guest') {
      // Create a guest record or fallback to anonymous lead
      const created = await data.post('/customers', {
        name: newCustomer.name.trim() || 'Guest Client (Draft Estimate)',
        phone: newCustomer.phone.trim() || '9999999999',
        address: newCustomer.address.trim() || 'Quick Consultation',
        notes: 'Created via quick measurement estimate entry',
      });
      return created.id;
    }
    if (!newCustomer.name.trim()) throw new Error('Customer name is required');
    const created = await data.post('/customers', {
      name: newCustomer.name.trim(),
      phone: newCustomer.phone.trim() || undefined,
      address: newCustomer.address.trim() || undefined,
    });
    return created.id;
  };

  const saveMeasurement = async (download = false) => {
    setBusy(true);
    setError(null);
    try {
      const customer = await resolveCustomerId();
      const payloadItems = items.map((i) => ({
        room: i.room,
        windowArea: i.windowArea,
        width: Number(i.width),
        height: Number(i.height),
        quantity: Number(i.quantity ?? 1),
        unit: i.unit,
        measurementType: i.measurementType,
        notes: i.notes || undefined,
      }));

      let id: number;
      if (editing?.id) {
        const updated = await data.patch(`/measurements/${editing.id}`, {
          measurementDate: new Date(measurementDate).toISOString(),
          items: { deleteMany: {}, create: payloadItems },
        });
        id = updated.id;
      } else {
        const created = await data.post('/measurements', {
          customerId: customer,
          measurementDate: new Date(measurementDate).toISOString(),
          items: payloadItems,
        });
        id = created.id;
      }

      if (download) {
        const pickMap: Record<number, number> = {};
        items.forEach((_, idx) => {
          const s = picks[idx];
          if (s) pickMap[idx + 1] = s.id;
        });
        await downloadSheet(id, pickMap, taxMode);
      }

      setShow(false);
      setEditing(null);
      refresh();
      loadGaps();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save measurement');
    } finally {
      setBusy(false);
    }
  };

  const downloadSheet = async (id: number, pickMap: Record<number, number>, mode: TaxMode) => {
    try {
      const res = await data.post(`/measurements/${id}/sheet`, { picks: pickMap, taxMode: mode });
      if (typeof res === 'string' && res.trim().startsWith('<!DOCTYPE html>')) {
        const blob = new Blob([res], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Aradhana-Furnishing-Estimate-M-${id}-${mode === 'INTER' ? 'IGST' : 'CGST-SGST'}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } else {
        window.alert('Measurement sheet ready. Open it from the measurement detail to print.');
      }
    } catch (e: any) {
      window.alert(e?.message ?? 'Could not generate measurement sheet');
    }
  };

  const downloadBlankSheet = async () => {
    try {
      const res = await data.one('/measurements/blank-sheet');
      if (typeof res === 'string' && res.trim().startsWith('<!DOCTYPE html>')) {
        const blob = new Blob([res], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Aradhana-Furnishing-Blank-Measurement-Sheet.html';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch {
      window.open('/api/measurements/blank-sheet', '_blank');
    }
  };

  const remove = async (r: any) => {
    if (!window.confirm(`Delete measurement ${r.businessId}?`)) return;
    try {
      await data.del(`/measurements/${r.id}`);
      refresh();
      loadGaps();
    } catch (e: any) {
      window.alert(e?.message ?? 'Could not delete measurement');
    }
  };

  // Search customer query supporting phone number & name
  const matchedCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    if (!q) return customers.slice(0, 8);
    return customers
      .filter((c) => {
        const nameMatch = (c.name ?? '').toLowerCase().includes(q);
        const phoneMatch = digits.length >= 3 && (c.phone ?? '').includes(digits);
        const idMatch = (c.businessId ?? '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || idMatch;
      })
      .slice(0, 8);
  }, [customers, customerQuery]);

  const totals = useMemo(() => {
    return itemTotals(items.map((item, idx) => ({ item, sku: picks[idx] ?? suggestSkus(item, skus, 1)[0] ?? null, taxMode })));
  }, [items, picks, skus, taxMode]);

  const gapCards = [
    {
      key: 'missingMeasurement' as const,
      label: 'Details, no measurement',
      desc: 'Customer registered but site measurements not taken yet',
      count: stats.missingMeasurement,
      icon: 'inbox',
      tone: 'amber',
      items: gaps?.gaps.missingMeasurement ?? [],
    },
    {
      key: 'pendingMeasurement' as const,
      label: 'Measurement promised',
      desc: 'Enquiries waiting on their scheduled measurement visit',
      count: stats.pendingMeasurement,
      icon: 'clock',
      tone: 'sky',
      items: gaps?.gaps.pendingMeasurement ?? [],
    },
    {
      key: 'incompleteDetails' as const,
      label: 'Measurement, no details',
      desc: 'Measurement recorded but customer phone or address missing',
      count: stats.incompleteDetails,
      icon: 'alertTriangle',
      tone: 'rose',
      items: gaps?.gaps.incompleteDetails ?? [],
    },
  ];

  const downloadFromRow = (r: any) => {
    downloadSheet(r.id, {}, taxMode);
  };

  // Schedule visit action handler
  const handleScheduleVisit = async () => {
    setScheduleBusy(true);
    try {
      await data.post('/measurements/schedule-visit', {
        customerId: scheduleModal.customerId || scheduleModal.id,
        scheduledDate: scheduleForm.scheduledDate,
        scheduledTime: scheduleForm.scheduledTime,
        assignedToId: scheduleForm.assignedToId || undefined,
        siteAddress: scheduleForm.siteAddress || scheduleModal.address || '',
        phone: scheduleModal.phone || '',
        customerName: scheduleModal.name || '',
        notes: scheduleForm.notes || undefined,
      });
      setScheduleSuccess('Visit scheduled successfully and added to Calendar!');
      setTimeout(() => {
        setScheduleModal(null);
        setScheduleSuccess(null);
        loadGaps();
        refresh();
      }, 1400);
    } catch (e: any) {
      window.alert(e?.message ?? 'Could not schedule visit');
    } finally {
      setScheduleBusy(false);
    }
  };

  return (
    <div className="fade-in space-y-6">
      {/* Aradhana Furnishing Brand & Stores Banner */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-teal-50/50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-lg font-black text-white shadow-sm">
                AF
              </span>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  Aradhana <span className="text-teal-700">Furnishing</span>
                </h1>
                <p className="text-xs font-semibold text-slate-500">
                  #1 Leading Home Furnishing Brand in Delhi NCR · Curtains, Wallpapers, Blinds, Mattresses &amp; Upholstery
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>📍 <strong>Ghaziabad:</strong> C-19 RDC Raj Nagar (0121-4519302, 96346-66617)</span>
              <span>📍 <strong>Dehradun:</strong> Govind Nagar, Race Course (7303700284)</span>
              <span>📍 <strong>Meerut:</strong> Abulane (0121-2640212, 93590-53522)</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={downloadBlankSheet} title="Download blank measurement form for site technicians">
              <Icon name="download" size={15} /> Blank Measure Sheet
            </Button>
            <Button onClick={() => openCreate({ guest: true })} variant="secondary" title="Quick estimate without customer details">
              <Icon name="sparkles" size={15} /> Quick Walk-in Estimate
            </Button>
            <Button onClick={() => openCreate()}>
              <Icon name="plus" size={15} /> New measurement
            </Button>
          </div>
        </div>
      </div>

      <PageHeader
        title="Measurements & Technical Blueprints"
        subtitle={`${rows.length} measurements on record · ${stats.incompleteDetails + stats.pendingMeasurement + stats.missingMeasurement} data gaps to resolve`}
        actions={
          <Button variant="secondary" onClick={loadGaps}><Icon name="refresh" size={15} /> Refresh Data</Button>
        }
      />

      {/* Data gaps — Find it & Fix it Matrix */}
      <div className="grid gap-3 md:grid-cols-3">
        {gapCards.map((c) => (
          <div key={c.key} className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-line-soft text-muted"><Icon name={c.icon} size={16} /></span>
                {c.label}
              </span>
              {gapsLoading ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand-500" /> : (
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-sm font-bold text-brand-800">{c.count}</span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">{c.desc}</p>
            <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto scroll-slim pr-1">
              {c.items.slice(0, 5).map((g: any) => (
                <div key={`${c.key}-${g.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink">{g.name}</p>
                    <p className="truncate text-[11px] text-muted">{g.phone ?? g.businessId ?? ''} · {fmtDate(g.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {c.key === 'missingMeasurement' && (
                      <button
                        className="rounded bg-teal-100 px-2 py-1 text-[10.5px] font-bold text-teal-900 hover:bg-teal-200"
                        onClick={() => {
                          setScheduleModal(g);
                          setScheduleForm({
                            scheduledDate: new Date().toISOString().slice(0, 10),
                            scheduledTime: '11:00 AM',
                            assignedToId: '',
                            siteAddress: g.address || '',
                            notes: 'Doorstep measurement requested',
                          });
                        }}
                      >
                        📅 Schedule Visit
                      </button>
                    )}
                    <button
                      className="text-[11px] font-semibold text-brand-800 hover:underline"
                      onClick={() => {
                        if (c.key === 'incompleteDetails') {
                          setFixForm({ phone: g.phone ?? '', address: g.address ?? '' });
                          setFixError(null);
                          setFixFor({ label: 'Complete customer details', name: g.name, missing: g.missing, measurementId: g.id });
                        } else {
                          openCreate({
                            customerId: c.key === 'pendingMeasurement' ? g.customerId : g.id,
                            name: g.name,
                            phone: g.phone ?? undefined,
                            address: g.address ?? undefined,
                          });
                        }
                      }}
                    >
                      {c.key === 'incompleteDetails' ? 'Fix Details →' : '+ Measure →'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Measurements table with omni-search by phone and name */}
      <DataTable
        columns={[
          { key: 'businessId', label: 'ID', render: (r) => <span className="font-semibold text-ink">{r.businessId}</span> },
          {
            key: 'customer',
            label: 'Customer (Name / Phone)',
            search: true,
            render: (r) => {
              const missing = !r.customer?.phone || !r.customer?.address;
              return (
                <div>
                  <Link to={`/customers/${r.customerId}`} className="font-semibold text-ink hover:text-brand-800 hover:underline">{r.customer?.name ?? '—'}</Link>
                  <p className="text-[11px] text-muted">
                    {r.customer?.phone ? (
                      <span className="font-mono text-slate-700">{r.customer.phone}</span>
                    ) : (
                      <span className="text-amber-600">no phone on record</span>
                    )}
                    {missing ? <span className="ml-1 text-amber-600">· incomplete</span> : null}
                  </p>
                </div>
              );
            },
          },
          {
            key: 'items',
            label: 'Items & Rooms',
            render: (r) => (
              <span className="text-ink-2">
                <strong>{r.items?.length ?? 0} item(s)</strong> · {[...new Set((r.items ?? []).map((i: any) => i.room))].slice(0, 3).join(', ') || '—'}
              </span>
            ),
          },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'measuredBy', label: 'Measured by', render: (r) => <span className="text-ink-2">{r.measuredBy ? `${r.measuredBy.firstName} ${r.measuredBy.lastName}` : 'On-Site Team'}</span> },
          { key: 'measurementDate', label: 'Date', render: (r) => fmtDate(r.measurementDate) },
          {
            key: 'actions',
            label: '',
            render: (r) => (
              <ActionMenu
                items={[
                  { label: 'View Technical Blueprint', icon: <Icon name="grid" size={14} />, onClick: () => setSelected(r) },
                  { label: 'Edit Measurements', icon: <Icon name="edit" size={14} />, onClick: () => openEdit(r) },
                  { label: 'Download GST Estimate', icon: <Icon name="download" size={14} />, onClick: () => downloadFromRow(r) },
                  { label: 'Customer Profile', icon: <Icon name="customers" size={14} />, onClick: () => setSelected(null) },
                  { label: 'Delete', tone: 'danger', icon: <Icon name="trash" size={14} />, onClick: () => remove(r) },
                ]}
              />
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['customer.name', 'customer.phone', 'businessId']}
        searchPlaceholder="Search customer by name or 10-digit mobile number…"
        emptyTitle="No measurements yet"
        onRowClick={(r) => setSelected(r)}
      />

      {/* Create / edit measurement modal with Live 2D Line Drawing */}
      <Modal open={show} onClose={close} title={editing?.id ? `Edit ${editing.businessId}` : 'New Measurement & Normal View'} wide>
        <div className="space-y-5">
          {/* Customer Selection or Guest Estimate */}
          <div className="rounded-xl border border-line-soft bg-canvas p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">
                Customer Reference · <span className="font-normal text-muted">Select existing, quick-add, or enter as draft estimate</span>
              </p>
              <div className="flex gap-1 rounded-lg bg-line-soft p-0.5">
                {(['existing', 'new', 'guest'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCustomerMode(m)}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${customerMode === m ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
                  >
                    {m === 'existing' ? 'Search by Name / Phone' : m === 'new' ? 'Quick Add' : 'Guest / Draft'}
                  </button>
                ))}
              </div>
            </div>

            {customerMode === 'existing' && (
              <div>
                <Input
                  value={customerQuery}
                  onChange={(e) => { setCustomerQuery(e.target.value); setCustomerId(null); }}
                  placeholder="Type customer name or mobile number (e.g. 96346, 73037)…"
                />
                {customerQuery && (
                  <div className="mt-2 max-h-44 overflow-y-auto scroll-slim rounded-xl border border-line bg-white shadow-sm">
                    {matchedCustomers.length === 0 && <p className="px-4 py-3 text-sm text-muted">No customers match — switch to quick add or guest estimate.</p>}
                    {matchedCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCustomerId(c.id); setCustomerQuery(`${c.name} · ${c.phone ?? 'no phone'}`); }}
                        className={`flex w-full items-center gap-2 border-b border-line-soft px-4 py-2.5 text-left text-sm transition hover:bg-brand-50 ${customerId === c.id ? 'bg-brand-50' : ''}`}
                      >
                        <Icon name="customers" size={14} className="text-muted" />
                        <span className="font-medium text-ink">{c.name}</span>
                        <span className="font-mono text-muted">{c.phone}</span>
                        {customerId === c.id && <Icon name="check" size={14} className="ml-auto text-brand-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {customerMode === 'new' && (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-[11px] font-medium text-muted">Customer Name *</label><Input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="e.g. Rohit Verma" /></div>
                <div><label className="mb-1 block text-[11px] font-medium text-muted">Phone Number *</label><Input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="10-digit mobile" /></div>
                <div className="col-span-2"><label className="mb-1 block text-[11px] font-medium text-muted">Site / Home Address</label><Input value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} placeholder="e.g. C-19 RDC Raj Nagar, Ghaziabad" /></div>
              </div>
            )}

            {customerMode === 'guest' && (
              <div className="rounded-lg bg-teal-50/70 p-3 text-xs text-teal-900">
                <p className="font-semibold">⚡ Quick Walk-in Estimate Mode</p>
                <p className="mt-0.5 text-teal-700">Enter measurements, inspect live 2D technical drawings, and generate a GST quote immediately. You can assign customer details anytime before saving.</p>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-[11px] font-medium text-muted">Measurement Date</label><Input type="date" value={measurementDate} onChange={(e) => setMeasurementDate(e.target.value)} /></div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted">GST Tax Mode</label>
                <Select value={taxMode} onChange={(e) => setTaxMode(e.target.value as TaxMode)}>
                  <option value="INTRA">CGST (9%) + SGST (9%) — Intra-state (UP/Uttarakhand)</option>
                  <option value="INTER">IGST (18%) — Inter-state</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Measurement Items with Live 2D Line Drawings */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">Measured Items &amp; Dynamic Schematics</p>
              <Button variant="secondary" onClick={() => setItems([...items, emptyItem(ROOMS[items.length % ROOMS.length], 'curtain')])}>
                <Icon name="plus" size={14} /> Add item
              </Button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-line-soft bg-white p-4 shadow-sm">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <label className="mb-1 block text-[11px] font-medium text-muted">Product Type</label>
                    <Select
                      value={item.category || 'curtain'}
                      onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, category: e.target.value } : x)))}
                    >
                      {PRODUCT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <label className="mb-1 block text-[11px] font-medium text-muted">Room / Area</label>
                    <Select value={item.room} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, room: e.target.value } : x)))}>
                      {ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-[11px] font-medium text-muted">Width</label>
                    <Input type="number" min={1} value={item.width} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, width: Number(e.target.value) } : x)))} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-[11px] font-medium text-muted">Height / Drop</label>
                    <Input type="number" min={1} value={item.height} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, height: Number(e.target.value) } : x)))} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-[11px] font-medium text-muted">Unit</label>
                    <Select value={item.unit} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)))}>
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <label className="mb-1 block text-[11px] font-medium text-muted">Quantity</label>
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x)))} />
                  </div>
                  <div className="col-span-8">
                    <label className="mb-1 block text-[11px] font-medium text-muted">Mounting / Measurement Type</label>
                    <Select value={item.measurementType} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, measurementType: e.target.value } : x)))}>
                      {MEASURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-end pb-1">
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          const next = { ...picks };
                          delete next[idx];
                          setPicks(next);
                          setItems(items.filter((_, i) => i !== idx));
                        }}
                      >
                        <Icon name="trash" size={15} /> Remove
                      </Button>
                    )}
                  </div>
                </div>

                {/* 2D Line Drawing Normal View & Suggestions Grid */}
                <div className="mt-4 grid gap-4 lg:grid-cols-[330px_1fr]">
                  {/* Dynamic Technical Line Draw */}
                  <div>
                    <ProductLineDraw
                      category={item.category}
                      width={item.width}
                      height={item.height}
                      depth={item.depth}
                      unit={item.unit}
                      quantity={item.quantity}
                      label={item.windowArea}
                      room={item.room}
                      measurementType={item.measurementType}
                    />
                  </div>

                  {/* Product Recommendations & Calculation */}
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
                      <Icon name="sparkles" size={14} className="text-brand-600" /> Aradhana Furnishing Recommendations
                      <span className="font-normal text-muted">· choose product/fabric for this measurement</span>
                    </p>
                    <SuggestionStrip item={item} skus={skus} picked={picks[idx] ?? null} onPick={(s) => setPicks({ ...picks, [idx]: s })} taxMode={taxMode} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Estimate Summary */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Aradhana Furnishing GST Quotation Estimate</p>
                <p className="text-xs text-muted">Includes base fabric, tailoring/stitching, hardware and applicable GST</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => saveMeasurement(true)} disabled={busy}>
                  <Icon name="download" size={15} /> {busy ? 'Processing…' : 'Save & Download Sheet'}
                </Button>
                <Button onClick={() => saveMeasurement(false)} disabled={busy}>{busy ? 'Saving…' : 'Save Measurement'}</Button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px] sm:grid-cols-4">
              <div className="flex justify-between gap-2"><span className="text-muted">Subtotal (Material)</span><span className="font-semibold tabular-nums">{fmtINR(totals.subtotal)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted">Stitching &amp; Services</span><span className="font-semibold tabular-nums">{fmtINR(totals.serviceCharges)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted">Taxable Value</span><span className="font-semibold tabular-nums">{fmtINR(totals.taxable)}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted">{taxMode === 'INTRA' ? `CGST + SGST (9%+9%)` : `IGST (18%)`}</span><span className="font-semibold tabular-nums">{fmtINR(totals.tax)}</span></div>
              <div className="col-span-2 flex justify-between gap-2 border-t border-teal-200 pt-2 sm:col-span-4"><span className="text-[13px] font-semibold text-ink">Grand Total (All Taxes Included)</span><span className="text-[16px] font-bold tabular-nums text-teal-800">{fmtINR(totals.grandTotal, 0)}</span></div>
            </div>
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        </div>
      </Modal>

      {/* Measurement detail modal with Technical Blueprint */}
      {selected && (
        <Modal open onClose={() => setSelected(null)} title={`${selected.businessId} · Technical Specification`} wide>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas p-3">
              <div>
                <Link to={`/customers/${selected.customerId}`} className="text-sm font-semibold text-ink hover:text-brand-800 hover:underline">
                  {selected.customer?.name ?? '—'}
                </Link>
                <p className="text-xs text-muted">
                  Phone: <strong>{selected.customer?.phone ?? 'no phone'}</strong> · Address: {selected.customer?.address ?? 'no address'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.status} />
                <Button variant="secondary" onClick={() => downloadFromRow(selected)}><Icon name="download" size={14} /> Download Estimate Sheet</Button>
              </div>
            </div>

            {/* Line Drawings for all items in selected measurement */}
            <div className="grid gap-4 sm:grid-cols-2">
              {(selected.items ?? []).map((it: any) => (
                <div key={it.id} className="rounded-xl border border-line-soft p-3">
                  <ProductLineDraw
                    width={Number(it.width)}
                    height={Number(it.height)}
                    unit={it.unit}
                    quantity={Number(it.quantity ?? 1)}
                    label={it.windowArea}
                    room={it.room}
                    measurementType={it.measurementType}
                  />
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule Measurement Visit Modal (Scenario A) */}
      {scheduleModal && (
        <Modal open onClose={() => setScheduleModal(null)} title="Schedule Doorstep Measurement Visit">
          <div className="space-y-4">
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 text-xs text-teal-900">
              <p className="font-semibold text-sm">Customer: {scheduleModal.name}</p>
              <p>Phone: <strong>{scheduleModal.phone ?? 'Not provided'}</strong></p>
              <p>Site: {scheduleModal.address ?? 'Address to be verified'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-2">Scheduled Date *</label>
                <Input type="date" value={scheduleForm.scheduledDate} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-2">Time Slot</label>
                <Select value={scheduleForm.scheduledTime} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledTime: e.target.value })}>
                  <option value="10:00 AM">10:00 AM - 11:30 AM</option>
                  <option value="11:30 AM">11:30 AM - 01:00 PM</option>
                  <option value="02:00 PM">02:00 PM - 03:30 PM</option>
                  <option value="04:00 PM">04:00 PM - 05:30 PM</option>
                  <option value="06:00 PM">06:00 PM - 07:30 PM</option>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-2">Assign Technician / Measurer</label>
                <Select value={scheduleForm.assignedToId} onChange={(e) => setScheduleForm({ ...scheduleForm, assignedToId: e.target.value })}>
                  <option value="">Select Technician (or assign me)</option>
                  {staff.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role?.name ?? 'Staff'})</option>)}
                </Select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-2">Site Address</label>
                <Input value={scheduleForm.siteAddress} onChange={(e) => setScheduleForm({ ...scheduleForm, siteAddress: e.target.value })} placeholder="Detailed house/flat address for field technician" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-2">Notes</label>
                <Input value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} placeholder="e.g. 3 Living room windows, preferred blackout fabrics" />
              </div>
            </div>

            {/* WhatsApp confirmation preview */}
            {scheduleModal.phone && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800">
                <p className="font-semibold mb-1">WhatsApp Customer Confirmation:</p>
                <p className="italic">
                  "Dear {scheduleModal.name}, your measurement visit with Aradhana Furnishing is confirmed for {scheduleForm.scheduledDate} at {scheduleForm.scheduledTime}. Our technician will carry sample catalogues for Ghaziabad, Meerut & Dehradun stores."
                </p>
                <a
                  href={`https://wa.me/91${scheduleModal.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Dear ${scheduleModal.name}, your measurement visit with Aradhana Furnishing is confirmed for ${scheduleForm.scheduledDate} at ${scheduleForm.scheduledTime}. Our technician will carry sample catalogues.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-block text-[11px] font-bold text-emerald-900 underline"
                >
                  Send via WhatsApp →
                </a>
              </div>
            )}

            {scheduleSuccess && <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800 font-semibold">{scheduleSuccess}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setScheduleModal(null)}>Cancel</Button>
              <Button onClick={handleScheduleVisit} disabled={scheduleBusy}>
                {scheduleBusy ? 'Scheduling…' : 'Schedule on Calendar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Fix incomplete details modal */}
      {fixFor && (
        <Modal open onClose={() => setFixFor(null)} title={fixFor.label}>
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {fixFor.name} — measurement saved but {fixFor.missing?.join(' & ')} missing.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium text-ink-2">Mobile Phone *</label><Input value={fixForm.phone ?? ''} onChange={(e) => setFixForm({ ...fixForm, phone: e.target.value })} placeholder="10-digit mobile number" /></div>
              <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-ink-2">Site / Customer Address *</label><Input value={fixForm.address ?? ''} onChange={(e) => setFixForm({ ...fixForm, address: e.target.value })} placeholder="Customer site address" /></div>
            </div>
            {fixError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{fixError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setFixFor(null)}>Cancel</Button>
              <Button
                disabled={fixBusy}
                onClick={async () => {
                  setFixBusy(true); setFixError(null);
                  try {
                    const m = (await data.one(`/measurements/${fixFor.measurementId}`)) as any;
                    if (!m?.customer?.id) throw new Error('Measurement customer not found');
                    await data.patch(`/customers/${m.customer.id}`, {
                      ...((fixForm.phone ?? '').trim() ? { phone: fixForm.phone.trim() } : {}),
                      ...((fixForm.address ?? '').trim() ? { address: fixForm.address.trim() } : {}),
                    });
                    setFixFor(null); loadGaps(); refresh();
                  } catch (e: any) {
                    setFixError(e?.message ?? 'Could not save details');
                  } finally { setFixBusy(false); }
                }}
              >
                {fixBusy ? 'Saving…' : 'Save details'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}