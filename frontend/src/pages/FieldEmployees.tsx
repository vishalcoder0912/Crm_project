// hello this is vishal project
import { useMemo, useState } from 'react';
import { PageHeader, StatusBadge, FilterSelect, Toolbar, KpiCard } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { useCollection, initials } from '../lib/hooks';
import { Icon } from '../components/icons';

export default function FieldEmployees() {
  const { rows, loading } = useCollection('/field-employees');
  const [role, setRole] = useState('');

  const roles = useMemo(
    () => Array.from(new Set(rows.map((r) => r.role).filter(Boolean))),
    [rows]
  );
  const list = useMemo(() => rows.filter((r) => !role || r.role === role), [rows, role]);

  const active = rows.filter((r) => r.isActive).length;
  const installers = rows.filter((r) => r.role === 'Installer').length;

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title="Field Employees"
        subtitle="Installers, measurers and drivers available for site visits and deliveries."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total field staff" value={rows.length} icon={<Icon name="users" size={18} />} />
        <KpiCard label="Active" value={active} tone="emerald" icon={<Icon name="checkCircle" size={18} />} />
        <KpiCard label="Installers" value={installers} tone="sky" icon={<Icon name="installations" size={18} />} />
      </div>

      <Toolbar>
        <FilterSelect value={role} onChange={(e) => setRole(e.target.value)} icon={<Icon name="filter" size={14} />}>
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </FilterSelect>
      </Toolbar>

      <DataTable
        columns={[
          {
            key: 'name',
            label: 'Employee',
            render: (r) => (
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-ink">
                  {initials(r.name)}
                </span>
                <div>
                  <p className="font-medium text-ink">{r.name}</p>
                  <p className="text-xs text-muted">{r.email || r.businessId}</p>
                </div>
              </div>
            ),
          },
          { key: 'role', label: 'Role', render: (r) => r.role ?? '—' },
          { key: 'phone', label: 'Phone', render: (r) => <span className="tabular-nums">{r.phone}</span> },
          { key: 'installations', label: 'Installations', render: (r) => <span className="tabular-nums">{r._count?.installations ?? 0}</span> },
          { key: 'trips', label: 'Trips', render: (r) => <span className="tabular-nums">{r._count?.vehicleTrips ?? 0}</span> },
          { key: 'isActive', label: 'Status', render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
        ]}
        rows={list}
        loading={loading}
        searchKeys={['name', 'phone', 'email', 'role', 'businessId']}
        searchPlaceholder="Search field employees…"
        emptyTitle="No field employees"
      />
    </div>
  );
}
