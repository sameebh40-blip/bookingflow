import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://xiwhdcutsjfdbikfyhtw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpd2hkY3V0c2pmZGJpa2Z5aHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzMwMzYsImV4cCI6MjA5NTk0OTAzNn0.KWBKgBVfA8xlflCXc6hvr1RByZ-p0AgOHbGx_GV9goU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
