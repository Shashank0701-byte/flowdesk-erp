import { useState } from 'react';
import { Customer } from '../../types';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useCustomerMutations } from '../../hooks/useCustomers';

interface Props {
  customer?: Customer;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CustomerForm({ customer, onSuccess, onCancel }: Props) {
  const isEdit = !!customer;
  const { loading, error, createCustomer, updateCustomer } = useCustomerMutations();

  const [form, setForm] = useState({
    name: customer?.name ?? '',
    mobile: customer?.mobile ?? '',
    email: customer?.email ?? '',
    businessName: customer?.businessName ?? '',
    gstNumber: customer?.gstNumber ?? '',
    type: customer?.type ?? 'Retail',
    status: customer?.status ?? 'Active',
    address: customer?.address ?? '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Strip empty optional strings
    const body = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== '')
    );
    const result = isEdit
      ? await updateCustomer(customer!.id, body)
      : await createCustomer(body);
    if (result.ok) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Name *" value={form.name} onChange={set('name')} required />
        <Input label="Mobile *" value={form.mobile} onChange={set('mobile')} required />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} />
        <Input label="Business Name" value={form.businessName} onChange={set('businessName')} />
        <Input label="GST Number" value={form.gstNumber} onChange={set('gstNumber')} />
        <Input label="Address" value={form.address} onChange={set('address')} />
        <Select label="Type *" value={form.type} onChange={set('type')}>
          <option value="Retail">Retail</option>
          <option value="Wholesale">Wholesale</option>
          <option value="Distributor">Distributor</option>
        </Select>
        <Select label="Status" value={form.status} onChange={set('status')}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </Select>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save changes' : 'Create customer'}
        </Button>
      </div>
    </form>
  );
}
