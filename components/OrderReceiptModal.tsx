import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { GuestOrderReceipt, OrderServiceType } from '../types/types';
import { theme } from '../theme';

const { colors } = theme;

const SHEET_MAX_WIDTH = 420;

const DONE_BTN_WEB: ViewStyle =
  Platform.OS === 'web'
    ? ({ cursor: 'pointer' } as ViewStyle)
    : {};

function formatPrice(n: number): string {
  return `₹${Number(n).toFixed(2)}`;
}

function serviceLabel(t: OrderServiceType): string {
  switch (t) {
    case 'dine_in':
      return 'Dine-in';
    case 'room_service':
      return 'Room service';
    case 'take_away':
      return 'Take away';
    default:
      return t;
  }
}

export interface OrderReceiptModalProps {
  visible: boolean;
  receipt: GuestOrderReceipt | null;
  onClose: () => void;
  /** Preview slip (`receipt.orderId === null`): confirm sends the order to the API. */
  onConfirmPlaceOrder?: () => void | Promise<void>;
  placingOrder?: boolean;
}

export default function OrderReceiptModal({
  visible,
  receipt,
  onClose,
  onConfirmPlaceOrder,
  placingOrder = false,
}: OrderReceiptModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (!visible || !receipt) return null;

  const isPreview = receipt.orderId == null;
  const { payload } = receipt;
  const sheetWidth = Math.min(SHEET_MAX_WIDTH, windowWidth - 40);
  const sheetMaxHeight = Math.min(windowHeight * 0.92, 720);

  return (
    <Modal
      visible={visible}
      animationType='fade'
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView
          style={styles.safe}
          edges={['top', 'left', 'right', 'bottom']}
        >
          <View
            style={[
              styles.sheet,
              {
                width: sheetWidth,
                maxHeight: sheetMaxHeight,
              },
            ]}
          >
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps='handled'
              bounces={false}
            >
              <View style={styles.receiptEdge} />
              <Text style={styles.title}>
                {isPreview ? 'Review your order' : 'Order received'}
              </Text>
              <Text style={styles.orderNo}>
                {isPreview ? '—' : `#${receipt.orderId}`}
              </Text>
              <Text style={styles.outletName}>{receipt.outletName}</Text>

              <View style={styles.divider} />

              <Text style={styles.sectionLabel}>Table</Text>
              <Text style={styles.bodyText}>{payload.tableNo}</Text>

              <View style={styles.divider} />

              <Text style={styles.sectionLabel}>Items</Text>
              {receipt.lines.map((row, i) => (
                <View key={i} style={styles.lineRow}>
                  <Text style={styles.lineName} numberOfLines={2}>
                    {row.itemName}
                  </Text>
                  <Text style={styles.lineQty}>×{row.qty}</Text>
                  <Text style={styles.lineAmt}>{formatPrice(row.lineTotal)}</Text>
                </View>
              ))}

              <View style={styles.totalsBox}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalMuted}>Subtotal</Text>
                  <Text style={styles.totalVal}>
                    {formatPrice(receipt.totalAmount)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalMuted}>GST</Text>
                  <Text style={styles.totalVal}>
                    {formatPrice(receipt.gstAmount)}
                  </Text>
                </View>
                <View style={[styles.totalRow, styles.grandRow]}>
                  <Text style={styles.grandLabel}>Total</Text>
                  <Text style={styles.grandVal}>
                    {formatPrice(receipt.finalAmount)}
                  </Text>
                </View>
              </View>

              <Text style={styles.thanks}>
                {isPreview
                  ? 'Tap Place order to confirm, or Cancel to go back.'
                  : 'Thank you — your order is on its way.'}
              </Text>
            </ScrollView>

            {isPreview ? (
              <View style={styles.previewActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    pressed && styles.cancelBtnPressed,
                    DONE_BTN_WEB,
                  ]}
                  onPress={onClose}
                  disabled={placingOrder}
                  accessibilityRole='button'
                  accessibilityLabel='Cancel order'
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.placeBtn,
                    (placingOrder || !onConfirmPlaceOrder) &&
                      styles.placeBtnDisabled,
                    pressed && !placingOrder && styles.placeBtnPressed,
                    DONE_BTN_WEB,
                  ]}
                  onPress={() => void onConfirmPlaceOrder?.()}
                  disabled={placingOrder || !onConfirmPlaceOrder}
                  accessibilityRole='button'
                  accessibilityLabel='Place order'
                >
                  {placingOrder ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.doneBtnText}>Place order</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.doneBtn,
                  pressed && styles.doneBtnPressed,
                  DONE_BTN_WEB,
                ]}
                onPress={onClose}
                accessibilityRole='button'
                accessibilityLabel='Close receipt'
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            )}
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
    paddingHorizontal: 20,
  },
  safe: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  receiptEdge: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 18,
    color: colors.textPrimary,
  },
  orderNo: {
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 22,
    color: colors.primaryDark,
    marginTop: 4,
  },
  outletName: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 14,
  },
  sectionLabel: {
    fontWeight: '800',
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  bodyText: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.textPrimary,
  },
  bodyMuted: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  lineName: {
    flex: 1,
    fontWeight: '700',
    fontSize: 14,
    color: colors.textPrimary,
    marginRight: 8,
  },
  lineQty: {
    fontWeight: '800',
    fontSize: 13,
    color: colors.textSecondary,
    minWidth: 28,
  },
  lineAmt: {
    fontWeight: '900',
    fontSize: 14,
    color: colors.primaryDark,
    minWidth: 72,
    textAlign: 'right',
  },
  totalsBox: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalMuted: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.textSecondary,
  },
  totalVal: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.textPrimary,
  },
  grandRow: { marginTop: 4 },
  grandLabel: {
    fontWeight: '900',
    fontSize: 16,
    color: colors.textPrimary,
  },
  grandVal: {
    fontWeight: '900',
    fontSize: 18,
    color: colors.primaryDark,
  },
  thanks: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 14,
    marginBottom: 4,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelBtnPressed: { opacity: 0.88 },
  cancelBtnText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  placeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  placeBtnPressed: { opacity: 0.9 },
  placeBtnDisabled: { opacity: 0.75 },
  doneBtn: {
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
  },
  doneBtnPressed: { opacity: 0.9 },
  doneBtnText: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 16,
  },
});
