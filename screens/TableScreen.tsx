import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Outlet, TableMaster } from '../types/types';
import { theme } from '../theme';
import { useCart } from '../context/CartContext';
import { useTables } from '../hooks/useTables';
import { useAuth } from '../hooks/useAuth';

const { colors } = theme;

export interface TableScreenProps {
  outlet: Outlet;
  onSelectTable: (tableNo: string) => void;
}

export default function TableScreen({
  outlet,
  onSelectTable,
}: TableScreenProps) {
  const { lines, kots, updateKotStatus } = useCart();
  const { width } = useWindowDimensions();
  const { tables: apiTables, loading, error } = useTables(outlet.id);
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'tables' | 'kots'>('tables');

  // Intercept back action
  useEffect(() => {
    const backAction = () => {
      // Lock user inside table flow (per request: "user cant go back")
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  // Derive occupied tables from current cart state
  const occupiedTables = useMemo(() => {
    const occupied = new Set<string>();
    for (const line of lines) {
      if (line.outletId === outlet.id && line.tableNo && line.qty > 0) {
        occupied.add(line.tableNo);
      }
    }
    return occupied;
  }, [lines, outlet.id]);

  const sections = useMemo(() => {
    const map = new Map<string, typeof apiTables>();
    for (const t of apiTables) {
      const secName = t.sectionName || 'Default Section';
      if (!map.has(secName)) {
        map.set(secName, []);
      }
      map.get(secName)!.push(t);
    }

    const list: {
      sectionName: string;
      tables: { id: string; label: string; displayCode: string; isOccupied: boolean }[];
    }[] = [];

    map.forEach((items, secName) => {
      list.push({
        sectionName: secName,
        tables: items.map((t) => ({
          id: String(t.id),
          label: t.tableCaption || `Table ${t.tableCode || t.id}`,
          displayCode: t.tableCode || String(t.id),
          isOccupied: occupiedTables.has(String(t.id)),
        })),
      });
    });

    return list;
  }, [apiTables, occupiedTables]);

  const kotTickets = useMemo(() => {
    return kots.filter((k) => k.outletId === outlet.id && k.status !== 'Served');
  }, [kots, outlet.id]);

  // Calculate column layout
  const numColumns = width > 600 ? 4 : 3;
  const itemMargin = 12;
  const containerPadding = 20;
  const itemWidth =
    (width - containerPadding * 2 - itemMargin * (numColumns - 1)) / numColumns;

  const renderTableItem = ({
    item,
  }: {
    item: { id: string; label: string; displayCode: string; isOccupied: boolean };
  }) => {
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.85}
        style={[
          styles.tableCard,
          { width: itemWidth },
          item.isOccupied && styles.tableCardOccupied,
        ]}
        onPress={() => onSelectTable(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`${item.label} ${item.isOccupied ? '(Occupied)' : '(Available)'}`}
      >
        <View style={styles.cardInner}>
          <Text style={styles.tableNumber} numberOfLines={1} adjustsFontSizeToFit>
            {item.displayCode}
          </Text>
          <Text style={styles.tableLabel}>{item.label}</Text>

          {item.isOccupied ? (
            <View style={styles.badgeOccupied}>
              <Text style={styles.badgeOccupiedText}>Occupied</Text>
            </View>
          ) : (
            <View style={styles.badgeAvailable}>
              <Text style={styles.badgeAvailableText}>Available</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.outletName}>{outlet.name}</Text>
          <Text style={styles.title}>Select a Table</Text>
          <Text style={styles.subtitle}>
            Pick your dining spot to begin ordering
          </Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={signOut}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Logout button"
        >
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'tables' && styles.tabBtnActive]}
          onPress={() => setActiveTab('tables')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'tables' && styles.tabTextActive]}>Tables</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'kots' && styles.tabBtnActive]}
          onPress={() => setActiveTab('kots')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'kots' && styles.tabTextActive]}>Active KOT ({kotTickets.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading tables...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centerWrap}>
          <Text style={styles.emptyText}>No tables available.</Text>
        </View>
      ) : activeTab === 'tables' ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((sec) => (
            <View key={sec.sectionName} style={styles.sectionWrapper}>
              <Text style={styles.sectionTitle}>{sec.sectionName}</Text>
              <View style={styles.sectionGrid}>
                {sec.tables.map((item) => renderTableItem({ item }))}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.kotGrid}
          showsVerticalScrollIndicator={false}
        >
          {kotTickets.length === 0 ? (
            <View style={styles.centerKot}>
              <Text style={styles.emptyText}>No active KOTs at the moment.</Text>
            </View>
          ) : (
            kotTickets.map((kot) => (
              <View
                key={kot.id}
                style={styles.kotCard}
              >
                <View style={styles.kotHeader}>
                  <Text style={styles.kotTable}>{kot.tableName}</Text>
                  <Text style={[
                    styles.kotDraftBadge, 
                    kot.status === 'Preparing' && styles.kotBadgePreparing,
                    kot.status === 'Served' && styles.kotBadgeServed
                  ]}>
                    {kot.status}
                  </Text>
                </View>
                <View style={styles.kotDivider} />
                {kot.lines.map((line: any, index: number) => {
                  let name = line.item.name || 'Item';
                  if (line.variationId) {
                    const vObj = (line.item as any).variations?.find((v: any) => v.id === line.variationId);
                    if (vObj) name += ` (${vObj.variantItemName})`;
                  }
                  const aids = line.selectedAddOnMappingIds ?? [];
                  if (aids.length > 0) {
                    const addons = (line.item as any).addOns ?? [];
                    const set = new Set(aids);
                    for (const a of addons) {
                      if (set.has(a.id)) name += ` + ${a.addOnMenuName}`;
                    }
                  }
                  const mids = line.selectedModifierMappingIds ?? [];
                  if (mids.length > 0) {
                    const modifiers = (line.item as any).modifiers ?? [];
                    const mset = new Set(mids);
                    for (const m of modifiers) {
                      if (mset.has(m.id)) name += ` + ${m.name}`;
                    }
                  }
                  
                  return (
                    <View key={index} style={styles.kotLine}>
                      <Text style={styles.kotQty}>{line.qty} x</Text>
                      <Text style={styles.kotItem} numberOfLines={2}>
                        {name}
                      </Text>
                    </View>
                  );
                })}
                <View style={styles.kotDivider} />
                <View style={styles.statusActionRow}>
                  {(['Pending', 'Preparing', 'Served'] as const).map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusOptionBtn,
                        kot.status === st && styles.statusOptionBtnActive,
                      ]}
                      onPress={() => updateKotStatus(kot.id, st)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          kot.status === st && styles.statusOptionTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
    backgroundColor: colors.headerFooter,
  },
  logoutBtn: {
    backgroundColor: colors.border + '40',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  logoutBtnText: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '800',
  },
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  centerKot: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kotGrid: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  kotCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
    minWidth: 280,
    maxWidth: 360,
    flexGrow: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  kotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kotTable: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  kotDraftBadge: {
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
    color: '#e67e22',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  kotBadgePreparing: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    color: '#2980b9',
  },
  kotBadgeServed: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    color: '#27ae60',
  },
  statusActionRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  statusOptionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  statusOptionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  statusOptionTextActive: {
    color: '#ffffff',
  },
  kotDivider: {
    height: 1,
    backgroundColor: colors.border + '50',
    marginBottom: 12,
  },
  kotLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  kotQty: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primaryDark,
    minWidth: 24,
  },
  kotItem: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  kotFooter: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  kotActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  headerTextBlock: {
    flex: 1,
    marginRight: 16,
  },
  outletName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionWrapper: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  sectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginBottom: 12,
    marginRight: 12,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tableCardOccupied: {
    borderColor: colors.primary + '50',
    backgroundColor: colors.surfaceAlt,
  },
  cardInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  tableLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 14,
  },
  badgeAvailable: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeAvailableText: {
    color: '#27ae60',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeOccupied: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeOccupiedText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 15,
    color: colors.primaryDark,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
