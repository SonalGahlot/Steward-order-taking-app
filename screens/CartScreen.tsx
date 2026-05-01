import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { theme } from '../theme';
import KotConfirmationModal from '../components/KotConfirmationModal';

const { colors } = theme;

export default function CartScreen({ onBack }: { onBack: () => void }) {
  const { cartItems, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const [isKotModalVisible, setIsKotModalVisible] = React.useState(false);

  const formatPrice = (price: number) => `₹${price.toFixed(2)}`;

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your cart is empty.</Text>
          <TouchableOpacity style={styles.browseButton} onPress={onBack}>
            <Text style={styles.browseButtonText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <TouchableOpacity style={styles.clearCartButton} onPress={clearCart} activeOpacity={0.7}>
          <Text style={styles.clearCartText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.cartList}>
        {cartItems.map((item) => {
          // get variation
          let variationObj: { name: string, price: number } | null = null;
          if (item.variationId && (item.menuItem as any).variations) {
            const v = (item.menuItem as any).variations.find((x: any) => x.id === item.variationId);
            if (v) variationObj = { name: v.variantItemName, price: v.unitPrice };
          }

          // get addons
          let addonObjs: { name: string, price: number, isFree: boolean }[] = [];
          if (item.addonIds.length > 0 && (item.menuItem as any).addOns) {
            addonObjs = item.addonIds.map(id => {
              const a = (item.menuItem as any).addOns.find((x: any) => x.addOnMenuId === id);
              if (a) return { name: a.addOnMenuName, price: a.addOnPrice, isFree: a.isFree };
              return null;
            }).filter(Boolean) as { name: string, price: number, isFree: boolean }[];
          }

          // get modifiers
          let modifierObjs: { name: string, price: number, isFree: boolean }[] = [];
          if (item.modifierIds.length > 0 && (item.menuItem as any).modifiers) {
            modifierObjs = item.modifierIds.map(id => {
              const m = (item.menuItem as any).modifiers.find((x: any) => x.id === id);
              if (m) return { name: m.name, price: m.priceAdjustment, isFree: !m.isChargeable };
              return null;
            }).filter(Boolean) as { name: string, price: number, isFree: boolean }[];
          }

          return (
            <View key={item.id} style={styles.cartItemCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.itemName}>{item.menuItem.name}</Text>
                <TouchableOpacity 
                  style={styles.removeBtn} 
                  onPress={() => removeFromCart(item.id)}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {(variationObj || addonObjs.length > 0 || modifierObjs.length > 0) && (
                <View style={styles.customizationsContainer}>
                  {variationObj && (
                    <View style={[styles.chip, styles.variationChip]}>
                      <Text style={styles.chipText}>{variationObj.name}</Text>
                      {variationObj.price > 0 && (
                        <Text style={styles.chipPrice}> ₹{variationObj.price.toFixed(2)}</Text>
                      )}
                    </View>
                  )}
                  {addonObjs.map((a, idx) => (
                    <View key={`addon-${idx}`} style={[styles.chip, styles.addonChip]}>
                      <Text style={styles.chipText}>{a.name}</Text>
                      {!a.isFree && a.price > 0 && (
                        <Text style={styles.chipPrice}> +₹{a.price.toFixed(2)}</Text>
                      )}
                    </View>
                  ))}
                  {modifierObjs.map((m, idx) => (
                    <View key={`mod-${idx}`} style={[styles.chip, styles.modifierChip]}>
                      <Text style={styles.chipText}>{m.name}</Text>
                      {!m.isFree && m.price > 0 && (
                        <Text style={styles.chipPrice}> +₹{m.price.toFixed(2)}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.itemPrice}>{formatPrice(item.computedPrice * item.quantity)}</Text>

                <View style={styles.quantityPill}>
                  <TouchableOpacity 
                    style={styles.qtyBtn} 
                    onPress={() => updateQuantity(item.id, -1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <TouchableOpacity 
                    style={styles.qtyBtn} 
                    onPress={() => updateQuantity(item.id, 1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(cartTotal)}</Text>
        </View>
        <TouchableOpacity 
          style={styles.checkoutButton} 
          onPress={() => {
            const hasChanges = cartItems.some(item => item.quantity !== item.sentQuantity);
            if (!hasChanges) {
              alert('No changes to send to kitchen.');
              return;
            }
            setIsKotModalVisible(true);
          }}
        >
          <Text style={styles.checkoutButtonText}>Place Order</Text>
        </TouchableOpacity>
      </View>

      <KotConfirmationModal
        visible={isKotModalVisible}
        onClose={() => setIsKotModalVisible(false)}
        onSuccess={() => {
          // Success handled in modal
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  clearCartButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 16,
  },
  clearCartText: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 24,
    fontWeight: '600',
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  cartList: {
    flex: 1,
    padding: 16,
  },
  cartItemCard: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 10,
    lineHeight: 20,
  },
  removeBtn: {
    padding: 2,
    backgroundColor: '#fff5f5',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '900',
  },
  customizationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  variationChip: {
    backgroundColor: '#e3f2fd',
    borderColor: '#bbdefb',
  },
  addonChip: {
    backgroundColor: '#e8f5e9',
    borderColor: '#c8e6c9',
  },
  modifierChip: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffe0b2',
  },
  chipText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  chipPrice: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  quantityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    height: 32,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  qtyBtnText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 16,
    marginTop: -2,
  },
  qtyValue: {
    paddingHorizontal: 12,
    fontWeight: '900',
    fontSize: 14,
    color: colors.textPrimary,
  },
  footer: {
    padding: 24,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border + '50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
