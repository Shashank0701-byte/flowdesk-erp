import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { ChallanStatusBadge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useChallans, useChallanMutations } from '../../hooks/useChallans';
import { useAuth } from '../../context/AuthContext';
import { Challan, ChallanStatus } from '../../types';

export default function ChallansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ChallanStatus | ''>('');
  const [page, setPage] = useState(1);

  const [confirmTarget, setConfirmTarget] = useState<Challan | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Challan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Challan | null>(null);

  const { data: challans, meta, loading, refetch } = useChallans({ q, status, page, limit: 20 });
  const { loading: mutating, confirmChallan, cancelChallan, deleteChallan } = useChallanMutations();

  const canWrite = user?.role === 'Admin' || user?.role === 'Sales';
  const canDelete = user?.role === 'Admin';

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    const result = await confirmChallan(confirmTarget.id);
    if (result.ok) {
      success(`Challan ${confirmTarget.challanNumber} confirmed`);
      setConfirmTarget(null);
      refetch();
    } else {
      toastError('Could not confirm challan');
      setConfirmTarget(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const result = await cancelChallan(cancelTarget.id);
    if (result.ok) {
      success(`Challan ${cancelTarget.challanNumber} cancelled`);
      setCancelTarget(null);
      refetch();
    } else {
      toastError('Could not cancel challan');
      setCancelTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteChallan(deleteTarget.id);
    if (result.ok) {
      success('Challan deleted');
      setDeleteTarget(null);
      refetch();
    } else {
      toastError('Cannot delete — challan may be confirmed');
      setDeleteTarget(null);
    }
  };

  return (
    <AppLayout
      title="Challans"
      actions={
        canWrite && (
          <Button icon={<Plus size={14} />} onClick={() => navigate('/challans/new')}>
            New Challan
          </Button>
        )
      }
    >
      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <Input
          placeholder="Search challan number…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          icon={<Search size={14} />}
          className="w-64"
        />
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value as ChallanStatus | ''); setPage(1); }}
          className="w-40"
        >
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Cancelled">Cancelled</option>
        </Select>
      </div>

      <Card padding={false}>
        {loading ? (
          <PageSpinner />
        ) : challans.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            {canWrite
              ? <>No challans yet — <button className="text-sky-500 hover:underline" onClick={() => navigate('/challans/new')}>create one</button></>
              : 'No challans found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {['Challan #', 'Customer', 'Status', 'Qty', 'Date', 'Created by', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {challans.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onClick={() => navigate(`/challans/${c.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      {c.challanNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{c.customer.name}</p>
                      {c.customer.businessName && (
                        <p className="text-xs text-slate-400">{c.customer.businessName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3"><ChallanStatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{c.totalQuantity}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{c.createdBy.name}</td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center gap-1 justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canWrite && c.status === 'Draft' && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/challans/${c.id}/edit`)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setConfirmTarget(c)}
                            >
                              Confirm
                            </Button>
                          </>
                        )}
                        {canWrite && (c.status === 'Draft' || c.status === 'Confirmed') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => setCancelTarget(c)}
                          >
                            Cancel
                          </Button>
                        )}
                        {canDelete && c.status === 'Draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget(c)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {meta.total} challans · page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Confirm modal */}
      <Modal open={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Confirm Challan">
        <p className="text-sm text-slate-600 mb-1">
          Confirm <span className="font-semibold text-slate-900">{confirmTarget?.challanNumber}</span>?
        </p>
        <p className="text-xs text-slate-400 mb-6">
          Stock will be deducted for all line items. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmTarget(null)}>Back</Button>
          <Button variant="primary" loading={mutating} onClick={handleConfirm}>
            Yes, confirm
          </Button>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Challan">
        <p className="text-sm text-slate-600 mb-6">
          Cancel <span className="font-semibold text-slate-900">{cancelTarget?.challanNumber}</span>?
          {cancelTarget?.status === 'Confirmed' && (
            <span className="block mt-1 text-xs text-amber-600">
              ⚠ Stock may be reversed depending on your backend configuration.
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setCancelTarget(null)}>Back</Button>
          <Button variant="danger" loading={mutating} onClick={handleCancel}>
            Cancel challan
          </Button>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Challan">
        <p className="text-sm text-slate-600 mb-6">
          Permanently delete <span className="font-semibold text-slate-900">{deleteTarget?.challanNumber}</span>?
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
