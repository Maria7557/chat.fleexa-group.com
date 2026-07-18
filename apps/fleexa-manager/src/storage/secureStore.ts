import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface SecureValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

const memoryStore = new Map<string, string>();

const browserSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const webSessionStore: SecureValueStore = {
  async getItem(key) {
    return browserSessionStorage()?.getItem(key) ?? memoryStore.get(key) ?? null;
  },
  async setItem(key, value) {
    memoryStore.set(key, value);
    browserSessionStorage()?.setItem(key, value);
  },
  async deleteItem(key) {
    memoryStore.delete(key);
    browserSessionStorage()?.removeItem(key);
  },
};

const nativeSecureStore: SecureValueStore = {
  async getItem(key) {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },
  async deleteItem(key) {
    await SecureStore.deleteItemAsync(key);
  },
};

export const createSecureValueStore = (): SecureValueStore =>
  Platform.OS === 'web' ? webSessionStore : nativeSecureStore;
