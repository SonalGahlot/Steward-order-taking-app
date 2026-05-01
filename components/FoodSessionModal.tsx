import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  FlatList,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import type { FoodSessionDto } from '../types/types';

const { colors } = theme;

const BTN_WEB: ViewStyle =
  Platform.OS === 'web'
    ? ({ cursor: 'pointer' } as ViewStyle)
    : {};

export interface FoodSessionModalProps {
  visible: boolean;
  sessions: FoodSessionDto[];
  onSelect: (sessionId: number) => void;
  onClose: () => void;
}

export default function FoodSessionModal({
  visible,
  sessions,
  onSelect,
  onClose,
}: FoodSessionModalProps) {
  if (!visible) return null;

  const renderItem = ({ item }: { item: FoodSessionDto }) => (
    <Pressable
      style={({ pressed }) => [
        styles.sessionItem,
        pressed && styles.sessionItemPressed,
        BTN_WEB,
      ]}
      onPress={() => onSelect(item.id)}
    >
      <Text style={styles.sessionName}>{item.sessionName || `Session #${item.id}`}</Text>
      <Text style={styles.sessionTime}>
        Opened: {new Date(item.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </Pressable>
  );

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
            <Text style={styles.title}>Select Food Session</Text>
            <Text style={styles.subtitle}>Choose the active session to proceed with your order.</Text>
            
            {sessions.length === 0 ? (
              <Text style={styles.emptyText}>No active food sessions available.</Text>
            ) : (
              <FlatList
                data={sessions}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
              />
            )}

            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.cancelBtnPressed,
                BTN_WEB,
              ]}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
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
    maxHeight: 400,
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
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 10,
  },
  sessionItem: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionItemPressed: {
    opacity: 0.7,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sessionTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginVertical: 20,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  cancelBtnPressed: {
    opacity: 0.7,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
});
