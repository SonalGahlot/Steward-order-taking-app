import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  TextInput,
  ActivityIndicator,
  Pressable,
  Alert,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildGuestOrderPreview,
  placeGuestOrder,
} from '../lib/orderLogic';
import { useMenu } from '../hooks/useMenu';
import { useTax } from '../hooks/useTax';
import apiClient from '../apiClient';
import type { CartLine, GuestOrderReceipt, MenuByOutletItem, Outlet, CategoryMaster } from '../types/types';


import { theme } from '../theme';
import { useCart } from '../context/CartContext';
import CartModal from '../components/CartModal';
import OrderReceiptModal from '../components/OrderReceiptModal';
import OrderPlacedModal from '../components/OrderPlacedModal';
import AddonPickerModal from '../components/AddonPickerModal';

const { colors } = theme;
const itemHasVariations = (item: any): boolean => Array.isArray(item.variations) && item.variations.length > 0;
const itemHasAddOns = (item: any): boolean => Array.isArray(item.addOns) && item.addOns.length > 0;
const itemHasModifiers = (item: any): boolean => Array.isArray(item.modifiers) && item.modifiers.length > 0;
const itemNeedsOptionsModal = (item: any): boolean => itemHasVariations(item) || itemHasAddOns(item) || itemHasModifiers(item);


function formatPrice(price: number | null | undefined): string {
  if (price == null || Number.isNaN(Number(price))) return '—';
  return `₹${Number(price).toFixed(2)}`;
}

/** Renders `itemName` with query matches highlighted (case-insensitive). */
function ItemNameWithSearchHighlight({
  itemName,
  query,
  style,
}: {
  itemName: string;
  query: string;
  style: TextStyle;
}) {
  const q = query.trim();
  const text = itemName ?? '';
  if (!q) {
    return <Text style={style}>{text}</Text>;
  }
  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const segments: { str: string; match: boolean }[] = [];
  let pos = 0;
  let idx = lower.indexOf(qLower, pos);
  while (idx !== -1) {
    if (idx > pos) {
      segments.push({ str: text.slice(pos, idx), match: false });
    }
    segments.push({
      str: text.slice(idx, idx + q.length),
      match: true,
    });
    pos = idx + q.length;
    idx = lower.indexOf(qLower, pos);
  }
  if (pos < text.length) {
    segments.push({ str: text.slice(pos), match: false });
  }
  if (segments.length === 0) {
    return <Text style={style}>{text}</Text>;
  }
  return (
    <Text style={style} numberOfLines={2}>
      {segments.map((seg, i) => (
        <Text
          key={i}
          style={seg.match ? styles.searchHighlight : undefined}
        >
          {seg.str}
        </Text>
      ))}
    </Text>
  );
}

function MenuItemMetaChips({ item }: { item: MenuByOutletItem }) {
  const spice = item.spicyLevel ?? 0;
  if (spice === 0) return null;

  let emojis = '';
  if (spice === 1) emojis = '🌶️';
  else if (spice === 2) emojis = '🌶️🌶️';
  else if (spice >= 3) emojis = '🌶️🌶️🌶️';

  return (
    <View style={styles.spiceRow}>
      <Text style={styles.spiceEmojis}>{emojis}</Text>
    </View>
  );
}

function VegIndicator({ isVeg }: { isVeg: boolean }) {
  return (
    <View style={[styles.vegBadge, isVeg ? styles.vegBadgeVeg : styles.vegBadgeNonVeg]}>
      <View style={[styles.vegDot, isVeg ? styles.vegDotVeg : styles.vegDotNonVeg]} />
    </View>
  );
}

function ItemTaxDisplay({ menuId, fallbackGst }: { menuId: number; fallbackGst: number }) {
  const tax = useTax(menuId, fallbackGst);

  if (tax.pct <= 0 && !tax.inc) return null;

  if (tax.inc) {
    return <Text style={styles.itemGst}>Inclusive of all taxes ({tax.name})</Text>;
  }
  return <Text style={styles.itemGst}>+ {tax.pct}% {tax.name}</Text>;
}

function MenuPriceColumn({
  item,
  outletLines,
}: {
  item: MenuByOutletItem;
  outletLines: CartLine[];
}) {
  const itemLines = outletLines.filter((l) => l.itemId === item.id);
  let baseUnit = Number(item.unitPrice) || 0;
  const vars = (item as any).variations ?? [];
  const defVar = vars.find((v: any) => v.isDefault) || vars[0];
  if (defVar) {
    baseUnit = Number(defVar.unitPrice) || 0;
  }

  let variationHint: string | null = null;

  if (itemLines.length === 1) {
    const line = itemLines[0];

    let linePrice = Number(item.unitPrice) || 0;
    const vObj = vars.find((x: any) => x.id === line.variationId);
    const parts: string[] = [];
    if (vObj) {
      linePrice = Number(vObj.unitPrice) || 0;
      parts.push(vObj.variantItemName);
    }

    let addonTotal = 0;
    const aids = line.selectedAddOnMappingIds ?? [];
    if (aids.length > 0) {
      const set = new Set(aids);
      const addons = (item as any).addOns ?? [];
      for (const a of addons) {
        if (set.has(a.id)) {
          addonTotal += a.isFree ? 0 : (Number(a.addOnPrice) || 0);
          parts.push(a.addOnMenuName);
        }
      }
    }

    baseUnit = linePrice + addonTotal;
    variationHint = parts.length > 0 ? parts.join(' · ') : null;
  } else if (itemLines.length > 1) {
    variationHint = `${itemLines.length} options in cart`;
  }

  return (
    <View style={styles.priceCol}>
      <Text style={styles.itemPrice}>{formatPrice(baseUnit)}</Text>
      <ItemTaxDisplay menuId={item.id} fallbackGst={Number((item as any).gstpercent) || 0} />
      {variationHint ? (
        <Text style={styles.itemVarHint} numberOfLines={3}>
          {variationHint}
        </Text>
      ) : null}
    </View>
  );
}

function MenuItemCartControls({
  outletId,
  selectedTable,
  item,
  outletLines,
  showCart,
  onOpenVariationPicker,
  onOpenAdjustLines,
}: {
  outletId: number;
  selectedTable: string | null;
  item: MenuByOutletItem;
  outletLines: CartLine[];
  showCart: boolean;
  onOpenVariationPicker: () => void;
  onOpenAdjustLines: () => void;
}) {
  const { addItem, increment, decrement } = useCart();

  const itemLines = outletLines.filter((l) => l.itemId === item.id);
  const totalQty = itemLines.reduce((s, l) => s + l.qty, 0);

  if (!showCart) {
    return null;
  }

  if (!itemNeedsOptionsModal(item)) {
    if (totalQty === 0) {
      return (
        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={() => addItem(outletId, selectedTable, item, null, [], [])}
          activeOpacity={0.85}
          accessibilityRole='button'
          accessibilityLabel={`Add ${item.name ?? 'item'} to cart`}
        >
          <Text style={styles.addToCartBtnText}>Add</Text>
        </TouchableOpacity>
      );
    }
    const line = itemLines[0];
    return (
      <View style={styles.menuStepper}>
        <Pressable
          onPress={() => decrement(outletId, selectedTable, item.id, null, [], [])}
          style={({ pressed }) => [
            styles.menuStepBtn,
            pressed && styles.menuStepBtnPressed,
          ]}
          accessibilityRole='button'
          accessibilityLabel='Decrease quantity'
        >
          <Text style={styles.menuStepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.menuQtyText}>{line?.qty ?? 0}</Text>
        <Pressable
          onPress={() => increment(outletId, selectedTable, item.id, null, [], [])}
          style={({ pressed }) => [
            styles.menuStepBtn,
            pressed && styles.menuStepBtnPressed,
          ]}
          accessibilityRole='button'
          accessibilityLabel='Increase quantity'
        >
          <Text style={styles.menuStepBtnText}>+</Text>
        </Pressable>
      </View>
    );
  }

  if (totalQty === 0) {
    return (
      <TouchableOpacity
        style={styles.addToCartBtn}
        onPress={onOpenVariationPicker}
        activeOpacity={0.85}
        accessibilityRole='button'
        accessibilityLabel={`Choose options for ${item.name ?? 'item'}`}
      >
        <Text style={styles.addToCartBtnText}>Add</Text>
      </TouchableOpacity>
    );
  }

  if (itemLines.length === 1) {
    const line = itemLines[0];
    const vid = line.variationId;
    const aids = line.selectedAddOnMappingIds ?? [];
    const mids = line.selectedModifierMappingIds ?? [];
    return (
      <View style={styles.menuStepper}>
        <Pressable
          onPress={() => decrement(outletId, selectedTable, item.id, vid, aids, mids)}
          style={({ pressed }) => [
            styles.menuStepBtn,
            pressed && styles.menuStepBtnPressed,
          ]}
          accessibilityRole='button'
          accessibilityLabel='Decrease quantity'
        >
          <Text style={styles.menuStepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.menuQtyText}>{line.qty}</Text>
        <Pressable
          onPress={onOpenVariationPicker}
          style={({ pressed }) => [
            styles.menuStepBtn,
            pressed && styles.menuStepBtnPressed,
          ]}
          accessibilityRole='button'
          accessibilityLabel='Choose options to add — same or different'
        >
          <Text style={styles.menuStepBtnText}>+</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.menuStepper}>
      <Pressable
        onPress={onOpenAdjustLines}
        style={({ pressed }) => [
          styles.menuStepBtn,
          pressed && styles.menuStepBtnPressed,
        ]}
        accessibilityRole='button'
        accessibilityLabel='Decrease quantity, choose variation'
      >
        <Text style={styles.menuStepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.menuQtyText}>{totalQty}</Text>
      <Pressable
        onPress={onOpenVariationPicker}
        style={({ pressed }) => [
          styles.menuStepBtn,
          pressed && styles.menuStepBtnPressed,
        ]}
        accessibilityRole='button'
        accessibilityLabel='Add another variation'
      >
        <Text style={styles.menuStepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

function buildCategoryTabs(
  menus: MenuByOutletItem[],
  categories: CategoryMaster[],
): { id: number; name: string }[] {
  const map = new Map<number, string>();
  for (const m of menus) {
    const cid = m.menuCategoryId;
    if (map.has(cid)) continue;
    const cat = categories.find((c) => c.id === cid);
    const label = cat?.name || `Category ${cid}`;
    map.set(cid, label);
  }
  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.id - b.id);
}

function getCategoryName(menuCategoryId: number, categories: CategoryMaster[]) {
  const cat = categories.find((c) => c.id === menuCategoryId);
  return cat?.name || `Category ${menuCategoryId}`;
}

/** `'all'` = every item; `'veg'` = only isVeg; `'non-veg'` = only not isVeg; otherwise categoryId. */
type MenuTabSelection = 'all' | 'veg' | 'non-veg' | number;

export interface MenuScreenProps {
  outlet: Outlet;
  selectedTable?: string | null;
  /** From `HotelMaster.IsOrderTakingSystem` — when false, cart and ordering are hidden. */
  isOrderTakingSystem: boolean;
  onBack: () => void;
}

export default function MenuScreen({
  outlet,
  selectedTable = null,
  isOrderTakingSystem,
  onBack,
}: MenuScreenProps) {
  const outletId = outlet.id;
  const { linesForTable, totalQtyForTable, clearOutlet, clearTable, addItem, addKot } = useCart();
  const { menus, categories, menuTypes, loading, error, refetch } = useMenu(outletId);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<MenuTabSelection>('all');
  const [addonPickerItem, setAddonPickerItem] = useState<MenuByOutletItem | null>(null);
  const [collapsedTypes, setCollapsedTypes] = useState<Set<number>>(new Set());

  const toggleTypeCollapse = useCallback((typeId: number) => {
    setCollapsedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  }, []);
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<GuestOrderReceipt | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null);
  const [variationPickerItem, setVariationPickerItem] =
    useState<MenuByOutletItem | null>(null);
  const [adjustLinesItem, setAdjustLinesItem] =
    useState<MenuByOutletItem | null>(null);

  const outletLines = useMemo(
    () => linesForTable(outletId, selectedTable),
    [linesForTable, outletId, selectedTable],
  );

  const cartBadgeCount = totalQtyForTable(outletId, selectedTable);

  useEffect(() => {
    if (!isOrderTakingSystem) {
      clearOutlet(outletId);
      setCartOpen(false);
      setReceipt(null);
      setPlacedOrderId(null);
    }
  }, [isOrderTakingSystem, outletId, clearOutlet]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  /** Only `isActive` items are listed (consumer menu). */
  const visibleMenus = useMemo(
    () => menus,
    [menus],
  );

  const categoryTabs = useMemo(
    () => buildCategoryTabs(visibleMenus, categories),
    [visibleMenus, categories],
  );

  const isSearching = searchQuery.trim().length > 0;

  const itemsForCategory = useMemo(() => {
    if (visibleMenus.length === 0) return [];
    if (selectedTab === 'all') return visibleMenus;
    if (selectedTab === 'veg') return visibleMenus.filter((m) => !m.isNonVeg);
    if (selectedTab === 'non-veg') return visibleMenus.filter((m) => m.isNonVeg);
    return visibleMenus.filter((m) => m.menuCategoryId === selectedTab);
  }, [visibleMenus, selectedTab]);

  /** Current tab’s rows, filtered by item name when search is active. */
  const displayItems = useMemo(() => {
    const base = itemsForCategory;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((m) =>
      (m.name ?? '').toLowerCase().includes(q),
    );
  }, [searchQuery, itemsForCategory]);

  const groupedItems = useMemo(() => {
    const groups: { typeId: number; typeName: string; items: MenuByOutletItem[] }[] = [];
    const typeMap = new Map<number, MenuByOutletItem[]>();

    for (const item of displayItems) {
      const tid = item.menuTypeId || 0;
      if (!typeMap.has(tid)) {
        typeMap.set(tid, []);
      }
      typeMap.get(tid)!.push(item);
    }

    typeMap.forEach((items, typeId) => {
      const typeObj = menuTypes.find((t) => t.id === typeId);
      const typeName = typeObj?.name || (typeId === 0 ? 'Standard' : `Type ${typeId}`);
      groups.push({ typeId, typeName, items });
    });

    return groups.sort((a, b) => a.typeId - b.typeId);
  }, [displayItems, menuTypes]);

  const sectionTitle = useMemo(() => {
    if (selectedTab === 'all') {
      return visibleMenus.length
        ? `All items (${visibleMenus.length})`
        : 'All items';
    }
    if (selectedTab === 'veg') return 'Vegetarian Selection';
    if (selectedTab === 'non-veg') return 'Non-Vegetarian Selection';
    const cat = categoryTabs.find((c) => c.id === selectedTab);
    return cat?.name ?? 'Menu';
  }, [selectedTab, categoryTabs, visibleMenus.length]);

  const listTitle = isSearching
    ? `Results (${displayItems.length})`
    : sectionTitle;

  const emptyListMessage = isSearching
    ? 'No item names match in this category.'
    : 'No items in this menu.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenColumn}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {outlet.name}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={2}>
              {outlet.address}
            </Text>
          </View>

          {isOrderTakingSystem ? (
            <TouchableOpacity
              onPress={() => setCartOpen(true)}
              activeOpacity={0.75}
              style={styles.headerCartBtn}
              accessibilityRole='button'
              accessibilityLabel={
                cartBadgeCount > 0
                  ? `Cart, ${cartBadgeCount} items`
                  : 'Open cart'
              }
            >
              <Text style={styles.headerCartIcon}>🛒</Text>
              {cartBadgeCount > 0 ? (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>
                    {cartBadgeCount > 99 ? '99+' : String(cartBadgeCount)}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : (
            <View style={styles.headerCartPlaceholder} accessibilityElementsHidden />
          )}
        </View>

        {loading ? (
          <View style={styles.centeredFlex}>
            <ActivityIndicator size='large' color={colors.primaryDark} />
            <Text style={styles.hint}>Loading menu…</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredFlex}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.menuBody}>
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                style={styles.searchInput}
                placeholder='Search by item name…'
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType='search'
                autoCorrect={false}
                autoCapitalize='none'
                accessibilityLabel='Search menu'
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.searchClear}
                  accessibilityRole='button'
                  accessibilityLabel='Clear search'
                >
                  <Text style={styles.searchClearText}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            {visibleMenus.length > 0 && (
              <View style={styles.tabsWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  <TouchableOpacity
                    key='all'
                    onPress={() => setSelectedTab('all')}
                    activeOpacity={0.8}
                    style={[
                      styles.tabBtn,
                      selectedTab === 'all' && styles.tabBtnActive,
                    ]}
                    accessibilityRole='button'
                    accessibilityState={{ selected: selectedTab === 'all' }}
                    accessibilityLabel='All categories'
                  >
                    <Text
                      style={[
                        styles.tabText,
                        selectedTab === 'all' && styles.tabTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    key='veg'
                    onPress={() => setSelectedTab('veg')}
                    activeOpacity={0.8}
                    style={[
                      styles.tabBtn,
                      selectedTab === 'veg' && styles.tabBtnActive,
                    ]}
                    accessibilityRole='button'
                    accessibilityState={{ selected: selectedTab === 'veg' }}
                    accessibilityLabel='Vegetarian items'
                  >
                    <Text
                      style={[
                        styles.tabText,
                        selectedTab === 'veg' && styles.tabTextActive,
                      ]}
                    >
                      🟢 Veg
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    key='non-veg'
                    onPress={() => setSelectedTab('non-veg')}
                    activeOpacity={0.8}
                    style={[
                      styles.tabBtn,
                      selectedTab === 'non-veg' && styles.tabBtnActive,
                    ]}
                    accessibilityRole='button'
                    accessibilityState={{ selected: selectedTab === 'non-veg' }}
                    accessibilityLabel='Non-vegetarian items'
                  >
                    <Text
                      style={[
                        styles.tabText,
                        selectedTab === 'non-veg' && styles.tabTextActive,
                      ]}
                    >
                      🔴 Non-Veg
                    </Text>
                  </TouchableOpacity>

                  {categoryTabs.map((cat) => {
                    const active =
                      selectedTab !== 'all' && cat.id === selectedTab;
                    return (
                      <TouchableOpacity
                        key={String(cat.id)}
                        onPress={() => setSelectedTab(cat.id)}
                        activeOpacity={0.8}
                        style={[styles.tabBtn, active && styles.tabBtnActive]}
                        accessibilityRole='button'
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={cat.name}
                      >
                        <Text
                          style={[
                            styles.tabText,
                            active && styles.tabTextActive,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.listContainer}>
              <View style={styles.listHeaderRow}>
                <Text style={styles.sectionTitle}>{listTitle}</Text>
              </View>

              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps='handled'
              >
                {displayItems.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{emptyListMessage}</Text>
                  </View>
                ) : (
                  groupedItems.map((group) => {
                    const isCollapsed = collapsedTypes.has(group.typeId);
                    return (
                      <View key={group.typeId} style={styles.typeSection}>
                        <TouchableOpacity
                          style={[styles.typeHeaderBtn, isCollapsed && styles.typeHeaderBtnCollapsed]}
                          onPress={() => toggleTypeCollapse(group.typeId)}
                          activeOpacity={0.75}
                          accessibilityRole="button"
                          accessibilityLabel={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.typeName}`}
                        >
                          <View style={styles.typeHeaderLeft}>
                            <View style={[styles.typeHeaderDot, isCollapsed && styles.typeHeaderDotCollapsed]} />
                            <Text style={styles.typeHeader}>{group.typeName}</Text>
                          </View>
                          <View style={[styles.typeIconWrapper, isCollapsed && styles.typeIconWrapperCollapsed]}>
                            <Text style={styles.typeHeaderIcon}>
                              {isCollapsed ? '▼' : '▲'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {!isCollapsed && (
                          <View style={styles.typeGrid}>
                            {group.items.map((item) => (
                              <View key={String(item.id)} style={styles.itemCard}>
                                <View style={styles.cardInfo}>
                                  <View style={styles.itemHeader}>
                                    <VegIndicator isVeg={!item.isNonVeg} />
                                    {isSearching ? (
                                      <ItemNameWithSearchHighlight
                                        itemName={item.name ?? ''}
                                        query={searchQuery}
                                        style={styles.itemName}
                                      />
                                    ) : (
                                      <Text style={styles.itemName}>
                                        {item.name ?? ''}
                                      </Text>
                                    )}
                                  </View>

                                  <MenuItemMetaChips item={item} />

                                  {selectedTab === 'all' && (getCategoryName(item.menuCategoryId, categories) ?? '').trim() ? (
                                    <Text style={styles.itemCategory} numberOfLines={1}>
                                      {getCategoryName(item.menuCategoryId, categories)}
                                    </Text>
                                  ) : null}

                                  <Text style={styles.itemDesc} numberOfLines={3}>
                                    {item.description ?? ''}
                                  </Text>
                                </View>

                                <View style={styles.cardActions}>
                                  <MenuPriceColumn
                                    item={item}
                                    outletLines={outletLines}
                                  />
                                  <MenuItemCartControls
                                    outletId={outletId}
                                    selectedTable={selectedTable}
                                    item={item}
                                    outletLines={outletLines}
                                    showCart={isOrderTakingSystem}
                                    onOpenVariationPicker={() => {
                                      if (itemHasAddOns(item) || itemHasVariations(item) || itemHasModifiers(item)) {
                                        setAddonPickerItem(item);
                                      } else {
                                        setAddonPickerItem(item);
                                      }
                                    }}
                                    onOpenAdjustLines={() => setAdjustLinesItem(item)}
                                  />
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
      {isOrderTakingSystem ? (
        <>
          <CartModal
            visible={cartOpen}
            onClose={() => setCartOpen(false)}
            outlet={outlet}
            selectedTable={selectedTable}
            onPressOrder={() => {
              const lines = linesForTable(outletId, selectedTable);
              const preview = buildGuestOrderPreview(
                outlet.name ?? 'Outlet',
                lines,
                { tableNo: selectedTable || '' },
              );
              setReceipt(preview);
            }}
          />
          <OrderReceiptModal
            visible={receipt != null}
            receipt={receipt}
            placingOrder={placingOrder}
            onConfirmPlaceOrder={
              receipt?.orderId == null
                ? async () => {
                  if (!receipt) return;
                  const lines = linesForTable(outletId, selectedTable);
                  setPlacingOrder(true);
                  try {
                    const result = await placeGuestOrder(
                      outletId,
                      outlet.name ?? 'Outlet',
                      lines,
                      receipt.payload,
                    );
                    addKot(outletId, selectedTable, selectedTable ? `Table ${selectedTable}` : 'Takeaway', lines);
                    clearTable(outletId, selectedTable);
                    setReceipt(null);
                    if (result.orderId != null) {
                      setPlacedOrderId(result.orderId);
                    }
                    setCartOpen(false);
                  } catch (e) {
                    const msg =
                      e instanceof Error
                        ? e.message
                        : 'Could not place your order. Please try again.';
                    Alert.alert('Order failed', msg);
                  } finally {
                    setPlacingOrder(false);
                  }
                }
                : undefined
            }
            onClose={() => {
              const wasPreview = receipt?.orderId == null;
              setReceipt(null);
              setCartOpen(wasPreview);
            }}
          />
          <OrderPlacedModal
            visible={placedOrderId != null}
            orderId={placedOrderId}
            onClose={() => setPlacedOrderId(null)}
          />

          <AddonPickerModal
            visible={addonPickerItem != null}
            item={addonPickerItem}
            onClose={() => setAddonPickerItem(null)}
            onConfirm={(variationId, selectedAddOnMappingIds, selectedModifierMappingIds) => {
              if (addonPickerItem) {
                addItem(
                  outletId,
                  selectedTable,
                  addonPickerItem,
                  variationId,
                  selectedAddOnMappingIds,
                  selectedModifierMappingIds,
                );
              }
              setAddonPickerItem(null);
            }}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screenColumn: { flex: 1 },
  menuBody: {
    flex: 1,
    paddingTop: 16,
  },
  centeredFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.headerFooter,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBtnText: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  headerCenter: { flex: 1, marginHorizontal: 14 },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    opacity: 0.8,
  },
  headerCartBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCartPlaceholder: { width: 38, height: 38 },
  headerCartIcon: { fontSize: 20 },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    elevation: 3,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 18,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  searchIcon: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  searchClear: {
    padding: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
  },
  searchClearText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '800',
  },

  tabsWrap: {
    marginBottom: 20,
    paddingVertical: 2,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 12,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    elevation: 6,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  tabText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#fff', fontWeight: '900' },

  listContainer: { flex: 1 },
  listHeaderRow: {
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.7,
  },

  listScroll: { flex: 1 },
  listScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },

  typeSection: {
    marginBottom: 24,
  },
  typeHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  typeHeaderBtnCollapsed: {
    backgroundColor: colors.border + '30',
    borderColor: colors.border,
  },
  typeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  typeHeaderDotCollapsed: {
    backgroundColor: colors.textSecondary,
  },
  typeHeader: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  typeIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconWrapperCollapsed: {
    backgroundColor: colors.primary + '20',
  },
  typeHeaderIcon: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '900',
  },
  typeGrid: {
    gap: 16,
  },

  /* Item Card Redesign */
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 14,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  itemName: {
    flex: 1,
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  itemCategory: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 2,
  },
  itemDesc: {
    color: colors.textSecondary,
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    opacity: 0.8,
  },

  /* Veg Indicator Badge */
  vegBadge: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegBadgeVeg: { borderColor: '#1e8449' },
  vegBadgeNonVeg: { borderColor: '#922b21' },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vegDotVeg: { backgroundColor: '#1e8449' },
  vegDotNonVeg: { backgroundColor: '#922b21' },

  /* Spicy Level Representation */
  spiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  spiceEmojis: {
    fontSize: 14,
  },
  spiceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    opacity: 0.6,
  },

  cardActions: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.border + '40',
  },
  priceCol: {
    alignItems: 'center',
    marginBottom: 10,
  },
  itemPrice: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: -0.5,
  },
  itemGst: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    opacity: 0.7,
  },
  itemVarHint: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.9,
  },

  addToCartBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  addToCartBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  menuStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    width: '100%',
    justifyContent: 'space-between',
  },
  menuStepBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    elevation: 1,
  },
  menuStepBtnPressed: {
    opacity: 0.7,
    backgroundColor: colors.border,
  },
  menuStepBtnText: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  menuQtyText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  searchHighlight: {
    backgroundColor: colors.primary + '30',
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 17,
  },
  hint: { color: colors.textSecondary, fontWeight: '600', marginTop: 8 },
  errorText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryBtnText: { color: colors.textPrimary, fontWeight: '800' },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
    opacity: 0.7,
  },
});
