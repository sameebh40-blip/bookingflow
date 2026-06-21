import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle, Plus, Calendar, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';

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

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface Booking {
  id: string;
  start_at: string;
  status: string;
  total_price?: number;
  price_bhd?: number;
  customer_name: string;
  customer_profile_id: string | null;
  barber_id: string | null;
}

const DEMO_BOOKINGS: Booking[] = [
  { id: 'd1', start_at: new Date(Date.now() - 2 * 3600000).toISOString(), status: 'confirmed', price_bhd: 5, customer_name: 'Ahmed Al-Mansoori', barber_id: null, customer_profile_id: null },
  { id: 'd2', start_at: new Date(Date.now() + 1 * 3600000).toISOString(), status: 'pending', price_bhd: 8, customer_name: 'Khalid Hassan', barber_id: null, customer_profile_id: null },
  { id: 'd3', start_at: new Date(Date.now() + 3 * 3600000).toISOString(), status: 'confirmed', price_bhd: 12, customer_name: 'Sara Al-Zahra', barber_id: null, customer_profile_id: null },
];
const DEMO_REVENUE = 25;
const DEMO_WEEK_COUNT = 14;

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={[styles.statCard, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
    confirmed: { color: P.success, bg: P.success + '22', label: 'Confirmed', icon: CheckCircle },
    pending: { color: P.warning, bg: P.warning + '22', label: 'Pending', icon: AlertCircle },
    completed: { color: P.accent, bg: P.accentLight, label: 'Done', icon: CheckCircle },
    cancelled: { color: P.danger, bg: P.danger + '22', label: 'Cancelled', icon: XCircle },
  };
  const cfg = config[status] ?? config.pending;
  const Icon = cfg.icon;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Icon size={10} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

export default function PartnerHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [loading, setLoading] = useState(true);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(-80)).current;

  const displayBookings = isDemo ? DEMO_BOOKINGS : todayBookings;
  const displayRevenue = isDemo ? DEMO_REVENUE : todayRevenue;
  const displayWeekCount = isDemo ? DEMO_WEEK_COUNT : weekCount;

  const revenueDisplay = Number(displayRevenue).toFixed(3);
  const todayCount = useCountUp(displayBookings.length, 800);
  const weekCountDisplay = useCountUp(displayWeekCount, 800);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: -80, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastAnim]);

  const fetchData = useCallback(async () => {
    if (!shopId) {
      // No shop_id — show demo data
      console.log('[PartnerHome] No shop_id, showing demo data');
      setIsDemo(true);
      setLoading(false);
      return;
    }
    console.log('[PartnerHome] Fetching dashboard data for shop:', shopId);
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const [bookingsRes, revenueRes, weekRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, status, start_at, total_price, price_bhd, customer_name, customer_profile_id, barber_id')
          .eq('shop_id', shopId)
          .gte('start_at', todayStart.toISOString())
          .lte('start_at', todayEnd.toISOString())
          .order('start_at'),
        supabase
          .from('bookings')
          .select('total_price, price_bhd')
          .eq('shop_id', shopId)
          .eq('status', 'completed')
          .gte('start_at', todayStart.toISOString()),
        supabase
          .from('bookings')
          .select('id', { count: 'exact' })
          .eq('shop_id', shopId)
          .gte('start_at', weekStart.toISOString()),
      ]);

      const fetchedBookings = (bookingsRes.data as Booking[]) ?? [];
      const rev = (revenueRes.data ?? []).reduce((sum: number, b: { total_price?: number; price_bhd?: number }) => {
        const price = Number(b.total_price ?? b.price_bhd ?? 0);
        return sum + price;
      }, 0);
      const wCount = weekRes.count ?? 0;

      console.log('[PartnerHome] Bookings fetched:', fetchedBookings.length, 'revenue:', rev, 'week:', wCount);

      const useDemo = fetchedBookings.length === 0;
      setIsDemo(useDemo);
      setTodayBookings(fetchedBookings);
      setTodayRevenue(rev);
      setWeekCount(wCount);
    } catch (err) {
      console.log('[PartnerHome] fetchData error:', err);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscription
  useEffect(() => {
    if (!shopId) return;
    console.log('[PartnerHome] Setting up real-time subscription for shop:', shopId);
    const channel = supabase
      .channel(`partner-home-${shopId}-${Date.now()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `shop_id=eq.${shopId}` }, () => {
        console.log('[PartnerHome] Booking updated, re-fetching dashboard data');
        fetchData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `shop_id=eq.${shopId}` }, (payload) => {
        console.log('[PartnerHome] New booking received:', payload.new);
        const newBooking = payload.new as Booking;
        setTodayBookings(prev => {
          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
          const bookingDate = new Date(newBooking.start_at);
          if (bookingDate >= todayStart && bookingDate <= todayEnd) {
            const updated = [...prev, newBooking].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
            if (updated.length > 0) setIsDemo(false);
            return updated;
          }
          return prev;
        });
        const customerName = newBooking.customer_name ?? 'A client';
        showToast(`New booking from ${customerName}!`);
        playBeep();
        // Insert a system message so partner can see it in messages
        supabase.from('messages').insert({
          venue_id: shopId,
          sender_id: newBooking.customer_profile_id ?? null,
          client_id: newBooking.customer_profile_id ?? null,
          text: `📅 New booking from ${customerName}! Check your schedule.`,
          is_from_venue: false,
        }).then(({ error: msgErr }) => {
          if (msgErr) console.log('[PartnerHome] Could not insert booking notification message:', msgErr.message);
          else console.log('[PartnerHome] Booking notification message inserted for venue:', shopId);
        });
        // Auto-reply to client
        const clientId = (newBooking as any).customer_profile_id;
        if (clientId && shopId) {
          supabase.from('messages').insert({
            venue_id: shopId,
            sender_id: null,
            client_id: clientId,
            text: `📅 Your booking has been received! We're looking forward to seeing you. If you have any questions, just message us here. See you soon! ✂️`,
            is_from_venue: true,
          }).then(({ error }) => {
            if (error) console.log('[PartnerHome] Auto-reply error:', error.message);
            else console.log('[PartnerHome] Auto-reply sent to client:', clientId);
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, showToast]);

  const playBeep = async () => {
    try {
      const { Audio } = await import('expo-av');
      const { sound } = await Audio.Sound.createAsync({ uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' });
      await sound.playAsync();
      setTimeout(() => sound.unloadAsync(), 5000);
    } catch (err) {
      console.log('[PartnerHome] Sound play failed (non-fatal):', err);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const greetingText = greeting();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Partner';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Toast */}
      {toast && (
        <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greetingText}, {firstName}</Text>
          <Text style={styles.shopSubtitle}>Partner Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => {
            console.log('[PartnerHome] Messages icon pressed');
            router.push('/(partner)/chat' as never);
          }}
        >
          <MessageCircle size={20} color={P.text} />
        </TouchableOpacity>
      </View>

      {isDemo && !shopId ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
          <Text style={{ color: P.gold, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>Setup Required</Text>
          <Text style={{ color: P.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
            Your shop profile is not linked to your account. Complete onboarding to activate your dashboard.
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[PartnerHome] Complete Setup button pressed');
              router.push('/(partner)/ob-essentials' as never);
            }}
            style={{ backgroundColor: P.gold, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
          >
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Complete Setup →</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Stat cards */}
            <View style={styles.statsRow}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>Today's overview</Text>
                {isDemo && (
                  <View style={styles.demoBadge}>
                    <Text style={styles.demoBadgeText}>Demo data</Text>
                  </View>
                )}
              </View>
              <View style={styles.statsCards}>
                <StatCard label="Today's Revenue" value={`BHD ${revenueDisplay}`} icon={TrendingUp} color={P.gold} />
                <StatCard label="Today" value={String(todayCount)} icon={Calendar} color={P.accent} />
                <StatCard label="This Week" value={String(weekCountDisplay)} icon={Clock} color={P.success} />
              </View>
            </View>

            {/* Today's schedule */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={P.accent} />
                </View>
              ) : displayBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Calendar size={40} color={P.textTertiary} />
                  <Text style={styles.emptyStateTitle}>No bookings today</Text>
                  <Text style={styles.emptyStateSubtitle}>Enjoy your day!</Text>
                </View>
              ) : (
                displayBookings.map((booking) => {
                  const timeText = formatTime(booking.start_at);
                  const clientName = booking.customer_name ?? 'Client';
                  const barberName = 'Staff';
                  const avatarUrl = undefined;
                  const initials = clientName.charAt(0).toUpperCase();
                  const priceText = `BHD ${Number(booking.total_price ?? booking.price_bhd ?? 0).toFixed(3)}`;

                  return (
                    <AnimatedPressable
                      key={booking.id}
                      onPress={() => {
                        console.log('[PartnerHome] Booking tapped:', booking.id);
                        if (!booking.id.startsWith('d')) {
                          router.push(`/appointment/${booking.id}` as never);
                        }
                      }}
                    >
                      <View style={styles.bookingRow}>
                        <View style={styles.timePill}>
                          <Text style={styles.timePillText}>{timeText}</Text>
                        </View>
                        {avatarUrl ? (
                          <Image source={resolveImageSource(avatarUrl)} style={styles.clientAvatar} />
                        ) : (
                          <View style={styles.clientAvatarPlaceholder}>
                            <Text style={styles.clientAvatarInitial}>{initials}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.clientName}>{clientName}</Text>
                          <Text style={styles.barberName}>with {barberName}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <StatusBadge status={booking.status} />
                          <Text style={styles.priceText}>{priceText}</Text>
                        </View>
                      </View>
                    </AnimatedPressable>
                  );
                })
              )}
            </View>
          </ScrollView>

          {/* FAB */}
          <TouchableOpacity
            style={[styles.fab, { bottom: insets.bottom + 80 }]}
            onPress={() => {
              console.log('[PartnerHome] FAB pressed — new booking');
              router.push('/(partner)/new-booking' as never);
            }}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: { color: P.text, fontSize: 20, fontWeight: '700' },
  shopSubtitle: { color: P.textSecondary, fontSize: 13, marginTop: 2 },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: P.accentLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: P.accent + '44',
  },
  setupBannerText: { color: P.text, fontSize: 13, fontWeight: '600', flex: 1 },
  statsRow: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsTitle: { color: P.text, fontSize: 16, fontWeight: '700' },
  demoBadge: {
    backgroundColor: P.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: P.border,
  },
  demoBadgeText: { color: P.textTertiary, fontSize: 11, fontWeight: '600' },
  statsCards: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: P.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: P.border,
    gap: 6,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { color: P.text, fontSize: 14, fontWeight: '700' },
  statLabel: { color: P.textSecondary, fontSize: 10 },
  section: { paddingHorizontal: 16 },
  sectionTitle: { color: P.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  loadingWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyStateTitle: { color: P.textSecondary, fontSize: 16, fontWeight: '600' },
  emptyStateSubtitle: { color: P.textTertiary, fontSize: 13 },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: P.border,
  },
  timePill: {
    backgroundColor: P.accentLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  timePillText: { color: P.accent, fontSize: 11, fontWeight: '600' },
  clientAvatar: { width: 36, height: 36, borderRadius: 18 },
  clientAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: P.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarInitial: { color: P.accent, fontSize: 14, fontWeight: '700' },
  clientName: { color: P.text, fontSize: 14, fontWeight: '600' },
  barberName: { color: P.textSecondary, fontSize: 11, marginTop: 2 },
  priceText: { color: P.gold, fontSize: 12, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: P.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: P.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: P.success,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
