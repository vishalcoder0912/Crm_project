import { useState } from 'react';
import { PageHeader, Panel, Tabs, Button, Input, StatusBadge, Badge } from '../components/ui';
import { Icon } from '../components/icons';

const DOC_TYPES = [
  { key: 'quotation', label: 'Quotation' },
  { key: 'requotation', label: 'Requotation' },
  { key: 'purchase-order', label: 'Purchase Order' },
  { key: 'goods-receipt', label: 'Goods Receipt' },
  { key: 'tailoring', label: 'Tailoring Work Order' },
  { key: 'packing', label: 'Packing Slip' },
  { key: 'resizing', label: 'Resizing Slip' },
  { key: 'payment-receipt', label: 'Payment Receipt' },
];

const PREFIX: Record<string, string> = {
  quotation: 'QT-',
  requotation: 'RQ-',
  'purchase-order': 'PO-',
  'goods-receipt': 'GRN-',
  tailoring: 'TWO-',
  packing: 'PS-',
  resizing: 'RS-',
  'payment-receipt': 'PR-',
};

type Form = {
  company: string;
  logo: string;
  address: string;
  gst: string;
  terms: string;
  footer: string;
  prefix: string;
};

const initial = (key: string): Form => ({
  company: 'Aradhana Furnishing',
  logo: '',
  address: 'Head Office, MG Road, Bengaluru 560001',
  gst: '29ABCDE1234F1Z5',
  terms: '50% advance along with order confirmation. Balance before installation.',
  footer: 'Thank you for choosing Aradhana Furnishing.',
  prefix: PREFIX[key] ?? 'DOC-',
});

export default function DocumentSettings() {
  const [tab, setTab] = useState(DOC_TYPES[0].key);
  const [forms, setForms] = useState<Record<string, Form>>(() =>
    Object.fromEntries(DOC_TYPES.map((d) => [d.key, initial(d.key)]))
  );
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const form = forms[tab];
  const set = (patch: Partial<Form>) => {
    setForms((f) => ({ ...f, [tab]: { ...f[tab], ...patch } }));
    setDirty(true);
    setSaved(false);
  };

  const field = (label: string, key: keyof Form, textarea?: boolean) => (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {textarea ? (
        <textarea
          rows={3}
          value={form[key]}
          onChange={(e) => set({ [key]: e.target.value } as Partial<Form>)}
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-2 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      ) : (
        <Input value={form[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<Form>)} />
      )}
    </label>
  );

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title="Document Settings"
        subtitle="Header, footer, numbering and legal details applied to generated documents."
        actions={dirty ? <Badge tone="amber">Unsaved changes</Badge> : <StatusBadge status="SAVED" dot={false} />}
      />

      <Tabs tabs={DOC_TYPES} value={tab} onChange={(k) => { setTab(k); setDirty(false); setSaved(false); }} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title="Branding & identity" subtitle={DOC_TYPES.find((d) => d.key === tab)?.label} className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field('Company name', 'company')}
            {field('Logo URL', 'logo')}
            {field('Registered address', 'address')}
            {field('GST details', 'gst')}
          </div>
          <div className="mt-4 space-y-4">
            {field('Terms & conditions', 'terms', true)}
            {field('Footer note', 'footer', true)}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Numbering">
            {field('Document number prefix', 'prefix')}
            <p className="mt-2 flex items-start gap-2 text-xs text-muted">
              <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0" />
              Preview: <span className="font-medium text-ink-2">{form.prefix}2026-0001</span>
            </p>
          </Panel>

          <Panel title="Apply">
            <p className="text-[13px] text-muted">
              These settings shape printed and shared documents. Saving stores the configuration for this session.
            </p>
            <Button className="mt-4 w-full" onClick={() => { setSaved(true); setDirty(false); }}>
              <Icon name="check" size={15} /> Save {DOC_TYPES.find((d) => d.key === tab)?.label} settings
            </Button>
            {saved && (
              <p className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700">
                <Icon name="checkCircle" size={14} /> Saved for this session
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
