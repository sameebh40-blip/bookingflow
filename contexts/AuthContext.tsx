import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

interface ProfileData {
  role: string;
  full_name?: string;
  avatar_url?: string;
  shop_id?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileData | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  deleteAccount: async () => ({ error: null }),
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const fetchProfile = async (userId: string) => {
    console.log('[Auth] Fetching profile for user:', userId);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', userId)
        .single();
      if (profileData) {
        let shopId: string | undefined;
        if (profileData.role === 'shop_owner' || profileData.role === 'barber') {
          const { data: shop } = await supabase
            .from('barbershops')
            .select('id')
            .eq('owner_profile_id', userId)
            .single();
          if (shop) shopId = shop.id;
        }
        const fullProfile: ProfileData = { ...profileData, shop_id: shopId };
        setProfile(fullProfile);
        console.log('[Auth] Profile fetched:', fullProfile.role, 'shop_id:', shopId);
      }
    } catch (err) {
      console.log('[Auth] fetchProfile exception (non-fatal):', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('[Auth] refreshProfile called');
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const upsertProfile = async (user: User) => {
    console.log('[Auth] Upserting profile for user:', user.id);
    try {
      // ignoreDuplicates: true — only inserts if no row exists yet, never overwrites role
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? '',
        role: 'customer',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) console.log('[Auth] Profile upsert error (non-fatal):', error.message);
      else console.log('[Auth] Profile upserted successfully');
    } catch (err) {
      console.log('[Auth] Profile upsert exception (non-fatal):', err);
    }
  };

  const upsertCustomer = async (user: User) => {
    console.log('[Auth] Upserting customer for user:', user.id);
    try {
      const { error } = await supabase.from('customers').upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? null,
        language: 'en',
        loyalty_points: 0,
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) console.log('[Auth] Customer upsert error (non-fatal):', error.message);
      else console.log('[Auth] Customer upserted successfully');
    } catch (err) {
      console.log('[Auth] Customer upsert exception (non-fatal):', err);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('[Auth] signIn attempt:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.log('[Auth] signIn error:', error.message);
        return { error };
      }
      console.log('[Auth] signIn success');
      if (data.user) {
        await upsertProfile(data.user);
        await fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err) {
      console.log('[Auth] signIn exception:', err);
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    console.log('[Auth] signUp attempt:', email, fullName);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        console.log('[Auth] signUp error:', error.message);
        return { error };
      }
      console.log('[Auth] signUp success');
      if (data.user) {
        await upsertProfile(data.user);
        await upsertCustomer(data.user);
        await fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err) {
      console.log('[Auth] signUp exception:', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    console.log('[Auth] signOut');
    setProfile(null);
    await supabase.auth.signOut();
  };

  const deleteAccount = async () => {
    console.log('[Auth] deleteAccount');
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) {
        console.log('[Auth] deleteAccount rpc error:', error.message);
        await supabase.auth.signOut();
        return { error };
      }
      await supabase.auth.signOut();
      return { error: null };
    } catch (err) {
      console.log('[Auth] deleteAccount exception:', err);
      await supabase.auth.signOut();
      return { error: err as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signIn, signUp, signOut, deleteAccount, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
