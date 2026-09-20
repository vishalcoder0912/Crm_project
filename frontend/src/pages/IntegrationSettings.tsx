// hello this is vishal project
import { useState } from 'react';
import { PageHeader, Panel, Button, Badge, Modal } from '../components/ui';
import { Icon } from '../components/icons';

const INTEGRATIONS = [
  { key: 'zoho', name: 'Zoho Books', icon: 'fileText', description: 'Sync invoices, customers and payments with accounting.' },
  { key: 'whatsapp', name: 'WhatsApp', icon: 'whatsapp', description: 'Send quotations, reminders and updates to customers.' },
  { key: 'email', name: 'Email', icon: 'mail', description: 'Transactional email for documents and notifications.' },
  { key: 'supplier', name: 'Supplier Portal', icon: 'truck', description: 'Share purchase orders and track vendor deliveries.' },
];

export default function IntegrationSettings() {
  const [configure, setConfigure] = useState<string | null>(null);
  const active = INTEGRATIONS.find((i) => i.key === configure);

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title="Integration Settings"
        subtitle="External systems connected to the CRM. Unconfigured services are shown as Not connected."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {INTEGRATIONS.map((i) => (
          <Panel key={i.key} title={i.name} compact className="h-full">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-muted">
                <Icon name={i.icon} size={16} />
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Not connected
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">{i.description}</p>
            <dl className="mt-3 space-y-1 border-t border-line-soft pt-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted">Last sync</dt>
                <dd className="text-ink-2">Never</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Status</dt>
                <dd className="text-ink-2">Awaiting credentials</dd>
              </div>
            </dl>
            <Button variant="secondary" className="mt-4 w-full" onClick={() => setConfigure(i.key)}>
              Configure
            </Button>
          </Panel>
        ))}
      </div>

      <Panel title={'What “not connected” means'} subtitle="Integration policy" className="max-w-none">
        <ul className="space-y-1.5 text-[13px] text-muted">
          <li className="flex gap-2"><Icon name="check" size={15} /> The CRM runs fully without external integrations.</li>
          <li className="flex gap-2"><Icon name="check" size={15} /> No external calls are simulated or faked — a service shows Connected only when live.</li>
          <li className="flex gap-2"><Icon name="check" size={15} /> Credentials are configured server-side and are never stored in the browser.</li>
        </ul>
      </Panel>

      <Modal open={!!configure} onClose={() => setConfigure(null)} title={`Configure ${active?.name ?? ''}`}>
        <div className="space-y-3 text-[13px] text-muted">
          <div className="flex items-center gap-2">
            <Badge tone="amber">Not connected</Badge>
            <span>No credentials configured</span>
          </div>
          <p>
            Connecting {active?.name} requires server-side credentials and an API key issued by the provider.
            Once configured on the backend, this page will display the live connection status and last sync time.
          </p>
          <p className="rounded-lg border border-line bg-canvas px-3 py-2 text-ink-2">
            Configure the provider under{' '}
            <span className="font-medium">Communication Settings</span> for messaging channels, or in the server
            environment for accounting and portal integrations.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfigure(null)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
