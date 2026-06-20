import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store works in Expo Go; AsyncStorage v3 requires a native build.
// Use SecureStore on native, localStorage on web.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    console.log('[Supabase Storage] getItem:', key);
    if (Platform.OS === 'web') {
      return Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    console.log('[Supabase Storage] setItem:', key);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    console.log('[Supabase Storage] removeItem:', key);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(
  'https://ckkcfgeifjxylknurpvr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNra2NmZ2VpZmp4eWxrbnVycHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTA0MTEsImV4cCI6MjA4ODUyNjQxMX0.n5NpkXzNn0iI3V33KilKNOL2aMRxq_HStK4Ll4_f8SI',
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
