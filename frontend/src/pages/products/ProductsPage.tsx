import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2, Eye, Pencil, ArrowUpDown } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useProducts, useProductMutations } from '../../hooks/useProducts';
import { useAuth } from '../../context/AuthContext';
import { Product } from '../../types';
import ProductForm from './ProductForm';
import StockAdjustForm from './StockAdjustForm';

const CATEGORIES = ['Fasteners', 'Electronics', 'Packaging', 'Raw Material', 'Tools'];

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data: products, meta, loading, refetch } = useProducts({
    q, category, lowStock: lowStock || undefined, page, limit: 20,
  });
  const { loading: mutating, deleteProduct } = useProductMutations();

  const canWrite = user?.role === 'Admin' || user?.role === 'Warehouse';
  const canDelete = user?.role === 'Admin';

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteProduct(deleteTarget.id);
    if (result.ok) {
      success('Product deleted');
      setDeleteTarget(null);
      refetch();
    } else {
      toastError('Cannot delete — product has challan history');
      setDeleteTarget(null);
    }
  };

  return (
    <AppLayout
      title="Products"
      actions={
        canWrite && (
          <Button icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            Add Product
          </Button>
        )
      }
    >
      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <Input
          placeholder="Search name or SKU…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          icon={<Search size={14} />}
          className="w-64"
        />
        <Select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="w-44"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => { setLowStock(e.target.checked); setPage(1); }}
            className="w-4 h-4 rounded accent-sky-500"
          />
          Low stock only
        </label>
      </div>

      <Card padding={false}>
        {loading ? (
          <PageSpinner />
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No products found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {['Name', 'SKU', 'Category', 'Price', 'Stock', 'Min Alert', 'Location', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const isLow = p.currentStock <= p.minStockAlert;
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => navigate(`/products/${p.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                      <td className="px-4 py-3 text-slate-500">{p.category}</td>
                      <td className="px-4 py-3 text-slate-700">₹{Number(p.unitPrice).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={['font-semibold', isLow ? 'text-amber-600' : 'text-slate-800'].join(' ')}>
                            {p.currentStock}
                          </span>
                          {isLow && <Badge variant="lowstock">Low</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{p.minStockAlert}</td>
                      <td className="px-4 py-3 text-slate-400">{p.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-1 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm" icon={<Eye size={13} />}
                            onClick={() => navigate(`/products/${p.id}`)} />
                          {canWrite && (
                            <>
                              <Button variant="ghost" size="sm" icon={<Pencil size={13} />}
                                onClick={() => setEditTarget(p)} />
                              <Button variant="ghost" size="sm" icon={<ArrowUpDown size={13} />}
                                onClick={() => setStockTarget(p)}
                                className="text-sky-500 hover:text-sky-700 hover:bg-sky-50" />
                            </>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="sm" icon={<Trash2 size={13} />}
                              onClick={() => setDeleteTarget(p)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50" />
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {meta.total} products · page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Product" width="lg">
        <ProductForm
          onSuccess={() => { setAddOpen(false); refetch(); success('Product created'); }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Product" width="lg">
        {editTarget && (
          <ProductForm
            product={editTarget}
            onSuccess={() => { setEditTarget(null); refetch(); success('Product updated'); }}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Modal>

      {/* Stock adjust */}
      <Modal open={!!stockTarget} onClose={() => setStockTarget(null)} title="Adjust Stock">
        {stockTarget && (
          <StockAdjustForm
            product={stockTarget}
            onSuccess={(updated) => {
              setStockTarget(null);
              refetch();
              success(`Stock updated — now ${updated.currentStock} units`);
            }}
            onCancel={() => setStockTarget(null)}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Product">
        <p className="text-sm text-slate-600 mb-6">
          Delete <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>?
          This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={mutating} onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
