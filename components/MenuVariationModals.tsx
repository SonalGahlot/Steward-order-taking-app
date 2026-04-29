import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  CartLine,
  MenuByOutletItem,
  MenuItemAddOnMapping,
  MenuItemModifierMapping,
  MenuItemVariation,
} from '../types/types';
import {
  addOnLabel,
  getCartLineUnitPreTaxTotal,
  getDefaultVariation,
  getModifierMappingById,
  getVariationById,
  itemHasAddOns,
  itemHasModifiers,
  itemHasVariations,
  modifierLabel,
  sortMappingIds,
  variationLabel,
} from '../lib/menuVariations';
import { useCart } from '../context/CartContext';
import { theme } from '../theme';

/** Stable fallbacks — `?? []` creates a new array every render and breaks useEffect deps. */
const EMPTY_VARIATIONS: MenuItemVariation[] = [];
const EMPTY_ADDONS: MenuItemAddOnMapping[] = [];
const EMPTY_MODIFIERS: MenuItemModifierMapping[] = [];

const { colors } = theme;

const WINDOW_H = Dimensions.get('window').height;
/** Full bottom sheet panel height (leave room for status bar / visual balance). */
const SHEET_HEIGHT = Math.round(WINDOW_H * 0.92);

const BTN_WEB: ViewStyle =
  Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : {};

function formatPrice(price: number | null | undefined): string {
  if (price == null || Number.isNaN(Number(price))) return '—';
  return `₹${Number(price).toFixed(2)}`;
}

function lineTotalWithTax(
  basePrice: number,
  gstPercent: number,
  qty: number,
): number {
  const base = Number(basePrice) || 0;
  const gst = Number(gstPercent) || 0;
  const unit = base * (1 + gst / 100);
  return unit * qty;
}

export interface VariationPickerModalProps {
  visible: boolean;
  item: MenuByOutletItem | null;
  onClose: () => void;
  /**
   * `variationId` is `null` when the item has no variations.
   * `selectedAddOnMappingIds` / `selectedModifierMappingIds` — chosen mapping ids.
   */
  onConfirm: (
    variationId: number | null,
    selectedAddOnMappingIds: number[],
    selectedModifierMappingIds: number[],
  ) => void;
}

/**
 * Single modal for menu options: **one** variation (radio) when the item has
 * variations, and **any number** of add-ons / modifiers (checkboxes). Unit total updates live.
 */
export function VariationPickerModal({
  visible,
  item,
  onClose,
  onConfirm,
}: VariationPickerModalProps) {
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(
    null,
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]);

  const variations = (item as any)?.variations ?? EMPTY_VARIATIONS;
  const addOns = (item as any)?.addOnMappings ?? EMPTY_ADDONS;
  const modifiers = (item as any)?.modifierMappings ?? EMPTY_MODIFIERS;

  useEffect(() => {
    if (!visible || !item) {
      setSelectedVariationId(null);
      setSelectedAddonIds([]);
      setSelectedModifierIds([]);
      return;
    }
    if (itemHasVariations(item)) {
      const d = getDefaultVariation(item);
      const list = (item as any).variations ?? EMPTY_VARIATIONS;
      setSelectedVariationId(d?.id ?? list[0]?.id ?? null);
    } else {
      setSelectedVariationId(null);
    }
    setSelectedAddonIds([]);
    setSelectedModifierIds([]);
  }, [visible, item?.id]);

  useEffect(() => {
    if (!visible || !item) return;
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    console.log('[VariationPickerModal] open item', {
      id: item.id,
      name: item.name,
      variations: (item as any).variations?.length ?? 0,
      addOnMappings: (item as any).addOnMappings?.length ?? 0,
      modifierMappings: (item as any).modifierMappings,
      itemHasModifiers: itemHasModifiers(item),
    });
  }, [visible, item]);

  const unitPreTax = useMemo(() => {
    if (!item) return 0;
    return getCartLineUnitPreTaxTotal(
      item,
      itemHasVariations(item) ? selectedVariationId : null,
      selectedAddonIds,
      selectedModifierIds,
    );
  }, [item, selectedVariationId, selectedAddonIds, selectedModifierIds]);

  const gstPct = item ? Number((item as any).gstpercent) || 0 : 0;
  const unitWithGst = unitPreTax * (1 + gstPct / 100);

  const canConfirm = useMemo(() => {
    if (!item) return false;
    if (itemHasVariations(item) && selectedVariationId == null) return false;
    return true;
  }, [item, selectedVariationId]);

  const toggleAddon = (mappingId: number) => {
    setSelectedAddonIds((prev) => {
      const set = new Set(prev);
      if (set.has(mappingId)) set.delete(mappingId);
      else set.add(mappingId);
      return sortMappingIds([...set]);
    });
  };

  const toggleModifier = (mappingId: number) => {
    setSelectedModifierIds((prev) => {
      const set = new Set(prev);
      if (set.has(mappingId)) set.delete(mappingId);
      else set.add(mappingId);
      return sortMappingIds([...set]);
    });
  };

  if (!visible || !item) return null;
  const showVariations = itemHasVariations(item);
  const showAddOns = itemHasAddOns(item);
  const showModifiers = itemHasModifiers(item);
  if (!showVariations && !showAddOns && !showModifiers) return null;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdropRoot}>
        <Pressable
          style={styles.backdropDim}
          onPress={onClose}
          accessibilityRole='button'
          accessibilityLabel='Dismiss'
        />
        <View style={[styles.sheet, { height: SHEET_HEIGHT }]}>
          <SafeAreaView style={styles.sheetSafe} edges={['bottom']}>
            <View style={styles.sheetColumn}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {item.name ?? 'Customize'}
            </Text>
            <Text style={styles.sheetHint}>
              Tap chips to choose variation, add-ons, and modifiers.
            </Text>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps='handled'
              showsVerticalScrollIndicator={false}
            >
              {showVariations ? (
                <>
                  <Text style={styles.sectionLabel}>Variation</Text>
                  <Text style={styles.sectionSubhint}>
                    Choose one · prices are pre-tax{gstPct > 0 ? ` · ${gstPct}% GST applies` : ''}
                  </Text>
                  <View style={styles.chipWrap}>
                    {variations.map((v: any) => {
                      const active = v.id === selectedVariationId;
                      return (
                        <Pressable
                          key={v.id}
                          onPress={() => setSelectedVariationId(v.id)}
                          style={({ pressed }) => [
                            styles.chip,
                            styles.chipVariation,
                            active && styles.chipSelected,
                            pressed && styles.chipPressed,
                            BTN_WEB,
                          ]}
                          accessibilityRole='radio'
                          accessibilityState={{ selected: active }}
                        >
                          <Text
                            style={[
                              styles.chipLabel,
                              active && styles.chipLabelSelected,
                            ]}
                            numberOfLines={2}
                          >
                            {variationLabel(v)}
                          </Text>
                          <Text
                            style={[
                              styles.chipPrice,
                              active && styles.chipPriceSelected,
                            ]}
                          >
                            {formatPrice(Number(v.price) || 0)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {showModifiers ? (
                <>
                  <Text
                    style={[
                      styles.sectionLabel,
                      showVariations ? styles.sectionLabelSpaced : null,
                    ]}
                  >
                    Modifiers
                  </Text>
                  <Text style={styles.sectionSubhint}>
                    Tap chips · multiple allowed
                  </Text>
                  <View style={styles.chipWrap}>
                    {modifiers.map((m: any) => {
                      const on = selectedModifierIds.includes(m.mappingId);
                      return (
                        <Pressable
                          key={m.mappingId}
                          onPress={() => toggleModifier(m.mappingId)}
                          style={({ pressed }) => [
                            styles.chip,
                            styles.chipModifier,
                            on && styles.chipSelected,
                            pressed && styles.chipPressed,
                            BTN_WEB,
                          ]}
                          accessibilityRole='checkbox'
                          accessibilityState={{ checked: on }}
                        >
                          <Text
                            style={[
                              styles.chipLabel,
                              on && styles.chipLabelSelected,
                            ]}
                            numberOfLines={2}
                          >
                            {modifierLabel(m)}
                          </Text>
                          <Text
                            style={[
                              styles.chipPrice,
                              on && styles.chipPriceSelected,
                            ]}
                          >
                            {Number(m.price) > 0
                              ? `+${formatPrice(Number(m.price))}`
                              : 'Free'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {showAddOns ? (
                <>
                  <Text
                    style={[
                      styles.sectionLabel,
                      showVariations || showModifiers
                        ? styles.sectionLabelSpaced
                        : null,
                    ]}
                  >
                    Add-ons
                  </Text>
                  <Text style={styles.sectionSubhint}>
                    Tap to add · multiple allowed
                  </Text>
                  <View style={styles.chipWrap}>
                    {addOns.map((m: any) => {
                      const on = selectedAddonIds.includes(m.mappingId);
                      return (
                        <Pressable
                          key={m.mappingId}
                          onPress={() => toggleAddon(m.mappingId)}
                          style={({ pressed }) => [
                            styles.chip,
                            on && styles.chipSelected,
                            pressed && styles.chipPressed,
                            BTN_WEB,
                          ]}
                          accessibilityRole='checkbox'
                          accessibilityState={{ checked: on }}
                        >
                          <Text
                            style={[
                              styles.chipLabel,
                              on && styles.chipLabelSelected,
                            ]}
                            numberOfLines={2}
                          >
                            {addOnLabel(m)}
                          </Text>
                          <Text
                            style={[
                              styles.chipPrice,
                              on && styles.chipPriceSelected,
                            ]}
                          >
                            {Number(m.price) > 0
                              ? `+${formatPrice(Number(m.price))}`
                              : 'Free'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.totalBar}>
              <Text style={styles.totalBarLabel}>Unit (incl. GST)</Text>
              <Text style={styles.totalBarVal}>{formatPrice(unitWithGst)}</Text>
            </View>

            <View style={styles.sheetActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.btnPressed,
                  BTN_WEB,
                ]}
                onPress={onClose}
                accessibilityRole='button'
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  !canConfirm && styles.primaryBtnDisabled,
                  pressed && canConfirm && styles.btnPressed,
                  BTN_WEB,
                ]}
                onPress={() => {
                  if (!canConfirm || !item) return;
                  onConfirm(
                    itemHasVariations(item) ? selectedVariationId : null,
                    selectedAddonIds,
                    selectedModifierIds,
                  );
                }}
                disabled={!canConfirm}
                accessibilityRole='button'
              >
                <Text style={styles.primaryBtnText}>Add to cart</Text>
              </Pressable>
            </View>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

/** Alias — same component (variation + add-ons in one sheet). */
export const ItemOptionsModal = VariationPickerModal;

export interface CartItemLinesModalProps {
  visible: boolean;
  item: MenuByOutletItem | null;
  lines: CartLine[];
  outletId: number;
  selectedTable?: string | null;
  onClose: () => void;
}

export function CartItemLinesModal({
  visible,
  item,
  lines,
  outletId,
  selectedTable = null,
  onClose,
}: CartItemLinesModalProps) {
  const { increment, decrement } = useCart();

  if (!visible || !item) return null;

  const filtered = lines.filter(
    (l) => l.outletId === outletId && l.itemId === item.id,
  );

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdropRoot}>
        <Pressable
          style={styles.backdropDim}
          onPress={onClose}
          accessibilityRole='button'
          accessibilityLabel='Dismiss'
        />
        <View style={[styles.sheet, { height: SHEET_HEIGHT }]}>
          <SafeAreaView style={styles.sheetSafe} edges={['bottom']}>
            <View style={styles.sheetColumn}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {item.name ?? 'Cart'}
            </Text>
            <Text style={styles.sheetHint}>Adjust quantity per option.</Text>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps='handled'
              showsVerticalScrollIndicator={false}
            >
              {filtered.map((line) => {
                const v = getVariationById(item, line.variationId);
                const aids = line.selectedAddOnMappingIds ?? [];
                const mids = line.selectedModifierMappingIds ?? [];
                const base = getCartLineUnitPreTaxTotal(
                  item,
                  line.variationId,
                  aids,
                  mids,
                );
                const lineSum = lineTotalWithTax(
                  base,
                  (line.item as any).gstpercent,
                  line.qty,
                );
                const vid = line.variationId ?? null;
                const key = `${line.itemId}-${vid}-${aids.join(',')}-${mids.join(',')}`;
                const titleParts: string[] = [];
                if (v) titleParts.push(variationLabel(v));
                if (aids.length > 0) {
                  const names = aids
                    .map((id) =>
                      (item as any).addOnMappings?.find((m: any) => m.mappingId === id),
                    )
                    .filter(Boolean)
                    .map((m) => addOnLabel(m!));
                  if (names.length) titleParts.push(names.join(', '));
                }
                if (mids.length > 0) {
                  const mnames = mids
                    .map((id) => getModifierMappingById(item, id))
                    .filter(Boolean)
                    .map((m) => modifierLabel(m!));
                  if (mnames.length) titleParts.push(mnames.join(', '));
                }
                const rowTitle =
                  titleParts.length > 0 ? titleParts.join(' · ') : 'Standard';

                return (
                  <View key={key} style={styles.adjustRow}>
                    <View style={styles.adjustInfo}>
                      <Text style={styles.adjustName} numberOfLines={3}>
                        {rowTitle}
                      </Text>
                      <Text style={styles.adjustEach}>
                        {formatPrice(
                          lineTotalWithTax(base, (line.item as any).gstpercent, 1),
                        )}{' '}
                        each
                      </Text>
                    </View>
                    <View style={styles.adjustRight}>
                      <Text style={styles.adjustSum}>
                        {formatPrice(lineSum)}
                      </Text>
                      <View style={styles.adjustStepper}>
                        <Pressable
                          onPress={() =>
                            decrement(outletId, selectedTable, line.itemId, vid, aids, mids)
                          }
                          style={({ pressed }) => [
                            styles.stepBtn,
                            pressed && styles.stepBtnPressed,
                          ]}
                        >
                          <Text style={styles.stepBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.qtyText}>{line.qty}</Text>
                        <Pressable
                          onPress={() =>
                            increment(outletId, selectedTable, line.itemId, vid, aids, mids)
                          }
                          style={({ pressed }) => [
                            styles.stepBtn,
                            pressed && styles.stepBtnPressed,
                          ]}
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              style={({ pressed }) => [
                styles.fullWidthDone,
                pressed && styles.btnPressed,
                BTN_WEB,
              ]}
              onPress={onClose}
              accessibilityRole='button'
            >
              <Text style={styles.primaryBtnText}>Done</Text>
            </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sheetSafe: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 4,
  },
  sheetColumn: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  sheetScroll: {
    flex: 1,
    minHeight: 0,
  },
  sheetScrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 12,
    marginBottom: 10,
  },
  sheetTitle: {
    fontWeight: '900',
    fontSize: 18,
    color: colors.textPrimary,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  sheetHint: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontWeight: '800',
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 16,
    marginBottom: 8,
  },
  sectionLabelSpaced: { marginTop: 16 },
  sectionSubhint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 16,
    marginRight: 16,
    marginTop: -2,
    marginBottom: 10,
    opacity: 0.9,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    marginRight: 8,
    marginBottom: 8,
    gap: 8,
  },
  chipVariation: {
    borderRadius: 18,
  },
  chipModifier: {
    borderColor: colors.primaryDark + '40',
  },
  chipSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primary + '22',
  },
  chipPressed: { opacity: 0.88 },
  chipLabel: {
    fontWeight: '800',
    fontSize: 13,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  chipLabelSelected: {
    color: colors.primaryDark,
  },
  chipPrice: {
    fontWeight: '900',
    fontSize: 12,
    color: colors.primaryDark,
  },
  chipPriceSelected: {
    color: colors.primaryDark,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalBarLabel: {
    fontWeight: '800',
    fontSize: 13,
    color: colors.textSecondary,
  },
  totalBarVal: {
    fontWeight: '900',
    fontSize: 17,
    color: colors.primaryDark,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.textPrimary,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    fontWeight: '900',
    fontSize: 16,
    color: '#fff',
  },
  fullWidthDone: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
  },
  btnPressed: { opacity: 0.9 },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustInfo: { flex: 1, paddingRight: 8 },
  adjustName: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.textPrimary,
  },
  adjustEach: {
    fontWeight: '600',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  adjustRight: { alignItems: 'flex-end', gap: 8 },
  adjustSum: {
    fontWeight: '900',
    fontSize: 14,
    color: colors.primaryDark,
  },
  adjustStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  stepBtnPressed: { opacity: 0.75 },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  qtyText: {
    minWidth: 22,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 13,
    color: colors.textPrimary,
  },
});
