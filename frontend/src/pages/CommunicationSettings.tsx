import { useState } from 'react';
import { PageHeader, Panel, Button, Input, Badge } from '../components/ui';
import { Icon } from '../components/icons';

type ChannelCfg = {
  key: string;
  name: string;
  icon: string;
  providers: string[];
  templates: string[];
};

const CHANNELS: ChannelCfg[] = [
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    icon: 'whatsapp',
    providers: ['WhatsApp Business Cloud API', 'Twilio', 'Gupshup'],
    templates: ['Quotation Sent', 'Order Confirmed', 'Installation Reminder', 'Payment Reminder'],
  },
  {
    key: 'email',
    name: 'Email',
    icon: 'mail',
    providers: ['SMTP', 'Amazon SES', 'SendGrid', 'Zoho Mail'],
    templates: ['Quotation', 'Order Confirmation', 'Invoice', 'Goods Receipt'],
  },
  {
    key: 'sms',
    name: 'SMS',
    icon: 'message',
    providers: ['Twilio', 'MSG91', 'Kaleyra'],
    templates: ['OTP', 'Delivery Update', 'Payment Reminder'],
  },
];

export default function CommunicationSettings() {
  const [provider, setProvider] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [sender, setSender] = useState<Record<string, string>>({});

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title="Communication Settings"
        subtitle="Provider configuration for outbound customer communication. Credentials are stored server-side only."
        actions={
          <Badge tone="amber">
            <Icon name="alertTriangle" size={13} /> Providers not connected
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {CHANNELS.map((c) => {
          const on = !!enabled[c.key];
          return (
            <Panel
              key={c.key}
              title={
                <span className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-100 text-brand-800">
                    <Icon name={c.icon} size={15} />
                  </span>
                  {c.name}
                </span>
              }
              action={
                <button
                  onClick={() => setEnabled((e) => ({ ...e, [c.key]: !on }))}
                  className={`inline-flex h-5 w-9 items-center rounded-full transition ${on ? 'bg-brand-500' : 'bg-slate-200'}`}
                  title={`${on ? 'Disable' : 'Enable'} ${c.name}`}
                >
                  <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2">
                  <span className="text-[13px] text-muted">Connection status</span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Not connected
                  </span>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Provider</span>
                  <select
                    value={provider[c.key] ?? ''}
                    onChange={(e) => setProvider((p) => ({ ...p, [c.key]: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="">Select provider…</option>
                    {c.providers.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Sender identity</span>
                  <Input
                    value={sender[c.key] ?? ''}
                    placeholder={c.key === 'email' ? 'sales@aradhana.com' : '+91 XXXXX XXXXX'}
                    onChange={(e) => setSender((s) => ({ ...s, [c.key]: e.target.value }))}
                  />
                </label>

                <div>
                  <p className="mb-2 text-[13px] font-medium text-ink-2">Templates</p>
                  <div className="space-y-1.5">
                    {c.templates.map((t) => (
                      <div key={t} className="flex items-center justify-between rounded-lg border border-line-soft px-3 py-1.5">
                        <span className="text-[13px] text-ink-2">{t}</span>
                        <Badge tone="slate">Draft</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Button variant="secondary" className="w-full" disabled>
                  <Icon name="plug" size={15} /> Connect provider
                </Button>
                <p className="text-[11px] leading-relaxed text-muted">
                  API keys and secrets are configured on the server and never entered or stored in the browser.
                </p>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
