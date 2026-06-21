import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Building2,
  MapPin,
  Clock,
  Image as ImageIcon,
  Star,
  MoreVertical,
  Users,
  Calendar,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const F = {
  bg: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  border: '#2A2A2A',
  accent: '#7C3AED',
  accentLight: 'rgba(124,58,237,0.15)',
  text: '#F5F0E8',
  textSec: '#8A8A8A',
  textTer: '#555555',
  green: '#22C55E',
  greenBg: '#052e16',
  greenDot: '#22C55E',
  danger: '#EF4444',
  divider: '#1E1E1E',
};

interface ShopData {
  name: string;
  address?: string;
  phone?: string;
  description?: string;
}

const SETTINGS_ROWS = [
  { label: 'Overview', Icon: LayoutGrid, route: null },
  { label: 'Essentials', Icon: Building2, route: '/(partner)/ob-essentials' },
  { label: 'Business location', Icon: MapPin, route: '/(partner)/ob-location' },
  { label: 'Opening hours', Icon: Clock, route: '/(partner)/ob-hours' },
  { label: 'Venue images', Icon: ImageIcon, route: '/(partner)/ob-images' },
  { label: 'Amenities and highlights', Icon: Star, route: null },
];

const ACTIVITY_ROWS = [
  { label: 'Listed profile' },
  { label: 'Updated venue description' },
  { label: 'Updated images' },
];

export default function OnlineBooking() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();

  const [shop, setShop] = useState<ShopData | null>(null);

  useEffect(() => {
    if (!profile?.shop_id) return;
    console.log('[OnlineBooking] Fetching shop data for shop_id:', profile.shop_id);
    supabase
      .from('barbershops')
      .select('name, address, phone, description')
      .eq('id', profile.shop_id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.log('[OnlineBooking] Error fetching shop:', error.message);
          return;
        }
        if (data) {
          console.log('[OnlineBooking] Shop data loaded:', data.name);
          setShop(data as ShopData);
        }
      });
  }, [profile?.shop_id]);

  const hasShop = !!profile?.shop_id;

  const addressParts = shop?.address ? shop.address.split(', ') : [];
  const cityDisplay = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : '';
  const countryDisplay = addressParts.length >= 1 ? addressParts[addressParts.length - 1] : '';
  const metaText = `No reviews yet • Closed today${cityDisplay ? ` • ${cityDisplay}` : ''}${countryDisplay ? `, ${countryDisplay}` : ''}`;

  const partnerName = profile?.full_name ?? 'Partner';

  const activityDate = 'Jun 21, 2026 at 11:42 AM';

  const handleSettingsRowPress = (label: string, route: string | null) => {
    console.log('[OnlineBooking] Settings row pressed:', label);
    if (label === 'Amenities and highlights') {
      Alert.alert('Coming soon', 'Amenities and highlights will be available soon.');
      return;
    }
    if (label === 'Overview') {
      return;
    }
    if (route) {
      router.push(route as never);
    }
  };

  const handleProfileBtn = () => {
    console.log('[OnlineBooking] Profile button pressed');
  };

  const handleMoreMenu = () => {
    console.log('[OnlineBooking] More menu (⋮) pressed');
  };

  const handleContinueSetup = () => {
    console.log('[OnlineBooking] Continue setup banner pressed');
    router.push('/(partner)/setup' as never);
  };

  const handleViewReport = () => {
    console.log('[OnlineBooking] View report button pressed');
  };

  const handleViewAllActivity = () => {
    console.log('[OnlineBooking] View all activity pressed');
  };

  const handleIntegrationSetup = (name: string) => {
    console.log('[OnlineBooking] Integration setup pressed:', name);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            console.log('[OnlineBooking] Back pressed');
            router.back();
          }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={F.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.profilePill}
          onPress={handleProfileBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.profilePillText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleMoreMenu}
          activeOpacity={0.7}
        >
          <MoreVertical size={20} color={F.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Continue setup banner */}
        {!hasShop && (
          <TouchableOpacity style={styles.setupBanner} onPress={handleContinueSetup} activeOpacity={0.85}>
            <Text style={styles.setupBannerEmoji}>🚀</Text>
            <Text style={styles.setupBannerText}>Continue setup</Text>
            <ChevronRight size={18} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Venue hero */}
        <View style={styles.venueHero}>
          <View style={styles.listedBadge}>
            <Text style={styles.listedBadgeText}>Listed</Text>
          </View>
          <Text style={styles.venueName}>{shop?.name ?? 'My Venue'}</Text>
          <Text style={styles.venueMeta}>{metaText}</Text>
        </View>

        {/* Performance section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <Text style={styles.sectionSubtitle}>
            {'Cumulative lifetime value of Fresha marketplace for '}
            <Text style={{ color: F.text, fontWeight: '600' }}>{shop?.name ?? 'your venue'}</Text>
          </Text>

          {/* Stat card 1 */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Users size={18} color={F.textSec} />
              <Text style={styles.statCardLabel}>Total new clients</Text>
            </View>
            <Text style={styles.statCardValue}>0</Text>
          </View>

          {/* Stat card 2 */}
          <View style={[styles.statCard, { marginTop: 10 }]}>
            <View style={styles.statCardHeader}>
              <Calendar size={18} color={F.textSec} />
              <Text style={styles.statCardLabel}>Total appointment value</Text>
            </View>
            <Text style={styles.statCardValue}>BHD 0</Text>
          </View>

          {/* View report button */}
          <TouchableOpacity style={styles.viewReportBtn} onPress={handleViewReport} activeOpacity={0.8}>
            <Text style={styles.viewReportText}>View report</Text>
          </TouchableOpacity>
        </View>

        {/* Latest activity */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Latest activity</Text>
            <TouchableOpacity onPress={handleViewAllActivity} activeOpacity={0.7}>
              <Text style={styles.accentLink}>View all activity</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            {ACTIVITY_ROWS.map((row, i) => (
              <View key={row.label}>
                {i > 0 && <View style={styles.activityDivider} />}
                <View style={styles.activityRow}>
                  <Text style={styles.activityLabel}>{row.label}</Text>
                  <Text style={styles.activityMeta}>{partnerName}</Text>
                  <Text style={styles.activityDate}>{activityDate}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Settings rows */}
        <View style={styles.settingsList}>
          {SETTINGS_ROWS.map((row, i) => {
            const { Icon } = row;
            return (
              <View key={row.label}>
                {i > 0 && <View style={styles.rowDivider} />}
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={() => handleSettingsRowPress(row.label, row.route)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowIconWrap}>
                    <Icon size={16} color={F.textSec} />
                  </View>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <ChevronRight size={16} color={F.textTer} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Add-ons and integrations */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Add-ons and integrations</Text>
          <Text style={styles.sectionSubtitle}>
            Boost your online profile by activating add-ons and integrations
          </Text>

          <View style={styles.integrationsCard}>
            {/* Google Ratings Boost */}
            <View style={styles.integrationRow}>
              <View style={[styles.integrationIcon, { backgroundColor: '#FEF3C7' }]}>
                <Text style={{ fontSize: 16 }}>⭐</Text>
              </View>
              <Text style={styles.integrationLabel}>Google Ratings Boost</Text>
              <TouchableOpacity
                style={styles.setupPill}
                onPress={() => handleIntegrationSetup('Google Ratings Boost')}
                activeOpacity={0.8}
              >
                <Text style={styles.setupPillText}>Set up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.integrationDivider} />

            {/* Google Reserve */}
            <View style={styles.integrationRow}>
              <View style={[styles.integrationIcon, { backgroundColor: '#EFF6FF' }]}>
                <Text style={{ fontSize: 15, color: '#4285F4', fontWeight: '800' }}>G</Text>
              </View>
              <Text style={styles.integrationLabel}>Google Reserve</Text>
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>Active</Text>
              </View>
            </View>

            <View style={styles.integrationDivider} />

            {/* Facebook and Instagram */}
            <View style={styles.integrationRow}>
              <View style={[styles.integrationIcon, { backgroundColor: '#EFF6FF' }]}>
                <Text style={{ fontSize: 15, color: '#1877F2', fontWeight: '800' }}>f</Text>
              </View>
              <Text style={styles.integrationLabel}>Facebook and Instagram</Text>
              <TouchableOpacity
                style={styles.setupPill}
                onPress={() => handleIntegrationSetup('Facebook and Instagram')}
                activeOpacity={0.8}
              >
                <Text style={styles.setupPillText}>Set up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: F.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: F.border,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  profilePillText: {
    color: F.text,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 20,
  },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: F.accent,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  setupBannerEmoji: {
    fontSize: 18,
  },
  setupBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  venueHero: {
    gap: 6,
    paddingTop: 4,
  },
  listedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: F.greenBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  listedBadgeText: {
    color: F.green,
    fontSize: 12,
    fontWeight: '700',
  },
  venueName: {
    color: F.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  venueMeta: {
    color: F.textSec,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: F.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: F.textSec,
    fontSize: 13,
    lineHeight: 18,
  },
  accentLink: {
    color: F.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  statCard: {
    backgroundColor: F.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: F.border,
    gap: 8,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statCardLabel: {
    color: F.textSec,
    fontSize: 13,
    fontWeight: '500',
  },
  statCardValue: {
    color: F.text,
    fontSize: 26,
    fontWeight: '800',
  },
  viewReportBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: F.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 2,
  },
  viewReportText: {
    color: F.text,
    fontSize: 13,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: F.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: F.border,
    overflow: 'hidden',
  },
  activityRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
  },
  activityLabel: {
    color: F.text,
    fontSize: 14,
    fontWeight: '700',
  },
  activityMeta: {
    color: F.textSec,
    fontSize: 12,
  },
  activityDate: {
    color: F.textSec,
    fontSize: 12,
  },
  activityDivider: {
    height: 1,
    backgroundColor: F.border,
    marginHorizontal: 16,
  },
  settingsList: {
    backgroundColor: F.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: F.border,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: F.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: F.border,
  },
  rowLabel: {
    flex: 1,
    color: F.text,
    fontSize: 15,
    fontWeight: '500',
  },
  rowDivider: {
    height: 1,
    backgroundColor: F.border,
    marginLeft: 60,
  },
  integrationsCard: {
    backgroundColor: F.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: F.border,
    overflow: 'hidden',
  },
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  integrationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrationLabel: {
    flex: 1,
    color: F.text,
    fontSize: 14,
    fontWeight: '500',
  },
  integrationDivider: {
    height: 1,
    backgroundColor: F.border,
    marginHorizontal: 16,
  },
  setupPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: F.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  setupPillText: {
    color: F.text,
    fontSize: 12,
    fontWeight: '600',
  },
  activePill: {
    borderRadius: 999,
    backgroundColor: F.greenBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activePillText: {
    color: F.green,
    fontSize: 12,
    fontWeight: '700',
  },
});
