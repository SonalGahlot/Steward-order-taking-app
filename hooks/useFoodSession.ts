import { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';
import type { FoodSessionDto } from '../types/types';

export function useFoodSession(outletId: number | undefined) {
  const [sessions, setSessions] = useState<FoodSessionDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch open sessions for the outlet
      const response = await apiClient.get<FoodSessionDto[]>(`/api/FoodSession?outletId=${outletId}&openOnly=true`);
      const raw = response.data;
      const data = Array.isArray(raw) ? raw : [];
      setSessions(data.filter(s => s.isOpen));
    } catch (err) {
      console.error('Failed to fetch food sessions', err);
      setError('Failed to load food sessions.');
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, refetch: fetchSessions };
}
