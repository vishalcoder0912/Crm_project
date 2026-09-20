import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, Button, Modal, Input, Select, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu, MoneyCell } from '../components/DataTable';
import { useCollection, fmtDate, currency } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

export default function Payments() {
  const navigate = useNavigate();
  const { rows, loading, refresh } = useCollection('/payments');
  const [orders, setOrders] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({ orderId: '', customerId: '', amount: '', paymentMethod: 'UPI', paymentType: 'ADVANCE' });

  useEffect(() => {
    data.list('/orders?pageSize=100').then(setOrders).catch(() => setOrders([]));
  }, []);

  const pending = rows.filter((r: any) => r.status === 'PENDING');
  const confirmed = rows.filter((r: any) => r.status === 'CONFIRMED');
  const totalConfirmed = confirmed.reduce((s: number, r: any) => s + Number(r.amount), 0);
  const totalPending = pending.reduce((s: number, r: any) => s + Number(r.amount), 0);

  const onSelectOrder = (orderIdStr: string) => {
    const ord = orders.find((o) => String(o.id) === orderIdStr);
    if (ord) {
      setForm({
        ...form,
        orderId: ord.id,
        customerId: ord.customerId ?? ord.customer?.id ?? 1,
        amount: ord.balanceAmount ? String(ord.balanceAmount) : form.amount,
        paymentType: ord.advanceAmount > 0 ? 'BALANCE' : 'ADVANCE',
      });
    } else {
      setForm({ ...form, orderId: orderIdStr });
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      await data.post('/payments', { ...form, amount: Number(form.amount) });
      setShow(false);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Payments"
        subtitle={`${currency(totalConfirmed)} confirmed · ${currency(totalPending)} pending (${pending.length})`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/orders')}>
              <Icon name="orders" size={15} /> View orders
            </Button>
            <Button onClick={() => setShow(true)}>
              <Icon name="plus" size={15} /> Record payment
            </Button>
          </div>
        }
      />
      <DataTable
        columns={[
          { key: 'businessId', label: 'No.', render: (r) => <span className="font-semibold">{r.businessId ?? r.paymentNo}</span> },
          {
            key: 'order',
            label: 'Order',
            search: true,
            render: (r) => {
              const orderNo = r.order?.businessId ?? r.orderBusinessId;
              return orderNo ? (
                <Link
                  to={`/orders?open=${orderNo}`}
                  className="font-medium text-brand-800 hover:underline"
                >
                  {orderNo}
                </Link>
              ) : (
                <span className="text-muted">—</span>
              );
            },
          },
          {
            key: 'customer',
            label: 'Customer',
            search: true,
            render: (r) => {
              const custId = r.customerId ?? r.customer?.id;
              const name = r.customer?.name ?? r.customerName ?? '—';
              return custId ? (
                <Link
                  to={`/customers/${custId}`}
                  className="font-semibold text-ink hover:text-brand-800 hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <span className="text-ink-2">{name}</span>
              );
            },
          },
          { key: 'amount', label: 'Amount', render: (r) => <MoneyCell value={r.amount} /> },
          { key: 'paymentMethod', label: 'Method', render: (r) => r.paymentMethod ?? r.method ?? '—' },
          { key: 'paymentType', label: 'Type', render: (r) => <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-ink-2">{r.paymentType ?? r.type ?? '—'}</span> },
          { key: 'paymentDate', label: 'Date', render: (r) => fmtDate(r.paymentDate ?? r.paidAt) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: '_actions',
            label: 'Actions',
            render: (r) => {
              const custId = r.customerId ?? r.customer?.id;
              const orderNo = r.order?.businessId ?? r.orderBusinessId;
              return (
                <ActionMenu
                  items={[
                    ...(custId
                      ? [{ label: 'View customer', icon: <Icon name="customers" size={14} />, onClick: () => navigate(`/customers/${custId}`) }]
                      : []),
                    ...(orderNo
                      ? [{ label: 'View order', icon: <Icon name="orders" size={14} />, onClick: () => navigate(`/orders?open=${orderNo}`) }]
                      : []),
                    ...(r.status === 'PENDING'
                      ? [{ label: 'Confirm', icon: <Icon name="check" size={14} />, onClick: () => data.post(`/payments/${r.id}/confirm`).then(refresh) },
                         { label: 'Refund', tone: 'danger' as const, onClick: () => data.post(`/payments/${r.id}/refund`).then(refresh) }]
                      : []),
                  ]}
                />
              );
            },
          },
        ]}
        rows={rows}
        loading={loading}
        searchKeys={['businessId', 'paymentNo', 'order.businessId', 'orderBusinessId', 'customer.name', 'customerName', 'paymentMethod']}
        searchPlaceholder="Search payments…"
        emptyTitle="No payments recorded"
      />

      <Modal open={show} onClose={() => setShow(false)} title="Record payment">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink-2">Select Order *</label>
            <Select value={form.orderId} onChange={(e) => onSelectOrder(e.target.value)}>
              <option value="">Select order to apply payment to…</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.businessId} · {o.customer?.name ?? o.customerName ?? 'Customer'} · Total: ₹{o.totalAmount} (Bal: ₹{o.balanceAmount})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Amount (₹) *</label>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="5000" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-2">Method</label>
            <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Credit / Debit Card</option>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink-2">Payment Stage</label>
            <Select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}>
              <option value="ADVANCE">Advance (Initial Deposit)</option>
              <option value="PARTIAL">Partial / Progress Payment</option>
              <option value="BALANCE">Balance (Final Payment)</option>
              <option value="FULL">Full Payment</option>
            </Select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
          <Button onClick={create} disabled={busy || !form.orderId || !form.amount}>{busy ? 'Saving…' : 'Save payment'}</Button>
        </div>
      </Modal>
    </div>
  );
}