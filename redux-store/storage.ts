import { Platform } from 'react-native';
import createWebStorage from 'redux-persist/lib/storage/createWebStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage interface that matches both AsyncStorage and web storage
interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// This function creates a dummy storage object that does nothing.
// It's used on the server-side where browser storage isn't available.
const createNoopStorage = (): Storage => {
  return {
    getItem(_key: string): Promise<string | null> {
      return Promise.resolve(null);
    },
    setItem(_key: string, _value: string): Promise<void> {
      return Promise.resolve();
    },
    removeItem(_key: string): Promise<void> {
      return Promise.resolve();
    },
  };
};

// Use AsyncStorage for React Native (iOS/Android) and createWebStorage for web
let storage: Storage;
if (Platform.OS === 'web') {
  // Web platform: use localStorage via createWebStorage
  if (typeof window !== 'undefined') {
    storage = createWebStorage('local') as Storage;
  } else {
    // Server-side rendering: use noop storage
    storage = createNoopStorage();
  }
} else {
  // React Native platform (iOS/Android): use AsyncStorage
  storage = AsyncStorage as Storage;
}

export default storage;
