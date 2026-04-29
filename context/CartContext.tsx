import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartLine, MenuByOutletItem } from '../types/types';
import {
  addOnSelectionEqual,
  itemHasVariations,
  sortMappingIds,
} from '../lib/menuVariations';

const CART_STORAGE_KEY = '@qr_app_cart_lines_v4';

function normalizeAddonIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is number => typeof x === 'number');
}

function normalizeCartLines(data: unknown): CartLine[] {
  if (!Array.isArray(data)) return [];
  const out: CartLine[] = [];
  for (const row of data) {
    if (row == null || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (
      typeof r.outletId !== 'number' ||
      typeof r.itemId !== 'number' ||
      typeof r.qty !== 'number' ||
      r.item == null ||
      typeof r.item !== 'object'
    ) {
      continue;
    }
    const vid = r.variationId;
    if (vid != null && typeof vid !== 'number') continue;
    out.push({
      outletId: r.outletId,
      itemId: r.itemId,
      variationId: typeof vid === 'number' ? vid : null,
      selectedAddOnMappingIds: sortMappingIds(
        normalizeAddonIds(r.selectedAddOnMappingIds),
      ),
      selectedModifierMappingIds: sortMappingIds(
        normalizeAddonIds(r.selectedModifierMappingIds),
      ),
      qty: r.qty,
      item: r.item as MenuByOutletItem,
    });
  }
  return out;
}

function validAddOnIdsForItem(
  item: MenuByOutletItem,
  ids: number[],
): number[] {
  const list = (item as any).addOnMappings;
  if (!list?.length) return [];
  const allowed = new Set(list.map((m: any) => m.mappingId));
  return sortMappingIds(ids.filter((id) => allowed.has(id)));
}

function validModifierIdsForItem(
  item: MenuByOutletItem,
  ids: number[],
): number[] {
  const list = (item as any).modifierMappings;
  if (!list?.length) return [];
  const allowed = new Set(list.map((m: any) => m.mappingId));
  return sortMappingIds(ids.filter((id) => allowed.has(id)));
}

type CartContextValue = {
  lines: CartLine[];
  linesForOutlet: (outletId: number) => CartLine[];
  linesForTable: (outletId: number, tableNo: string | null) => CartLine[];
  totalQtyForOutlet: (outletId: number) => number;
  totalQtyForTable: (outletId: number, tableNo: string | null) => number;
  addItem: (
    outletId: number,
    tableNo: string | null,
    item: MenuByOutletItem,
    variationId: number | null,
    selectedAddOnMappingIds: number[],
    selectedModifierMappingIds: number[],
  ) => void;
  increment: (
    outletId: number,
    tableNo: string | null,
    itemId: number,
    variationId: number | null,
    selectedAddOnMappingIds: number[],
    selectedModifierMappingIds: number[],
  ) => void;
  decrement: (
    outletId: number,
    tableNo: string | null,
    itemId: number,
    variationId: number | null,
    selectedAddOnMappingIds: number[],
    selectedModifierMappingIds: number[],
  ) => void;
  removeLine: (
    outletId: number,
    tableNo: string | null,
    itemId: number,
    variationId: number | null,
    selectedAddOnMappingIds: number[],
    selectedModifierMappingIds: number[],
  ) => void;
  clearOutlet: (outletId: number) => void;
  clearTable: (outletId: number, tableNo: string | null) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function lineMatches(
  l: CartLine,
  outletId: number,
  tableNo: string | null,
  itemId: number,
  variationId: number | null,
  selectedAddOnMappingIds: number[],
  selectedModifierMappingIds: number[],
): boolean {
  return (
    l.outletId === outletId &&
    (l.tableNo ?? null) === (tableNo ?? null) &&
    l.itemId === itemId &&
    (l.variationId ?? null) === (variationId ?? null) &&
    addOnSelectionEqual(l.selectedAddOnMappingIds ?? [], selectedAddOnMappingIds) &&
    addOnSelectionEqual(
      l.selectedModifierMappingIds ?? [],
      selectedModifierMappingIds,
    )
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rawV4 = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (rawV4 != null) {
          const parsed: unknown = JSON.parse(rawV4);
          if (!cancelled) setLines(normalizeCartLines(parsed));
          if (!cancelled) setHydrated(true);
          return;
        }
        const rawV3 = await AsyncStorage.getItem('@qr_app_cart_lines_v3');
        if (rawV3 != null) {
          const parsed: unknown = JSON.parse(rawV3);
          if (!cancelled) setLines(normalizeCartLines(parsed));
          if (!cancelled) setHydrated(true);
          return;
        }
        const rawV2 = await AsyncStorage.getItem('@qr_app_cart_lines_v2');
        if (rawV2 != null) {
          const parsed: unknown = JSON.parse(rawV2);
          const migrated = normalizeCartLines(parsed);
          if (!cancelled) setLines(migrated);
        } else {
          const rawV1 = await AsyncStorage.getItem('@qr_app_cart_lines_v1');
          if (rawV1 != null) {
            const parsed: unknown = JSON.parse(rawV1);
            const migrated = normalizeCartLines(parsed);
            if (!cancelled) setLines(migrated);
          }
        }
      } catch {
        /* ignore corrupt storage */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines)).catch(
      () => {},
    );
  }, [lines, hydrated]);

  const linesForOutlet = useCallback(
    (outletId: number) => lines.filter((l) => l.outletId === outletId),
    [lines],
  );

  const linesForTable = useCallback(
    (outletId: number, tableNo: string | null) =>
      lines.filter(
        (l) =>
          l.outletId === outletId &&
          (l.tableNo ?? null) === (tableNo ?? null),
      ),
    [lines],
  );

  const totalQtyForOutlet = useCallback(
    (outletId: number) =>
      lines
        .filter((l) => l.outletId === outletId)
        .reduce((sum, l) => sum + l.qty, 0),
    [lines],
  );

  const totalQtyForTable = useCallback(
    (outletId: number, tableNo: string | null) =>
      lines
        .filter(
          (l) =>
            l.outletId === outletId &&
            (l.tableNo ?? null) === (tableNo ?? null),
        )
        .reduce((sum, l) => sum + l.qty, 0),
    [lines],
  );

  const addItem = useCallback(
    (
      outletId: number,
      tableNo: string | null,
      item: MenuByOutletItem,
      variationId: number | null,
      selectedAddOnMappingIds: number[],
      selectedModifierMappingIds: number[],
    ) => {
      const vid = itemHasVariations(item) ? variationId : null;
      const addonIds = validAddOnIdsForItem(item, selectedAddOnMappingIds);
      const modIds = validModifierIdsForItem(item, selectedModifierMappingIds);
      setLines((prev) => {
        const idx = prev.findIndex((l) =>
          lineMatches(l, outletId, tableNo, item.id, vid, addonIds, modIds),
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
          return next;
        }
        return [
          ...prev,
          {
            outletId,
            tableNo,
            itemId: item.id,
            variationId: vid,
            selectedAddOnMappingIds: addonIds,
            selectedModifierMappingIds: modIds,
            qty: 1,
            item: { ...item },
          },
        ];
      });
    },
    [],
  );

  const increment = useCallback(
    (
      outletId: number,
      tableNo: string | null,
      itemId: number,
      variationId: number | null,
      selectedAddOnMappingIds: number[],
      selectedModifierMappingIds: number[],
    ) => {
      setLines((prev) =>
        prev.map((l) =>
          lineMatches(
            l,
            outletId,
            tableNo,
            itemId,
            variationId,
            selectedAddOnMappingIds,
            selectedModifierMappingIds,
          )
            ? { ...l, qty: l.qty + 1 }
            : l,
        ),
      );
    },
    [],
  );

  const decrement = useCallback(
    (
      outletId: number,
      tableNo: string | null,
      itemId: number,
      variationId: number | null,
      selectedAddOnMappingIds: number[],
      selectedModifierMappingIds: number[],
    ) => {
      setLines((prev) => {
        const next: CartLine[] = [];
        for (const l of prev) {
          if (
            !lineMatches(
              l,
              outletId,
              tableNo,
              itemId,
              variationId,
              selectedAddOnMappingIds,
              selectedModifierMappingIds,
            )
          ) {
            next.push(l);
            continue;
          }
          if (l.qty <= 1) continue;
          next.push({ ...l, qty: l.qty - 1 });
        }
        return next;
      });
    },
    [],
  );

  const removeLine = useCallback(
    (
      outletId: number,
      tableNo: string | null,
      itemId: number,
      variationId: number | null,
      selectedAddOnMappingIds: number[],
      selectedModifierMappingIds: number[],
    ) => {
      setLines((prev) =>
        prev.filter(
          (l) =>
            !lineMatches(
              l,
              outletId,
              tableNo,
              itemId,
              variationId,
              selectedAddOnMappingIds,
              selectedModifierMappingIds,
            ),
        ),
      );
    },
    [],
  );

  const clearOutlet = useCallback((outletId: number) => {
    setLines((prev) => prev.filter((l) => l.outletId !== outletId));
  }, []);

  const clearTable = useCallback((outletId: number, tableNo: string | null) => {
    setLines((prev) =>
      prev.filter(
        (l) =>
          !(
            l.outletId === outletId &&
            (l.tableNo ?? null) === (tableNo ?? null)
          ),
      ),
    );
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      linesForOutlet,
      linesForTable,
      totalQtyForOutlet,
      totalQtyForTable,
      addItem,
      increment,
      decrement,
      removeLine,
      clearOutlet,
      clearTable,
    }),
    [
      lines,
      linesForOutlet,
      linesForTable,
      totalQtyForOutlet,
      totalQtyForTable,
      addItem,
      increment,
      decrement,
      removeLine,
      clearOutlet,
      clearTable,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
