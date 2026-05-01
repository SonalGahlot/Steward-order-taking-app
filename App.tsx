import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Linking,
  Alert,
  Platform,
  View,
  ActivityIndicator,
} from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor, useAppSelector, useAppDispatch } from './redux-store/store';
import apiClient from './apiClient';
import LandingScreen from './screens/LandingScreen';
import MenuScreen from './screens/MenuScreen';
import TableScreen from './screens/TableScreen';
import { CartProvider, useCart } from './context/CartContext';
import { setSelectedFoodSessionState } from './redux-store/slices/navSlice';
import type { AdminUserLoginResponse, Outlet } from './types/types';
import {
  clearGuestUrlParams,
  readGuestUrlParams,
  writeGuestUrlParams,
} from './lib/guestUrl';
import { theme } from './theme';
import LoginScreen from './screens/LoginScreen';
import {
  setScreenState,
  setSelectedOutletState,
  setSelectedTableState,
} from './redux-store/slices/navSlice';
import CartScreen from './screens/CartScreen';

type Screen = 'landing' | 'tables' | 'menu' | 'cart';

function getAdminAppBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_ADMIN_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'http://192.168.1.4:3000';
}

function AppContent() {
  const { setInvoiceData, clearCart, setTableContext } = useCart();
  const dispatch = useAppDispatch();
  const { screen, selectedOutlet, selectedTable } = useAppSelector((state) => state.nav);
  const [routeReady, setRouteReady] = useState(Platform.OS !== 'web');

  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);

  const setScreen = useCallback((s: any) => dispatch(setScreenState(s)), [dispatch]);
  const setSelectedOutlet = useCallback((o: any) => dispatch(setSelectedOutletState(o)), [dispatch]);
  const setSelectedTable = useCallback((t: any) => dispatch(setSelectedTableState(t)), [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedOutlet(null);
      setSelectedTable(null);
      setScreen('landing');
    }
  }, [isAuthenticated]);

  const applyUrlToState = useCallback(async () => {
    const p = readGuestUrlParams();
    try {
      if (p.outletId == null) {
        setSelectedOutlet(null);
        setScreen('landing');
        return;
      }
      const response = await apiClient.get<any>('/api/OutletMaster');
      console.log('App.tsx applyUrlToState Outlets from API:', response.data);

      const raw = response.data;
      const outlets: Outlet[] = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object' && Array.isArray(raw.data) ? raw.data : []);

      const outlet = outlets.find((o) => o.id === p.outletId && o.isActive);
      if (!outlet) {
        setSelectedOutlet(null);
        setScreen('landing');
        clearGuestUrlParams();
        return;
      }
      setSelectedOutlet(outlet);
      setTableContext(outlet.id, null as any, null);
      setScreen('tables');
    } catch {
      setSelectedOutlet(null);
      setScreen('landing');
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setRouteReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      await applyUrlToState();
      if (!cancelled) setRouteReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyUrlToState]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onPop = () => {
      void applyUrlToState();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [applyUrlToState]);

  const handleClearContext = useCallback(() => {
    setSelectedOutlet(null);
    setScreen('landing');
    if (Platform.OS === 'web') {
      clearGuestUrlParams();
    }
  }, []);

  const handleSelectOutlet = useCallback(
    (outlet: Outlet, foodSessionId: number) => {
      dispatch(setSelectedFoodSessionState(foodSessionId));
      setSelectedOutlet(outlet);
      setScreen('tables');
      if (Platform.OS === 'web') {
        writeGuestUrlParams(
          {
            outletId: outlet.id,
          },
          'push',
        );
      }
    },
    [dispatch],
  );

  const handleSelectTable = useCallback(
    async (tableId: string, tableCode: string) => {
      setSelectedTable(tableCode);
      clearCart();

      if (selectedOutlet) {
        setTableContext(selectedOutlet.id, tableId, (store.getState().nav as any).selectedFoodSessionId);
      }

      try {
        if (selectedOutlet) {
          // 1. Fetch active invoice for the table using tableId instead of tableCode
          const invRes = await apiClient.get(`/api/FNBInvoiceMaster/table/${selectedOutlet.id}/${tableId}`);
          if (invRes.data) {
            const invoice = invRes.data;
            // 2. Fetch transactions for the invoice
            const transRes = await apiClient.get(`/api/FNBInvoiceTran/master/${invoice.id}`);
            // 3. Fetch add-ons for the invoice
            const addonsRes = await apiClient.get(`/api/FNBInvoiceTranAddOn/master/${invoice.id}`);

            if (transRes.data) {
              setInvoiceData(invoice.id, transRes.data, addonsRes.data || []);
            }
          }
        }
      } catch (err) {
        console.log('No active invoice or error fetching invoice:', err);
      }

      setScreen('menu');
    },
    [selectedOutlet, setInvoiceData, clearCart],
  );

  const handleBackToLanding = useCallback(() => {
    setSelectedOutlet(null);
    setScreen('landing');
    if (Platform.OS === 'web') {
      clearGuestUrlParams();
    }
  }, []);

  const handleAdminLoginSuccess = useCallback(
    (result: AdminUserLoginResponse) => {
      void (async () => {
        const base = getAdminAppBaseUrl();
        const qs = new URLSearchParams({
          username: result.username,
        })
        const url = `${base}/landing?${qs.toString()}`;
        Linking.openURL(url).catch(() => {
          Alert.alert(
            'Could not open',
            `Check that the admin app is running and EXPO_PUBLIC_ADMIN_APP_URL is set correctly.\n\n${url}`,
          );
        });
      })();
    },
    [],
  );

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <>
      {!routeReady ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.background,
          }}
        >
          <ActivityIndicator size='large' color={theme.colors.primaryDark} />
        </View>
      ) : (
        <>
          {screen === 'landing' && (
            <LandingScreen
              onSelectOutlet={handleSelectOutlet}
              onLoginSuccess={handleAdminLoginSuccess}
            />
          )}
          {screen === 'tables' && selectedOutlet != null && (
            <TableScreen
              outlet={selectedOutlet}
              onSelectTable={handleSelectTable}
            />
          )}
          {screen === 'menu' && selectedOutlet != null && (
            <MenuScreen
              outlet={selectedOutlet}
              selectedTable={selectedTable}
              isOrderTakingSystem={true}
              onBack={() => setScreen('tables')}
              onViewCart={() => setScreen('cart')}
            />
          )}
          {screen === 'cart' && selectedOutlet != null && (
            <CartScreen
              onBack={() => setScreen('menu')}
            />
          )}
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
