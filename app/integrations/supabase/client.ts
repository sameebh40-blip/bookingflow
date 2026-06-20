import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://xiwhdcutsjfdbikfyhtw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2hkY3V0c2pmZGJpa2Z5aHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzMwMzYsImV4cCI6MjA5NTk0OTAzNn0.KWBKgBVfA8xlflCXc6hvr1RByZ-p0AgOHbGx_GV9goU";

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

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
