import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, RefreshCw, CreditCard, Award } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

interface Appointment {
  id: string;
  venue_name: string;
  venue_image: string;
  date: string;
  price: number;
  items: number;
  status: 'upcoming' | 'past';
  venue_id: string;
}

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: '1', venue_name: 'Level Barber Shop', venue_image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200', date: 'Fri, Jun 19, 2026 at 7:25 AM', price: 7, items: 2, status: 'upcoming', venue_id: '1' },
  { id: '2', venue_name: 'Hairpage', venue_image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200', date: 'Mon, Jun 15, 2026 at 7:00 AM', price: 14, items: 2, status: 'past', venue_id: '2' },
  { id: '3', venue_name: 'Elite Athlete Barber', venue_image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=200', date: 'Sat, Jun 6, 2026 at 11:15 AM', price: 3, items: 1, status: 'past', venue_id: '3' },
];

const MOCK_GIFT_CARDS = [
  { id: '1', code: 'MADAR-2024-XKQP', balance: 25, expiry: 'Dec 31, 2025' },
];

const MOCK_MEMBERSHIPS = [
  { id: '1', venue: 'Level Barber Shop', plan: 'Monthly Unlimited', status: 'Active', expiry: 'Jul 31, 2026' },
];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 70, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'appointments' | 'giftcards' | 'memberships'>('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const fetchAppointments = async () => {
    console.log('[Bookings] Fetching appointments');
    setLoading(true);
    try {
      if (!user) {
        setAppointments(MOCK_APPOINTMENTS);
        return;
      }
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        console.log('[Bookings] Using mock appointments:', error?.message);
        setAppointments(MOCK_APPOINTMENTS);
      } else {
        console.log('[Bookings] Loaded', data.length, 'appointments');
        setAppointments(data);
      }
    } catch (err) {
      console.log('[Bookings] Exception, using mock:', err);
      setAppointments(MOCK_APPOINTMENTS);
    } finally {
      setLoading(false);
    }
  };

  const handleRebook = useCallback((venueId: string, venueName: string) => {
    console.log('[Bookings] Rebook pressed:', venueId, venueName);
    router.push(`/venue/${venueId}`);
  }, [router]);

  const handleTabChange = useCallback((tab: 'appointments' | 'giftcards' | 'memberships') => {
    console.log('[Bookings] Tab changed to:', tab);
    setActiveTab(tab);
  }, []);

  const upcoming = appointments.filter(a => a.status === 'upcoming');
  const past = appointments.filter(a => a.status === 'past');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Activity</Text>
        <AnimatedPressable
          onPress={() => console.log('[Bookings] Search pressed')}
          style={styles.searchBtn}
        >
          <Search size={20} color={MADAR_COLORS.textSecondary} />
        </AnimatedPressable>
      </View>

      {/* Segmented control */}
      <View style={styles.segmentContainer}>
        {(['appointments', 'giftcards', 'memberships'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const labels = { appointments: 'Appointments', giftcards: 'Gift cards', memberships: 'Memberships' };
          const count = tab === 'appointments' ? appointments.length : 0;
          return (
            <AnimatedPressable
              key={tab}
              onPress={() => handleTabChange(tab)}
              style={[styles.segmentTab, isActive && styles.segmentTabActive]}
            >
              <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                {labels[tab]}
              </Text>
              {tab === 'appointments' && count > 0 && (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countBadgeText, isActive && styles.countBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </AnimatedPressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'appointments' && (
          <>
            {upcoming.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                {upcoming.map((appt, index) => (
                  <AnimatedListItem key={appt.id} index={index}>
                    <AppointmentRow appt={appt} onRebook={handleRebook} />
                  </AnimatedListItem>
                ))}
              </View>
            )}

            {past.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past</Text>
                {past.map((appt, index) => (
                  <AnimatedListItem key={appt.id} index={index}>
                    <AppointmentRow appt={appt} onRebook={handleRebook} />
                  </AnimatedListItem>
                ))}
              </View>
            )}

            {appointments.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <RefreshCw size={32} color={MADAR_COLORS.gold} />
                </View>
                <Text style={styles.emptyTitle}>No appointments yet</Text>
                <Text style={styles.emptySubtitle}>Book your first service to see it here</Text>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Bookings] Discover venues pressed from empty state');
                    router.push('/(tabs)/discover');
                  }}
                  style={styles.emptyBtn}
                >
                  <Text style={styles.emptyBtnText}>Discover venues</Text>
                </AnimatedPressable>
              </View>
            )}
          </>
        )}

        {activeTab === 'giftcards' && (
          <View style={styles.section}>
            {MOCK_GIFT_CARDS.map((card, index) => (
              <AnimatedListItem key={card.id} index={index}>
                <View style={styles.giftCard}>
                  <View style={styles.giftCardHeader}>
                    <CreditCard size={20} color={MADAR_COLORS.gold} />
                    <Text style={styles.giftCardCode}>{card.code}</Text>
                  </View>
                  <Text style={styles.giftCardBalance}>BHD {card.balance.toFixed(3)}</Text>
                  <Text style={styles.giftCardExpiry}>Expires {card.expiry}</Text>
                </View>
              </AnimatedListItem>
            ))}
          </View>
        )}

        {activeTab === 'memberships' && (
          <View style={styles.section}>
            {MOCK_MEMBERSHIPS.map((m, index) => (
              <AnimatedListItem key={m.id} index={index}>
                <View style={styles.membershipCard}>
                  <View style={styles.membershipHeader}>
                    <Award size={20} color={MADAR_COLORS.gold} />
                    <View style={[styles.statusBadge, m.status === 'Active' ? styles.statusActive : styles.statusExpired]}>
                      <Text style={[styles.statusText, m.status === 'Active' ? styles.statusTextActive : styles.statusTextExpired]}>
                        {m.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.membershipVenue}>{m.venue}</Text>
                  <Text style={styles.membershipPlan}>{m.plan}</Text>
                  <Text style={styles.membershipExpiry}>Expires {m.expiry}</Text>
                </View>
              </AnimatedListItem>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function AppointmentRow({ appt, onRebook }: { appt: Appointment; onRebook: (id: string, name: string) => void }) {
  return (
    <View style={styles.appointmentRow}>
      <Image source={{ uri: appt.venue_image }} style={styles.appointmentImage} resizeMode="cover" />
      <View style={styles.appointmentInfo}>
        <Text style={styles.appointmentVenue} numberOfLines={1}>{appt.venue_name}</Text>
        <Text style={styles.appointmentDate} numberOfLines={1}>{appt.date}</Text>
        <Text style={styles.appointmentMeta}>BHD {appt.price} · {appt.items} {appt.items === 1 ? 'item' : 'items'}</Text>
      </View>
      <AnimatedPressable
        onPress={() => onRebook(appt.venue_id, appt.venue_name)}
        style={styles.rebookBtn}
      >
        <Text style={styles.rebookBtnText}>Rebook</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  pageTitle: { fontSize: 32, fontWeight: '800', color: MADAR_COLORS.text, letterSpacing: -0.5 },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  segmentTabActive: { backgroundColor: MADAR_COLORS.surfaceElevated },
  segmentLabel: { fontSize: 12, color: MADAR_COLORS.textSecondary, fontWeight: '500' },
  segmentLabelActive: { color: MADAR_COLORS.gold, fontWeight: '700' },
  countBadge: {
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countBadgeActive: { backgroundColor: MADAR_COLORS.goldMuted },
  countBadgeText: { fontSize: 10, color: MADAR_COLORS.textSecondary, fontWeight: '700' },
  countBadgeTextActive: { color: MADAR_COLORS.gold },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: MADAR_COLORS.text, marginBottom: 16, letterSpacing: -0.3 },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MADAR_COLORS.divider,
    gap: 12,
  },
  appointmentImage: { width: 56, height: 56, borderRadius: 8 },
  appointmentInfo: { flex: 1, gap: 3 },
  appointmentVenue: { fontSize: 15, fontWeight: '700', color: MADAR_COLORS.text },
  appointmentDate: { fontSize: 12, color: MADAR_COLORS.textSecondary },
  appointmentMeta: { fontSize: 12, color: MADAR_COLORS.textSecondary },
  rebookBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MADAR_COLORS.goldBorder,
  },
  rebookBtnText: { fontSize: 13, color: MADAR_COLORS.gold, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: MADAR_COLORS.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: MADAR_COLORS.text },
  emptySubtitle: { fontSize: 14, color: MADAR_COLORS.textSecondary, textAlign: 'center', maxWidth: 260 },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: MADAR_COLORS.gold,
  },
  emptyBtnText: { fontSize: 14, color: MADAR_COLORS.background, fontWeight: '700' },
  giftCard: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: MADAR_COLORS.goldBorder,
    gap: 8,
    marginBottom: 12,
  },
  giftCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  giftCardCode: { fontSize: 13, color: MADAR_COLORS.textSecondary, fontFamily: 'SpaceMono' },
  giftCardBalance: { fontSize: 28, fontWeight: '800', color: MADAR_COLORS.gold, letterSpacing: -0.5 },
  giftCardExpiry: { fontSize: 12, color: MADAR_COLORS.textTertiary },
  membershipCard: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    gap: 8,
    marginBottom: 12,
  },
  membershipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusActive: { backgroundColor: 'rgba(76,175,125,0.15)' },
  statusExpired: { backgroundColor: 'rgba(232,84,84,0.15)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextActive: { color: MADAR_COLORS.success },
  statusTextExpired: { color: MADAR_COLORS.danger },
  membershipVenue: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.text },
  membershipPlan: { fontSize: 13, color: MADAR_COLORS.textSecondary },
  membershipExpiry: { fontSize: 12, color: MADAR_COLORS.textTertiary },
});
