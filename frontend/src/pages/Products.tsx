import { useEffect, useState } from 'react';
import { PageHeader, Button, Modal, Input, Select, StatusBadge } from '../components/ui';
import { DataTable, ActionMenu, MoneyCell } from '../components/DataTable';
import { useCollection } from '../lib/hooks';
import { data } from '../lib/data';
import { Icon } from '../components/icons';

export default function Products() {
  const { rows: products, loading, refresh } = useCollection('/products');
  const { rows: skus, refresh: refreshSkus } = useCollection('/skus');
  const [selected, setSelected] = useState<any>(null);
  const [skusOf, setSkusOf] = useState<any>(null);

  const loadSkus = async (p: any) => {
    setSelected(null);
    try {
      const list = await data.list(`/products/${p.id}/skus`);
      setSkusOf({ product: p, skus: list });
    } catch {
      setSkusOf({ product: p, skus: skus.filter((s: any) => s.productId === p.id) });
    }
  };

  useEffect(() => {
    if (selected?.showSkus) loadSkus(selected);
  }, [selected]);

  return (
    <div className="fade-in space-y-6">
      <PageHeader title="Products & SKUs" subtitle={`${products.length} products · ${skus.length} active SKUs with live pricing`} />

      <DataTable
        onRowClick={(r) => setSelected({ ...r, showSkus: true })}
        columns={[
          { key: 'name', label: 'Product', search: true },
          { key: 'category', label: 'Category', search: true },
          { key: 'productType', label: 'Type', search: true },
          { key: 'description', label: 'Description' },
          {
            key: '_skus',
            label: 'SKUs',
            render: (r) => {
              const count = skus.filter((s: any) => s.productId === r.id).length;
              return (
                <button onClick={(e) => { e.stopPropagation(); loadSkus(r); }} className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-100">
                  {count} SKU{count === 1 ? '' : 's'} →
                </button>
              );
            },
          },
        ]}
        rows={products}
        loading={loading}
        searchKeys={['name', 'category', 'productType']}
        searchPlaceholder="Search products…"
        emptyTitle="No products yet"
      />

      <h3 className="text-sm font-semibold text-ink-2">SKU price list</h3>
      <DataTable
        columns={[
          { key: 'sku', label: 'SKU Code', render: (r) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-ink-2">{r.sku}</code> },
          { key: 'name', label: 'Product', search: true },
          { key: 'product.name', label: 'Category', search: true },
          { key: 'vendor.name', label: 'Vendor', search: true },
          { key: 'costPrice', label: 'Cost', render: (r) => <span className="text-muted"><MoneyCell value={r.costPrice} /></span> },
          { key: 'sellingPrice', label: 'Selling', render: (r) => <MoneyCell value={r.sellingPrice} /> },
          { key: 'serviceCharge', label: 'Service', render: (r) => <MoneyCell value={r.serviceCharge} /> },
          { key: 'taxPercent', label: 'GST', render: (r) => <span>{r.taxPercent}%</span> },
          { key: 'isActive', label: 'Active', render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
        ]}
        rows={skus}
        loading={loading}
        searchKeys={['sku', 'name', 'product.name', 'vendor.name']}
        searchPlaceholder="Search SKUs…"
        emptyTitle="No SKUs configured"
      />

      {skusOf && (
        <Modal open wide onClose={() => setSkusOf(null)} title={`SKUs · ${skusOf.product.name}`}>
          <DataTable
            columns={[
              { key: 'sku', label: 'Code', render: (r) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{r.sku}</code> },
              { key: 'name', label: 'Name' },
              { key: 'vendor.name', label: 'Vendor' },
              { key: 'costPrice', label: 'Cost', render: (r) => <MoneyCell value={r.costPrice} /> },
              { key: 'sellingPrice', label: 'Selling', render: (r) => <MoneyCell value={r.sellingPrice} /> },
              { key: 'isActive', label: 'Status', render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
            ]}
            rows={skusOf.skus}
            loading={false}
          />
        </Modal>
      )}
    </div>
  );
}