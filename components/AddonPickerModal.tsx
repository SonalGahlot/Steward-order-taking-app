import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { theme } from '../theme';
import type { MenuByOutletItem } from '../types/types';

const { colors } = theme;

interface AddonPickerModalProps {
  visible: boolean;
  onClose: () => void;
  item: MenuByOutletItem | null;
  onConfirm: (variationId: number | null, addonIds: number[], modifierIds: number[]) => void;
}

export default function AddonPickerModal({
  visible,
  onClose,
  item,
  onConfirm,
}: AddonPickerModalProps) {
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null);

  useEffect(() => {
    if (visible && item) {
      setSelectedAddonIds([]);
      setSelectedModifierIds([]);
      const vars = (item as any).variations ?? [];
      const def = vars.find((v: any) => v.isDefault) || vars[0];
      setSelectedVariationId(def ? def.id : null);
    }
  }, [visible, item]);

  if (!item) return null;

  const addons: any[] = (item as any).addOns ?? [];
  const variations: any[] = (item as any).variations ?? [];
  const modifiers: any[] = (item as any).modifiers ?? [];

  const toggleAddon = (id: number) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleModifier = (id: number) => {
    setSelectedModifierIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedVariationId, selectedAddonIds, selectedModifierIds);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{item.name}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            {variations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Select Variation</Text>
                <View style={styles.cardContainer}>
                  {variations.map((v) => {
                    const isSelected = selectedVariationId === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.rectCard,
                          isSelected && styles.rectCardSelected,
                        ]}
                        onPress={() => setSelectedVariationId(v.id)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.rectCardRadio}>
                          <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                        </View>
                        <Text style={[styles.rectCardText, isSelected && styles.rectCardTextSelected]}>
                          {v.variantItemName}
                        </Text>
                        <Text style={[styles.rectCardPrice, isSelected && styles.rectCardPriceSelected]}>
                          ₹{v.unitPrice}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {variations.length > 0 && (addons.length > 0 || modifiers.length > 0) && (
              <View style={styles.separator} />
            )}

            {addons.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Add-ons</Text>
                <View style={styles.chipContainer}>
                  {addons.map((addon) => {
                    const isSelected = selectedAddonIds.includes(addon.id);
                    return (
                      <TouchableOpacity
                        key={addon.id}
                        style={[
                          styles.chip,
                          isSelected && styles.chipSelected,
                        ]}
                        onPress={() => toggleAddon(addon.id)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {addon.addOnMenuName}
                        </Text>
                        <Text
                          style={[
                            styles.chipPrice,
                            isSelected && styles.chipPriceSelected,
                          ]}
                        >
                          {addon.isFree ? 'Free' : `+ ₹${addon.addOnPrice}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {addons.length > 0 && modifiers.length > 0 && (
              <View style={styles.separator} />
            )}

            {modifiers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Modifiers</Text>
                <View style={styles.chipContainer}>
                  {modifiers.map((mod) => {
                    const isSelected = selectedModifierIds.includes(mod.id);
                    return (
                      <TouchableOpacity
                        key={mod.id}
                        style={[
                          styles.chip,
                          isSelected && styles.chipSelected,
                        ]}
                        onPress={() => toggleModifier(mod.id)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {mod.name}
                        </Text>
                        <Text
                          style={[
                            styles.chipPrice,
                            isSelected && styles.chipPriceSelected,
                          ]}
                        >
                          {mod.isChargeable ? `+ ₹${mod.priceAdjustment}` : 'Free'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.9}>
            <Text style={styles.confirmBtnText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  closeBtn: {
    padding: 5,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '900',
  },
  scrollArea: {
    marginBottom: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 20,
  },
  cardContainer: {
    gap: 10,
  },
  rectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  rectCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface || '#FFF8F5',
  },
  rectCardRadio: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  rectCardText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  rectCardTextSelected: {
    color: colors.primary,
  },
  rectCardPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  rectCardPriceSelected: {
    color: colors.primary,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  chipPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  chipPriceSelected: {
    color: '#ffffff',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
});
