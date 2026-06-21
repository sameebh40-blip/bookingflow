import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  User, Building2, Scissors, ImageIcon, Star, Settings,
  CreditCard, Calendar, Users, AlertTriangle, ChevronRight,
  BarChart2, Bell,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

const P = {
  bg: '#0B0C10', card: '#1A1B20', border: '#2A2B30',
  accent: '#7C3AED', accentGlow: '#9F67FF',
  text: '#F0F0FF', textSec: '#9090B0', textTer: '#5A5A7A',
  green: '#10B981', amber: '#F59E0B', amberBg: '#451A03',
  danger: '#E85454',
};

const GRID_ITEMS = [
  { icon: User,       label: 'Profile',           route: '/(partner)/settings' },
  { icon: Building2,  label: 'Workspaces',        route: '/(partner)/settings' },
  { icon: Scissors,   label: 'Services',          route: '/(partner)/catalog' },
  { icon: ImageIcon,  label: 'Portfolio',         route: '/(partner)/settings' },
  { icon: Star,       label: 'Reviews',           route: '/(partner)/more' },
  { icon: Settings,   label: 'Personal Settings', route: '/(partner)/settings' },
  { icon: CreditCard, label: 'Payments',          route: '/(partner)/sales' },
  { icon: Calendar,   label: 'Calendar',          route: '/(partner)/calendar' },
  { icon: Users,      label: 'Team',              route: '/(partner)/team' },
];

function PartnerPortalInner() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const nameParts = (profile?.full_name ?? 'U').split(' ');
  const initials = nameParts.map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const displayName = profile?.full_name ?? 'Partner';

  const handleNotificationsPress = useCallback(() => {
    console.log('[Portal] Notifications button pressed');
    router.push('/(partner)/notifications' as never);
  }, []);

  const handleProfilePress = useCallback(() => {
    console.log('[Portal] Profile avatar button pressed');
    router.push('/(partner)/profile' as never);
  }, []);

  const handleVerifyBannerPress = useCallback(() => {
    console.log('[Portal] Verification banner pressed');
  }, []);

  const handleGridItemPress = useCallback((label: string, route: string) => {
    console.log('[Portal] Grid item pressed:', label, '→', route);
    router.push(route as never);
  }, []);

  const handleAnalyticsPress = useCallback(() => {
    console.log('[Portal] Analytics card pressed → /(partner)/analytics');
    router.push('/(partner)/analytics' as never);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Portal</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleNotificationsPress}>
              <Bell size={20} color={P.textSec} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleProfilePress}>
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarSmallText}>{initials}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile hero */}
        <View style={styles.heroSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{initials}</Text>
            <View style={styles.avatarGlow} />
          </View>
          <Text style={styles.heroName}>{displayName}</Text>
          <Text style={styles.heroSub}>Personal Area</Text>
        </View>

        {/* Verification banner */}
        <TouchableOpacity style={styles.verifyBanner} activeOpacity={0.8} onPress={handleVerifyBannerPress}>
          <AlertTriangle size={18} color={P.amber} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.verifyTitle}>Account Status: Partially Verified</Text>
            <Text style={styles.verifySub}>Complete Email Verification & Secure Your Account with 2FA →</Text>
          </View>
        </TouchableOpacity>

        {/* 3x3 Grid */}
        <View style={styles.gridSection}>
          <View style={styles.grid}>
            {GRID_ITEMS.map((item) => {
              const Icon = item.icon;
              const itemLabel = item.label;
              const itemRoute = item.route;
              return (
                <TouchableOpacity
                  key={itemLabel}
                  style={styles.gridCard}
                  onPress={() => handleGridItemPress(itemLabel, itemRoute)}
                  activeOpacity={0.7}
                >
                  <View style={styles.gridIconWrap}>
                    <Icon size={22} color={P.accentGlow} />
                  </View>
                  <Text style={styles.gridLabel}>{itemLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Analytics shortcut */}
        <TouchableOpacity style={styles.analyticsCard} onPress={handleAnalyticsPress} activeOpacity={0.8}>
          <View style={styles.analyticsCardLeft}>
            <BarChart2 size={22} color={P.accent} />
            <View style={{ marginLeft: 14 }}>
              <Text style={styles.analyticsCardTitle}>Analytics & Revenue</Text>
              <Text style={styles.analyticsCardSub}>View your financial performance</Text>
            </View>
          </View>
          <ChevronRight size={18} color={P.textTer} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { color: P.text, fontSize: 22, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: P.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.border,
  },
  avatarSmall: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#4C1D95',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarSmallText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  heroSection: { alignItems: 'center', paddingVertical: 28 },
  avatarLarge: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#4C1D95',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 2, borderColor: P.accent,
  },
  avatarLargeText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  avatarGlow: {
    position: 'absolute', width: 88, height: 88, borderRadius: 44,
    backgroundColor: P.accent, opacity: 0.15,
  },
  heroName: { color: P.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  heroSub: { color: P.textSec, fontSize: 13, marginTop: 4 },
  verifyBanner: {
    marginHorizontal: 16, marginBottom: 20, backgroundColor: P.amberBg,
    borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#92400E',
  },
  verifyTitle: { color: P.amber, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  verifySub: { color: '#D97706', fontSize: 12, lineHeight: 17 },
  gridSection: { paddingHorizontal: 16, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: {
    width: '31%', backgroundColor: P.card, borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: P.border,
  },
  gridIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E1040',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: '#3B1F7A',
  },
  gridLabel: { color: P.text, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  analyticsCard: {
    marginHorizontal: 16, backgroundColor: P.card, borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: P.border,
  },
  analyticsCardLeft: { flexDirection: 'row', alignItems: 'center' },
  analyticsCardTitle: { color: P.text, fontSize: 15, fontWeight: '700' },
  analyticsCardSub: { color: P.textSec, fontSize: 12, marginTop: 2 },
});

export default function PartnerPortal() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => { setReady(true); }, []);
  if (!ready) return (
    <View style={{ flex: 1, backgroundColor: '#0B0C10', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#7C3AED" size="large" />
    </View>
  );
  return <PartnerPortalInner />;
}
