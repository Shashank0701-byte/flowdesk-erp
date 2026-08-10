import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/challans', label: 'Challans', icon: FileText },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100">
        <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 leading-tight">Vertex ERP</p>
          <p className="text-xs text-slate-400 leading-tight">CRM Suite</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="block"
          >
            {({ isActive }) => (
              <div className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 group">
                {/* Animated active background */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-sky-50 rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon
                  size={16}
                  className={[
                    'relative z-10 transition-colors',
                    isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600',
                  ].join(' ')}
                />
                <span
                  className={[
                    'relative z-10 font-medium transition-colors',
                    isActive ? 'text-sky-700' : 'text-slate-600 group-hover:text-slate-900',
                  ].join(' ')}
                >
                  {label}
                </span>
                {/* Active left border accent */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-accent"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-sky-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card at bottom */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-semibold text-xs shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
