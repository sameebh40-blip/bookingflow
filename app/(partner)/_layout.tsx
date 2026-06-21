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
import { Slot, useRouter, usePathname } from 'expo-router';
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
];

const MOBILE_TABS = [
  { route: '/(partner)', label: 'Home', icon: Home },
  { route: '/(partner)/calendar', label: 'Calendar', icon: CalendarDays },
  { route: '/(partner)/clients', label: 'Clients', icon: Users },
  { route: '/(partner)/chat', label: 'Chat', icon: MessageCircle },
  { route: '/(partner)/sales', label: 'More', icon: Grid3x3 },
];

export default function PartnerLayout() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

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
            <View style={styles.sidebarUser}>
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
            </View>
          </View>
        </View>

        {/* Main content */}
        <View style={{ flex: 1, backgroundColor: P.bg }}>
          <Slot />
        </View>
      </View>
    );
  }

  // Mobile bottom tab bar
  return (
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        {MOBILE_TABS.map((tab) => {
          const active = isActive(tab.route);
          const Icon = tab.icon;
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
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
    paddingTop: 8,
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
});
