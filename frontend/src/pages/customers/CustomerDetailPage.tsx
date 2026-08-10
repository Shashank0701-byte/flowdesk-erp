import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, MessageSquare, FileText, Send } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, ChallanStatusBadge, CustomerStatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useCustomer, useCustomerNotes, useCustomerMutations } from '../../hooks/useCustomers';
import { useAuth } from '../../context/AuthContext';
import CustomerForm from './CustomerForm';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800">{value || '—'}</p>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success } = useToast();

  const { data: customer, loading, error, refetch } = useCustomer(id!);
  const { data: notes, loading: notesLoading, refetch: refetchNotes } = useCustomerNotes(id!);
  const { loading: mutating, addNote } = useCustomerMutations();

  const [editOpen, setEditOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [activeTab, setActiveTab] = useState<'challans' | 'notes'>('challans');

  const canWrite = user?.role === 'Admin' || user?.role === 'Sales';

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !id) return;
    const result = await addNote(id, noteText.trim());
    if (result.ok) {
      setNoteText('');
      refetchNotes();
      success('Note added');
    }
  };

  if (loading) return (
    <AppLayout title="Customer Detail">
      <PageSpinner />
    </AppLayout>
  );

  if (error || !customer) return (
    <AppLayout title="Customer Detail">
      <div className="text-red-500 text-sm">{error || 'Customer not found'}</div>
    </AppLayout>
  );

  return (
    <AppLayout
      title={customer.name}
      actions={
        canWrite && (
          <Button variant="secondary" size="sm" icon={<Pencil size={13} />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        )
      }
    >
      <div className="mb-5">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Customers
        </button>
      </div>

      {/* Info card */}
      <Card className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{customer.name}</h2>
            {customer.businessName && (
              <p className="text-sm text-slate-500 mt-0.5">{customer.businessName}</p>
            )}
          </div>
          <div className="flex gap-2">
            <CustomerStatusBadge status={customer.status} />
            <Badge>{customer.type}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <InfoRow label="Mobile" value={customer.mobile} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="GST Number" value={customer.gstNumber} />
          <InfoRow label="Address" value={customer.address} />
          <InfoRow
            label="Follow-up Date"
            value={customer.followUpDate
              ? new Date(customer.followUpDate).toLocaleDateString()
              : undefined}
          />
          <InfoRow
            label="Customer Since"
            value={new Date(customer.createdAt).toLocaleDateString()}
          />
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(['challans', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'text-sky-600 border-sky-500'
                : 'text-slate-500 border-transparent hover:text-slate-700',
            ].join(' ')}
          >
            {tab === 'challans' ? <FileText size={13} /> : <MessageSquare size={13} />}
            {tab}
            {tab === 'challans' && customer._count && (
              <span className="ml-1 text-xs bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
                {customer._count.challans}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Challans tab */}
      {activeTab === 'challans' && (
        <Card padding={false}>
          {!customer.challans || customer.challans.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No challans yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Challan #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {customer.challans.map((ch, i) => (
                  <motion.tr
                    key={ch.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-slate-50 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{ch.challanNumber}</td>
                    <td className="px-4 py-3"><ChallanStatusBadge status={ch.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{ch.totalQuantity}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(ch.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/challans/${ch.id}`}
                        className="text-sky-500 hover:text-sky-700 text-xs font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Notes tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Add note */}
          {canWrite && (
            <Card>
              <form onSubmit={handleAddNote} className="flex gap-3 items-end">
                <Textarea
                  placeholder="Add a note about this customer…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1"
                  rows={2}
                />
                <Button
                  type="submit"
                  loading={mutating}
                  disabled={!noteText.trim()}
                  icon={<Send size={13} />}
                  size="sm"
                >
                  Add
                </Button>
              </form>
            </Card>
          )}

          {notesLoading ? (
            <PageSpinner />
          ) : notes.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">No notes yet</div>
          ) : (
            notes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card>
                  <p className="text-sm text-slate-800 leading-relaxed">{note.note}</p>
                  <p className="text-xs text-slate-400 mt-3">
                    {note.user.name} · {new Date(note.createdAt).toLocaleString()}
                  </p>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Customer" width="lg">
        <CustomerForm
          customer={customer}
          onSuccess={() => { setEditOpen(false); refetch(); success('Customer updated'); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </AppLayout>
  );
}
