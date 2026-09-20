// hello this is vishal project
import { useMemo, useState } from 'react';
import { PageHeader, FilterSelect, Toolbar, Panel, Badge } from '../components/ui';
import { useCollection } from '../lib/hooks';
import { Icon } from '../components/icons';

const COLUMNS = [
  { key: 'read', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'approve', label: 'Approve' },
];

const moduleLabel = (m: string) =>
  m
    .split('_')
    .map((w) => (w === 'admin' ? 'Administration' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');

export default function Permissions() {
  const { rows: permissions, loading } = useCollection('/permissions');
  const { rows: roles } = useCollection('/roles');
  const [roleId, setRoleId] = useState('');

  const modules = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => p.module && set.add(p.module));
    return Array.from(set).sort();
  }, [permissions]);

  const available = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => set.add(`${p.module}.${p.action}`));
    return set;
  }, [permissions]);

  const activeRole = roles.find((r) => String(r.id) === roleId);
  const roleCodes = useMemo(() => {
    const set = new Set<string>();
    (activeRole?.permissions ?? []).forEach((rp: any) => set.add(rp.permission?.code));
    return set;
  }, [activeRole]);

  const extraActions = (module: string) =>
    permissions
      .filter((p) => p.module === module && !COLUMNS.some((c) => c.key === p.action))
      .map((p) => p.action);

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title="Permissions"
        subtitle="Role-based access matrix defining what each module allows across the CRM."
        actions={
          <Toolbar>
            <FilterSelect value={roleId} onChange={(e) => setRoleId(e.target.value)} icon={<Icon name="shield" size={14} />}>
              <option value="">All roles (catalog)</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName ?? r.name}
                </option>
              ))}
            </FilterSelect>
          </Toolbar>
        }
      />

      <Panel
        title={activeRole ? `Access for ${activeRole.displayName ?? activeRole.name}` : 'Permission matrix'}
        subtitle={
          activeRole
            ? `${roleCodes.size} permissions granted to this role`
            : `${permissions.length} permissions across ${modules.length} modules`
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-3">Module</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-5 py-3 text-center">
                    {c.label}
                  </th>
                ))}
                <th className="px-5 py-3">Additional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {!loading &&
                modules.map((m) => (
                  <tr key={m}>
                    <td className="px-5 py-3 font-medium text-ink">{moduleLabel(m)}</td>
                    {COLUMNS.map((c) => {
                      const exists = available.has(`${m}.${c.key}`);
                      const granted = activeRole ? roleCodes.has(`${m}.${c.key}`) : exists;
                      return (
                        <td key={c.key} className="px-5 py-3 text-center">
                          {granted ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-brand-100 text-brand-800">
                              <Icon name="check" size={13} />
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {extraActions(m).map((a) => (
                          <Badge key={a} tone="slate">
                            {a.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
