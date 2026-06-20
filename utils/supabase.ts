import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  'https://ckkcfgeifjxylknurpvr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNra2NmZ2VpZmp4eWxrbnVycHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTA0MTEsImV4cCI6MjA4ODUyNjQxMX0.n5NpkXzNn0iI3V33KilKNOL2aMRxq_HStK4Ll4_f8SI',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
