import { useState, useEffect } from 'react';
import apiClient from '../apiClient';

export interface TaxInfo {
  pct: number;
  inc: boolean;
  name: string;
}

const taxCache = new Map<number, TaxInfo>();

// Synchronous getter for non-component contexts
export const getMenuTax = (menuId: number, fallbackGst: number): TaxInfo => {
  const entry = taxCache.get(menuId);
  if (entry) return entry;

  // Fire background fetch to populate cache for future
  apiClient
    .get(`/api/MenuTaxMapping?menuId=${menuId}`)
    .then((res) => {
      const data = res.data;
      let pct = fallbackGst;
      let inc = false;
      let name = 'GST';

      const parseObj = (obj: any) => {
        if (obj == null) return;
        if (typeof obj.taxPercentage === 'number') pct = obj.taxPercentage;
        if (typeof obj.isIncludedInPrice === 'boolean') inc = obj.isIncludedInPrice;
        if (typeof obj.taxName === 'string') name = obj.taxName;
      };

      if (Array.isArray(data)) {
        if (data.length > 0) parseObj(data[0]);
      } else if (data && typeof data === 'object') {
        const raw = data.data ?? data;
        if (Array.isArray(raw)) {
          if (raw.length > 0) parseObj(raw[0]);
        } else {
          parseObj(raw);
        }
      }
      taxCache.set(menuId, { pct, inc, name });
    })
    .catch(() => {
      taxCache.set(menuId, { pct: fallbackGst, inc: false, name: 'GST' });
    });

  return { pct: fallbackGst, inc: false, name: 'GST' };
};

export const useTax = (menuId: number, fallbackGst: number) => {
  const [taxInfo, setTaxInfo] = useState<TaxInfo>(() => getMenuTax(menuId, fallbackGst));

  useEffect(() => {
    let cancelled = false;
    
    const timer = setInterval(() => {
      const entry = taxCache.get(menuId);
      if (entry) {
        if (!cancelled) setTaxInfo(entry);
        clearInterval(timer);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [menuId, fallbackGst]);

  return taxInfo;
};
