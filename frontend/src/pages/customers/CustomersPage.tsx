import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2, Eye, Pencil } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge, CustomerStatusBadge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useCustomers, useCustomerMutations } from '../../hooks/useCustomers';
import { useAuth } from '../../context/AuthContext';
import CustomerForm from './CustomerForm';

export default function CustomersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: customers, meta, loading, refetch } = useCustomers({ q, status, page, limit: 20 });
  const { loading: mutating, deleteCustomer } = useCustomerMutations();

  const canWrite = user?.role === 'Admin' || user?.role === 'Sales';
  const canDelete = user?.role === 'Admin';

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteCustomer(deleteTarget);
    if (result.ok) {
      success('Customer deleted');
      setDeleteTarget(null);
      refetch();
    } else {
      toastError('Cannot delete — customer has existing challans');
      setDeleteTarget(null);
    }
  };

  const deleteTargetName = customers.find((c) => c.id === deleteTarget)?.name;
  const editTargetCustomer = customers.find((c) => c.id === editTarget) ?? null;

  return (
    <AppLayout
      title="Customers"
      actions={
        canWrite && (
          <Button icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            Add Customer
          </Button>
        )
      }
    >
      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Input
          placeholder="Search name, mobile, email…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          icon={<Search size={14} />}
          className="w-72"
        />
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-40"
        >
          <option value="">All statuses</option>
          <option value="Lead">Lead</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </Select>
      </div>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <PageSpinner />
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Business</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mobile</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Challans</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-500">{c.businessName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.mobile}</td>
                    <td className="px-4 py-3">
                      <Badge>{c.type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <CustomerStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{c._count?.challans ?? 0}</td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center gap-1 justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye size={13} />}
                          onClick={() => navigate(`/customers/${c.id}`)}
                        />
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={13} />}
                            onClick={() => setEditTarget(c.id)}
                          />
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={13} />}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget(c.id)}
                          />
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {meta.total} customers · page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Customer" width="lg">
        <CustomerForm
          onSuccess={() => { setAddOpen(false); refetch(); success('Customer created'); }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Customer" width="lg">
        <CustomerForm
          customer={editTargetCustomer ?? undefined}
          onSuccess={() => { setEditTarget(null); refetch(); success('Customer updated'); }}
          onCancel={() => setEditTarget(null)}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Customer">
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteTargetName}</span>?
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
