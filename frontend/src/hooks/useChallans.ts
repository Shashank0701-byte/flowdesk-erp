import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { Challan, ChallanStatus, PaginatedResponse } from '../types';

// ─── List ─────────────────────────────────────────────────────────────────────

interface ListParams {
  status?: ChallanStatus | '';
  customerId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export function useChallans(params: ListParams = {}) {
  const [data, setData] = useState<Challan[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // strip empty strings so the backend doesn't receive status=''
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== '' && v !== undefined) clean[k] = v;
      }
      const res = await api.get<PaginatedResponse<Challan>>('/challans', { params: clean });
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to load challans');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, meta, loading, error, refetch: fetch };
}

// ─── Single ───────────────────────────────────────────────────────────────────

export function useChallan(id: string) {
  const [data, setData] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ data: Challan }>(`/challans/${id}`);
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to load challan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface ChallanItemInput {
  productId: string;
  quantity: number;
}

export interface CreateChallanBody {
  customerId: string;
  items: ChallanItemInput[];
  status?: 'Draft' | 'Confirmed';
}

export function useChallanMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createChallan = async (body: CreateChallanBody) => {
    setLoading(true); setError('');
    try {
      const res = await api.post<{ data: Challan }>('/challans', body);
      return { ok: true as const, data: res.data.data };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to create challan';
      setError(typeof msg === 'string' ? msg : 'Validation error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  const updateChallan = async (
    id: string,
    body: { customerId?: string; items?: ChallanItemInput[] }
  ) => {
    setLoading(true); setError('');
    try {
      const res = await api.put<{ data: Challan }>(`/challans/${id}`, body);
      return { ok: true as const, data: res.data.data };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to update challan';
      setError(typeof msg === 'string' ? msg : 'Validation error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  const confirmChallan = async (id: string) => {
    setLoading(true); setError('');
    try {
      const res = await api.patch<{ data: Challan }>(`/challans/${id}/confirm`);
      return { ok: true as const, data: res.data.data };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to confirm challan';
      setError(typeof msg === 'string' ? msg : 'Error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  const cancelChallan = async (id: string) => {
    setLoading(true); setError('');
    try {
      const res = await api.patch<{ data: Challan }>(`/challans/${id}/cancel`);
      return { ok: true as const, data: res.data.data };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to cancel challan';
      setError(typeof msg === 'string' ? msg : 'Error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  const deleteChallan = async (id: string) => {
    setLoading(true); setError('');
    try {
      await api.delete(`/challans/${id}`);
      return { ok: true as const };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to delete challan';
      setError(typeof msg === 'string' ? msg : 'Error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, createChallan, updateChallan, confirmChallan, cancelChallan, deleteChallan };
}
