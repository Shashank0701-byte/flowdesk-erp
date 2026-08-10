import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Package, FileText, AlertTriangle } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { ChallanStatusBadge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { useCustomers } from '../hooks/useCustomers';
import { useProducts } from '../hooks/useProducts';
import { useChallans } from '../hooks/useChallans';

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;   // tailwind bg class for icon shell
  delay: number;
  onClick?: () => void;
}

function StatCard({ label, value, icon, color, delay, onClick }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      onClick={onClick}
      className={onClick ? 'cursor-pointer' : ''}
    >
      <Card className={['flex items-center gap-4', onClick ? 'hover:shadow-md transition-shadow' : ''].join(' ')}>
        <div className={['w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color].join(' ')}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 leading-none mb-1">{value}</p>
          <p className="text-xs text-slate-400 font-medium">{label}</p>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();

  const { meta: custMeta, loading: custLoading } = useCustomers({ limit: 1 });
  const { meta: prodMeta, loading: prodLoading } = useProducts({ limit: 1 });
  const { data: lowStockProducts, loading: lowLoading } = useProducts({ lowStock: true, limit: 10 });
  const { meta: challanMeta, loading: challanLoading } = useChallans({ limit: 1 });
  const { data: recentChallans, loading: recentLoading } = useChallans({ limit: 6 });

  const loading = custLoading || prodLoading || challanLoading;

  return (
    <AppLayout title="Dashboard">
      {loading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-8">

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Customers"
              value={custMeta.total}
              icon={<Users size={20} className="text-sky-600" />}
              color="bg-sky-50"
              delay={0}
              onClick={() => navigate('/customers')}
            />
            <StatCard
              label="Total Products"
              value={prodMeta.total}
              icon={<Package size={20} className="text-slate-600" />}
              color="bg-slate-100"
              delay={0.05}
              onClick={() => navigate('/products')}
            />
            <StatCard
              label="Total Challans"
              value={challanMeta.total}
              icon={<FileText size={20} className="text-sky-600" />}
              color="bg-sky-50"
              delay={0.1}
              onClick={() => navigate('/challans')}
            />
            <StatCard
              label="Low Stock Alerts"
              value={lowStockProducts.length}
              icon={<AlertTriangle size={20} className="text-amber-500" />}
              color="bg-amber-50"
              delay={0.15}
              onClick={() => navigate('/products?lowStock=1')}
            />
          </div>

          {/* Two-column lower section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Low stock panel */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card padding={false}>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <AlertTriangle size={13} className="text-amber-500" />
                    Low Stock Alerts
                  </h3>
                  <button
                    onClick={() => navigate('/products')}
                    className="text-xs text-sky-500 hover:text-sky-700 transition-colors"
                  >
                    View all →
                  </button>
                </div>

                {lowLoading ? (
                  <PageSpinner />
                ) : lowStockProducts.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    All products are well stocked 🎉
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {lowStockProducts.map((p, i) => (
                      <motion.button
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.22 + i * 0.04 }}
                        onClick={() => navigate(`/products/${p.id}`)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">{p.name}</p>
                          <p className="text-xs font-mono text-slate-400">{p.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-500">{p.currentStock}</p>
                          <p className="text-xs text-slate-400">min {p.minStockAlert}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Recent challans panel */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card padding={false}>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileText size={13} className="text-sky-500" />
                    Recent Challans
                  </h3>
                  <button
                    onClick={() => navigate('/challans')}
                    className="text-xs text-sky-500 hover:text-sky-700 transition-colors"
                  >
                    View all →
                  </button>
                </div>

                {recentLoading ? (
                  <PageSpinner />
                ) : recentChallans.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    No challans yet
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {recentChallans.map((c, i) => (
                      <motion.button
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.27 + i * 0.04 }}
                        onClick={() => navigate(`/challans/${c.id}`)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold font-mono text-slate-700">
                            {c.challanNumber}
                          </p>
                          <p className="text-xs text-slate-400">{c.customer.name}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <ChallanStatusBadge status={c.status} />
                          <p className="text-xs text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>

          </div>
        </div>
      )}
    </AppLayout>
  );
}
