import { ChallanStatus, CustomerStatus, StockMovementType } from '../../types';

type BadgeVariant =
  | 'draft'
  | 'confirmed'
  | 'cancelled'
  | 'active'
  | 'inactive'
  | 'lowstock'
  | 'in'
  | 'out'
  | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  draft: 'bg-sky-100 text-sky-700',
  confirmed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-slate-100 text-slate-600',
  active: 'bg-sky-100 text-sky-700',
  inactive: 'bg-slate-100 text-slate-600',
  lowstock: 'bg-amber-100 text-amber-700',
  in: 'bg-blue-100 text-blue-700',
  out: 'bg-red-100 text-red-600',
  default: 'bg-slate-100 text-slate-600',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

// ─── Convenience mappers ──────────────────────────────────────────────────────

export function ChallanStatusBadge({ status }: { status: ChallanStatus }) {
  const map: Record<ChallanStatus, BadgeVariant> = {
    Draft: 'draft',
    Confirmed: 'confirmed',
    Cancelled: 'cancelled',
  };
  return <Badge variant={map[status]}>{status}</Badge>;
}

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return <Badge variant={status === 'Active' ? 'active' : 'inactive'}>{status}</Badge>;
}

export function StockTypeBadge({ type }: { type: StockMovementType }) {
  return <Badge variant={type === 'IN' ? 'in' : 'out'}>{type}</Badge>;
}
