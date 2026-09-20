import { useState } from 'react';
import { PageHeader, Panel, Button, Badge } from '../components/ui';
import { useCollection, fmtDate, fmtTime } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

type Channel = 'enabled' | 'inapp' | 'email' | 'whatsapp';

const RULES: { event: string; recipients: string }[] = [
  { event: 'Measurement Scheduled', recipients: 'Measurement Team' },
  { event: 'Quotation Approved', recipients: 'Sales + Order Manager' },
  { event: 'PO Awaiting Approval', recipients: 'Procurement Manager' },
  { event: 'Material Received', recipients: 'Warehouse' },
  { event: 'QC Failed', recipients: 'Order Manager' },
  { event: 'Installation Scheduled', recipients: 'Field Team' },
  { event: 'Payment Pending', recipients: 'Finance' },
  { event: 'Resizing Required', recipients: 'Production' },
];

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`inline-flex h-5 w-9 items-center rounded-full transition ${on ? 'bg-brand-500' : 'bg-slate-200'}`}
    >
      <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function Notifications() {
  const { rows, refresh } = useCollection('/notifications');
  const [rules, setRules] = useState(
    () => RULES.map((r) => ({ ...r, enabled: true, inapp: true, email: false, whatsapp: false }))
  );
  const [saving, setSaving] = useState(false);

  const flip = (i: number, key: Channel) =>
    setRules((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: !r[key] } : r)));

  const markAll = async () => {
    setSaving(true);
    try {
      await data.post('/notifications/read-all');
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title="Notifications"
        subtitle="Configure which events alert which teams, and review your own notification inbox."
      />

      <Panel title="Notification rules" subtitle="In-app delivery is active. Email and WhatsApp require a connected provider." bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">Recipients</th>
                <th className="px-5 py-3 text-center">Enabled</th>
                <th className="px-5 py-3 text-center">In-app</th>
                <th className="px-5 py-3 text-center">Email</th>
                <th className="px-5 py-3 text-center">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rules.map((r, i) => (
                <tr key={r.event}>
                  <td className="px-5 py-3 font-medium text-ink">{r.event}</td>
                  <td className="px-5 py-3 text-ink-2">{r.recipients}</td>
                  <td className="px-5 py-3 text-center">
                    <Toggle on={r.enabled} label={`Enable ${r.event}`} onClick={() => flip(i, 'enabled')} />
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Toggle on={r.inapp} label="In-app" onClick={() => flip(i, 'inapp')} />
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Toggle on={r.email} label="Email" onClick={() => flip(i, 'email')} />
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Toggle on={r.whatsapp} label="WhatsApp" onClick={() => flip(i, 'whatsapp')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t border-line-soft px-5 py-3 text-xs text-muted">
          <Icon name="alertTriangle" size={14} />
          Email and WhatsApp toggles are inactive until a provider is connected in Communication Settings.
        </div>
      </Panel>

      <Panel
        title="My inbox"
        subtitle={`${rows.filter((n) => !n.isRead).length} unread`}
        action={
          <Button variant="secondary" onClick={markAll} disabled={saving}>
            <Icon name="check" size={15} /> Mark all read
          </Button>
        }
        bodyClassName="p-0"
      >
        {rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">No notifications</p>}
        <div className="divide-y divide-line-soft">
          {rows.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 px-5 py-3.5 ${n.isRead ? '' : 'bg-brand-50/60'}`}>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-slate-300' : 'bg-brand-500'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-ink">{n.title}</p>
                  <Badge tone="slate">{n.type}</Badge>
                </div>
                <p className="mt-0.5 text-[13px] text-muted">{n.message}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {fmtDate(n.createdAt)} · {fmtTime(n.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
