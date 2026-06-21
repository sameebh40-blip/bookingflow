import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { Slot, Stack, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  CalendarDays,
  Users,
  MessageCircle,
  BarChart2,
  BookOpen,
  UserCheck,
  Settings,
  LogOut,
  Grid3x3,
  Bell,
  Tag,
  Plus,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

const P = {
  bg: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#242438',
  border: '#2A2A45',
  accent: '#7C3AED',
  accentLight: 'rgba(124,58,237,0.15)',
  accentMid: '#9B59B6',
  gold: '#C9A84C',
  text: '#F0F0FF',
  textSecondary: '#9090B0',
  textTertiary: '#5A5A7A',
  success: '#4CAF7D',
  danger: '#E85454',
  warning: '#F59E0B',
  divider: '#1E1E35',
};

const SIDEBAR_ITEMS = [
  { route: '/(partner)', label: 'Home', icon: Home },
  { route: '/(partner)/calendar', label: 'Calendar', icon: CalendarDays },
  { route: '/(partner)/clients', label: 'Clients', icon: Users },
  { route: '/(partner)/chat', label: 'Chat', icon: MessageCircle },
  { route: '/(partner)/sales', label: 'Sales', icon: BarChart2 },
  { route: '/(partner)/catalog', label: 'Catalog', icon: BookOpen },
  { route: '/(partner)/team', label: 'Team', icon: UserCheck },
  { route: '/(partner)/settings', label: 'Settings', icon: Settings },
  { route: '/(partner)/notifications', label: 'Notifications', icon: Bell },
  { route: '/(partner)/more', label: 'More', icon: Grid3x3 },
];

const MOBILE_TABS = [
  { route: '/(partner)/calendar', icon: CalendarDays, isCenter: false },
  { route: '/(partner)/catalog', icon: Tag, isCenter: false },
  { route: '/(partner)/new-booking', icon: Plus, isCenter: true },
  { route: '/(partner)/notifications', icon: Bell, isCenter: false },
  { route: '/(partner)/more', icon: Grid3x3, isCenter: false },
];

export default function PartnerLayout() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  // Allow access if role is shop_owner or barber (even without shop_id — demo mode)
  // Only redirect to auth if not a partner role at all
  const isPartnerRole = profile?.role === 'shop_owner' || profile?.role === 'barber';

  const handleSignOut = async () => {
    console.log('[Partner] Sign out pressed');
    await signOut();
    router.replace('/auth');
  };

  const navigateTo = (route: string) => {
    console.log('[Partner] Navigate to:', route);
    router.push(route as never);
  };

  const isActive = (route: string) => {
    if (route === '/(partner)') return pathname === '/(partner)' || pathname === '/';
    return pathname.startsWith(route.replace('/(partner)', ''));
  };

  if (isWide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: P.bg }}>
        {/* Sidebar */}
        <View style={[styles.sidebar, { paddingTop: insets.top + 16 }]}>
          {/* Shop header */}
          <View style={styles.sidebarHeader}>
            <View style={styles.shopLogoPlaceholder}>
              <Text style={styles.shopLogoText}>
                {profile?.full_name?.charAt(0) ?? 'S'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopName} numberOfLines={1}>
                {profile?.full_name ?? 'My Shop'}
              </Text>
              <Text style={styles.shopRole}>Partner Dashboard</Text>
            </View>
          </View>

          <View style={styles.sidebarDivider} />

          {/* Nav items */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {SIDEBAR_ITEMS.map((item) => {
              const active = isActive(item.route);
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.sidebarItem, active && styles.sidebarItemActive]}
                  onPress={() => navigateTo(item.route)}
                >
                  <Icon
                    size={18}
                    color={active ? P.accent : P.textSecondary}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Bottom user section */}
          <View style={[styles.sidebarBottom, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sidebarDivider} />
            <TouchableOpacity
              style={styles.sidebarUser}
              onPress={() => {
                console.log('[Partner] Sidebar user avatar pressed — navigate to profile');
                router.push('/(partner)/profile' as never);
              }}
              activeOpacity={0.7}
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.userAvatar} />
              ) : (
                <View style={styles.userAvatarPlaceholder}>
                  <Text style={styles.userAvatarText}>
                    {profile?.full_name?.charAt(0) ?? 'U'}
                  </Text>
                </View>
              )}
              <Text style={styles.userName} numberOfLines={1}>
                {profile?.full_name ?? 'User'}
              </Text>
              <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                <LogOut size={16} color={P.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main content */}
        <View style={{ flex: 1, backgroundColor: P.bg }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="calendar" />
            <Stack.Screen name="new-booking" />
            <Stack.Screen name="clients" />
            <Stack.Screen name="chat/index" />
            <Stack.Screen name="chat/[clientId]" />
            <Stack.Screen name="sales" />
            <Stack.Screen name="catalog" />
            <Stack.Screen name="team" />
            <Stack.Screen name="team/[barberId]" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="more" />
            <Stack.Screen name="setup" />
            <Stack.Screen name="client/[id]" />
            <Stack.Screen name="profile" />
          </Stack>
        </View>
      </View>
    );
  }

  // Mobile bottom tab bar
  return (
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="calendar" />
          <Stack.Screen name="new-booking" />
          <Stack.Screen name="clients" />
          <Stack.Screen name="chat/index" />
          <Stack.Screen name="chat/[clientId]" />
          <Stack.Screen name="sales" />
          <Stack.Screen name="catalog" />
          <Stack.Screen name="team" />
          <Stack.Screen name="team/[barberId]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="more" />
          <Stack.Screen name="setup" />
          <Stack.Screen name="client/[id]" />
          <Stack.Screen name="profile" />
        </Stack>
      </View>
      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { height: 56 + insets.bottom, paddingBottom: insets.bottom }]}>
        {MOBILE_TABS.map((tab) => {
          const active = isActive(tab.route);
          const Icon = tab.icon;
          if (tab.isCenter) {
            return (
              <TouchableOpacity
                key={tab.route}
                style={styles.tabItem}
                onPress={() => navigateTo(tab.route)}
              >
                <View style={styles.centerTabBtn}>
                  <Icon size={22} color="#fff" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={tab.route}
              style={styles.tabItem}
              onPress={() => navigateTo(tab.route)}
            >
              <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                <Icon
                  size={20}
                  color={active ? P.accent : P.textSecondary}
                  strokeWidth={active ? 2.5 : 2}
                />
              </View>
            </TouchableOpacity>
          );
        })}
        {/* Profile avatar tab */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            console.log('[Partner] Mobile tab avatar pressed — navigate to profile');
            router.push('/(partner)/profile' as never);
          }}
        >
          <View style={[styles.tabIconWrap, isActive('/(partner)/profile') && styles.tabIconWrapActive]}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.mobileTabAvatar} />
            ) : (
              <View style={styles.mobileTabAvatarPlaceholder}>
                <Text style={styles.mobileTabAvatarText}>
                  {profile?.full_name?.charAt(0) ?? 'U'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: P.surface,
    borderRightWidth: 1,
    borderRightColor: P.border,
    paddingHorizontal: 12,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  shopLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: P.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopLogoText: {
    color: P.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  shopName: {
    color: P.text,
    fontSize: 14,
    fontWeight: '700',
  },
  shopRole: {
    color: P.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: P.border,
    marginVertical: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  sidebarItemActive: {
    backgroundColor: P.accentLight,
  },
  sidebarLabel: {
    color: P.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  sidebarLabelActive: {
    color: P.accent,
    fontWeight: '600',
  },
  sidebarBottom: {
    paddingHorizontal: 4,
  },
  sidebarUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: P.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: P.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  userName: {
    flex: 1,
    color: P.text,
    fontSize: 13,
    fontWeight: '500',
  },
  signOutBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: P.surface,
    borderTopWidth: 1,
    borderTopColor: P.border,
    paddingTop: 4,
    alignItems: 'center',
  },
  centerTabBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: P.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    elevation: 4,
    shadowColor: P.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: P.accentLight,
  },
  tabLabel: {
    color: P.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: P.accent,
    fontWeight: '600',
  },
  mobileTabAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  mobileTabAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: P.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTabAvatarText: {
    color: P.accent,
    fontSize: 10,
    fontWeight: '700',
  },
});
