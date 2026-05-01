import { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';

export function useOccupancy(outletId: number | undefined) {
  const [occupiedTableCodes, setOccupiedTableCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchOccupancy = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      // Fetch all active invoices for the outlet
      const response = await apiClient.get<any[]>(`/api/FNBInvoiceMaster/outlet/${outletId}`);
      const activeInvoices = response.data;
      
      // Extract tableCodes from active invoices
      const codes = new Set(
        activeInvoices
          .map(inv => String(inv.tableCode || inv.tableCaption || ''))
          .filter(code => code !== '')
      );
      
      setOccupiedTableCodes(codes);
    } catch (err) {
      console.error('Failed to fetch occupancy', err);
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    fetchOccupancy();
    // Poll every 30 seconds to keep occupancy status fresh
    const interval = setInterval(fetchOccupancy, 30000);
    return () => clearInterval(interval);
  }, [fetchOccupancy]);

  return { occupiedTableCodes, loading, refreshOccupancy: fetchOccupancy };
}
