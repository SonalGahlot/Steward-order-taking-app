import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Outlet } from '../types/types';
// Decoupled from menuVariations.ts
import { useCart } from '../context/CartContext';
import { theme } from '../theme';
import { getMenuTax } from '../hooks/useTax';

const { colors } = theme;

function formatPrice(price: number | null | undefined): string {
  if (price == null || Number.isNaN(Number(price))) return '—';
  return `₹${Number(price).toFixed(2)}`;
}

function lineTotalWithTax(
  itemId: number,
  basePrice: number,
  fallbackGst: number,
  qty: number,
): number {
  const base = Number(basePrice) || 0;
  const tax = getMenuTax(itemId, fallbackGst);
  
  if (tax.inc) {
    return base * qty;
  }
  const unit = base * (1 + tax.pct / 100);
  return unit * qty;
}

export interface CartModalProps {
  visible: boolean;
  onClose: () => void;
  outlet: Outlet;
  selectedTable?: string | null;
  /** Opens the order form. Kept outside this modal so order UI is not nested in another `Modal` (fixes taps on Android / web). */
  onPressOrder: () => void;
}

export default function CartModal({
  visible,
  onClose,
  outlet,
  selectedTable = null,
  onPressOrder,
}: CartModalProps) {
  const outletId = outlet.id;
  const {
    linesForTable,
    increment,
    decrement,
    removeLine,
    clearOutlet,
  } = useCart();

  const lines = useMemo(
    () => linesForTable(outletId, selectedTable),
    [linesForTable, outletId, selectedTable],
  );

  const { subtotal, gstAmount, grandTotal } = useMemo(() => {
    let sub = 0;
    let gst = 0;

    for (const l of lines) {
      let linePrice = Number(l.item.unitPrice) || 0;
      if (l.variationId) {
        const vObj = (l.item as any).variations?.find((x: any) => x.id === l.variationId);
        if (vObj) linePrice = Number(vObj.unitPrice) || 0;
      }

      let addonTotal = 0;
      const aids = l.selectedAddOnMappingIds ?? [];
      if (aids.length > 0) {
        const set = new Set(aids);
        const addons = (l.item as any).addOns ?? [];
        for (const a of addons) {
          if (set.has(a.id)) {
            addonTotal += a.isFree ? 0 : (Number(a.addOnPrice) || 0);
          }
        }
      }

      let modifierTotal = 0;
      const mids = l.selectedModifierMappingIds ?? [];
      if (mids.length > 0) {
        const mset = new Set(mids);
        const modifiers = (l.item as any).modifiers ?? [];
        for (const m of modifiers) {
          if (mset.has(m.id)) {
            modifierTotal += m.isChargeable ? (Number(m.priceAdjustment) || 0) : 0;
          }
        }
      }

      const base = linePrice + addonTotal + modifierTotal;
      const tax = getMenuTax(l.itemId, Number((l.item as any).gstpercent) || 0);
      const qty = l.qty;

      if (tax.inc) {
        const lineTot = base * qty;
        const linePreTax = lineTot / (1 + tax.pct / 100);
        const lineGst = lineTot - linePreTax;
        sub += linePreTax;
        gst += lineGst;
      } else {
        const linePreTax = base * qty;
        const lineGst = linePreTax * (tax.pct / 100);
        sub += linePreTax;
        gst += lineGst;
      }
    }

    return {
      subtotal: sub,
      gstAmount: gst,
      grandTotal: sub + gst,
    };
  }, [lines]);

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBackBtn}
          >
            <Text style={styles.headerBackText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Your Cart
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {outlet.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.doneBtn}
            accessibilityRole='button'
            accessibilityLabel='Close cart'
          >
            <View style={styles.headerSpacer} />
          </TouchableOpacity>
        </View>

        {lines.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Your cart is empty.</Text>
            <Text style={styles.emptyHint}>
              Add items from the menu to see them here.
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps='handled'
            >
              {lines.map((line) => {
                const aids = line.selectedAddOnMappingIds ?? [];
                const mids = line.selectedModifierMappingIds ?? [];
                let linePrice = Number(line.item.unitPrice) || 0;
                let varName = '';
                if (line.variationId) {
                  const vObj = (line.item as any).variations?.find((x: any) => x.id === line.variationId);
                  if (vObj) {
                    linePrice = Number(vObj.unitPrice) || 0;
                    varName = vObj.variantItemName;
                  }
                }

                let addonTotal = 0;
                let selectedAddonNames: string[] = [];
                if (aids.length > 0) {
                  const set = new Set(aids);
                  const addons = (line.item as any).addOns ?? [];
                  for (const a of addons) {
                    if (set.has(a.id)) {
                      addonTotal += a.isFree ? 0 : (Number(a.addOnPrice) || 0);
                      selectedAddonNames.push(a.addOnMenuName);
                    }
                  }
                }

                let modifierTotal = 0;
                let selectedModifierNames: string[] = [];
                if (mids.length > 0) {
                  const mset = new Set(mids);
                  const modifiers = (line.item as any).modifiers ?? [];
                  for (const m of modifiers) {
                    if (mset.has(m.id)) {
                      modifierTotal += m.isChargeable ? (Number(m.priceAdjustment) || 0) : 0;
                      selectedModifierNames.push(m.name);
                    }
                  }
                }

                const base = linePrice + addonTotal + modifierTotal;
                const unit = lineTotalWithTax(
                  line.itemId,
                  base,
                  Number((line.item as any).gstpercent) || 0,
                  1,
                );
                const lineSum = lineTotalWithTax(
                  line.itemId,
                  base,
                  Number((line.item as any).gstpercent) || 0,
                  line.qty,
                );
                const v = line.variationId ? (line.item as any).variations?.find((x: any) => x.id === line.variationId) : null;
                const rowKey = `${line.itemId}-${line.variationId ?? 'base'}-${aids.join(',')}-${mids.join(',')}`;
                return (
                  <View key={rowKey} style={styles.lineCard}>
                    <View style={styles.lineInfo}>
                      <Text style={styles.lineName} numberOfLines={2}>
                        {line.item.name ?? ''}
                      </Text>
                      {v ? (
                        <Text style={styles.lineVariation} numberOfLines={2}>
                          {v.variantItemName}
                        </Text>
                      ) : null}
                      {selectedAddonNames.map((name, idx) => {
                        return (
                          <Text
                            key={`a-${idx}`}
                            style={styles.lineAddon}
                            numberOfLines={2}
                          >
                            + {name}
                          </Text>
                        );
                      })}
                      {selectedModifierNames.map((name, idx) => {
                        return (
                          <Text
                            key={`m-${idx}`}
                            style={styles.lineAddon}
                            numberOfLines={2}
                          >
                            + {name}
                          </Text>
                        );
                      })}
                      {/* {mids.map((mid) => {
                        const m = getModifierMappingById(line.item, mid);
                        if (!m) return null;
                        return (
                          <Text
                            key={`m-${mid}`}
                            style={styles.lineAddon}
                            numberOfLines={2}
                          >
                            + {modifierLabel(m)}
                          </Text>
                        );
                      })} */}
                      <Text style={styles.lineMeta}>
                        {formatPrice(unit)} each
                        {(() => {
                          const tax = getMenuTax(line.itemId, Number((line.item as any).gstpercent) || 0);
                          if (tax.pct <= 0 && !tax.inc) return '';
                          if (tax.inc) return ` (Inc. ${tax.name})`;
                          return ` (+ ${tax.pct}% ${tax.name})`;
                        })()}
                      </Text>
                      <Text style={styles.lineSum}>{formatPrice(lineSum)}</Text>
                    </View>

                    <View style={styles.lineActions}>
                      <View style={styles.stepper}>
                        <Pressable
                          onPress={() =>
                            decrement(
                              outletId,
                              selectedTable,
                              line.itemId,
                              line.variationId ?? null,
                              aids,
                              mids,
                            )
                          }
                          style={({ pressed }) => [
                            styles.stepBtn,
                            pressed && styles.stepBtnPressed,
                          ]}
                          accessibilityRole='button'
                        >
                          <Text style={styles.stepBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.qtyText}>{line.qty}</Text>
                        <Pressable
                          onPress={() =>
                            increment(
                              outletId,
                              selectedTable,
                              line.itemId,
                              line.variationId ?? null,
                              aids,
                              mids,
                            )
                          }
                          style={({ pressed }) => [
                            styles.stepBtn,
                            pressed && styles.stepBtnPressed,
                          ]}
                          accessibilityRole='button'
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </Pressable>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        removeLine(
                          outletId,
                          selectedTable,
                          line.itemId,
                          line.variationId ?? null,
                          aids,
                          mids,
                        )
                      }
                      style={styles.trashBtn}
                      accessibilityRole='button'
                      accessibilityLabel='Remove from cart'
                    >
                      <Text style={styles.trashIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.priceBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subtotal</Text>
                  <Text style={styles.breakdownValue}>{formatPrice(subtotal)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>GST</Text>
                  <Text style={styles.breakdownValue}>{formatPrice(gstAmount)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.orderBtn}
                onPress={onPressOrder}
                activeOpacity={0.92}
                accessibilityRole='button'
                accessibilityLabel={`Pay ${formatPrice(grandTotal)} and place order`}
              >
                <View style={styles.orderBtnInfo}>
                  <Text style={styles.orderBtnText}>Place Order</Text>
                  <Text style={styles.orderBtnSubtext}>{lines.length} items</Text>
                </View>
                <View style={styles.orderBtnPrice}>
                  <Text style={styles.orderTotalValue}>{formatPrice(grandTotal)}</Text>
                  <Text style={styles.orderTotalLabel}>Grand Total</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => clearOutlet(outletId)}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel='Clear cart'
              >
                <Text style={styles.clearBtnText}>Clear all items</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.headerFooter,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBackText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  headerCenter: { flex: 1, marginHorizontal: 14 },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  doneBtn: {
    width: 32,
    height: 32,
    opacity: 0,
  },
  headerSpacer: { width: 32 },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
  },
  emptyHint: {
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 8 },

  priceBreakdown: {
    marginBottom: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
    paddingBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  lineCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    position: 'relative',
  },
  lineInfo: {
    flex: 1,
    paddingRight: 8,
  },
  lineName: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 2,
  },
  lineVariation: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 11,
    marginBottom: 2,
  },
  lineAddon: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 10,
    marginBottom: 2,
  },
  lineMeta: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 10,
    marginBottom: 4,
  },
  trashBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
    zIndex: 10,
  },
  trashIcon: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },

  lineActions: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  lineSum: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 13,
    marginTop: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 1,
    width: '100%',
  },
  stepBtn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepBtnPressed: { opacity: 0.7 },
  stepBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  qtyText: {
    minWidth: 16,
    textAlign: 'center',
    fontWeight: '900',
    color: colors.textPrimary,
    fontSize: 11,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.headerFooter,
    gap: 14,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    elevation: 8,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  orderBtnInfo: {
    flex: 1,
  },
  orderBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  orderBtnSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  orderBtnPrice: {
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.3)',
    paddingLeft: 16,
  },
  orderTotalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  orderTotalValue: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 19,
  },
  clearBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  clearBtnText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 13,
    textDecorationLine: 'underline',
    opacity: 0.6,
  },
});
