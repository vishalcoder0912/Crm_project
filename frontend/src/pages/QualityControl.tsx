import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, Button, Modal, Input, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu } from '../components/DataTable';
import { useCollection, fmtDate } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

export default function QualityControl() {
  const navigate = useNavigate();
  const { rows, loading, refresh } = useCollection('/qc');
  const [apply, setApply] = useState<any>(null);
  const [result, setResult] = useState('PASS');
  const [failReason, setFailReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openApply = (r: any) => {
    setResult(r.result === 'FAIL' ? 'FAIL' : 'PASS');
    setFailReason(r.failReason ?? '');
    setError(null);
    setApply(r);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await data.patch(`/qc/${apply.id}`, { result, failReason: result === 'FAIL' ? failReason : null });
      await data.post(`/qc/${apply.id}/apply`, {});
      setApply(null);
      setFailReason('');
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Could not apply result');
    } finally {
      setBusy(false);
    }
  };

  const pass = rows.filter((r: any) => r.result === 'PASS').length;
  const fail = rows.filter((r: any) => r.result === 'FAIL').length;

  return (
    <div className="fade-in">
      <PageHeader
        title="Quality Control"
        subtitle={`${pass} passed · ${fail} failed · inspections gate delivery`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/tailoring')}>
              <Icon name="tailoring" size={15} /> Tailoring
            </Button>
            <Button variant="secondary" onClick={() => navigate('/packing')}>
              <Icon name="packing" size={15} /> Packing slips
            </Button>
          </div>
        }
      />
      <DataTable
        columns={[
          { key: 'businessId', label: 'Inspection' },
          {
            key: 'tailoringOrder',
            label: 'Tailoring job',
            search: true,
            render: (r) => {
              const jobNo = r.tailoringOrder?.businessId ?? r.tailoringBusinessId;
              return jobNo ? (
                <Link to="/tailoring" className="font-medium text-brand-800 hover:underline">
                  {jobNo}
                </Link>
              ) : (
                '—'
              );
            },
          },
          { key: 'orderItem.productName', label: 'Item', search: true },
          { key: 'result', label: 'Result', render: (r) => <StatusBadge status={r.result} /> },
          { key: 'failReason', label: 'Remarks', render: (r) => <span className="text-ink-2">{r.failReason ?? '—'}</span> },
          { key: 'inspectedAt', label: 'Inspected', render: (r) => fmtDate(r.inspectedAt) },
          {
            key: '_actions',
            label: 'Actions',
            render: (r) => (
              <ActionMenu
                items={[
                  { label: 'Apply result', icon: <Icon name="check" size={14} />, onClick: () => openApply(r) },
                  { label: 'View tailoring', icon: <Icon name="tailoring" size={14} />, onClick: () => navigate('/tailoring') },
                  { label: 'View packing', icon: <Icon name="packing" size={14} />, onClick: () => navigate('/packing') },
                ]}
              />
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['businessId', 'tailoringOrder.businessId', 'orderItem.productName', 'result']}
        searchPlaceholder="Search inspections…"
        emptyTitle="No QC inspections"
      />

      <Modal open={!!apply} onClose={() => setApply(null)} title={`Apply QC · ${apply?.businessId}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setResult('PASS')}
              className={`rounded-xl border-2 p-4 text-left transition ${result === 'PASS' ? 'border-emerald-500 bg-emerald-50' : 'border-line hover:border-line'}`}
            >
              <div className="flex items-center gap-2 font-semibold text-emerald-700"><Icon name="check" size={16} /> Pass</div>
              <p className="mt-1 text-xs text-muted">Item moves to packing</p>
            </button>
            <button
              onClick={() => setResult('FAIL')}
              className={`rounded-xl border-2 p-4 text-left transition ${result === 'FAIL' ? 'border-rose-500 bg-rose-50' : 'border-line hover:border-line'}`}
            >
              <div className="flex items-center gap-2 font-semibold text-rose-700"><Icon name="x" size={16} /> Fail</div>
              <p className="mt-1 text-xs text-muted">Item sent back for rework</p>
            </button>
          </div>
          {result === 'FAIL' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-2">Failure reason</label>
              <Input value={failReason} onChange={(e) => setFailReason(e.target.value)} placeholder="e.g. stitching defect on hem" />
            </div>
          )}
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setApply(null)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || (result === 'FAIL' && !failReason)}>{busy ? 'Applying…' : 'Apply'}</Button>
        </div>
      </Modal>
    </div>
  );
}