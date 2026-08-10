import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ChallanStatusBadge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useChallan, useChallanMutations } from '../../hooks/useChallans';
import { useAuth } from '../../context/AuthContext';

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value ?? '—'}</p>
    </div>
  );
}

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const { data: challan, loading, error, refetch } = useChallan(id!);
  const { loading: mutating, confirmChallan, cancelChallan } = useChallanMutations();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const canWrite = user?.role === 'Admin' || user?.role === 'Sales';

  if (loading) return <AppLayout title="Challan"><PageSpinner /></AppLayout>;
  if (error || !challan) return (
    <AppLayout title="Challan">
      <p className="text-sm text-red-500">{error || 'Challan not found'}</p>
    </AppLayout>
  );

  const handleConfirm = async () => {
    const result = await confirmChallan(challan.id);
    if (result.ok) {
      success(`${challan.challanNumber} confirmed`);
      setConfirmOpen(false);
      refetch();
    } else {
      toastError('Could not confirm challan');
      setConfirmOpen(false);
    }
  };

  const handleCancel = async () => {
    const result = await cancelChallan(challan.id);
    if (result.ok) {
      success(`${challan.challanNumber} cancelled`);
      setCancelOpen(false);
      refetch();
    } else {
      toastError('Could not cancel challan');
      setCancelOpen(false);
    }
  };

  const totalValue = challan.items.reduce(
    (sum, item) => sum + Number(item.unitPriceSnapshot) * item.quantity,
    0
  );

  return (
    <AppLayout
      title={challan.challanNumber}
      actions={
        canWrite && challan.status === 'Draft' ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Pencil size={13} />}
              onClick={() => navigate(`/challans/${challan.id}/edit`)}
            >
              Edit
            </Button>
            <Button variant="primary" size="sm" onClick={() => setConfirmOpen(true)}>
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-red-500 hover:bg-red-50"
              onClick={() => setCancelOpen(true)}
            >
              Cancel
            </Button>
          </div>
        ) : canWrite && challan.status === 'Confirmed' ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-red-500 hover:bg-red-50"
            onClick={() => setCancelOpen(true)}
          >
            Cancel challan
          </Button>
        ) : null
      }
    >
      <div className="mb-5">
        <button
          onClick={() => navigate('/challans')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Challans
        </button>
      </div>

      {/* Header card */}
      <Card className="mb-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{challan.challanNumber}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Created {new Date(challan.createdAt).toLocaleString()}
            </p>
          </div>
          <ChallanStatusBadge status={challan.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <InfoRow label="Customer" value={challan.customer.name} />
          <InfoRow label="Business" value={challan.customer.businessName} />
          <InfoRow label="Created by" value={challan.createdBy.name} />
          <InfoRow
            label="Last updated"
            value={new Date(challan.updatedAt).toLocaleDateString()}
          />
        </div>

        {/* Stats strip */}
        <div className="mt-5 grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Line items</p>
            <p className="text-3xl font-bold text-slate-700">{challan.items.length}</p>
          </div>
          <div className="text-center border-x border-slate-200">
            <p className="text-xs text-slate-400 mb-1">Total qty</p>
            <p className="text-3xl font-bold text-sky-600">{challan.totalQuantity}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Total value</p>
            <p className="text-3xl font-bold text-slate-700">₹{totalValue.toFixed(2)}</p>
          </div>
        </div>
      </Card>

      {/* Items table */}
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Line Items</h3>
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {['#', 'Product', 'SKU', 'Unit Price', 'Qty', 'Subtotal'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {challan.items.map((item, i) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 hover:bg-slate-50/40"
                >
                  <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {item.productNameSnapshot}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {item.skuSnapshot}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    ₹{Number(item.unitPriceSnapshot).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.quantity}</td>
                  <td className="px-4 py-3 font-semibold text-sky-700">
                    ₹{(Number(item.unitPriceSnapshot) * item.quantity).toFixed(2)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/60">
                <td colSpan={4} className="px-4 py-3 text-xs text-slate-500 font-medium">Total</td>
                <td className="px-4 py-3 font-bold text-slate-900">{challan.totalQuantity}</td>
                <td className="px-4 py-3 font-bold text-sky-700">₹{Number(totalValue).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Confirm modal */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Challan">
        <p className="text-sm text-slate-600 mb-1">
          Confirm <span className="font-semibold">{challan.challanNumber}</span>?
        </p>
        <p className="text-xs text-slate-400 mb-6">
          Stock will be deducted for all {challan.items.length} line item{challan.items.length !== 1 ? 's' : ''}.
          This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Back</Button>
          <Button variant="primary" loading={mutating} onClick={handleConfirm}>
            Yes, confirm
          </Button>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Challan">
        <p className="text-sm text-slate-600 mb-6">
          Cancel <span className="font-semibold">{challan.challanNumber}</span>?
          {challan.status === 'Confirmed' && (
            <span className="block mt-1 text-xs text-amber-600">
              ⚠ This challan is already confirmed — stock may be reversed depending on backend settings.
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>Back</Button>
          <Button variant="danger" loading={mutating} onClick={handleCancel}>Cancel challan</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
