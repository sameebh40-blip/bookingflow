import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Image,
  ImageSourcePropType,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, RefreshCw, CreditCard, Award, Calendar, Clock, MessageCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

interface Appointment {
  id: string;
  venue_name: string;
  venue_image: string;
  date: string;
  start_at?: string;
  price: number;
  items: number;
  status: 'upcoming' | 'past';
  venue_id: string;
  services?: { name: string; price: number }[];
}

function getCountdown(startAt?: string): string {
  if (!startAt) return 'Upcoming';
  const diff = new Date(startAt).getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `In ${Math.floor(hours / 24)}d`;
  if (hours > 0) return `In ${hours}h ${mins}m`;
  return `In ${mins}m`;
}

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    venue_name: 'Level Barber Shop',
    venue_image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
    date: 'Fri, Jun 19, 2026 at 7:25 AM',
    price: 7,
    items: 2,
    status: 'upcoming',
    venue_id: '1',
    services: [
      { name: 'Haircut & Beard Trim', price: 5 },
      { name: 'Hot Towel Shave', price: 2 },
    ],
  },
  {
    id: '2',
    venue_name: 'Level Barber Shop',
    venue_image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
    date: 'Fri, Jun 19, 2026 at 10:25 AM',
    price: 14,
    items: 2,
    status: 'past',
    venue_id: '2',
    services: [
      { name: 'Classic Fade', price: 8 },
      { name: 'Beard Trim', price: 6 },
    ],
  },
  {
    id: '3',
    venue_name: 'Elite Athlete Barber',
    venue_image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800',
    date: 'Sat, Jun 6, 2026 at 11:15 AM',
    price: 3,
    items: 1,
    status: 'past',
    venue_id: '3',
    services: [
      { name: 'Skin Fade', price: 3 },
    ],
  },
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

function UpcomingCard({ appt, onViewDetails, onRebook, onCancelled }: {
  appt: Appointment;
  onViewDetails: () => void;
  onRebook: () => void;
  onCancelled?: () => void;
}) {
  const router = useRouter();
  const totalDuration = (appt.services?.length ?? 1) * 30;
  const totalStr = `BHD ${Number(appt.price).toFixed(3)}`;
  const itemCount = appt.services?.length ?? appt.items;
  const durationText = `${totalDuration} min · ${totalStr} · ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;

  const handleCancelPress = useCallback(() => {
    console.log('[Bookings] Cancel pressed for appointment:', appt.id);
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cancel appointment', style: 'destructive', onPress: async () => {
          console.log('[Bookings] Cancelling appointment in Supabase:', appt.id);
          await supabase.from('bookings').update({
            status: 'cancelled',
            cancel_reason: 'Customer cancelled via app',
            cancelled_at: new Date().toISOString(),
          }).eq('id', appt.id);
          onCancelled?.();
        }},
      ]
    );
  }, [appt.id, onCancelled]);

  const handleCardPress = useCallback(() => {
    console.log('[Bookings] UpcomingCard tapped, navigating to appointment detail:', appt.id);
    router.push(`/appointment/${appt.id}`);
  }, [appt.id, router]);

  const handleReschedulePress = useCallback(() => {
    console.log('[Bookings] Reschedule pressed for appointment:', appt.id);
    router.push(`/booking/datetime?venueId=${appt.venue_id}`);
  }, [appt.id, appt.venue_id, router]);

  const handleMessage = useCallback(() => {
    console.log('[Bookings] Message shop pressed for venue:', appt.venue_id);
    router.push(`/chat/${appt.venue_id}`);
  }, [appt.venue_id, router]);

  const handleGetDirections = useCallback(() => {
    console.log('[Bookings] Get directions pressed for:', appt.venue_name);
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${encodeURIComponent(appt.venue_name)}`
      : `geo:0,0?q=${encodeURIComponent(appt.venue_name)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(appt.venue_name)}`);
    });
  }, [appt.venue_name]);

  return (
    <AnimatedPressable onPress={handleCardPress} style={upcomingCardStyles.card}>
      {/* Cover image with gradient */}
      <View style={{ height: 180, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }}>
        <Image
          source={resolveImageSource(appt.venue_image)}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.92)']}
          style={StyleSheet.absoluteFillObject}
        />
        {/* "In X hours" badge */}
        <View style={upcomingCardStyles.countdownBadge}>
          <Text style={upcomingCardStyles.countdownText}>{getCountdown(appt.start_at)}</Text>
        </View>
        {/* Venue name overlay */}
        <Text style={upcomingCardStyles.venueNameOverlay} numberOfLines={1}>
          {appt.venue_name}
        </Text>
      </View>

      {/* Info section */}
      <View style={upcomingCardStyles.infoSection}>
        {/* Date row */}
        <View style={upcomingCardStyles.infoRow}>
          <Calendar size={14} color={MADAR_COLORS.gold} />
          <Text style={upcomingCardStyles.infoText}>{appt.date}</Text>
        </View>
        {/* Duration + price row */}
        <View style={upcomingCardStyles.infoRow}>
          <Clock size={14} color={MADAR_COLORS.textSecondary} />
          <Text style={upcomingCardStyles.infoText}>{durationText}</Text>
        </View>
        {/* Get directions */}
        <AnimatedPressable onPress={handleGetDirections}>
          <Text style={upcomingCardStyles.directionsText}>Get directions</Text>
        </AnimatedPressable>

        <View style={upcomingCardStyles.divider} />

        {/* Action buttons */}
        <View style={upcomingCardStyles.actionsRow}>
          <AnimatedPressable style={upcomingCardStyles.cancelBtn} onPress={handleCancelPress}>
            <Text style={upcomingCardStyles.cancelBtnText}>Cancel</Text>
          </AnimatedPressable>
          <AnimatedPressable style={upcomingCardStyles.rescheduleBtn} onPress={handleReschedulePress}>
            <Text style={upcomingCardStyles.rescheduleBtnText}>Reschedule</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[upcomingCardStyles.rescheduleBtn, upcomingCardStyles.messageBtn]}
            onPress={handleMessage}
          >
            <MessageCircle size={14} color={'#7C3AED'} />
            <Text style={[upcomingCardStyles.rescheduleBtnText, upcomingCardStyles.messageBtnText]}>Message</Text>
          </AnimatedPressable>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const upcomingCardStyles = StyleSheet.create({
  card: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  countdownBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(13,13,20,0.85)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  countdownText: { fontSize: 12, color: MADAR_COLORS.text, fontWeight: '600' },
  venueNameOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  infoSection: { padding: 14, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: MADAR_COLORS.textSecondary, flex: 1 },
  directionsText: { fontSize: 13, color: MADAR_COLORS.gold, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: MADAR_COLORS.border, marginVertical: 4 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MADAR_COLORS.danger,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: MADAR_COLORS.danger },
  rescheduleBtn: {
    flex: 1,
    backgroundColor: MADAR_COLORS.gold,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rescheduleBtnText: { fontSize: 14, fontWeight: '700', color: '#0A0A0F' },
  messageBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#7C3AED',
    flexDirection: 'row',
    gap: 4,
  },
  messageBtnText: { color: '#7C3AED' },
});

function PastCard({ appt, onRebook }: { appt: Appointment; onRebook: () => void }) {
  const router = useRouter();
  const itemsLabel = appt.items === 1 ? 'item' : 'items';
  const priceStr = Number(appt.price).toFixed(3);

  const handleCardPress = useCallback(() => {
    console.log('[Bookings] PastCard tapped, navigating to appointment detail:', appt.id);
    router.push(`/appointment/${appt.id}`);
  }, [appt.id, router]);

  const handleRebookPress = useCallback(() => {
    console.log('[Bookings] Rebook pressed for past appointment:', appt.id, appt.venue_name);
    onRebook();
  }, [appt.id, appt.venue_name, onRebook]);

  return (
    <AnimatedPressable onPress={handleCardPress} style={pastRowStyles.row}>
      <Image source={resolveImageSource(appt.venue_image)} style={pastRowStyles.thumb} resizeMode="cover" />
      <View style={pastRowStyles.info}>
        <Text style={pastRowStyles.name} numberOfLines={1}>{appt.venue_name}</Text>
        <Text style={pastRowStyles.date} numberOfLines={1}>{appt.date}</Text>
        <Text style={pastRowStyles.meta}>BHD {priceStr} · {appt.items} {itemsLabel}</Text>
      </View>
      <AnimatedPressable onPress={handleRebookPress} style={pastRowStyles.rebookBtn}>
        <Text style={pastRowStyles.rebookText}>Rebook</Text>
      </AnimatedPressable>
    </AnimatedPressable>
  );
}

const pastRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontWeight: '700', color: MADAR_COLORS.text },
  date: { fontSize: 12, color: MADAR_COLORS.textSecondary },
  meta: { fontSize: 12, color: MADAR_COLORS.textTertiary },
  rebookBtn: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  rebookText: { fontSize: 13, color: MADAR_COLORS.text, fontWeight: '500' },
});

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
        setAppointments([]);
        return;
      }
      console.log('[Bookings] Fetching from hallaq bookings table for user:', user.id);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_at,
          end_at,
          status,
          total_price,
          price_bhd,
          shop_id,
          barber_id,
          barbershops!shop_id(id, name, cover_url, address)
        `)
        .eq('customer_profile_id', user.id)
        .order('start_at', { ascending: false })
        .limit(20);

      if (error || !data || data.length === 0) {
        console.log('[Bookings] No appointments found:', error?.message);
        setAppointments([]);
      } else {
        console.log('[Bookings] Loaded', data.length, 'bookings from hallaq');
        const mapped = data.map((row: any) => {
          const shop = row.barbershops ?? {};
          const rawStatus: string = row.status ?? 'pending';
          const mappedStatus: 'upcoming' | 'past' =
            rawStatus === 'pending' || rawStatus === 'confirmed' || rawStatus === 'in_progress'
              ? 'upcoming'
              : 'past';
          return {
            id: row.id,
            venue_id: row.shop_id,
            venue_name: shop.name ?? 'Unknown Venue',
            venue_image: shop.cover_url ?? '',
            start_at: row.start_at,
            date: row.start_at
              ? new Date(row.start_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
                ' at ' +
                new Date(row.start_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              : '',
            price: Number(row.price_bhd ?? row.total_price ?? 0),
            items: 1,
            status: mappedStatus,
            services: [],
          };
        });
        setAppointments(mapped);
      }
    } catch (err) {
      console.log('[Bookings] Exception fetching appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRebook = useCallback((venueId: string, venueName: string) => {
    console.log('[Bookings] Rebook pressed:', venueId, venueName);
    router.push(`/venue/${venueId}`);
  }, [router]);

  const handleViewDetails = useCallback((apptId: string) => {
    console.log('[Bookings] View details pressed for appointment:', apptId);
  }, []);

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
                {upcoming.map((appt) => (
                  <UpcomingCard
                    key={appt.id}
                    appt={appt}
                    onViewDetails={() => handleViewDetails(appt.id)}
                    onRebook={() => handleRebook(appt.venue_id, appt.venue_name)}
                    onCancelled={fetchAppointments}
                  />
                ))}
              </View>
            )}

            {past.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past</Text>
                {past.map((appt, index) => (
                  <AnimatedListItem key={appt.id} index={index}>
                    <PastCard
                      appt={appt}
                      onRebook={() => handleRebook(appt.venue_id, appt.venue_name)}
                    />
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

  // Empty state
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

  // Gift cards
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

  // Memberships
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
