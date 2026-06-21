import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  MoreVertical,
  RefreshCw,
  DollarSign,
  Gift,
  Layers,
  CreditCard,
  User,
  MessageSquare,
  Bell,
} from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const P = {
  bg: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#242438',
  border: '#2A2A45',
  accent: '#7C3AED',
  accentLight: 'rgba(124,58,237,0.15)',
  gold: '#C9A84C',
  text: '#F0F0FF',
  textSecondary: '#9090B0',
  textTertiary: '#5A5A7A',
  success: '#4CAF7D',
  danger: '#E85454',
  warning: '#F59E0B',
  divider: '#1E1E35',
};

const HOUR_HEIGHT = 64;
const COL_WIDTH = 130;
const TIME_COL_WIDTH = 52;
const START_HOUR = 6;
const END_HOUR = 22;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SCREEN_W = Dimensions.get('window').width;

interface Booking {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  price_bhd: number;
  customer_name: string;
  customer_profile_id: string | null;
  barber_id: string | null;
  service_id: string | null;
  payment_status?: string;
  payment_method?: string;
  profiles?: { full_name: string; avatar_url: string } | null;
  barbers?: { display_name: string } | null;
  services?: { name: string; duration_minutes: number } | null;
  booking_services?: { service_name_en: string }[] | null;
}

interface BarberChip {
  id: string;
  name: string;
  avatar?: string;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function todayAt(h: number, m: number): string {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const DEMO_CAL_BOOKINGS: Booking[] = [
  { id: 'dc1', start_at: todayAt(8, 20), end_at: todayAt(9, 5), status: 'confirmed', price_bhd: 40, customer_name: 'John Doe', barber_id: 'b1', customer_profile_id: null, service_id: null, profiles: null, barbers: { display_name: 'S2 Khaled' }, booking_services: [{ service_name_en: 'Haircut' }] },
  { id: 'dc2', start_at: todayAt(9, 0), end_at: todayAt(9, 45), status: 'confirmed', price_bhd: 40, customer_name: 'John Doe', barber_id: 'b2', customer_profile_id: null, service_id: null, profiles: null, barbers: { display_name: 'Wendy Smith' }, booking_services: [{ service_name_en: 'Haircut' }] },
  { id: 'dc3', start_at: todayAt(10, 0), end_at: todayAt(10, 35), status: 'confirmed', price_bhd: 30, customer_name: 'Jack Doe', barber_id: 'b1', customer_profile_id: null, service_id: null, profiles: null, barbers: { display_name: 'S2 Khaled' }, booking_services: [{ service_name_en: 'Blow Dry' }] },
];

const DEMO_BARBERS: BarberChip[] = [
  { id: 'b1', name: 'S2 Khaled' },
  { id: 'b2', name: 'Wendy Smith (Demo)' },
];

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const day = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function statusColor(status: string) {
  if (status === 'confirmed') return P.success;
  if (status === 'pending') return P.warning;
  if (status === 'cancelled') return P.danger;
  if (status === 'completed') return P.accent;
  if (status === 'in_progress') return '#4A90E2';
  return P.textSecondary;
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')}${ampm}`;
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

export default function PartnerCalendar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [barbers, setBarbers] = useState<BarberChip[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Detail sheet
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailTab, setDetailTab] = useState<'details' | 'activity'>('details');

  // Payment flow
  const [showPaymentSelect, setShowPaymentSelect] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('');

  // Drag
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(-60)).current;

  // Scroll refs
  const timeScrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const weekDates = getWeekDates(weekOffset);

  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return (n.getHours() - START_HOUR) * 60 + n.getMinutes();
  });

  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNowMinutes((n.getHours() - START_HOUR) * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const nowTop = (nowMinutes / 60) * HOUR_HEIGHT;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: -60, duration: 250, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastAnim]);

  const fetchBarbers = useCallback(async () => {
    if (!shopId) { setBarbers(DEMO_BARBERS); return; }
    try {
      const { data } = await supabase
        .from('barbers')
        .select('id, display_name, avatar_url')
        .eq('shop_id', shopId)
        .eq('status', 'approved')
        .limit(20);
      if (data && data.length > 0) {
        setBarbers(data.map((b: any) => ({ id: b.id, name: b.display_name, avatar: b.avatar_url })));
      } else {
        setBarbers(DEMO_BARBERS);
      }
    } catch {
      setBarbers(DEMO_BARBERS);
    }
  }, [shopId]);

  const fetchBookings = useCallback(async () => {
    if (!shopId) {
      console.log('[Calendar] No shop_id, showing demo bookings');
      setBookings(DEMO_CAL_BOOKINGS);
      setIsDemo(true);
      setLoading(false);
      return;
    }
    const weekStart = weekDates[0];
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);
    console.log('[Calendar] Fetching bookings for week:', weekStart.toDateString());
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, start_at, end_at, status, price_bhd, customer_name, customer_profile_id, barber_id, service_id, payment_status, payment_method, profiles!customer_profile_id(full_name, avatar_url), barbers!barber_id(display_name), services!service_id(name, duration_minutes)')
        .eq('shop_id', shopId)
        .gte('start_at', weekStart.toISOString())
        .lte('start_at', weekEnd.toISOString())
        .order('start_at');
      const fetched = (data as Booking[]) ?? [];
      if (fetched.length === 0) {
        console.log('[Calendar] No bookings, showing demo');
        setBookings(DEMO_CAL_BOOKINGS);
        setIsDemo(true);
      } else {
        setBookings(fetched);
        setIsDemo(false);
      }
      console.log('[Calendar] Bookings loaded:', fetched.length);
    } catch (err) {
      console.log('[Calendar] fetchBookings error:', err);
      setBookings(DEMO_CAL_BOOKINGS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [shopId, weekOffset]);

  useEffect(() => { fetchBarbers(); }, [fetchBarbers]);
  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => {
    if (!shopId) return;
    const channel = supabase
      .channel(`calendar-${shopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `shop_id=eq.${shopId}` }, () => {
        console.log('[Calendar] Real-time update received');
        fetchBookings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shopId, fetchBookings]);

  // Auto-scroll to current time
  useEffect(() => {
    setTimeout(() => {
      const scrollTo = Math.max(0, nowTop - 100);
      timeScrollRef.current?.scrollTo({ y: scrollTo, animated: true });
    }, 600);
  }, []);

  const changeWeek = (dir: number) => {
    console.log('[Calendar] Week changed:', dir > 0 ? 'next' : 'prev');
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: dir * -20, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
    setWeekOffset(prev => prev + dir);
  };

  const dayBookings = bookings.filter(b => {
    const d = new Date(b.start_at);
    return d.toDateString() === selectedDate.toDateString();
  });

  // Columns: if barber selected, show only that barber; else show all
  const visibleBarbers = selectedBarberId
    ? barbers.filter(b => b.id === selectedBarberId)
    : barbers;

  const bookingsForBarber = (barberId: string) =>
    dayBookings.filter(b => b.barber_id === barberId);

  const createDragResponder = (booking: Booking) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        console.log('[Calendar] Drag started for booking:', booking.id);
        setDraggingId(booking.id);
      },
      onPanResponderMove: (_, gs) => {
        setDragOffsets(prev => ({ ...prev, [booking.id]: gs.dy }));
      },
      onPanResponderRelease: async (_, gs) => {
        console.log('[Calendar] Drag released for booking:', booking.id, 'dy:', gs.dy);
        const deltaMinutes = Math.round((gs.dy / HOUR_HEIGHT) * 60 / 15) * 15;
        const newStart = new Date(new Date(booking.start_at).getTime() + deltaMinutes * 60000);
        const newEnd = new Date(new Date(booking.end_at ?? booking.start_at).getTime() + deltaMinutes * 60000);
        if (!booking.id.startsWith('d')) {
          try {
            await supabase.from('bookings').update({
              start_at: newStart.toISOString(),
              end_at: newEnd.toISOString(),
            }).eq('id', booking.id);
            console.log('[Calendar] Booking rescheduled:', booking.id, 'to', newStart.toISOString());
          } catch (err) {
            console.log('[Calendar] Reschedule error:', err);
          }
        }
        setDragOffsets(prev => ({ ...prev, [booking.id]: 0 }));
        setDraggingId(null);
        fetchBookings();
        showToast('Appointment rescheduled');
      },
    });

  const handlePayCash = async () => {
    if (!selectedBooking) return;
    const amount = parseFloat(cashAmount) || 0;
    console.log('[Calendar] Cash payment pressed, amount:', amount, 'booking:', selectedBooking.id);
    if (!selectedBooking.id.startsWith('d')) {
      try {
        await supabase.from('bookings').update({
          payment_status: 'paid',
          payment_method: 'cash',
          status: 'completed',
        }).eq('id', selectedBooking.id);
        console.log('[Calendar] Payment recorded for booking:', selectedBooking.id);
      } catch (err) {
        console.log('[Calendar] Payment error:', err);
      }
    }
    setShowCashModal(false);
    setShowPaymentSelect(false);
    setSelectedBooking(null);
    setCashAmount('');
    fetchBookings();
    showToast('Payment recorded');
  };

  const handleKeypad = (key: string) => {
    if (key === '⌫') {
      setCashAmount(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (!cashAmount.includes('.')) setCashAmount(prev => prev + '.');
    } else {
      setCashAmount(prev => (prev.length < 8 ? prev + key : prev));
    }
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const totalGridHeight = hours.length * HOUR_HEIGHT;

  const selectedBookingPrice = selectedBooking ? Number(selectedBooking.price_bhd) : 0;
  const selectedBookingPriceStr = selectedBookingPrice.toFixed(3);

  const nowHour = Math.floor(nowMinutes / 60) + START_HOUR;
  const nowMin = nowMinutes % 60;
  const nowLabel = `${nowHour % 12 === 0 ? 12 : nowHour % 12}:${String(nowMin).padStart(2, '0')}`;

  const selectedDateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  // Booking dots per day
  const bookingDotsForDay = (date: Date) => {
    return bookings.filter(b => new Date(b.start_at).toDateString() === date.toDateString());
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Toast */}
      {toast !== null && (
        <Animated.View style={[styles.toast, { top: insets.top + 8, transform: [{ translateY: toastAnim }] }]}>
          <Check size={14} color="#fff" />
          <Text style={styles.toastText}>{toast}</Text>
          <TouchableOpacity onPress={() => setToast(null)}>
            <X size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.headerArrow}>
            <ChevronLeft size={20} color={P.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerDateBtn}>
            <Text style={styles.headerDateText}>{selectedDateLabel}</Text>
            <ChevronRight size={14} color={P.textSecondary} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeWeek(1)} style={styles.headerArrow}>
            <ChevronRight size={20} color={P.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          {isDemo && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>Demo</Text>
            </View>
          )}
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => console.log('[Calendar] Messages pressed')}>
            <MessageSquare size={18} color={P.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => console.log('[Calendar] Notifications pressed')}>
            <Bell size={18} color={P.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              console.log('[Calendar] New booking button pressed');
              router.push('/(partner)/new-booking' as never);
            }}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{profile?.full_name?.charAt(0) ?? 'S'}</Text>
          </View>
        </View>
      </View>

      {/* Barber column headers (scrollable chips) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.barberChipsContent}
        style={styles.barberChipsScroll}
      >
        <TouchableOpacity
          style={[styles.barberChip, !selectedBarberId && styles.barberChipActive]}
          onPress={() => { console.log('[Calendar] Barber filter: All'); setSelectedBarberId(null); }}
        >
          <Text style={[styles.barberChipText, !selectedBarberId && styles.barberChipTextActive]}>All</Text>
        </TouchableOpacity>
        {barbers.map(b => (
          <TouchableOpacity
            key={b.id}
            style={[styles.barberChip, selectedBarberId === b.id && styles.barberChipActive]}
            onPress={() => { console.log('[Calendar] Barber filter:', b.name); setSelectedBarberId(b.id); }}
          >
            {b.avatar ? (
              <Image source={resolveImageSource(b.avatar)} style={styles.barberChipAvatar} />
            ) : (
              <View style={styles.barberChipAvatarPlaceholder}>
                <Text style={styles.barberChipAvatarText}>{b.name.charAt(0)}</Text>
              </View>
            )}
            <Text style={[styles.barberChipText, selectedBarberId === b.id && styles.barberChipTextActive]}>{b.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Week strip */}
      <View style={styles.weekNav}>
        <Animated.View style={[styles.weekStrip, { transform: [{ translateX: slideAnim }] }]}>
          {weekDates.map((date, i) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            const dots = bookingDotsForDay(date).slice(0, 3);
            return (
              <TouchableOpacity
                key={i}
                style={styles.dayItem}
                onPress={() => {
                  console.log('[Calendar] Day selected:', date.toDateString());
                  setSelectedDate(date);
                }}
              >
                <Text style={[styles.dayLetter, isSelected && styles.dayLetterActive]}>
                  {DAY_LABELS[date.getDay()]}
                </Text>
                <View style={[styles.dayCircle, isSelected && styles.dayCircleActive, isToday && !isSelected && styles.dayCircleToday]}>
                  <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>
                    {date.getDate()}
                  </Text>
                </View>
                <View style={styles.dayDots}>
                  {dots.map((b, di) => (
                    <View key={di} style={[styles.dayDot, { backgroundColor: statusColor(b.status) }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>

      {/* Time grid */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={P.accent} />
        </View>
      ) : (
        <ScrollView ref={timeScrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {/* Fixed time column */}
            <View style={[styles.timeCol, { height: totalGridHeight }]}>
              {hours.map(h => (
                <View key={h} style={styles.hourLabelWrap}>
                  <Text style={styles.hourText}>{formatHour(h)}</Text>
                </View>
              ))}
            </View>

            {/* Horizontal scroll for barber columns */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row' }}>
                {visibleBarbers.map((barber, colIdx) => {
                  const colBookings = bookingsForBarber(barber.id);
                  return (
                    <View key={barber.id} style={[styles.barberCol, { width: COL_WIDTH }]}>
                      {/* Barber header */}
                      <View style={styles.barberColHeader}>
                        {barber.avatar ? (
                          <Image source={resolveImageSource(barber.avatar)} style={styles.barberColAvatar} />
                        ) : (
                          <View style={styles.barberColAvatarPlaceholder}>
                            <Text style={styles.barberColAvatarText}>{barber.name.charAt(0)}</Text>
                          </View>
                        )}
                        <Text style={styles.barberColName} numberOfLines={1}>{barber.name}</Text>
                      </View>

                      {/* Grid lines */}
                      <View style={{ position: 'relative', height: totalGridHeight }}>
                        {hours.map(h => (
                          <TouchableOpacity
                            key={h}
                            style={[styles.hourLine, { borderLeftWidth: colIdx === 0 ? 0 : 0 }]}
                            onPress={() => {
                              const dateStr = selectedDate.toISOString().split('T')[0];
                              const timeStr = `${String(h).padStart(2, '0')}:00`;
                              console.log('[Calendar] Empty slot tapped, barber:', barber.id, 'date:', dateStr, 'time:', timeStr);
                              router.push(`/(partner)/new-booking?date=${dateStr}&time=${timeStr}&barberId=${barber.id}` as never);
                            }}
                            activeOpacity={0.4}
                          />
                        ))}

                        {/* Now line */}
                        {nowTop >= 0 && nowTop <= totalGridHeight && (
                          <View style={[styles.nowLine, { top: nowTop }]}>
                            {colIdx === 0 && (
                              <View style={styles.nowLabelPill}>
                                <Text style={styles.nowLabelText}>{nowLabel}</Text>
                              </View>
                            )}
                          </View>
                        )}

                        {/* Booking blocks */}
                        {colBookings.map(booking => {
                          const start = new Date(booking.start_at);
                          const end = booking.end_at ? new Date(booking.end_at) : new Date(start.getTime() + 30 * 60000);
                          const startMins = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
                          const endMins = (end.getHours() - START_HOUR) * 60 + end.getMinutes();
                          const baseTop = (startMins / 60) * HOUR_HEIGHT;
                          const height = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 32);
                          const dragOffset = dragOffsets[booking.id] ?? 0;
                          const top = baseTop + dragOffset;
                          const isDragging = draggingId === booking.id;

                          const clientName = booking.profiles?.full_name ?? booking.customer_name ?? 'Walk-in';
                          const serviceName = booking.booking_services?.[0]?.service_name_en ?? booking.services?.name ?? 'Service';
                          const startLabel = formatTime(start);
                          const endLabel = formatTime(end);

                          const panResponder = createDragResponder(booking);

                          return (
                            <Animated.View
                              key={booking.id}
                              {...panResponder.panHandlers}
                              style={[
                                styles.bookingBlock,
                                {
                                  top,
                                  height,
                                  backgroundColor: isDragging ? P.accentLight : 'rgba(100,160,255,0.18)',
                                  borderLeftColor: isDragging ? P.accent : '#5BA4F5',
                                  opacity: isDragging ? 0.85 : 1,
                                  zIndex: isDragging ? 100 : 1,
                                },
                              ]}
                            >
                              <TouchableOpacity
                                style={{ flex: 1 }}
                                onPress={() => {
                                  if (!isDragging) {
                                    console.log('[Calendar] Booking block tapped:', booking.id);
                                    setSelectedBooking(booking);
                                    setDetailTab('details');
                                  }
                                }}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.blockTime} numberOfLines={1}>{startLabel} - {endLabel}</Text>
                                <Text style={styles.blockClient} numberOfLines={1}>{clientName}</Text>
                                <Text style={styles.blockService} numberOfLines={1}>{serviceName}</Text>
                              </TouchableOpacity>
                            </Animated.View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => {
          console.log('[Calendar] FAB pressed');
          router.push('/(partner)/new-booking' as never);
        }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* ── Booking Detail Sheet ── */}
      <Modal visible={!!selectedBooking} transparent animationType="slide" onRequestClose={() => setSelectedBooking(null)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />

            {/* Sale header */}
            <View style={styles.saleHeader}>
              <TouchableOpacity onPress={() => setSelectedBooking(null)} style={styles.saleBackBtn}>
                <ChevronLeft size={20} color={P.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.saleTitle}>Sale</Text>
                <Text style={styles.saleSubtitle}>
                  {selectedBooking ? new Date(selectedBooking.start_at).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''} • H1
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBooking(null)}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Status row */}
            <View style={styles.statusRow}>
              <View style={styles.confirmedBadge}>
                <Check size={12} color="#fff" />
                <Text style={styles.confirmedBadgeText}>
                  {selectedBooking?.status === 'completed' ? 'Completed' : 'Confirmed'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.rebookBtn}
                onPress={() => {
                  console.log('[Calendar] Rebook pressed for booking:', selectedBooking?.id);
                  setSelectedBooking(null);
                  router.push('/(partner)/new-booking' as never);
                }}
              >
                <Text style={styles.rebookBtnText}>Rebook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreBtn} onPress={() => console.log('[Calendar] More options pressed')}>
                <MoreVertical size={18} color={P.text} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, detailTab === 'details' && styles.tabActive]}
                onPress={() => { console.log('[Calendar] Detail tab: details'); setDetailTab('details'); }}
              >
                <Text style={[styles.tabText, detailTab === 'details' && styles.tabTextActive]}>Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, detailTab === 'activity' && styles.tabActive]}
                onPress={() => { console.log('[Calendar] Detail tab: activity'); setDetailTab('activity'); }}
              >
                <Text style={[styles.tabText, detailTab === 'activity' && styles.tabTextActive]}>Activity</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {detailTab === 'details' && selectedBooking && (
                <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
                  {/* Walk-in row */}
                  <View style={styles.walkInRow}>
                    <Text style={styles.walkInText}>
                      {selectedBooking.profiles?.full_name ?? selectedBooking.customer_name ?? 'Walk-In'}
                    </Text>
                    <View style={styles.walkInIcon}>
                      <User size={18} color={P.accent} />
                    </View>
                  </View>

                  {/* Sale card */}
                  <View style={styles.saleCard}>
                    <Text style={styles.saleCardTitle}>Sale #1</Text>
                    <Text style={styles.saleCardDate}>
                      {new Date(selectedBooking.start_at).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>

                    {/* Service row */}
                    <View style={styles.saleServiceRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.saleServiceName}>
                          {selectedBooking.booking_services?.[0]?.service_name_en ?? selectedBooking.services?.name ?? 'Service'}
                        </Text>
                        <Text style={styles.saleServiceMeta}>
                          {formatTime(new Date(selectedBooking.start_at))} · {selectedBooking.services?.duration_minutes ?? 45}min · {selectedBooking.barbers?.display_name ?? 'Barber'}
                        </Text>
                      </View>
                      <Text style={styles.saleServicePrice}>BHD {selectedBookingPriceStr}</Text>
                    </View>

                    <View style={styles.saleDivider} />

                    <View style={styles.saleTotalRow}>
                      <Text style={styles.saleTotalLabel}>Subtotal</Text>
                      <Text style={styles.saleTotalValue}>BHD {selectedBookingPriceStr}</Text>
                    </View>
                    <View style={styles.saleTotalRow}>
                      <Text style={[styles.saleTotalLabel, { fontWeight: '700', color: P.text }]}>Total</Text>
                      <Text style={[styles.saleTotalValue, { fontWeight: '700', color: P.text }]}>BHD {selectedBookingPriceStr}</Text>
                    </View>

                    {selectedBooking.payment_status === 'paid' && (
                      <View style={[styles.saleTotalRow, { marginTop: 8 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <DollarSign size={14} color={P.success} />
                          <Text style={styles.saleTotalLabel}>
                            {selectedBooking.payment_method === 'cash' ? 'Cash' : 'Payment'}
                          </Text>
                        </View>
                        <Text style={[styles.saleTotalValue, { color: P.success }]}>BHD {selectedBookingPriceStr}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {detailTab === 'activity' && selectedBooking && (
                <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 0 }}>
                  <Text style={styles.activityMonthLabel}>
                    {new Date(selectedBooking.start_at).toLocaleDateString('en-US', { month: 'long' })}
                  </Text>

                  <View style={styles.activityItem}>
                    <View style={styles.activityDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle}>Sale 1 created</Text>
                      <Text style={styles.activitySub}>
                        Today at {formatTime(new Date(selectedBooking.start_at))}
                      </Text>
                      <Text style={styles.activitySub}>
                        Completed by {selectedBooking.barbers?.display_name ?? 'Staff'}
                      </Text>
                    </View>
                    <View style={styles.activityAvatar}>
                      <Text style={styles.activityAvatarText}>
                        {(selectedBooking.barbers?.display_name ?? 'S').charAt(0)}
                      </Text>
                    </View>
                  </View>

                  {selectedBooking.payment_status === 'paid' && (
                    <View style={styles.activityItem}>
                      <View style={[styles.activityDot, { backgroundColor: P.success }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activityTitle}>BHD {selectedBookingPriceStr} paid by cash</Text>
                        <Text style={styles.activitySub}>
                          Today at {formatTime(new Date(selectedBooking.start_at))}
                        </Text>
                        <Text style={styles.activitySub}>
                          Payment taken by {selectedBooking.barbers?.display_name ?? 'Staff'}
                        </Text>
                      </View>
                      <View style={[styles.activityAvatar, { backgroundColor: P.success + '22' }]}>
                        <DollarSign size={14} color={P.success} />
                      </View>
                    </View>
                  )}

                  <TouchableOpacity style={styles.actionsBtn} onPress={() => console.log('[Calendar] Activity actions pressed')}>
                    <Text style={styles.actionsBtnText}>Actions</Text>
                    <ChevronRight size={14} color={P.textSecondary} />
                  </TouchableOpacity>

                  <Text style={styles.activityFooter}>Activity for this sale in the last 90 days</Text>
                </View>
              )}
            </ScrollView>

            {/* Sheet footer */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={() => {
                  console.log('[Calendar] Checkout pressed for booking:', selectedBooking?.id);
                  setCashAmount(selectedBookingPriceStr);
                  setShowPaymentSelect(true);
                }}
              >
                <Text style={styles.checkoutBtnText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Payment Select Modal ── */}
      <Modal visible={showPaymentSelect} transparent animationType="slide" onRequestClose={() => setShowPaymentSelect(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.paymentHeader}>
              <TouchableOpacity onPress={() => setShowPaymentSelect(false)} style={styles.saleBackBtn}>
                <ChevronLeft size={20} color={P.text} />
              </TouchableOpacity>
              <Text style={styles.paymentTitle}>Select payment</Text>
              <TouchableOpacity onPress={() => { setShowPaymentSelect(false); setSelectedBooking(null); }}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentGrid}>
              {[
                { icon: <DollarSign size={28} color={P.success} />, label: 'Cash', onPress: () => { console.log('[Calendar] Cash payment selected'); setShowCashModal(true); } },
                { icon: <Gift size={28} color={P.accent} />, label: 'Gift card', onPress: () => console.log('[Calendar] Gift card selected') },
                { icon: <Layers size={28} color={P.warning} />, label: 'Split payment', onPress: () => console.log('[Calendar] Split payment selected') },
                { icon: <CreditCard size={28} color={P.textSecondary} />, label: 'Other', onPress: () => console.log('[Calendar] Other payment selected') },
              ].map((opt, i) => (
                <TouchableOpacity key={i} style={styles.paymentOption} onPress={opt.onPress}>
                  {opt.icon}
                  <Text style={styles.paymentOptionLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.paymentFooterRow}>
              <View>
                <Text style={styles.paymentFooterLabel}>Total</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.paymentFooterSub}>To pay</Text>
                  <ChevronRight size={12} color={P.textSecondary} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.paymentFooterAmount}>BHD {selectedBookingPriceStr}</Text>
                <Text style={styles.paymentFooterAmount}>BHD {selectedBookingPriceStr}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.saveUnpaidBtn} onPress={() => { console.log('[Calendar] Save unpaid pressed'); setShowPaymentSelect(false); setSelectedBooking(null); }}>
              <Text style={styles.saveUnpaidText}>Save unpaid</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Cash Amount Modal ── */}
      <Modal visible={showCashModal} transparent animationType="slide" onRequestClose={() => setShowCashModal(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.cashHeader}>
              <View style={{ width: 32 }} />
              <Text style={styles.cashTitle}>Add cash amount</Text>
              <TouchableOpacity onPress={() => setShowCashModal(false)}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Amount display */}
            <View style={styles.cashAmountRow}>
              <Text style={styles.cashCurrency}>BHD</Text>
              <Text style={styles.cashAmount}>{cashAmount || '0'}</Text>
              <View style={styles.cashCursor} />
            </View>

            {/* Quick chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cashChips}>
              {['40', '45', '50', '55'].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.cashChip, cashAmount === v && styles.cashChipActive]}
                  onPress={() => { console.log('[Calendar] Quick amount chip pressed:', v); setCashAmount(v); }}
                >
                  <Text style={[styles.cashChipText, cashAmount === v && styles.cashChipTextActive]}>BHD {v}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Keypad */}
            <View style={styles.keypad}>
              {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
                <TouchableOpacity
                  key={k}
                  style={styles.keypadBtn}
                  onPress={() => { console.log('[Calendar] Keypad pressed:', k); handleKeypad(k); }}
                >
                  <Text style={styles.keypadBtnText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Footer */}
            <View style={styles.cashFooterRow}>
              <View>
                <Text style={styles.cashFooterLabel}>
                  Cash received by • <Text style={{ color: P.accent }}>{selectedBooking?.barbers?.display_name ?? 'Staff'}</Text>
                </Text>
                <Text style={styles.cashFooterSub}>
                  Left to pay • BHD {Math.max(0, selectedBookingPrice - (parseFloat(cashAmount) || 0)).toFixed(3)}
                </Text>
              </View>
              <TouchableOpacity style={styles.cashAddBtn} onPress={handlePayCash}>
                <Text style={styles.cashAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },

  // Toast
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20,20,40,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerArrow: { padding: 6 },
  headerDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  headerDateText: { color: P.text, fontSize: 16, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: { padding: 6 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.accent },
  avatarText: { color: P.accent, fontSize: 13, fontWeight: '700' },
  demoBadge: { backgroundColor: P.surfaceElevated, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: P.border },
  demoBadgeText: { color: P.textTertiary, fontSize: 10, fontWeight: '600' },

  // Barber chips
  barberChipsScroll: { maxHeight: 50, marginBottom: 2 },
  barberChipsContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  barberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: P.surface, borderWidth: 1, borderColor: P.border },
  barberChipActive: { backgroundColor: P.accentLight, borderColor: P.accent },
  barberChipText: { color: P.textSecondary, fontSize: 12, fontWeight: '500' },
  barberChipTextActive: { color: P.accent, fontWeight: '600' },
  barberChipAvatar: { width: 20, height: 20, borderRadius: 10 },
  barberChipAvatarPlaceholder: { width: 20, height: 20, borderRadius: 10, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  barberChipAvatarText: { color: P.accent, fontSize: 9, fontWeight: '700' },

  // Week strip
  weekNav: { paddingHorizontal: 12, marginBottom: 4 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-around' },
  dayItem: { alignItems: 'center', gap: 2 },
  dayLetter: { color: P.textSecondary, fontSize: 10, fontWeight: '600' },
  dayLetterActive: { color: P.accent },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayCircleActive: { backgroundColor: P.accent },
  dayCircleToday: { borderWidth: 1, borderColor: P.accent },
  dayNum: { color: P.text, fontSize: 13, fontWeight: '600' },
  dayNumActive: { color: '#fff' },
  dayDots: { flexDirection: 'row', gap: 2, height: 6, alignItems: 'center' },
  dayDot: { width: 4, height: 4, borderRadius: 2 },

  // Grid
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timeCol: { width: TIME_COL_WIDTH, paddingTop: 44 },
  hourLabelWrap: { height: HOUR_HEIGHT, justifyContent: 'flex-start', paddingTop: 4, paddingLeft: 8 },
  hourText: { color: P.textTertiary, fontSize: 10 },

  // Barber columns
  barberCol: { borderLeftWidth: 1, borderLeftColor: P.divider },
  barberColHeader: { height: 44, alignItems: 'center', justifyContent: 'center', gap: 4, borderBottomWidth: 1, borderBottomColor: P.divider, paddingHorizontal: 4 },
  barberColAvatar: { width: 24, height: 24, borderRadius: 12 },
  barberColAvatarPlaceholder: { width: 24, height: 24, borderRadius: 12, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  barberColAvatarText: { color: P.accent, fontSize: 10, fontWeight: '700' },
  barberColName: { color: P.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' },

  hourLine: { height: HOUR_HEIGHT, borderTopWidth: 1, borderTopColor: P.divider },

  // Now line
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: P.danger, zIndex: 10 },
  nowLabelPill: { position: 'absolute', left: -TIME_COL_WIDTH + 4, top: -10, backgroundColor: P.danger, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  nowLabelText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Booking block
  bookingBlock: {
    position: 'absolute',
    left: 3,
    right: 3,
    borderRadius: 6,
    borderLeftWidth: 3,
    padding: 5,
    overflow: 'hidden',
  },
  blockTime: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '600' },
  blockClient: { color: P.text, fontSize: 11, fontWeight: '700', marginTop: 1 },
  blockService: { color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 1 },

  // FAB
  fab: { position: 'absolute', right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: P.accent, shadowOpacity: 0.4, shadowRadius: 12 },

  // Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: P.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: P.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },

  // Sale header
  saleHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  saleBackBtn: { padding: 4, marginRight: 8 },
  saleTitle: { color: P.text, fontSize: 22, fontWeight: '700' },
  saleSubtitle: { color: P.textSecondary, fontSize: 13, marginTop: 2 },

  // Status row
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: P.success, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  confirmedBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rebookBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: P.border },
  rebookBtnText: { color: P.text, fontSize: 13, fontWeight: '600' },
  moreBtn: { padding: 6 },

  // Tabs
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: P.divider, marginHorizontal: 20 },
  tab: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 24 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: P.text },
  tabText: { color: P.textSecondary, fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: P.text },

  // Walk-in row
  walkInRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: P.surfaceElevated, borderRadius: 12, padding: 16 },
  walkInText: { color: P.text, fontSize: 15, fontWeight: '600' },
  walkInIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },

  // Sale card
  saleCard: { backgroundColor: P.surfaceElevated, borderRadius: 12, padding: 16 },
  saleCardTitle: { color: P.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  saleCardDate: { color: P.textSecondary, fontSize: 12, marginBottom: 12 },
  saleServiceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  saleServiceName: { color: P.text, fontSize: 14, fontWeight: '600' },
  saleServiceMeta: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  saleServicePrice: { color: P.text, fontSize: 14, fontWeight: '700' },
  saleDivider: { height: 1, backgroundColor: P.divider, marginVertical: 12 },
  saleTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  saleTotalLabel: { color: P.textSecondary, fontSize: 14 },
  saleTotalValue: { color: P.textSecondary, fontSize: 14 },

  // Activity
  activityMonthLabel: { color: P.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 12 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  activityDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: P.accent, marginTop: 4 },
  activityTitle: { color: P.text, fontSize: 14, fontWeight: '600' },
  activitySub: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  activityAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  activityAvatarText: { color: P.accent, fontSize: 13, fontWeight: '700' },
  actionsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: P.surfaceElevated, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16 },
  actionsBtnText: { color: P.text, fontSize: 13, fontWeight: '600' },
  activityFooter: { color: P.textTertiary, fontSize: 12, textAlign: 'center', paddingBottom: 8 },

  // Sheet footer
  sheetFooter: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.divider },
  checkoutBtn: { backgroundColor: P.text, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  checkoutBtnText: { color: P.bg, fontSize: 16, fontWeight: '700' },

  // Payment select
  paymentHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  paymentTitle: { flex: 1, color: P.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  paymentOption: { width: (SCREEN_W - 52) / 2, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 24, borderRadius: 14, borderWidth: 1, borderColor: P.border, backgroundColor: P.surfaceElevated },
  paymentOptionLabel: { color: P.text, fontSize: 14, fontWeight: '600' },
  paymentFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: P.divider },
  paymentFooterLabel: { color: P.text, fontSize: 14, fontWeight: '600' },
  paymentFooterSub: { color: P.textSecondary, fontSize: 13 },
  paymentFooterAmount: { color: P.text, fontSize: 14, fontWeight: '700' },
  saveUnpaidBtn: { marginHorizontal: 20, marginTop: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: P.border, alignItems: 'center' },
  saveUnpaidText: { color: P.text, fontSize: 15, fontWeight: '600' },

  // Cash modal
  cashHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  cashTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  cashAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  cashCurrency: { color: P.text, fontSize: 28, fontWeight: '700' },
  cashAmount: { color: P.text, fontSize: 40, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  cashCursor: { width: 2, height: 40, backgroundColor: P.accent },
  cashChips: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  cashChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: P.border, backgroundColor: P.surfaceElevated },
  cashChipActive: { borderColor: P.accent, backgroundColor: P.accentLight },
  cashChipText: { color: P.textSecondary, fontSize: 13, fontWeight: '600' },
  cashChipTextActive: { color: P.accent },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 0 },
  keypadBtn: { width: '33.33%', height: 56, alignItems: 'center', justifyContent: 'center' },
  keypadBtnText: { color: P.text, fontSize: 22, fontWeight: '500' },
  cashFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.divider },
  cashFooterLabel: { color: P.textSecondary, fontSize: 13 },
  cashFooterSub: { color: P.textSecondary, fontSize: 13, marginTop: 2 },
  cashAddBtn: { backgroundColor: P.text, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  cashAddBtnText: { color: P.bg, fontSize: 15, fontWeight: '700' },
});
