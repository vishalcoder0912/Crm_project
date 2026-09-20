import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Panel, Tabs, Button, Input, Badge } from '../components/ui';
import { Icon } from '../components/icons';

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'currency', label: 'Currency' },
  { key: 'tax', label: 'Tax' },
  { key: 'workflow', label: 'Order Workflow' },
  { key: 'notifications', label: 'Notification Preferences' },
  { key: 'numbering', label: 'Numbering' },
  { key: 'datetime', label: 'Date & Time' },
  { key: 'security', label: 'Security' },
  { key: 'session', label: 'Session' },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-line-soft py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-2">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="w-full sm:w-72">{children}</div>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-5 w-9 items-center rounded-full transition ${on ? 'bg-brand-500' : 'bg-slate-200'}`}
    >
      <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

const selectClass =
  'h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

export default function SystemSettings() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab')! : 'general';
  const [on, setOn] = useState<Record<string, boolean>>({
    posOnly: false,
    autoFollowUp: true,
    qcGate: true,
    paymentBeforeDelivery: true,
    emailNotifs: false,
    whatsappNotifs: false,
    twoFactor: false,
    enforcePasswordPolicy: true,
  });
  const [saved, setSaved] = useState(false);

  const switchTab = (key: string) => {
    setParams({ tab: key });
    setSaved(false);
  };
  const flip = (k: string) => setOn((o) => ({ ...o, [k]: !o[k] }));

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title="System Settings"
        subtitle="Organization-wide configuration for the CRM workspace."
        actions={<Badge tone="slate">{TABS.find((t) => t.key === tab)?.label}</Badge>}
      />

      <Tabs tabs={TABS} value={tab} onChange={switchTab} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title={TABS.find((t) => t.key === tab)?.label} className="xl:col-span-2" bodyClassName="p-5 pt-1">
          {tab === 'general' && (
            <>
              <Field label="Organization name"><Input defaultValue="Aradhana Furnishing" /></Field>
              <Field label="Default branch">
                <select className={selectClass} defaultValue="Head Office">
                  <option>Head Office</option>
                  <option>Bengaluru South</option>
                  <option>Mangaluru</option>
                </select>
              </Field>
              <Field label="Support email" hint="Replies to customer enquiries are sent from here">
                <Input defaultValue="support@aradhana.com" />
              </Field>
              <Field label="Support phone"><Input defaultValue="+91 98000 00000" /></Field>
            </>
          )}

          {tab === 'currency' && (
            <>
              <Field label="Base currency"><select className={selectClass} defaultValue="INR"><option>INR</option><option>AED</option><option>USD</option></select></Field>
              <Field label="Currency symbol"><Input defaultValue="₹" /></Field>
              <Field label="Decimal places"><select className={selectClass} defaultValue="0"><option>0</option><option>2</option></select></Field>
              <Field label="Amount formatting"><select className={selectClass} defaultValue="en-IN"><option>en-IN</option><option>en-US</option></select></Field>
            </>
          )}

          {tab === 'tax' && (
            <>
              <Field label="Default GST rate"><select className={selectClass} defaultValue="18"><option>0</option><option>5</option><option>12</option><option>18</option><option>28</option></select></Field>
              <Field label="Prices include tax"><Toggle on={!!on.taxInclusive} onClick={() => flip('taxInclusive')} /></Field>
              <Field label="GSTIN"><Input defaultValue="29ABCDE1234F1Z5" /></Field>
              <Field label="Tax label on documents"><Input defaultValue="GST" /></Field>
            </>
          )}

          {tab === 'workflow' && (
            <>
              <Field label="Require QC pass before packing" hint="Blocks packing slips until QC passes"><Toggle on={!!on.qcGate} onClick={() => flip('qcGate')} /></Field>
              <Field label="Require payment before delivery" hint="Guards the paid-before-delivery rule"><Toggle on={!!on.paymentBeforeDelivery} onClick={() => flip('paymentBeforeDelivery')} /></Field>
              <Field label="Auto-create follow-up on quotation sent"><Toggle on={!!on.autoFollowUp} onClick={() => flip('autoFollowUp')} /></Field>
              <Field label="Restrict quotations to accepted measurement"><Toggle on={!!on.posOnly} onClick={() => flip('posOnly')} /></Field>
            </>
          )}

          {tab === 'notifications' && (
            <>
              <Field label="Email notifications" hint="Requires a connected email provider"><Toggle on={!!on.emailNotifs} onClick={() => flip('emailNotifs')} /></Field>
              <Field label="WhatsApp notifications" hint="Requires a connected WhatsApp provider"><Toggle on={!!on.whatsappNotifs} onClick={() => flip('whatsappNotifs')} /></Field>
              <Field label="Digest frequency"><select className={selectClass} defaultValue="Realtime"><option>Realtime</option><option>Hourly</option><option>Daily</option></select></Field>
              <Field label="Quiet hours"><Input defaultValue="22:00 – 08:00" /></Field>
            </>
          )}

          {tab === 'numbering' && (
            <>
              <Field label="Customer prefix"><Input defaultValue="CUS-" /></Field>
              <Field label="Order prefix"><Input defaultValue="ORD-" /></Field>
              <Field label="Quotation prefix"><Input defaultValue="QT-" /></Field>
              <Field label="Reset sequence"><select className={selectClass} defaultValue="Yearly"><option>Never</option><option>Yearly</option><option>Monthly</option></select></Field>
            </>
          )}

          {tab === 'datetime' && (
            <>
              <Field label="Time zone"><select className={selectClass} defaultValue="Asia/Kolkata"><option>Asia/Kolkata</option><option>Asia/Dubai</option><option>UTC</option></select></Field>
              <Field label="Date format"><select className={selectClass} defaultValue="DD MMM YYYY"><option>DD MMM YYYY</option><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option></select></Field>
              <Field label="Time format"><select className={selectClass} defaultValue="12h"><option>12h</option><option>24h</option></select></Field>
              <Field label="Week starts on"><select className={selectClass} defaultValue="Monday"><option>Monday</option><option>Sunday</option></select></Field>
            </>
          )}

          {tab === 'security' && (
            <>
              <Field label="Two-factor authentication"><Toggle on={!!on.twoFactor} onClick={() => flip('twoFactor')} /></Field>
              <Field label="Enforce password policy" hint="Minimum 8 characters with mixed case and a number"><Toggle on={!!on.enforcePasswordPolicy} onClick={() => flip('enforcePasswordPolicy')} /></Field>
              <Field label="Password rotation (days)"><Input type="number" defaultValue={90} /></Field>
              <Field label="Failed login lockout"><Input type="number" defaultValue={5} /></Field>
            </>
          )}

          {tab === 'session' && (
            <>
              <Field label="Session timeout (minutes)"><Input type="number" defaultValue={60} /></Field>
              <Field label="Refresh token lifetime (days)"><Input type="number" defaultValue={7} /></Field>
              <Field label="Allow concurrent sessions"><Toggle on={!!on.concurrent} onClick={() => flip('concurrent')} /></Field>
              <Field label="Force logout on password change"><Toggle on={!!on.forceLogout} onClick={() => flip('forceLogout')} /></Field>
            </>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => setSaved(true)}>
              <Icon name="check" size={15} /> Save changes
            </Button>
            {saved && <span className="text-xs font-medium text-emerald-700">Saved for this session</span>}
          </div>
        </Panel>

        <Panel title="About these settings" subtitle="Scope and persistence" className="h-fit">
          <ul className="space-y-2.5 text-[13px] text-muted">
            <li className="flex gap-2"><Icon name="sliders" size={15} className="mt-0.5 shrink-0" /> Settings apply to the active organization workspace.</li>
            <li className="flex gap-2"><Icon name="alertTriangle" size={15} className="mt-0.5 shrink-0" /> Values are shown for configuration review; persistence is enabled once the settings service is connected.</li>
            <li className="flex gap-2"><Icon name="shield" size={15} className="mt-0.5 shrink-0" /> Security and session changes take effect on next sign-in.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
