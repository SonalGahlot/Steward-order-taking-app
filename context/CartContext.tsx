import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import type { MenuByOutletItem } from '../types/types';
import apiClient from '../apiClient';
import { Alert } from 'react-native';

export interface CartItemType {
  id: string; // unique hash: itemId|variationId|addonIds|modifierIds
  menuItem: MenuByOutletItem;
  quantity: number;
  sentQuantity: number; // How many have been sent via KOT
  variationId: number | null;
  addonIds: number[];
  modifierIds: number[];
  computedPrice: number; // total unit price including customizations
  tranId?: number; // Backend transaction ID if it exists
}

interface CartContextType {
  cartItems: CartItemType[];
  serverItems: CartItemType[];
  cartTotal: number;
  cartItemCount: number;
  invoiceId: number | null;
  foodSessionId: number | null;
  outletId: number | null;
  selectedTable: string | null;
  setInvoiceId: (id: number | null) => void;
  setFoodSessionId: (id: number | null) => void;
  setTableContext: (outletId: number, table: string, sessionId: number | null) => void;
  addToCart: (
    item: MenuByOutletItem,
    variationId?: number | null,
    addonIds?: number[],
    modifierIds?: number[]
  ) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  setInvoiceData: (invoiceId: number, transactions: any[], addOns?: any[]) => void;
  hydrateCart: (menus: MenuByOutletItem[]) => void;
  markAsSent: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [serverItems, setServerItems] = useState<CartItemType[]>([]);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [foodSessionId, setFoodSessionId] = useState<number | null>(null);
  const [outletId, setOutletId] = useState<number | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.computedPrice * item.quantity, 0);

  const calculateComputedPrice = (
    item: MenuByOutletItem,
    variationId: number | null,
    addonIds: number[],
    modifierIds: number[]
  ) => {
    let price = item.unitPrice;

    // Check variation
    const vars: any[] = (item as any).variations || [];
    if (variationId) {
      const v = vars.find((x: any) => x.id === variationId);
      if (v) price = v.unitPrice;
    }

    // Check addons
    const addons: any[] = (item as any).addOns || [];
    addonIds.forEach(id => {
      const a = addons.find((x: any) => x.addOnMenuId === id);
      if (a && !a.isFree) price += a.addOnPrice;
    });

    // Check modifiers
    const modifiers: any[] = (item as any).modifiers || [];
    modifierIds.forEach(id => {
      const m = modifiers.find((x: any) => x.id === id);
      if (m && m.isChargeable) price += m.priceAdjustment;
    });

    return price;
  };

  const generateCartItemId = (
    itemId: number,
    variationId: number | null,
    addonIds: number[],
    modifierIds: number[]
  ) => {
    return `${itemId}|${variationId || ''}|${[...addonIds].sort().join(',')}|${[...modifierIds].sort().join(',')}`;
  };

  const addToCart = useCallback(async (
    item: MenuByOutletItem,
    variationId: number | null = null,
    addonIds: number[] = [],
    modifierIds: number[] = []
  ) => {
    const id = generateCartItemId(item.id, variationId, addonIds, modifierIds);
    let currentTranId: number | undefined;

    setCartItems(prev => {
      const existing = prev.find(x => x.id === id);
      if (existing) {
        currentTranId = existing.tranId;
        return prev.map(x => (x.id === id ? { ...x, quantity: x.quantity + 1 } : x));
      }

      const sItem = serverItems.find(x => x.id === id);
      currentTranId = sItem?.tranId;
      const computedPrice = calculateComputedPrice(item, variationId, addonIds, modifierIds);

      return [
        ...prev,
        {
          id,
          menuItem: item,
          quantity: 1,
          sentQuantity: sItem ? sItem.sentQuantity : 0,
          variationId,
          addonIds,
          modifierIds,
          computedPrice,
          tranId: sItem ? sItem.tranId : undefined,
        },
      ];
    });

    // Server Sync
    try {
      let currentInvoiceId = invoiceId;

      // 1. Create Invoice Master if it doesn't exist
      if (!currentInvoiceId && outletId && selectedTable && foodSessionId) {
        console.log('[Cart] Creating new invoice master...');
        const masterRes = await apiClient.post('/api/FNBInvoiceMaster', {
          outletId: outletId,
          tableId: parseInt(selectedTable, 10),
          tableNo: 1,
          foodSessionId: foodSessionId,
          orderType: 'DineIn',
          pax: 1,
          stewardId: 1,
        });
        if (masterRes.data && masterRes.data.id) {
          currentInvoiceId = masterRes.data.id;
          setInvoiceId(currentInvoiceId);
        }
      }

      if (currentInvoiceId) {
        if (currentTranId) {
          const existing = cartItems.find(x => x.id === id);
          const newQty = (existing ? existing.quantity : 0) + 1;
          await apiClient.put(`/api/FNBInvoiceTran/${currentTranId}/qty`, { qty: newQty });
        } else {
          const res = await apiClient.post('/api/FNBInvoiceTran', {
            masterId: currentInvoiceId,
            menuId: item.id,
            variationId,
            qty: 1,
            unitPrice: calculateComputedPrice(item, variationId, addonIds, modifierIds),
            addOnsIdList: addonIds.join(','),
          });
          const newId = res.data.id;
          await apiClient.put(`/api/FNBInvoiceTran/${newId}/qty`, { qty: 1 });
          setCartItems(prev => prev.map(x => x.id === id ? { ...x, tranId: newId } : x));

          if (addonIds.length > 0) {
            const addons: any[] = (item as any).addOns || [];
            for (const aid of addonIds) {
              const selectedAddon = addons.find((a: any) => a.addOnMenuId === aid);
              await apiClient.post('/api/FNBInvoiceTranAddOn', {
                masterId: currentInvoiceId,
                menuId: item.id,
                addOnId: aid,
                price: selectedAddon ? selectedAddon.addOnPrice : 0
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to sync addToCart to server', e);
    }
  }, [invoiceId, cartItems, serverItems]);

  const updateQuantity = useCallback(async (cartItemId: string, delta: number) => {
    let targetItem: CartItemType | undefined;
    setCartItems(prev => {
      const updated = prev.map(item => {
        if (item.id === cartItemId) {
          const newQty = item.quantity + delta;
          targetItem = { ...item, quantity: newQty };
          return targetItem;
        }
        return item;
      }).filter(item => item.quantity > 0);
      return updated;
    });

    // Server Sync
    try {
      if (invoiceId && targetItem && targetItem.tranId) {
        if (delta > 0) {
          // Increase: Use /qty endpoint
          await apiClient.put(`/api/FNBInvoiceTran/${targetItem.tranId}/qty`, { qty: targetItem.quantity });
        } else if (delta < 0) {
          // Decrease: Use /void endpoint for the delta
          await apiClient.post(`/api/FNBInvoiceTran/${targetItem.tranId}/void`, {
            voidQty: Math.abs(delta),
            reason: 'Quantity reduced in cart',
            voidBy: 'User'
          });
        }
      }
    } catch (e) {
      console.error('Failed to sync updateQuantity to server', e);
    }
  }, [invoiceId]);

  const removeFromCart = useCallback(async (cartItemId: string) => {
    let targetItem: CartItemType | undefined;
    setCartItems(prev => {
      targetItem = prev.find(item => item.id === cartItemId);
      return prev.filter(item => item.id !== cartItemId);
    });

    // Server Sync
    try {
      if (invoiceId && targetItem && targetItem.tranId) {
        await apiClient.post(`/api/FNBInvoiceTran/${targetItem.tranId}/void`, {
          voidQty: targetItem.quantity,
          reason: 'Removed from cart',
          voidBy: 'User'
        });
      }
    } catch (e) {
      console.error('Failed to sync removeFromCart to server', e);
    }
  }, [invoiceId]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setServerItems([]);
    setInvoiceId(null);
  }, []);


  const setInvoiceData = useCallback((id: number, transactions: any[], addOns: any[] = []) => {
    setInvoiceId(id);
    const newItems: CartItemType[] = transactions
      .filter(t => (t.qty - (t.negQty || 0)) > 0) // Filter out fully voided items
      .map(t => {
        const itemAddons = addOns.filter(a => a.menuId === t.menuId);
        const addonIds = itemAddons.map(a => a.addOnId);
        const effectiveQty = t.qty - (t.negQty || 0);

        return {
          id: generateCartItemId(t.menuId, t.variationId, addonIds, t.modifierId ? [t.modifierId] : []),
          menuItem: t.menuItem || {
            id: t.menuId,
            name: t.menuName || 'Unknown Item',
            unitPrice: t.unitPrice,
            variations: [],
            addOns: [],
            modifiers: []
          },
          quantity: effectiveQty,
          sentQuantity: effectiveQty,
          variationId: t.variationId,
          addonIds: addonIds,
          modifierIds: t.modifierId ? [t.modifierId] : [],
          computedPrice: t.unitPrice,
          tranId: t.id
        };
      });
    setCartItems(newItems);
    setServerItems([...newItems]);
  }, []);

  const hydrateCart = useCallback((menus: MenuByOutletItem[]) => {
    setCartItems(prev => {
      let changed = false;
      const updated = prev.map(item => {
        // Only hydrate if the item is currently a skeleton (no variations/addons etc)
        // or we just want to ensure it has the latest data.
        // To prevent infinite loop, we check if we actually found a better item.
        const fullItem = menus.find(m => m.id === item.menuItem.id);
        if (fullItem && (!item.menuItem.variations || item.menuItem.variations.length === 0)) {
          changed = true;
          return { ...item, menuItem: fullItem };
        }
        return item;
      });
      return changed ? updated : prev;
    });

    setServerItems(prev => {
      let changed = false;
      const updated = prev.map(item => {
        const fullItem = menus.find(m => m.id === item.menuItem.id);
        if (fullItem && (!item.menuItem.variations || item.menuItem.variations.length === 0)) {
          changed = true;
          return { ...item, menuItem: fullItem };
        }
        return item;
      });
      return changed ? updated : prev;
    });
  }, []);

  const markAsSent = useCallback(() => {
    setCartItems(prev => {
      const updated = prev.map(item => ({ ...item, sentQuantity: item.quantity }));
      setServerItems([...updated]);
      return updated;
    });
  }, []);

  const setTableContext = useCallback((oid: number, table: string, sid: number | null) => {
    setOutletId(oid);
    setSelectedTable(table);
    setFoodSessionId(sid);
  }, []);

  const contextValue = useMemo(() => ({
    cartItems,
    serverItems,
    cartTotal,
    cartItemCount,
    invoiceId,
    foodSessionId,
    outletId,
    selectedTable,
    setInvoiceId,
    setFoodSessionId,
    setTableContext,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    setInvoiceData,
    hydrateCart,
    markAsSent,
  }), [
    cartItems,
    serverItems,
    cartTotal,
    cartItemCount,
    invoiceId,
    foodSessionId,
    outletId,
    selectedTable,
    setInvoiceId,
    setFoodSessionId,
    setTableContext,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    setInvoiceData,
    hydrateCart,
    markAsSent,
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
