import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

const { colors } = theme;

const OK_BTN_WEB: ViewStyle =
  Platform.OS === 'web'
    ? ({ cursor: 'pointer' } as ViewStyle)
    : {};

export interface OrderPlacedModalProps {
  visible: boolean;
  orderId: number | null;
  onClose: () => void;
}

export default function OrderPlacedModal({
  visible,
  orderId,
  onClose,
}: OrderPlacedModalProps) {
  if (!visible || orderId == null) return null;

  return (
    <Modal
      visible={visible}
      animationType='fade'
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
          <View style={styles.sheet}>
            <View style={styles.receiptEdge} />
            <Text style={styles.title}>Order placed</Text>
            <Text style={styles.body}>
              Your order #{orderId} has been submitted successfully.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.okBtn,
                pressed && styles.okBtnPressed,
                OK_BTN_WEB,
              ]}
              onPress={onClose}
              accessibilityRole='button'
              accessibilityLabel='OK'
            >
              <Text style={styles.okBtnText}>OK</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  safe: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
  },
  receiptEdge: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  title: {
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  body: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  okBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
  },
  okBtnPressed: { opacity: 0.9 },
  okBtnText: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 16,
  },
});
