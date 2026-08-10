import { useState } from 'react';
import { Product } from '../../types';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useProductMutations } from '../../hooks/useProducts';

interface Props {
  product: Product;
  onSuccess: (updated: Product) => void;
  onCancel: () => void;
}

export default function StockAdjustForm({ product, onSuccess, onCancel }: Props) {
  const { loading, error, adjustStock } = useProductMutations();
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const projected =
    quantity
      ? type === 'IN'
        ? product.currentStock + parseInt(quantity, 10)
        : product.currentStock - parseInt(quantity, 10)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await adjustStock(product.id, {
      type,
      quantity: parseInt(quantity, 10),
      reason,
    });
    if (result.ok && result.data) onSuccess(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Current stock banner */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
        <div>
          <p className="text-xs text-slate-400">Current stock</p>
          <p className="text-2xl font-bold text-slate-900">{product.currentStock}</p>
        </div>
        {projected !== null && (
          <div className="text-right">
            <p className="text-xs text-slate-400">After adjustment</p>
            <p className={[
              'text-2xl font-bold',
              projected < 0 ? 'text-red-500' : projected <= product.minStockAlert ? 'text-amber-500' : 'text-sky-600',
            ].join(' ')}>
              {projected}
            </p>
          </div>
        )}
      </div>

      <Select
        label="Movement type"
        value={type}
        onChange={(e) => setType(e.target.value as 'IN' | 'OUT')}
      >
        <option value="IN">IN — Stock received</option>
        <option value="OUT">OUT — Stock removed</option>
      </Select>

      <Input
        label="Quantity *"
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        required
      />

      <Input
        label="Reason *"
        placeholder="e.g. Purchase order PO-001 received"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
      />

      {projected !== null && projected < 0 && (
        <p className="text-xs text-red-500">
          ⚠ This would result in negative stock. The server will reject it.
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button
          type="submit"
          loading={loading}
          variant={type === 'OUT' ? 'danger' : 'primary'}
        >
          Apply {type}
        </Button>
      </div>
    </form>
  );
}
