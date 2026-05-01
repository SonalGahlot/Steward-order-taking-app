import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCart, CartItemType } from '../context/CartContext';
import { theme } from '../theme';
import apiClient from '../apiClient';

const { colors } = theme;

interface KotConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function KotConfirmationModal({
  visible,
  onClose,
  onSuccess,
}: KotConfirmationModalProps) {
  const {
    cartItems,
    serverItems,
    invoiceId,
    foodSessionId,
    outletId,
    selectedTable,
    markAsSent,
    setInvoiceId,
  } = useCart();
  const [loading, setLoading] = useState(false);

  // 1. Find items that are in cart (could be new, updated, or same)
  const cartDeltas = cartItems.map(item => {
    const sItem = serverItems.find(s => s.id === item.id);
    return {
      item,
      diff: item.quantity - (sItem ? sItem.sentQuantity : 0)
    };
  }).filter(d => d.diff !== 0);

  // 2. Find items that were in server but are now GONE from cart (removed)
  const removedDeltas = serverItems
    .filter(s => !cartItems.find(c => c.id === s.id))
    .map(s => ({
      item: { ...s, quantity: 0 },
      diff: -s.sentQuantity
    }));

  const deltas = [...cartDeltas, ...removedDeltas];

  const positiveDeltas = deltas.filter((d) => d.diff > 0);
  const negativeDeltas = deltas.filter((d) => d.diff < 0);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (!invoiceId) {
        throw new Error('No active invoice to generate KOT for.');
      }

      console.log('[KOT] Triggering generation for invoice:', invoiceId);

      // 1. Generate Positive KOT
      if (positiveDeltas.length > 0) {
        try {
          await apiClient.post('/api/KOTMaster/generate', {
            invoiceId: invoiceId,
            outletId: outletId,
            kitchenInstruction: '',
          });
        } catch (kotErr: any) {
          if (kotErr.response?.data?.includes('No pending items')) {
            console.log('[KOT] No pending positive items.');
          } else {
            throw kotErr;
          }
        }
      }

      // 2. Generate Negative KOT
      if (negativeDeltas.length > 0) {
        try {
          await apiClient.post('/api/KOTMaster/generate-negative', {
            invoiceId: invoiceId,
            outletId: outletId,
            kitchenInstruction: '',
          });
        } catch (kotErr: any) {
          if (kotErr.response?.data?.includes('No pending items')) {
            console.log('[KOT] No pending negative items.');
          } else {
            throw kotErr;
          }
        }
      }

      console.log('[KOT] All generation triggered successfully.');
      markAsSent();
      onSuccess();
      onClose();
      Alert.alert('Success', 'Order placed successfully!');
    } catch (error: any) {
      console.error('[KOT Error]', error);
      let errorMsg = error.message || 'Failed to process KOT';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string' && data.includes('No pending items')) {
          errorMsg = 'KOT already exists or no changes to send.';
        }
      }
      
      Alert.alert('KOT Info', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Confirm KOT</Text>

          <ScrollView style={styles.scroll}>
            {positiveDeltas.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>To Add (Positive KOT)</Text>
                {positiveDeltas.map((d) => (
                  <Text key={d.item.id} style={styles.itemText}>
                    • {d.item.menuItem.name} x {d.diff}
                  </Text>
                ))}
              </View>
            )}

            {negativeDeltas.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: '#d9534f' }]}>
                  To Remove (Negative KOT)
                </Text>
                {negativeDeltas.map((d) => (
                  <Text key={d.item.id} style={styles.itemText}>
                    • {d.item.menuItem.name} x {Math.abs(d.diff)}
                  </Text>
                ))}
              </View>
            )}

            {deltas.length === 0 && (
              <Text style={styles.noChanges}>No changes to send.</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                (loading || deltas.length === 0) && styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={loading || deltas.length === 0}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm KOT</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  scroll: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
    paddingLeft: 8,
  },
  noChanges: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surfaceAlt,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    backgroundColor: colors.textSecondary,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
