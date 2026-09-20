import { useState } from 'react';
import { PageHeader, StatusBadge, FilterSelect, Toolbar, KpiCard, Drawer, Spinner, EmptyState } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { useCollection, fmtDate, fmtTime } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

export default function Vehicles() {
  const { rows, loading } = useCollection('/vehicles');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const open = async (row: any) => {
    setSelected(row);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await data.one(`/vehicles/${row.id}`));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const list = rows.filter((r) => !status || r.status === status);
  const available = rows.filter((r) => r.status === 'AVAILABLE').length;
  const inUse = rows.filter((r) => r.status === 'IN_USE').length;

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title="Vehicles & Trips"
        subtitle="Fleet availability and completed trips for installation, delivery and measurement teams."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Fleet size" value={rows.length} icon={<Icon name="truck" size={18} />} />
        <KpiCard label="Available" value={available} tone="emerald" icon={<Icon name="checkCircle" size={18} />} />
        <KpiCard label="In use" value={inUse} tone="sky" icon={<Icon name="send" size={18} />} />
      </div>

      <Toolbar>
        <FilterSelect value={status} onChange={(e) => setStatus(e.target.value)} icon={<Icon name="filter" size={14} />}>
          <option value="">All statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="IN_USE">In use</option>
          <option value="MAINTENANCE">Maintenance</option>
        </FilterSelect>
      </Toolbar>

      <DataTable
        columns={[
          { key: 'registrationNo', label: 'Registration', render: (r) => <span className="font-medium text-ink">{r.registrationNo}</span> },
          { key: 'vehicleType', label: 'Type', render: (r) => r.vehicleType ?? '—' },
          { key: 'assignedTeam', label: 'Assigned team', render: (r) => r.assignedTeam ?? '—' },
          { key: 'trips', label: 'Trips', render: (r) => <span className="tabular-nums">{r._count?.trips ?? 0}</span> },
          { key: 'installations', label: 'Installations', render: (r) => <span className="tabular-nums">{r._count?.installations ?? 0}</span> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        rows={list}
        loading={loading}
        searchKeys={['registrationNo', 'vehicleType', 'assignedTeam', 'businessId']}
        searchPlaceholder="Search vehicles…"
        emptyTitle="No vehicles"
        onRowClick={open}
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.registrationNo ?? 'Vehicle'}
        subtitle={selected ? `${selected.vehicleType} · ${selected.assignedTeam ?? 'Unassigned'}` : ''}
      >
        {detailLoading && <Spinner label="Loading trips…" />}
        {!detailLoading && detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={detail.status} />
              <span className="text-xs text-muted">{detail.businessId}</span>
            </div>
            <h4 className="text-sm font-semibold text-ink">Trip history</h4>
            {(detail.trips ?? []).length === 0 && (
              <EmptyState title="No trips recorded" hint="Completed trips will appear here." />
            )}
            <div className="space-y-2">
              {(detail.trips ?? []).map((t: any) => (
                <div key={t.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-ink">{t.purpose}</p>
                    <span className="text-xs text-muted">{t.taskType ?? '—'}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
                    <span>Driver: {t.fieldEmployee?.name ?? '—'}</span>
                    <span>Start: {fmtDate(t.startTime)} {fmtTime(t.startTime)}</span>
                    <span>End: {fmtDate(t.endTime)} {fmtTime(t.endTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!detailLoading && !detail && <EmptyState title="Could not load vehicle" />}
      </Drawer>
    </div>
  );
}
