import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { Customer, CustomerNote, PaginatedResponse } from '../types';

// ─── List ─────────────────────────────────────────────────────────────────────

interface ListParams {
  q?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export function useCustomers(params: ListParams = {}) {
  const [data, setData] = useState<Customer[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // strip empty strings so enum fields don't fail backend validation
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== '' && v !== undefined) clean[k] = v;
      }
      const res = await api.get<PaginatedResponse<Customer>>('/customers', { params: clean });
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, meta, loading, error, refetch: fetch };
}

// ─── Single ───────────────────────────────────────────────────────────────────

export function useCustomer(id: string) {
  const [data, setData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ data: Customer }>(`/customers/${id}`);
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function useCustomerNotes(customerId: string) {
  const [data, setData] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: CustomerNote[] }>(`/customers/${customerId}/notes`);
      setData(res.data.data);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCustomerMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clearError = () => setError('');

  const createCustomer = async (body: Record<string, any>) => {
    setLoading(true); setError('');
    try {
      const res = await api.post<{ data: Customer }>('/customers', body);
      return { ok: true as const, data: res.data.data };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to create customer';
      setError(typeof msg === 'string' ? msg : 'Validation error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  const updateCustomer = async (id: string, body: Record<string, any>) => {
    setLoading(true); setError('');
    try {
      const res = await api.put<{ data: Customer }>(`/customers/${id}`, body);
      return { ok: true as const, data: res.data.data };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to update customer';
      setError(typeof msg === 'string' ? msg : 'Validation error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    setLoading(true); setError('');
    try {
      await api.delete(`/customers/${id}`);
      return { ok: true as const };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to delete customer';
      setError(typeof msg === 'string' ? msg : 'Error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (customerId: string, note: string) => {
    setLoading(true); setError('');
    try {
      const res = await api.post<{ data: CustomerNote }>(`/customers/${customerId}/notes`, { note });
      return { ok: true as const, data: res.data.data };
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to add note');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, clearError, createCustomer, updateCustomer, deleteCustomer, addNote };
}
