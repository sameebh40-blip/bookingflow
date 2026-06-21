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
import { Bell, Plus, Calendar, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
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
  price_bhd: number;
  customer_name: string;
  customer_profile_id: string | null;
  barber_id: string | null;
  profiles?: { full_name: string; avatar_url: string } | null;
  barbers?: { display_name: string } | null;
}

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
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(-80)).current;

  const revenueDisplay = todayRevenue.toFixed(3);
  const todayCount = useCountUp(todayBookings.length, 800);
  const weekCountDisplay = useCountUp(weekCount, 800);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: -80, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastAnim]);

  const fetchData = useCallback(async () => {
    if (!shopId) return;
    console.log('[PartnerHome] Fetching dashboard data for shop:', shopId);
    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const [bookingsRes, revenueRes, weekRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, status, start_at, price_bhd, customer_name, customer_profile_id, barber_id, profiles!customer_profile_id(full_name, avatar_url), barbers!barber_id(display_name)')
          .eq('shop_id', shopId)
          .gte('start_at', todayStart.toISOString())
          .lte('start_at', todayEnd.toISOString())
          .order('start_at'),
        supabase
          .from('bookings')
          .select('price_bhd')
          .eq('shop_id', shopId)
          .eq('status', 'completed')
          .gte('start_at', todayStart.toISOString()),
        supabase
          .from('bookings')
          .select('id', { count: 'exact' })
          .eq('shop_id', shopId)
          .gte('start_at', weekStart.toISOString()),
      ]);

      console.log('[PartnerHome] Bookings fetched:', bookingsRes.data?.length ?? 0);
      setTodayBookings((bookingsRes.data as Booking[]) ?? []);
      const rev = (revenueRes.data ?? []).reduce((sum: number, b: { price_bhd: number }) => sum + (Number(b.price_bhd) || 0), 0);
      setTodayRevenue(rev);
      setWeekCount(weekRes.count ?? 0);
    } catch (err) {
      console.log('[PartnerHome] fetchData error:', err);
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
      .channel(`partner-home-${shopId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `shop_id=eq.${shopId}` }, (payload) => {
        console.log('[PartnerHome] New booking received:', payload.new);
        const newBooking = payload.new as Booking;
        setTodayBookings(prev => {
          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
          const bookingDate = new Date(newBooking.start_at);
          if (bookingDate >= todayStart && bookingDate <= todayEnd) {
            return [...prev, newBooking].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
          }
          return prev;
        });
        const customerName = newBooking.customer_name ?? 'A client';
        showToast(`New booking from ${customerName}!`);
        playBeep();
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

  if (!shopId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyTitle}>No shop found</Text>
          <Text style={styles.emptySubtitle}>Set up your shop to get started</Text>
          <AnimatedPressable onPress={() => { console.log('[PartnerHome] Setup shop pressed'); router.push('/(partner)/setup'); }}>
            <View style={styles.setupBtn}>
              <Text style={styles.setupBtnText}>Set Up Shop</Text>
            </View>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

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
        <TouchableOpacity style={styles.bellBtn} onPress={() => console.log('[PartnerHome] Bell pressed')}>
          <Bell size={20} color={P.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Stat cards */}
        <View style={styles.statsRow}>
          <StatCard label="Today's Revenue" value={`BHD ${revenueDisplay}`} icon={TrendingUp} color={P.gold} />
          <StatCard label="Today" value={String(todayCount)} icon={Calendar} color={P.accent} />
          <StatCard label="This Week" value={String(weekCountDisplay)} icon={Clock} color={P.success} />
        </View>

        {/* Today's schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={P.accent} />
            </View>
          ) : todayBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={40} color={P.textTertiary} />
              <Text style={styles.emptyStateTitle}>No bookings today</Text>
              <Text style={styles.emptyStateSubtitle}>Enjoy your day!</Text>
            </View>
          ) : (
            todayBookings.map((booking) => {
              const timeText = formatTime(booking.start_at);
              const clientName = booking.profiles?.full_name ?? booking.customer_name ?? 'Walk-in';
              const barberName = booking.barbers?.display_name ?? 'Any';
              const avatarUrl = booking.profiles?.avatar_url;
              const initials = clientName.charAt(0).toUpperCase();
              const priceText = `BHD ${Number(booking.price_bhd).toFixed(3)}`;

              return (
                <AnimatedPressable
                  key={booking.id}
                  onPress={() => {
                    console.log('[PartnerHome] Booking tapped:', booking.id);
                    router.push(`/appointment/${booking.id}` as never);
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
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
  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: P.textSecondary, fontSize: 14 },
  setupBtn: {
    backgroundColor: P.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  setupBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
