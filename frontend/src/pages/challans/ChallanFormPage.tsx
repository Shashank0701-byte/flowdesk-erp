import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Search, ArrowLeft, PackageOpen } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useChallan, useChallanMutations } from '../../hooks/useChallans';
import { useProducts } from '../../hooks/useProducts';
import { useCustomers } from '../../hooks/useCustomers';
import { Product } from '../../types';

// ─── Line item state ──────────────────────────────────────────────────────────

interface LineItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
  quantity: number;
}

// ─── Product picker panel ─────────────────────────────────────────────────────

interface PickerProps {
  lines: LineItem[];
  onAdd: (product: Product) => void;
}

function ProductPicker({ lines, onAdd }: PickerProps) {
  const [q, setQ] = useState('');
  const { data: products, loading } = useProducts({ q, limit: 30 });
  const addedIds = new Set(lines.map((l) => l.productId));

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <Input
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          icon={<Search size={13} />}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading…</div>
        ) : products.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No products found</div>
        ) : (
          products.map((p) => {
            const already = addedIds.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={already}
                onClick={() => onAdd(p)}
                className={[
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors',
                  already
                    ? 'bg-sky-50 border border-sky-200 cursor-default'
                    : 'hover:bg-slate-50 border border-transparent hover:border-slate-200',
                ].join(' ')}
              >
                <div className="min-w-0">
                  <p className={['font-medium truncate', already ? 'text-sky-700' : 'text-slate-800'].join(' ')}>
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">{p.sku}</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="text-xs font-semibold text-slate-600">₹{Number(p.unitPrice).toFixed(2)}</p>
                  <p className={['text-xs', p.currentStock <= p.minStockAlert ? 'text-amber-500' : 'text-slate-400'].join(' ')}>
                    {p.currentStock} in stock
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function ChallanFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // For edit mode — load existing challan
  const { data: existingChallan, loading: challanLoading } = useChallan(isEdit ? id! : '__skip__');

  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [submitIntent, setSubmitIntent] = useState<'Draft' | 'Confirmed' | null>(null);

  const { data: customers, loading: custLoading } = useCustomers({ limit: 100 });
  const { loading: saving, error: saveError, createChallan, updateChallan } = useChallanMutations();

  // Populate form when editing
  useEffect(() => {
    if (isEdit && existingChallan) {
      setCustomerId(existingChallan.customerId);
      setLines(
        existingChallan.items.map((item) => ({
          productId: item.productId,
          name: item.productNameSnapshot,
          sku: item.skuSnapshot,
          unitPrice: item.unitPriceSnapshot,
          currentStock: item.product?.currentStock ?? 0,
          quantity: item.quantity,
        }))
      );
    }
  }, [isEdit, existingChallan]);

  const addProduct = useCallback((p: Product) => {
    setLines((prev) => {
      if (prev.find((l) => l.productId === p.id)) return prev;
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          unitPrice: Number(p.unitPrice),
          currentStock: p.currentStock,
          quantity: 1,
        },
      ];
    });
  }, []);

  const removeProduct = (productId: string) =>
    setLines((prev) => prev.filter((l) => l.productId !== productId));

  const setQty = (productId: string, qty: number) =>
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(1, qty) } : l))
    );

  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const totalValue = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  const handleSubmit = async (intent: 'Draft' | 'Confirmed') => {
    if (!customerId) { toastError('Please select a customer'); return; }
    if (lines.length === 0) { toastError('Add at least one product'); return; }

    setSubmitIntent(intent);

    const body = {
      customerId,
      items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    };

    let result;
    if (isEdit) {
      result = await updateChallan(id!, body);
    } else {
      result = await createChallan({ ...body, status: intent });
    }

    if (result.ok) {
      if (isEdit) {
        success('Challan updated');
        navigate(`/challans/${result.data.id}`);
      } else {
        success(intent === 'Confirmed' ? 'Challan created & confirmed' : 'Draft saved');
        navigate(`/challans/${result.data.id}`);
      }
    } else {
      setSubmitIntent(null);
    }
  };

  if (isEdit && challanLoading) return <AppLayout title="Edit Challan"><PageSpinner /></AppLayout>;
  if (isEdit && existingChallan?.status !== 'Draft') {
    return (
      <AppLayout title="Edit Challan">
        <p className="text-sm text-red-500">Only Draft challans can be edited.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEdit ? 'Edit Challan' : 'New Challan'}>
      <div className="mb-5">
        <button
          onClick={() => navigate(isEdit ? `/challans/${id}` : '/challans')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} /> {isEdit ? 'Back to challan' : 'Back to Challans'}
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

        {/* ── Left panel: form ──────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Customer select */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Customer</h3>
            {custLoading ? (
              <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <Select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.businessName ? ` — ${c.businessName}` : ''}
                  </option>
                ))}
              </Select>
            )}
          </Card>

          {/* Line items */}
          <Card padding={false}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Line Items</h3>
              {lines.length > 0 && (
                <span className="text-xs text-slate-400">{lines.length} product{lines.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="py-14 flex flex-col items-center gap-2 text-slate-300">
                <PackageOpen size={36} strokeWidth={1.2} />
                <p className="text-sm">Search and add products →</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                <AnimatePresence initial={false}>
                  {lines.map((line) => (
                    <motion.div
                      key={line.productId}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{line.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{line.sku}</p>
                        </div>
                        {/* Price */}
                        <div className="text-right flex-shrink-0 hidden sm:block">
                          <p className="text-xs text-slate-500">₹{Number(line.unitPrice).toFixed(2)} ea</p>
                          <p className="text-xs font-semibold text-sky-700">
                            ₹{(Number(line.unitPrice) * line.quantity).toFixed(2)}
                          </p>
                        </div>
                        {/* Qty stepper */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setQty(line.productId, line.quantity - 1)}
                            disabled={line.quantity <= 1}
                            className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors text-lg leading-none"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => setQty(line.productId, parseInt(e.target.value) || 1)}
                            className="w-12 h-7 text-center text-sm font-semibold rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                          />
                          <button
                            type="button"
                            onClick={() => setQty(line.productId, line.quantity + 1)}
                            className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors text-lg leading-none"
                          >
                            +
                          </button>
                        </div>
                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeProduct(line.productId)}
                          className="text-slate-300 hover:text-red-400 transition-colors ml-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Totals footer */}
            {lines.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {totalQty} units · {lines.length} SKU{lines.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  ₹{totalValue.toFixed(2)}
                </p>
              </div>
            )}
          </Card>

          {/* Error */}
          {saveError && (
            <p className="text-sm text-red-500 px-1">{saveError}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEdit ? `/challans/${id}` : '/challans')}
            >
              Discard
            </Button>
            {!isEdit && (
              <Button
                type="button"
                variant="secondary"
                loading={saving && submitIntent === 'Draft'}
                disabled={saving && submitIntent === 'Confirmed'}
                onClick={() => handleSubmit('Draft')}
              >
                Save as Draft
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              loading={saving && submitIntent === 'Confirmed'}
              disabled={saving && submitIntent === 'Draft'}
              onClick={() => handleSubmit(isEdit ? 'Draft' : 'Confirmed')}
            >
              {isEdit ? 'Save changes' : 'Create & Confirm'}
            </Button>
          </div>
        </div>

        {/* ── Right panel: product picker ───────────────────────────── */}
        <div className="lg:sticky lg:top-6">
          <Card className="h-[560px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Plus size={14} className="text-sky-500" />
                Add Products
              </h3>
            </div>
            <div className="flex-1 min-h-0">
              <ProductPicker lines={lines} onAdd={addProduct} />
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
