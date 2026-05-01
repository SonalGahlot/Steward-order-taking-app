import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMenu } from '../hooks/useMenu';
import { theme } from '../theme';
import type { Outlet, MenuByOutletItem } from '../types/types';
import AddonPickerModal from '../components/AddonPickerModal';
import { useCart } from '../context/CartContext';

const { colors } = theme;

export interface MenuScreenProps {
  outlet: Outlet;
  selectedTable?: string | null;
  isOrderTakingSystem: boolean;
  onBack: () => void;
  onViewCart?: () => void;
}

export default function MenuScreen({
  outlet,
  selectedTable = null,
  isOrderTakingSystem,
  onBack,
  onViewCart,
}: MenuScreenProps) {
  const { menus, categories, loading, error, fetchItemDetails } = useMenu(outlet.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [loadingDetails, setLoadingDetails] = useState<number | null>(null);

  const { cartItems, cartTotal, cartItemCount, addToCart, updateQuantity, hydrateCart } = useCart();
  const [selectedCustomizableItem, setSelectedCustomizableItem] = useState<MenuByOutletItem | null>(null);

  useEffect(() => {
    if (menus.length > 0) {
      hydrateCart(menus);
    }
  }, [menus, hydrateCart]);

  const getItemQuantity = (itemId: number) => {
    return cartItems.filter((ci) => ci.menuItem.id === itemId).reduce((sum, ci) => sum + ci.quantity, 0);
  };

  const handleRemoveAny = (itemId: number) => {
    const existing = cartItems.find((ci) => ci.menuItem.id === itemId);
    if (existing) {
      updateQuantity(existing.id, -1);
    }
  };

  const hasCustomizations = (item: MenuByOutletItem) => {
    const i = item as any;
    return (i.addOns?.length > 0 || i.variations?.length > 0 || i.modifiers?.length > 0);
  };

  const handleItemPress = async (item: MenuByOutletItem) => {
    const i = item as any;
    
    // Check if the item's custom details (specifically modifiers, which couldn't be mapped in bulk) are already loaded.
    // Addons and Variations are now loaded upfront during fetchMenu.
    if (i.modifiersLoaded) {
      if (hasCustomizations(item)) {
        setSelectedCustomizableItem(item);
      } else {
        addToCart(item);
      }
      return;
    }

    // Otherwise, fetch modifiers lazily
    setLoadingDetails(item.id);
    const details = await fetchItemDetails(item.id);
    setLoadingDetails(null);

    const mergedItem = details ? { ...item, ...details } : item;

    if (hasCustomizations(mergedItem)) {
      setSelectedCustomizableItem(mergedItem);
    } else {
      addToCart(mergedItem); // Fallback
    }
  };

  // Filter items by search query and category
  const filteredItems = useMemo(() => {
    return menus.filter((item) => {
      const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || item.menuCategoryId === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [menus, searchQuery, selectedCategory]);

  // Filter categories to only show those that have items
  const sortedCategories = useMemo(() => {
    const activeCategoryIds = new Set(menus.map(m => m.menuCategoryId));
    return categories
      .filter(cat => activeCategoryIds.has(cat.id))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [categories, menus]);

  const formatPrice = (price: number) => {
    return `₹${Number(price).toFixed(2)}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Menu...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onBack}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{outlet.name}</Text>
          {selectedTable && (
            <Text style={styles.headerSubtitle}>Table: {selectedTable}</Text>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search dishes..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedCategory === 'all' && styles.activeTab,
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text
              style={[
                styles.tabText,
                selectedCategory === 'all' && styles.activeTabText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {sortedCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.tab,
                selectedCategory === cat.id && styles.activeTab,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedCategory === cat.id && styles.activeTabText,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Menu Items */}
      <ScrollView contentContainerStyle={styles.menuList}>
        {filteredItems.length === 0 ? (
          <Text style={styles.noItemsText}>No items found</Text>
        ) : (
          filteredItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
              )}
              <View style={styles.itemInfo}>
                <View style={styles.itemHeaderRow}>
                  <View style={styles.vegIndicatorContainer}>
                    <View
                      style={[
                        styles.vegDot,
                        { backgroundColor: item.isNonVeg ? '#d9534f' : '#5cb85c' },
                      ]}
                    />
                  </View>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                {item.description ? (
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <View style={styles.itemFooter}>
                  <View style={styles.priceAndSpicyContainer}>
                    <Text style={styles.itemPrice}>
                      {formatPrice(item.unitPrice)}
                    </Text>
                    {item.spicyLevel > 0 && (
                      <Text style={styles.spicyText}>
                        {'🌶️'.repeat(item.spicyLevel)}
                      </Text>
                    )}
                  </View>

                    <View style={styles.cartActionContainer}>
                      {loadingDetails === item.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : getItemQuantity(item.id) > 0 ? (
                        <View style={styles.quantityContainer}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleRemoveAny(item.id)}
                          >
                            <Text style={styles.quantityButtonText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.quantityText}>{getItemQuantity(item.id)}</Text>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleItemPress(item)}
                          >
                            <Text style={styles.quantityButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => handleItemPress(item)}
                        >
                          <Text style={styles.addButtonText}>
                            {hasCustomizations(item) ? 'CUSTOMIZE' : 'ADD'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Cart Floating Bar */}
      {cartItemCount > 0 && (
        <View style={styles.floatingCartContainer}>
          <View style={styles.floatingCartInfo}>
            <Text style={styles.floatingCartItemsText}>
              {cartItemCount} ITEM{cartItemCount > 1 ? 'S' : ''}
            </Text>
            <Text style={styles.floatingCartPriceText}>Total: {formatPrice(cartTotal)}</Text>
          </View>
          <TouchableOpacity
            style={styles.viewCartButton}
            onPress={onViewCart}
          >
            <Text style={styles.viewCartButtonText}>View Cart</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Addon Picker Modal */}
      <AddonPickerModal
        visible={!!selectedCustomizableItem}
        onClose={() => setSelectedCustomizableItem(null)}
        item={selectedCustomizableItem}
        onConfirm={(variationId, addonIds, modifierIds) => {
          if (selectedCustomizableItem) {
            addToCart(selectedCustomizableItem, variationId, addonIds, modifierIds);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textPrimary,
    fontSize: 16,
  },
  errorText: {
    color: '#d9534f',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.background,
  },
  searchInput: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  menuList: {
    padding: 16,
  },
  noItemsText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 40,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vegIndicatorContainer: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  itemDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  spicyText: {
    fontSize: 14,
    marginLeft: 8,
  },
  priceAndSpicyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartActionContainer: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  addButton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.primaryDark,
    fontWeight: 'bold',
    fontSize: 14,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceAlt,
  },
  quantityButtonText: {
    color: colors.primaryDark,
    fontWeight: 'bold',
    fontSize: 16,
  },
  quantityText: {
    paddingHorizontal: 12,
    fontWeight: 'bold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingCartInfo: {
    flex: 1,
  },
  floatingCartItemsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  floatingCartPriceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  viewCartButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  viewCartButtonText: {
    color: colors.primaryDark,
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeModalText: {
    fontSize: 20,
    color: colors.textSecondary,
    padding: 4,
  },
  cartItemsList: {
    marginBottom: 20,
  },
  cartModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cartModalItemInfo: {
    flex: 1,
    marginRight: 16,
  },
  cartModalItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cartModalItemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  modalFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTotalLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
