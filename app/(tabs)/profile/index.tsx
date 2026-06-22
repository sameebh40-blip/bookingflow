import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Heart,
  MessageCircle,
  CalendarDays,
  Settings,
  HelpCircle,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

interface ProfileData {
  full_name?: string;
  avatar_url?: string;
  membership_tier?: string;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  route: string;
  external?: boolean;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (user) {
      console.log('[Profile] Fetching profile from Supabase for user:', user.id);
      supabase
        .from('profiles')
        .select('full_name, avatar_url, membership_tier')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.log('[Profile] Profile fetch error (non-fatal):', error.message);
          } else if (data) {
            console.log('[Profile] Profile loaded:', data.full_name);
            setProfile(data);
          }
        });
      // Real loyalty points (drives the tier + the wallet card)
      supabase.from('customers').select('loyalty_points').eq('id', user.id).maybeSingle()
        .then(({ data }) => { if (data?.loyalty_points != null) setPoints(Number(data.loyalty_points)); });
    }
  }, [user]);

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Guest';
  const membershipTier = profile?.membership_tier ?? (points >= 500 ? 'Gold' : points >= 100 ? 'Silver' : 'Bronze');
  const avatarUrl = profile?.avatar_url ?? null;

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const menuItems: MenuItem[] = [
    { icon: <User size={20} color={MADAR_COLORS.textSecondary} />, label: 'Profile', route: '/edit-profile' },
    { icon: <Heart size={20} color={MADAR_COLORS.textSecondary} />, label: 'Favourites', route: '/favourites' },
    { icon: <MessageCircle size={20} color={MADAR_COLORS.textSecondary} />, label: 'Messages', route: '/(tabs)/messages' },
    { icon: <CalendarDays size={20} color={MADAR_COLORS.textSecondary} />, label: 'My appointments', route: '/(tabs)/bookings' },
    { icon: <Settings size={20} color={MADAR_COLORS.textSecondary} />, label: 'Settings', route: '/settings' },
  ];

  const handleMenuPress = useCallback((route: string, label: string) => {
    console.log('[Profile] Menu item pressed:', label, route);
    router.push(route as any);
  }, [router]);

  const handleSignOut = useCallback(async () => {
    console.log('[Profile] Sign out pressed');
    await signOut();
    router.replace('/auth');
  }, [signOut, router]);

  const handleViewWallet = useCallback(() => {
    console.log('[Profile] View wallet pressed');
    router.push('/wallet');
  }, [router]);

  const handleSignIn = useCallback(() => {
    console.log('[Profile] Sign in pressed');
    router.push('/auth');
  }, [router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.userName}>{displayName}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{membershipTier}</Text>
          </View>
        </View>
        {avatarUrl ? (
          <Image
            source={resolveImageSource(avatarUrl)}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
      </View>

      {/* Wallet card */}
      <AnimatedPressable onPress={handleViewWallet} style={styles.walletCardWrapper}>
        <LinearGradient
          colors={['#5B3FA0', '#9B59B6', '#C9A84C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.walletCard}
        >
          <Text style={styles.walletLabel}>Loyalty points</Text>
          <Text style={styles.walletBalance}>{points.toLocaleString()} pts</Text>
          <View style={styles.viewWalletBtn}>
            <Text style={styles.viewWalletText}>{membershipTier} member</Text>
          </View>
        </LinearGradient>
      </AnimatedPressable>

      {/* Menu list */}
      <View style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <AnimatedPressable
            key={item.label}
            onPress={() => handleMenuPress(item.route, item.label)}
            style={[
              styles.menuItem,
              index < menuItems.length - 1 && styles.menuItemBorder,
            ]}
          >
            <View style={styles.menuItemLeft}>
              {item.icon}
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <ChevronRight size={16} color={MADAR_COLORS.textTertiary} />
          </AnimatedPressable>
        ))}
      </View>

      {/* Support */}
      <View style={[styles.menuCard, { marginTop: 16 }]}>
        <AnimatedPressable
          onPress={() => console.log('[Profile] Support pressed')}
          style={styles.menuItem}
        >
          <View style={styles.menuItemLeft}>
            <HelpCircle size={20} color={MADAR_COLORS.textSecondary} />
            <Text style={styles.menuItemLabel}>Support</Text>
          </View>
          <ChevronRight size={16} color={MADAR_COLORS.textTertiary} />
        </AnimatedPressable>
      </View>

      {/* Sign out / Sign in */}
      <View style={{ marginTop: 24, marginBottom: 8 }}>
        {user ? (
          <AnimatedPressable onPress={handleSignOut} style={styles.signOutBtn}>
            <LogOut size={18} color={MADAR_COLORS.danger} />
            <Text style={styles.signOutText}>Sign out</Text>
          </AnimatedPressable>
        ) : (
          <AnimatedPressable onPress={handleSignIn} style={styles.signInBtn}>
            <Text style={styles.signInText}>Sign in to your account</Text>
          </AnimatedPressable>
        )}
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: { gap: 6 },
  userName: { fontSize: 26, fontWeight: '800', color: MADAR_COLORS.text, letterSpacing: -0.5 },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: MADAR_COLORS.goldMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: MADAR_COLORS.goldBorder,
  },
  tierText: { fontSize: 11, fontWeight: '700', color: MADAR_COLORS.gold },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MADAR_COLORS.purpleMuted,
    borderWidth: 2,
    borderColor: MADAR_COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: MADAR_COLORS.border,
  },
  avatarInitials: { fontSize: 18, fontWeight: '800', color: MADAR_COLORS.purple },
  walletCardWrapper: { marginBottom: 24 },
  walletCard: {
    borderRadius: 20,
    padding: 24,
    gap: 8,
  },
  walletLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  walletBalance: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  viewWalletBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  viewWalletText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  menuCard: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: MADAR_COLORS.divider,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuItemLabel: { fontSize: 15, color: MADAR_COLORS.text, fontWeight: '500' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(232,84,84,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232,84,84,0.2)',
  },
  signOutText: { fontSize: 15, color: MADAR_COLORS.danger, fontWeight: '600' },
  signInBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: MADAR_COLORS.gold,
    alignItems: 'center',
  },
  signInText: { fontSize: 15, color: MADAR_COLORS.background, fontWeight: '700' },
});
