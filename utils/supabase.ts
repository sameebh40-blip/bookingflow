import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use AsyncStorage for the auth session on every platform.
// (SecureStore was throwing keychain "User interaction is not allowed" errors in
// the iOS preview, which broke the session and hung session-dependent screens.)
export const supabase = createClient(
  'https://xiwhdcutsjfdbikfyhtw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2hkY3V0c2pmZGJpa2Z5aHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzMwMzYsImV4cCI6MjA5NTk0OTAzNn0.KWBKgBVfA8xlflCXc6hvr1RByZ-p0AgOHbGx_GV9goU',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
