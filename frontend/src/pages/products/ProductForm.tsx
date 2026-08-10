import { useState } from 'react';
import { Product } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useProductMutations } from '../../hooks/useProducts';

interface Props {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: Props) {
  const isEdit = !!product;
  const { loading, error, createProduct, updateProduct } = useProductMutations();

  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category: product?.category ?? '',
    unitPrice: product?.unitPrice?.toString() ?? '',
    currentStock: product?.currentStock?.toString() ?? '0',
    minStockAlert: product?.minStockAlert?.toString() ?? '0',
    location: product?.location ?? '',
  });

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, any> = {
      name: form.name,
      category: form.category,
      unitPrice: parseFloat(form.unitPrice),
      minStockAlert: parseInt(form.minStockAlert, 10),
    };
    if (form.location) body.location = form.location;

    // SKU and currentStock only on create
    if (!isEdit) {
      body.sku = form.sku;
      body.currentStock = parseInt(form.currentStock, 10);
    }

    const result = isEdit
      ? await updateProduct(product!.id, body)
      : await createProduct(body);

    if (result.ok) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Product Name *"
          value={form.name}
          onChange={set('name')}
          required
        />
        <Input
          label="SKU *"
          value={form.sku}
          onChange={set('sku')}
          required={!isEdit}
          disabled={isEdit}
          className={isEdit ? 'bg-slate-50 cursor-not-allowed' : ''}
          title={isEdit ? 'SKU cannot be changed after creation' : ''}
        />
        <Input
          label="Category *"
          value={form.category}
          onChange={set('category')}
          required
        />
        <Input
          label="Unit Price (₹) *"
          type="number"
          min="0"
          step="0.01"
          value={form.unitPrice}
          onChange={set('unitPrice')}
          required
        />
        {!isEdit && (
          <Input
            label="Opening Stock"
            type="number"
            min="0"
            value={form.currentStock}
            onChange={set('currentStock')}
          />
        )}
        <Input
          label="Min Stock Alert"
          type="number"
          min="0"
          value={form.minStockAlert}
          onChange={set('minStockAlert')}
        />
        <Input
          label="Location"
          placeholder="Rack A1"
          value={form.location}
          onChange={set('location')}
          className="col-span-2"
        />
      </div>

      {isEdit && (
        <p className="text-xs text-slate-400">
          SKU is immutable. Adjust stock via the stock adjustment form.
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
