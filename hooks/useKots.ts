import { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';

export interface KOTTranDto {
  id: number;
  kotId: number;
  masterId: number;
  tranId: number;
  menuId: number;
  qty: number;
  details: string;
  instruction?: string;
  kotType: number;
}

export interface KOTMasterDto {
  id: number;
  masterId: number;
  outletId: number;
  kotNo: number;
  kotFullCode: string;
  kotTime: string;
  prepared: boolean;
  delivered: boolean;
  isVoid: boolean;
  lines: KOTTranDto[];
}

export function useKots(outletId: number | null, enabled: boolean = true) {
  const [kots, setKots] = useState<KOTMasterDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKots = useCallback(async () => {
    if (!outletId || !enabled) return;
    setLoading(true);
    try {
      // 1. Fetch all invoices for this outlet to identify active sessions
      const invRes = await apiClient.get<any[]>(`/api/FNBInvoiceMaster/outlet/${outletId}`);
      const activeInvoices = invRes.data;
      const validMasterIds = new Set(activeInvoices.map(inv => inv.id));

      // 2. Fetch KOT list
      const response = await apiClient.get<KOTMasterDto[]>('/api/KOTMaster');
      
      // 3. Filter KOTs belonging to our outlet and active invoices
      const initialFiltered = response.data.filter(k => 
        validMasterIds.has(k.masterId) && 
        !k.delivered && 
        !k.isVoid
      );

      if (initialFiltered.length === 0) {
        setKots([]);
        setError(null);
        return;
      }

      // 4. Fetch transactions ONLY for invoices that actually have active KOTs
      // This is the major optimization: we avoid N calls for invoices with no KOTs.
      const relevantMasterIds = [...new Set(initialFiltered.map(k => k.masterId))];
      const tranMap: Record<number, any> = {};
      
      await Promise.all(
        relevantMasterIds.map(async (mId) => {
          try {
            const transRes = await apiClient.get<any[]>(`/api/FNBInvoiceTran/master/${mId}`);
            transRes.data.forEach(t => {
              tranMap[t.id] = t;
            });
          } catch (e) {
            console.error(`Failed to fetch trans for invoice ${mId}`, e);
          }
        })
      );

      // 5. Fetch full details for each KOT and map names
      const detailedKots = await Promise.all(
        initialFiltered.map(async (k) => {
          try {
            const detailRes = await apiClient.get<any>(`/api/KOTMaster/${k.id}`);
            const fullKot = detailRes.data;
            
            // Map the names using our consolidated tranMap
            if (fullKot.lines) {
              fullKot.lines = fullKot.lines.map((line: any) => {
                const tran = tranMap[line.fnbTranId];
                return {
                  ...line,
                  details: tran?.menuName || `Item #${line.fnbTranId}`,
                  isActuallyNegative: line.qty < 0 || line.isVoid === true || line.kotType > 0
                };
              });
            }
            return fullKot;
          } catch (e) {
            console.error(`Failed to fetch details for KOT ${k.id}`, e);
            return k;
          }
        })
      );

      // 6. Sort by time (Oldest First - FIFO)
      detailedKots.sort((a, b) => {
        const timeA = a.kotTime ? new Date(a.kotTime).getTime() : 0;
        const timeB = b.kotTime ? new Date(b.kotTime).getTime() : 0;
        return timeA - timeB;
      });
      
      setKots(detailedKots);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching KOTs:', err);
      setError('Failed to load KOTs');
    } finally {
      setLoading(false);
    }
  }, [outletId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setKots([]);
      return;
    }
    
    fetchKots();
    // Refresh every 30 seconds for active view
    const interval = setInterval(fetchKots, 30000);
    return () => clearInterval(interval);
  }, [fetchKots, enabled]);

  return { kots, loading, error, refreshKots: fetchKots };
}
