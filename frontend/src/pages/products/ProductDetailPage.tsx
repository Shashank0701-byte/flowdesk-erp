import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, ArrowUpDown } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, StockTypeBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useProduct, useStockMovements } from '../../hooks/useProducts';
import { useAuth } from '../../context/AuthContext';
import ProductForm from './ProductForm';
import StockAdjustForm from './StockAdjustForm';

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value ?? '—'}</p>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success } = useToast();

  const { data: product, loading, error, refetch } = useProduct(id!);
  const [movPage, setMovPage] = useState(1);
  const { data: movements, meta: movMeta, loading: movLoading, refetch: refetchMov } =
    useStockMovements(id!, { page: movPage, limit: 15 });

  const [editOpen, setEditOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);

  const canWrite = user?.role === 'Admin' || user?.role === 'Warehouse';

  if (loading) return <AppLayout title="Product"><PageSpinner /></AppLayout>;
  if (error || !product) return (
    <AppLayout title="Product">
      <p className="text-sm text-red-500">{error || 'Product not found'}</p>
    </AppLayout>
  );

  const isLow = product.currentStock <= product.minStockAlert;

  return (
    <AppLayout
      title={product.name}
      actions={
        canWrite && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<ArrowUpDown size={13} />}
              onClick={() => setStockOpen(true)}>
              Adjust Stock
            </Button>
            <Button variant="secondary" size="sm" icon={<Pencil size={13} />}
              onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </div>
        )
      }
    >
      <div className="mb-5">
        <button onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={14} /> Back to Products
        </button>
      </div>

      {/* Product card */}
      <Card className="mb-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{product.name}</h2>
            <p className="text-xs font-mono text-slate-400 mt-1">{product.sku}</p>
          </div>
          {isLow && <Badge variant="lowstock">Low Stock</Badge>}
        </div>

        {/* Stock spotlight */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 mb-5">
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Current Stock</p>
            <p className={['text-3xl font-bold', isLow ? 'text-amber-500' : 'text-sky-600'].join(' ')}>
              {product.currentStock}
            </p>
          </div>
          <div className="text-center border-x border-slate-200">
            <p className="text-xs text-slate-400 mb-1">Min Alert</p>
            <p className="text-3xl font-bold text-slate-700">{product.minStockAlert}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Unit Price</p>
            <p className="text-3xl font-bold text-slate-700">₹{Number(product.unitPrice).toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <InfoRow label="Category" value={product.category} />
          <InfoRow label="Location" value={product.location} />
          <InfoRow label="Added" value={new Date(product.createdAt).toLocaleDateString()} />
        </div>
      </Card>

      {/* Movement history */}
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Stock Movement History</h3>
      <Card padding={false}>
        {movLoading ? (
          <PageSpinner />
        ) : movements.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No movements yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {['Date', 'Type', 'Quantity', 'Reason', 'By'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-50 hover:bg-slate-50/40"
                  >
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3"><StockTypeBadge type={m.type} /></td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {m.type === 'IN' ? '+' : '−'}{m.quantityChanged}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{m.reason}</td>
                    <td className="px-4 py-3 text-slate-400">{m.createdBy.name}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {movMeta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {movMeta.total} movements · page {movPage} of {movMeta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={movPage <= 1}
                onClick={() => setMovPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={movPage >= movMeta.totalPages}
                onClick={() => setMovPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Product" width="lg">
        <ProductForm
          product={product}
          onSuccess={() => { setEditOpen(false); refetch(); success('Product updated'); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Stock adjust modal */}
      <Modal open={stockOpen} onClose={() => setStockOpen(false)} title="Adjust Stock">
        <StockAdjustForm
          product={product}
          onSuccess={(updated) => {
            setStockOpen(false);
            refetch();
            refetchMov();
            success(`Stock updated — now ${updated.currentStock} units`);
          }}
          onCancel={() => setStockOpen(false)}
        />
      </Modal>
    </AppLayout>
  );
}
