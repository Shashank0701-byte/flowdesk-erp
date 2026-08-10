import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { Product, StockMovement, PaginatedResponse } from '../types';

// ─── List ─────────────────────────────────────────────────────────────────────

interface ListParams {
  q?: string;
  category?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export function useProducts(params: ListParams = {}) {
  const [data, setData] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== '' && v !== undefined) clean[k] = v;
      }
      const res = await api.get<PaginatedResponse<Product>>('/products', { params: clean });
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, meta, loading, error, refetch: fetch };
}

// ─── Single ───────────────────────────────────────────────────────────────────

export function useProduct(id: string) {
  const [data, setData] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ data: Product }>(`/products/${id}`);
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Stock Movements ──────────────────────────────────────────────────────────

interface MovementsParams { page?: number; limit?: number }

export function useStockMovements(productId: string, params: MovementsParams = {}) {
  const [data, setData] = useState<StockMovement[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<StockMovement>>(
        `/products/${productId}/stock`,
        { params }
      );
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [productId, JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, meta, loading, refetch: fetch };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useProductMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clearError = () => setError('');

  const createProduct = async (body: Record<string, any>) => {
    setLoading(true); setError('');
    try {
      const res = await api.post<{ data: Product }>('/products', body);
      return { ok: true as const, data: res.data.data };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to create product';
      setError(typeof msg === 'string' ? msg : 'Validation error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (id: string, body: Record<string, any>) => {
    setLoading(true); setError('');
    try {
      const res = await api.put<{ data: Product }>(`/products/${id}`, body);
      return { ok: true as const, data: res.data.data };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to update product';
      setError(typeof msg === 'string' ? msg : 'Validation error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    setLoading(true); setError('');
    try {
      await api.delete(`/products/${id}`);
      return { ok: true as const };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to delete product';
      setError(typeof msg === 'string' ? msg : 'Error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  const adjustStock = async (
    id: string,
    body: { type: 'IN' | 'OUT'; quantity: number; reason: string }
  ) => {
    setLoading(true); setError('');
    try {
      const res = await api.post<{ data: Product }>(`/products/${id}/stock`, body);
      return { ok: true as const, data: res.data.data };
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to adjust stock';
      setError(typeof msg === 'string' ? msg : 'Error');
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, clearError, createProduct, updateProduct, deleteProduct, adjustStock };
}
