import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  type ImageSourcePropType,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOutlet } from '../hooks/useOutlet';
import { useFoodSession } from '../hooks/useFoodSession';
import type { AdminUserLoginResponse, Outlet } from '../types/types';
import { theme } from '../theme';

const { colors } = theme;

type OutletViewMode = 'list' | 'grid' | 'compact';

const VIEW_OPTIONS: { key: OutletViewMode; label: string }[] = [
  { key: 'compact', label: 'Compact' },
  { key: 'list', label: 'List' },
  { key: 'grid', label: 'Grid' },
];

/** Optional hero image per outlet id — UI only; not part of the `Outlet` API type. */
const OUTLET_IMAGES: Record<number, ImageSourcePropType> = {
  1: require('../assets/restaurant.png'),
  2: require('../assets/bar.png'),
  3: require('../assets/cafe.png'),
};

const FALLBACK_IMAGE: ImageSourcePropType = require('../assets/restaurant.png');

export interface LandingScreenProps {
  onSelectOutlet?: (outlet: Outlet, foodSessionId: number) => void;
  /** Called after a successful admin login. */
  onLoginSuccess?: (result: AdminUserLoginResponse) => void;
}

export default function LandingScreen({
  onSelectOutlet,
  onLoginSuccess,
}: LandingScreenProps) {
  const { signOut } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const { outlets, loading, error, getOutlets } = useOutlet();
  const [viewMode, setViewMode] = useState<OutletViewMode>('compact');
  const [selectedOutletForSession, setSelectedOutletForSession] = useState<Outlet | null>(null);

  const { sessions, loading: sessionsLoading, error: sessionsError } = useFoodSession(
    selectedOutletForSession?.id
  );

  const [loginOpen, setLoginOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const gridColumnGap = 10;
  const gridPad = 16;
  const gridItemWidth = useMemo(
    () => (windowWidth - gridPad * 2 - gridColumnGap) / 2,
    [windowWidth],
  );

  useEffect(() => {
    void getOutlets();
  }, [getOutlets]);

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
    setLoginError(null);
    setUserName('');
    setPassword('');
  }, []);

  const handleSubmitLogin = useCallback(() => {
    const trimmed = userName.trim();
    if (!trimmed || !password) {
      setLoginError('Enter user name and password.');
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      // Static mock login success
      const result: AdminUserLoginResponse = {
        username: trimmed,
      };
      onLoginSuccess?.(result);
      closeLogin();
    } catch {
      setLoginError('Login failed.');
    } finally {
      setLoginLoading(false);
    }
  }, [userName, password, onLoginSuccess, closeLogin]);

  const handleCardPress = useCallback(
    (item: Outlet) => {
      if (!item.isActive) return;
      if (item.foodSessionRequired) {
        setSelectedOutletForSession(item);
      } else {
        onSelectOutlet?.(item, 0);
      }
    },
    [onSelectOutlet],
  );

  const renderItem: ListRenderItem<Outlet> = useCallback(
    ({ item }) => {
      const image = OUTLET_IMAGES[item.id] ?? FALLBACK_IMAGE;
      const active = item.isActive;

      if (viewMode === 'list') {
        return (
          <TouchableOpacity
            activeOpacity={active ? 0.9 : 1}
            style={[styles.card, !active && styles.cardInactive]}
            onPress={() => handleCardPress(item)}
            disabled={!active}
          >
            <View style={styles.cardInner}>
              <Image source={image} style={styles.cardImage} resizeMode='cover' />
              <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View
                    style={[
                      styles.statusDot,
                      active ? styles.statusDotOpen : styles.statusDotClosed,
                    ]}
                  />
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.address}
                </Text>
                <View style={styles.cardFooter}>
                  <Text
                    style={[
                      styles.statusLabel,
                      item.isActive ? styles.statusLabelOpen : styles.statusLabelClosed,
                    ]}
                  >
                    {item.isActive ? 'Open Now' : 'Closed'}
                  </Text>
                  {item.isActive && (
                    <View style={styles.viewMenuBtn}>
                      <Text style={styles.viewMenuBtnText}>View Menu →</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      }

      if (viewMode === 'grid') {
        return (
          <TouchableOpacity
            activeOpacity={active ? 0.9 : 1}
            style={[
              styles.gridItemWrap,
              { width: gridItemWidth },
              !active && styles.cardInactive,
            ]}
            onPress={() => handleCardPress(item)}
            disabled={!active}
          >
            <View style={styles.gridCard}>
              <Image source={image} style={styles.gridImage} resizeMode='cover' />
              <View style={styles.gridBody}>
                <Text style={styles.gridTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.gridFooter}>
                  <View
                    style={[
                      styles.statusDotSmall,
                      item.isActive ? styles.statusDotOpen : styles.statusDotClosed,
                    ]}
                  />
                  <Text style={styles.gridStatusText}>
                    {item.isActive ? 'Open' : 'Closed'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      }

      return (
        <TouchableOpacity
          activeOpacity={active ? 0.9 : 1}
          style={[styles.compactRow, !active && styles.cardInactive]}
          onPress={() => handleCardPress(item)}
          disabled={!active}
        >
          <Image source={image} style={styles.compactThumb} resizeMode='cover' />
          <View style={styles.compactTextCol}>
            <View style={styles.compactTopRow}>
              <Text style={styles.compactTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  item.isActive ? styles.statusBadgeOpen : styles.statusBadgeClosed,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    active ? styles.statusBadgeTextOpen : styles.statusBadgeTextClosed,
                  ]}
                >
                  {active ? 'OPEN' : 'CLOSED'}
                </Text>
              </View>
            </View>
            <Text style={styles.compactDesc} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
          {active && <Text style={styles.compactArrow}>→</Text>}
        </TouchableOpacity>
      );
    },
    [viewMode, gridItemWidth, handleCardPress],
  );

  const renderSessionItem: ListRenderItem<any> = useCallback(
    ({ item }) => {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.compactRow}
          onPress={() => onSelectOutlet?.(selectedOutletForSession!, item.id)}
        >
          <View style={styles.compactTextCol}>
            <View style={styles.compactTopRow}>
              <Text style={styles.compactTitle} numberOfLines={1}>
                {item.sessionName || `Session #${item.id}`}
              </Text>
              <View style={[styles.statusBadge, styles.statusBadgeOpen]}>
                <Text style={[styles.statusBadgeText, styles.statusBadgeTextOpen]}>
                  ACTIVE
                </Text>
              </View>
            </View>
            <Text style={styles.compactDesc} numberOfLines={1}>
              Opened: {new Date(item.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={styles.compactArrow}>→</Text>
        </TouchableOpacity>
      );
    },
    [selectedOutletForSession, onSelectOutlet],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.welcomeText}>
              Explore
            </Text>
            <Text style={styles.hotelName} numberOfLines={1}>
              Our Outlets
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => {
              setLoginError(null);
              setLoginOpen(true);
            }}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel='Admin log in'
          >
            <Text style={styles.loginBtnText}>Admin</Text>
          </TouchableOpacity> */}
          <TouchableOpacity
            style={[styles.loginBtn, { borderColor: '#e74c3c' }]}
            onPress={signOut}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel='Log out'
          >
            <Text style={[styles.loginBtnText, { color: '#e74c3c' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={loginOpen}
        transparent
        animationType='fade'
        onRequestClose={closeLogin}
      >
        <KeyboardAvoidingView
          style={styles.loginOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.loginSheet}>
            <View style={styles.loginHeaderRow}>
              <View>
                <Text style={styles.loginTitle}>Admin Access</Text>
                <Text style={styles.loginSubtitle}>Sign in to manage this hotel</Text>
              </View>
              <TouchableOpacity
                style={styles.loginCloseBtn}
                onPress={closeLogin}
                disabled={loginLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.loginCloseBtnText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.loginForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.loginLabel}>User Name</Text>
                <TextInput
                  style={styles.loginInput}
                  value={userName}
                  onChangeText={setUserName}
                  autoCapitalize='none'
                  autoCorrect={false}
                  editable={!loginLoading}
                  placeholder='Enter username'
                  placeholderTextColor={colors.textSecondary + '80'}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.loginLabel}>Password</Text>
                <TextInput
                  style={styles.loginInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loginLoading}
                  placeholder='Enter password'
                  placeholderTextColor={colors.textSecondary + '80'}
                />
              </View>

              {loginError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.loginErrText}>{loginError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.loginSubmitBtn,
                  loginLoading && styles.loginSubmitBtnDisabled,
                ]}
                onPress={handleSubmitLogin}
                disabled={loginLoading}
                activeOpacity={0.8}
              >
                {loginLoading ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.loginSubmitBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.sectionHead}>
        <View style={styles.sectionHeadTop}>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>
              {selectedOutletForSession ? 'Select Food Session' : 'Explore our outlets'}
            </Text>
            <Text style={styles.sectionHint}>
              {selectedOutletForSession
                ? `Choose an active session for ${selectedOutletForSession.name}`
                : 'Select an experience to view the menu'}
            </Text>
          </View>
          {selectedOutletForSession ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setSelectedOutletForSession(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.viewToggle} accessibilityRole='tablist'>
              {VIEW_OPTIONS.map(({ key, label }) => {
                const selected = viewMode === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.viewSegment, selected && styles.viewSegmentOn]}
                    onPress={() => setViewMode(key)}
                    activeOpacity={0.85}
                    accessibilityRole='button'
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${label} view`}
                  >
                    <Text
                      style={[
                        styles.viewSegmentText,
                        selected && styles.viewSegmentTextOn,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {loading || sessionsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={colors.primaryDark} />
        </View>
      ) : error || sessionsError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || sessionsError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              if (selectedOutletForSession) {
                // We can't easily refetch sessions here without refetch from hook,
                // but setting state again might trigger it or just let user go back.
                setSelectedOutletForSession(null);
              } else {
                void getOutlets();
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : selectedOutletForSession ? (
        <FlatList
          data={sessions}
          keyExtractor={(s) => String(s.id)}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                No active food sessions for this outlet.
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { marginTop: 12 }]}
                onPress={() => setSelectedOutletForSession(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.retryBtnText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          key={viewMode}
          data={outlets}
          keyExtractor={(o) => String(o.id)}
          renderItem={renderItem}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={
            viewMode === 'grid' ? styles.gridColumnWrapper : undefined
          }
          extraData={viewMode}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No outlets available right now.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.headerFooter,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBackBtnText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTextBlock: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  hotelName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loginBtnText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
  },

  sectionHead: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionHeadTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionHeadText: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },

  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewSegment: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  viewSegmentOn: {
    backgroundColor: colors.primary,
    elevation: 2,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  viewSegmentText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  viewSegmentTextOn: {
    color: '#fff',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* List Card Modernization */
  card: {
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: colors.surface,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInner: {
    flexDirection: 'column',
  },
  cardInactive: {
    opacity: 0.6,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardBody: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    flex: 1,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
  statusDotOpen: {
    backgroundColor: '#2ecc71',
    elevation: 4,
    shadowColor: '#2ecc71',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  statusDotClosed: {
    backgroundColor: '#e74c3c',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusLabelOpen: { color: '#27ae60' },
  statusLabelClosed: { color: '#c0392b' },
  viewMenuBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewMenuBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Grid Redesign */
  gridColumnWrapper: {
    justifyContent: 'space-between',
  },
  gridItemWrap: {
    marginBottom: 16,
  },
  gridCard: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: 110,
  },
  gridBody: {
    padding: 12,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  gridStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  /* Compact Redesign */
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  compactThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  compactTextCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  compactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  compactDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusBadgeOpen: { backgroundColor: '#eafaf1' },
  statusBadgeClosed: { backgroundColor: '#fdedec' },
  statusBadgeText: { fontSize: 9, fontWeight: '900' },
  statusBadgeTextOpen: { color: '#27ae60' },
  statusBadgeTextClosed: { color: '#c0392b' },
  compactArrow: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
    opacity: 0.5,
  },

  /* Admin Login Redesign */
  loginOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 16, 8, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  loginSheet: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loginHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  loginSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  loginCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginCloseBtnText: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  loginForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  loginLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  loginInput: {
    height: 52,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBox: {
    backgroundColor: '#fdedec',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fadbd8',
  },
  loginErrText: {
    color: '#c0392b',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  loginSubmitBtn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginSubmitBtnDisabled: {
    opacity: 0.6,
    backgroundColor: colors.textSecondary,
  },
  loginSubmitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '900',
  },
  emptyText: {
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 40,
    fontSize: 15,
  },
});
