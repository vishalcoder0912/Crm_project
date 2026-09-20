import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Button, Modal, Input } from '../components/ui';
import { DataTable, ActionMenu } from '../components/DataTable';
import { useCollection, fmtDate } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

const EMPTY = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Customers() {
  const navigate = useNavigate();
  const { rows, loading, refresh } = useCollection('/customers');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError(null);
    setShow(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      address: row.address ?? '',
      notes: row.notes ?? '',
    });
    setError(null);
    setShow(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (editing?.id) {
        await data.patch(`/customers/${editing.id}`, form);
      } else {
        await data.post('/customers', form);
      }
      setShow(false);
      setEditing(null);
      setForm({ ...EMPTY });
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save customer');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: any) => {
    if (!window.confirm(`Delete customer "${row.name}"?`)) return;
    try {
      await data.del(`/customers/${row.id}`);
      refresh();
    } catch (e: any) {
      window.alert(e?.message ?? 'Could not delete customer');
    }
  };

  const close = () => {
    setShow(false);
    setEditing(null);
    setError(null);
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Customers"
        subtitle={`${rows.length} customers on record`}
        actions={
          <Button onClick={openCreate}>
            <Icon name="plus" size={15} /> Add customer
          </Button>
        }
      />
      <DataTable
        columns={[
          { key: 'businessId', label: 'ID' },
          { key: 'name', label: 'Name', search: true, render: (r) => <span className="font-semibold text-ink hover:text-brand-800">{r.name}</span> },
          { key: 'phone', label: 'Phone', search: true },
          { key: 'email', label: 'Email', search: true },
          { key: 'address', label: 'Address', search: true },
          { key: 'sites', label: 'Sites', render: (r) => <span className="tabular-nums text-ink-2">{r.sites?.length ?? 0}</span> },
          { key: 'assignedEmployee', label: 'Assigned', render: (r) => <span className="text-ink-2">{r.assignedEmployee ? (typeof r.assignedEmployee === 'object' ? `${r.assignedEmployee.firstName} ${r.assignedEmployee.lastName}` : r.assignedEmployee) : '—'}</span> },
          { key: 'createdAt', label: 'Since', render: (r) => fmtDate(r.createdAt) },
          {
            key: 'actions',
            label: '',
            render: (r) => (
              <ActionMenu
                items={[
                  { label: 'View profile', icon: <Icon name="customers" size={14} />, onClick: () => navigate(`/customers/${r.id}`) },
                  { label: 'New enquiry', icon: <Icon name="enquiries" size={14} />, onClick: () => navigate(`/enquiries`) },
                  { label: 'Follow-up', icon: <Icon name="bell" size={14} />, onClick: () => navigate(`/follow-ups`) },
                  { label: 'Edit', icon: <Icon name="edit" size={14} />, onClick: () => openEdit(r) },
                  { label: 'Delete', tone: 'danger', icon: <Icon name="trash" size={14} />, onClick: () => remove(r) },
                ]}
              />
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['name', 'phone', 'email', 'address', 'businessId']}
        searchPlaceholder="Search customers…"
        emptyTitle="No customers yet"
        onRowClick={(r) => navigate(`/customers/${r.id}`)}
      />

      <Modal open={show} onClose={close} title={editing?.id ? 'Edit customer' : 'Add customer'}>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="mb-1 block text-xs font-medium text-ink-2">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs font-medium text-ink-2">Phone *</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs font-medium text-ink-2">Email</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs font-medium text-ink-2">Address</label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-ink-2">Notes</label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button onClick={save} disabled={busy || !form.name || !form.phone}>{busy ? 'Saving…' : editing?.id ? 'Save changes' : 'Create customer'}</Button>
        </div>
      </Modal>
    </div>
  );
}