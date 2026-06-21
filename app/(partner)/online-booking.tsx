import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ImageSourcePropType,
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
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const F = {
  bg: '#0D0D0D',
  surface: '#1A1A1A',
  border: '#2A2A2A',
  accent: '#7C3AED',
  accentLight: 'rgba(124,58,237,0.15)',
  text: '#F5F0E8',
  textSec: '#8A8A8A',
  textTer: '#555555',
  green: '#22C55E',
  greenBg: '#052e16',
};

interface ShopData {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
}

const SETTINGS_ROWS = [
  { label: 'Overview', Icon: LayoutGrid },
  { label: 'Essentials', Icon: Building2 },
  { label: 'Business location', Icon: MapPin },
  { label: 'Opening hours', Icon: Clock },
  { label: 'Venue images', Icon: ImageIcon },
  { label: 'Amenities and highlights', Icon: Star },
];

const STATS = [
  { label: 'Total new clients', value: '0' },
  { label: 'Total appointment value', value: 'BHD 0' },
  { label: 'Marketplace ROI', value: '0.0x' },
];

export default function OnlineBooking() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();

  const [shop, setShop] = useState<ShopData | null>(null);
  const [activeTab, setActiveTab] = useState<'profiles' | 'portfolio'>('profiles');

  useEffect(() => {
    if (!profile?.shop_id) return;
    console.log('[OnlineBooking] Fetching shop data for shop_id:', profile.shop_id);
    supabase
      .from('barbershops')
      .select('name, address, phone')
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

  // Parse city/country from address if not separate fields
  const addressParts = shop?.address ? shop.address.split(', ') : [];
  const cityDisplay = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : '';
  const countryDisplay = addressParts.length >= 1 ? addressParts[addressParts.length - 1] : '';
  const metaText = `No reviews yet • Closed today${cityDisplay ? ` • ${cityDisplay}` : ''}${countryDisplay ? `, ${countryDisplay}` : ''}`;

  const handleSettingsRowPress = (label: string) => {
    console.log('[OnlineBooking] Settings row pressed:', label);
    router.push('/(partner)/settings' as never);
  };

  const handleProfileBtn = () => {
    console.log('[OnlineBooking] Profile button pressed');
    router.push('/(partner)/settings' as never);
  };

  const handleContinueSetup = () => {
    console.log('[OnlineBooking] Continue setup banner pressed');
    router.push('/(partner)/setup' as never);
  };

  const handleTabPress = (tab: 'profiles' | 'portfolio') => {
    console.log('[OnlineBooking] Tab pressed:', tab);
    setActiveTab(tab);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { console.log('[OnlineBooking] Back pressed'); router.back(); }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={F.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Online booking</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Continue setup banner — shown if no shop yet */}
        {!hasShop && (
          <TouchableOpacity style={styles.setupBanner} onPress={handleContinueSetup} activeOpacity={0.85}>
            <Text style={styles.setupBannerEmoji}>🚀</Text>
            <Text style={styles.setupBannerText}>Continue setup</Text>
            <ChevronRight size={18} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Venue hero — shown if shop exists */}
        {hasShop && shop && (
          <View style={styles.venueHero}>
            {/* Listed badge */}
            <View style={styles.listedBadge}>
              <Text style={styles.listedBadgeText}>Listed</Text>
            </View>

            {/* Venue name + profile button row */}
            <View style={styles.venueNameRow}>
              <Text style={styles.venueName}>{shop.name}</Text>
              <TouchableOpacity style={styles.profilePill} onPress={handleProfileBtn} activeOpacity={0.8}>
                <Text style={styles.profilePillText}>Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Meta row */}
            <Text style={styles.venueMeta}>{metaText}</Text>
          </View>
        )}

        {/* Settings rows list */}
        <View style={styles.settingsList}>
          {SETTINGS_ROWS.map((row, i) => {
            const { Icon } = row;
            return (
              <View key={row.label}>
                {i > 0 && <View style={styles.rowDivider} />}
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={() => handleSettingsRowPress(row.label)}
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

        {/* Marketplace profile card */}
        <View style={styles.marketplaceCard}>
          <Text style={styles.marketplaceTitle}>Marketplace profile</Text>
          <Text style={styles.marketplaceSub}>
            View and manage your online profile on Fresha marketplace.{' '}
            <Text style={styles.learnMore}>Learn more</Text>
          </Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {STATS.map((stat, i) => (
              <View key={stat.label} style={[styles.statRow, i < STATS.length - 1 && styles.statRowBorder]}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            ))}
          </View>

          {/* Tab pills */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabPill, activeTab === 'profiles' && styles.tabPillActive]}
              onPress={() => handleTabPress('profiles')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabPillText, activeTab === 'profiles' && styles.tabPillTextActive]}>
                Profiles 1
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabPill, activeTab === 'portfolio' && styles.tabPillActive]}
              onPress={() => handleTabPress('portfolio')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabPillText, activeTab === 'portfolio' && styles.tabPillTextActive]}>
                Portfolio 0
              </Text>
            </TouchableOpacity>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: F.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },

  // Continue setup banner
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

  // Venue hero
  venueHero: {
    paddingVertical: 4,
    gap: 6,
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
  venueNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  venueName: {
    color: F.text,
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
    marginRight: 12,
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
  venueMeta: {
    color: F.textSec,
    fontSize: 13,
    lineHeight: 18,
  },

  // Settings list
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

  // Marketplace card
  marketplaceCard: {
    backgroundColor: F.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: F.border,
    padding: 16,
    gap: 12,
  },
  marketplaceTitle: {
    color: F.text,
    fontSize: 17,
    fontWeight: '700',
  },
  marketplaceSub: {
    color: F.textSec,
    fontSize: 13,
    lineHeight: 18,
  },
  learnMore: {
    color: F.accent,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: F.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: F.border,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: F.border,
  },
  statLabel: {
    color: F.textSec,
    fontSize: 13,
  },
  statValue: {
    color: F.text,
    fontSize: 14,
    fontWeight: '700',
  },

  // Tab pills
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: F.border,
  },
  tabPillActive: {
    backgroundColor: F.accent,
    borderColor: F.accent,
  },
  tabPillText: {
    color: F.textSec,
    fontSize: 13,
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#fff',
  },
});
