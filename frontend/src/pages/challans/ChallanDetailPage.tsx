import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, Printer } from 'lucide-react';
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

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const statusColor =
      challan.status === 'Confirmed'
        ? { bg: '#dcfce7', text: '#15803d' }
        : challan.status === 'Cancelled'
        ? { bg: '#fee2e2', text: '#b91c1c' }
        : { bg: '#f1f5f9', text: '#475569' };

    const rows = challan.items
      .map(
        (item, i) => `
        <tr>
          <td style="color:#94a3b8">${i + 1}</td>
          <td style="font-weight:500">${item.productNameSnapshot}</td>
          <td style="font-family:monospace;font-size:11px;color:#94a3b8">${item.skuSnapshot}</td>
          <td>&#8377;${Number(item.unitPriceSnapshot).toFixed(2)}</td>
          <td style="font-weight:600">${item.quantity}</td>
          <td style="font-weight:600;color:#0369a1">&#8377;${(Number(item.unitPriceSnapshot) * item.quantity).toFixed(2)}</td>
        </tr>`
      )
      .join('');

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${challan.challanNumber}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;color:#0f172a;padding:40px;font-size:14px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #e2e8f0}
    .brand{font-size:22px;font-weight:700;color:#0ea5e9}
    .brand-sub{font-size:12px;color:#94a3b8;margin-top:2px}
    .status{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;background:${statusColor.bg};color:${statusColor.text}}
    .meta{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:20px;margin-bottom:28px}
    .meta label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8}
    .meta p{font-size:14px;font-weight:500;margin-top:3px}
    table{width:100%;border-collapse:collapse}
    th{background:#f8fafc;padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:1px solid #e2e8f0}
    td{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px}
    tfoot td{font-weight:700;background:#f8fafc;border-top:2px solid #e2e8f0}
    .footer{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
    @media print{body{padding:24px}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Flowdesk</div>
      <div class="brand-sub">ERP / CRM Suite</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:700">${challan.challanNumber}</div>
      <div style="margin-top:6px"><span class="status">${challan.status}</span></div>
      <div style="font-size:11px;color:#94a3b8;margin-top:4px">
        ${new Date(challan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  </div>
  <div class="meta">
    <div><label>Customer</label><p>${challan.customer.name}</p></div>
    <div><label>Business</label><p>${challan.customer.businessName ?? '—'}</p></div>
    <div><label>Created by</label><p>${challan.createdBy.name}</p></div>
    <div><label>Total value</label><p style="color:#0369a1">&#8377;${totalValue.toFixed(2)}</p></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Unit Price</th><th>Qty</th><th>Subtotal</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">Total</td>
        <td>${challan.totalQuantity}</td>
        <td style="color:#0369a1">&#8377;${totalValue.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>
  <div class="footer">Generated by Flowdesk &middot; ${new Date().toLocaleString('en-IN')}</div>
  <script>window.onload=()=>{window.print()}<\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <AppLayout
      title={challan.challanNumber}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Printer size={13} />}
            onClick={handlePrint}
          >
            Export PDF
          </Button>
          {canWrite && challan.status === 'Draft' && (
            <>
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
            </>
          )}
          {canWrite && challan.status === 'Confirmed' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-red-500 hover:bg-red-50"
              onClick={() => setCancelOpen(true)}
            >
              Cancel challan
            </Button>
          )}
        </div>
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
