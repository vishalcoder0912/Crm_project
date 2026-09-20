import { PageHeader, StatusBadge, Card, Button, Input } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { useCollection, fmtDate, initials } from '../lib/hooks';
import { Icon } from '../components/icons';

export default function Users() {
  const { rows, loading } = useCollection('/users');
  const { rows: roles } = useCollection('/roles');
  const { rows: permissions } = useCollection('/permissions');

  return (
    <div className="fade-in space-y-6">
      <PageHeader title="Users & Roles" subtitle={`${rows.length} users · role-based access control`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {roles.map((r: any) => (
          <Card key={r.id ?? r.name} className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
                <Icon name="users" size={17} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{r.name}</p>
                <p className="text-xs text-muted">{rows.filter((u: any) => u.role?.name === r.name).length} users</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <DataTable
        columns={[
          {
            key: 'firstName',
            label: 'User',
            render: (r) => (
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-ink">
                  {initials(r.firstName, r.lastName)}
                </span>
                <div>
                  <p className="font-medium text-ink">{r.firstName} {r.lastName}</p>
                  <p className="text-xs text-muted">{r.email}</p>
                </div>
              </div>
            ),
          },
          { key: 'role', label: 'Role', render: (r) => <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-ink-2">{r.role?.name ?? '—'}</span> },
          { key: 'createdAt', label: 'Member since', render: (r) => fmtDate(r.createdAt) },
          { key: 'isActive', label: 'Status', render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['firstName', 'lastName', 'email', 'role.name']}
        searchPlaceholder="Search users…"
        emptyTitle="No users"
      />

      {permissions.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Permission catalog</h3>
          <div className="flex flex-wrap gap-1.5">
            {permissions.map((p: any, i: number) => (
              <code key={i} className="rounded-md border border-line bg-slate-50 px-2 py-1 text-[11px] text-muted">
                {typeof p === 'string' ? p : p.code ?? p.name}
              </code>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}