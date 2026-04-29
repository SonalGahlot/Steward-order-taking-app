import { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';
import type { TableMaster } from '../types/types';

export function useTables(outletId: number | undefined) {
  const [tables, setTables] = useState<TableMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<TableMaster[]>(`/api/TableMaster?outletId=${outletId}`);
      const raw = response.data;
      const data = Array.isArray(raw) ? raw : [];
      setTables(data.filter(t => t.isActive));
    } catch (err) {
      console.error('Failed to fetch tables', err);
      setError('Failed to load tables.');
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  return { tables, loading, error, refetch: fetchTables };
}
