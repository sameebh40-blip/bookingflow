import { Platform } from 'react-native';

interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// Web fallback using localStorage
const webStorage: StorageAdapter = {
  getItem: (key: string) => Promise.resolve(
    typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
  ),
  setItem: (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export const secureStorage: StorageAdapter = webStorage;
