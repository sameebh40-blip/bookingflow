import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  CalendarDays,
  Tag,
  Plus,
  Smile,
  Grid3x3,
  Bell,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  MoreHorizontal,
  RefreshCw,
  CreditCard,
  Gift,
  Zap,
  DollarSign,
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
const START_HOUR = 0;
const END_HOUR = 24;
const TIME_COL_WIDTH = 52;
const COL_WIDTH = 110;
const SCREEN_W = Dimensions.get('window').width;

interface Booking {
  id: string;
  start_at: string;
  end_at: string | null;
  status: string;
  customer_name: string;
  barber_id: string | null;
  shop_id: string;
  payment_status?: string;
  payment_method?: string;
  cancel_reason?: string;
  source?: string;
  profiles?: { full_name: string; avatar_url: string } | null;
  barbers?: { display_name: string } | null;
  booking_services?: { service_name_en: string; price_bhd: number; duration_minutes: number }[] | null;
}

interface BarberRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const todayAt = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const DEMO_BOOKINGS: Booking[] = [
  { id: 'dc1', start_at: todayAt(9, 0), end_at: todayAt(9, 45), status: 'confirmed', customer_name: 'Ahmed Al-Mansoori', barber_id: 'b1', shop_id: '', profiles: null, barbers: { display_name: 'Majed' }, booking_services: [{ service_name_en: 'Haircut', price_bhd: 5, duration_minutes: 45 }] },
  { id: 'dc2', start_at: todayAt(10, 0), end_at: todayAt(10, 30), status: 'pending', customer_name: 'Khalid Hassan', barber_id: 'b2', shop_id: '', profiles: null, barbers: { display_name: 'Omar' }, booking_services: [{ service_name_en: 'Beard Trim', price_bhd: 3, duration_minutes: 30 }] },
  { id: 'dc3', start_at: todayAt(14, 0), end_at: todayAt(15, 0), status: 'confirmed', customer_name: 'Sara Al-Zahra', barber_id: 'b1', shop_id: '', profiles: null, barbers: { display_name: 'Majed' }, booking_services: [{ service_name_en: 'Color & Highlights', price_bhd: 12, duration_minutes: 60 }] },
  { id: 'dc4', start_at: todayAt(11, 30), end_at: todayAt(12, 15), status: 'in_progress', customer_name: 'Yusuf Al-Rashid', barber_id: 'b2', shop_id: '', profiles: null, barbers: { display_name: 'Omar' }, booking_services: [{ service_name_en: 'Haircut + Beard', price_bhd: 8, duration_minutes: 45 }] },
];

const DEMO_BARBERS: BarberRow[] = [
  { id: 'b1', display_name: 'Majed', avatar_url: null },
  { id: 'b2', display_name: 'Omar', avatar_url: null },
];

function statusColor(status: string) {
  if (status === 'confirmed') return P.success;
  if (status === 'pending') return P.warning;
  if (status === 'cancelled') return P.danger;
  if (status === 'in_progress') return P.accent;
  if (status === 'completed') return P.gold;
  return P.textSecondary;
}

function statusLabel(status: string) {
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'pending') return 'Pending';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  return status;
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function getMonthDays(date: Date): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const result: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) result.push(null);
  for (let d = 1; d <= last.getDate(); d++) result.push(new Date(year, month, d));
  return result;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function PartnerCalendar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [calView, setCalView] = useState<'day' | '3day' | 'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Sheets
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailTab, setDetailTab] = useState<'details' | 'activity'>('details');
  const [showViewSwitcher, setShowViewSwitcher] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthPickerDate, setMonthPickerDate] = useState(new Date());

  // Payment flow
  const [showPaymentSelect, setShowPaymentSelect] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('');

  // Drag
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(-60)).current;

  // Scroll refs
  const timeScrollRef = useRef<ScrollView>(null);

  // Current time
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const nowTop = (nowMinutes / 60) * HOUR_HEIGHT;
  const nowHour = Math.floor(nowMinutes / 60);
  const nowMin = nowMinutes % 60;
  const nowAmPm = nowHour >= 12 ? 'PM' : 'AM';
  const nowH12 = nowHour % 12 === 0 ? 12 : nowHour % 12;
  const nowLabel = `${nowH12}:${String(nowMin).padStart(2, '0')} ${nowAmPm}`;

  const totalGridHeight = END_HOUR * HOUR_HEIGHT;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  const showToastMsg = useCallback((msg: string) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: -60, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastAnim]);

  const fetchBarbers = useCallback(async () => {
    if (!shopId) { setBarbers(DEMO_BARBERS); return; }
    console.log('[Calendar] Fetching barbers for shop:', shopId);
    try {
      const { data } = await supabase
        .from('barbers')
        .select('id, display_name, avatar_url')
        .eq('shop_id', shopId)
        .eq('status', 'approved')
        .limit(20);
      if (data && data.length > 0) {
        setBarbers(data as BarberRow[]);
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
      setBookings(DEMO_BOOKINGS);
      setIsDemo(true);
      setLoading(false);
      return;
    }
    // Fetch a wide range (current month ± 1)
    const rangeStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
    const rangeEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 2, 0, 23, 59, 59);
    console.log('[Calendar] Fetching bookings range:', rangeStart.toDateString(), '-', rangeEnd.toDateString());
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, start_at, end_at, status, customer_name, barber_id, shop_id, payment_status, payment_method, cancel_reason, source, profiles!customer_profile_id(full_name, avatar_url), barbers!barber_id(display_name), booking_services(service_name_en, price_bhd, duration_minutes)')
        .eq('shop_id', shopId)
        .gte('start_at', rangeStart.toISOString())
        .lte('start_at', rangeEnd.toISOString())
        .order('start_at');
      const fetched = (data as Booking[]) ?? [];
      if (fetched.length === 0) {
        console.log('[Calendar] No bookings found, showing demo');
        setBookings(DEMO_BOOKINGS);
        setIsDemo(true);
      } else {
        console.log('[Calendar] Bookings loaded:', fetched.length);
        setBookings(fetched);
        setIsDemo(false);
      }
    } catch (err) {
      console.log('[Calendar] fetchBookings error:', err);
      setBookings(DEMO_BOOKINGS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [shopId, selectedDate]);

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

  // Auto-scroll to current time on mount
  useEffect(() => {
    setTimeout(() => {
      timeScrollRef.current?.scrollTo({ y: Math.max(0, nowTop - 120), animated: true });
    }, 600);
  }, []);

  // ── Drag responder ──
  const createDragResponder = (b: Booking) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 8,
      onPanResponderMove: (_, gs) => setDragOffsets(p => ({ ...p, [b.id]: gs.dy })),
      onPanResponderRelease: (_, gs) => {
        const dm = Math.round((gs.dy / HOUR_HEIGHT) * 60 / 15) * 15;
        if (Math.abs(dm) >= 15 && !b.id.startsWith('d')) {
          const ns = new Date(new Date(b.start_at).getTime() + dm * 60000);
          const ne = new Date(new Date(b.end_at ?? b.start_at).getTime() + dm * 60000);
          console.log('[Calendar] Drag reschedule booking:', b.id, 'delta minutes:', dm);
          supabase.from('bookings').update({ start_at: ns.toISOString(), end_at: ne.toISOString() }).eq('id', b.id).then(() => fetchBookings());
          showToastMsg('Appointment rescheduled');
        }
        setDragOffsets(p => { const n = { ...p }; delete n[b.id]; return n; });
      },
    });

  // ── Payment ──
  const handlePayCash = async () => {
    if (!selectedBooking) return;
    const amount = parseFloat(cashAmount) || 0;
    console.log('[Calendar] Cash payment confirmed, booking:', selectedBooking.id, 'amount:', amount);
    if (!selectedBooking.id.startsWith('d')) {
      try {
        await supabase.from('bookings').update({
          payment_status: 'paid',
          payment_method: 'cash',
          status: 'completed',
        }).eq('id', selectedBooking.id);
      } catch (err) {
        console.log('[Calendar] Payment error:', err);
      }
    }
    setShowCashModal(false);
    setShowPaymentSelect(false);
    setSelectedBooking(null);
    setCashAmount('');
    fetchBookings();
    showToastMsg('Payment recorded');
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

  // ── Header date label ──
  const formatHeaderDate = () => {
    if (calView === 'day') {
      return selectedDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (calView === '3day') {
      const end = new Date(selectedDate);
      end.setDate(end.getDate() + 2);
      return `${selectedDate.getDate()} – ${end.getDate()} ${MONTH_NAMES[selectedDate.getMonth()].slice(0, 3)} ${selectedDate.getFullYear()}`;
    }
    if (calView === 'week') {
      const mon = getWeekMonday(selectedDate);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return `${mon.getDate()} – ${sun.getDate()} ${MONTH_NAMES[mon.getMonth()].slice(0, 3)} ${mon.getFullYear()}`;
    }
    return `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  };

  function getWeekMonday(d: Date): Date {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return mon;
  }

  // ── Column dates for each view ──
  const getViewColumns = (): Date[] => {
    if (calView === 'day') return [selectedDate];
    if (calView === '3day') {
      return [0, 1, 2].map(i => { const d = new Date(selectedDate); d.setDate(d.getDate() + i); return d; });
    }
    if (calView === 'week') {
      const mon = getWeekMonday(selectedDate);
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
    }
    return [];
  };

  const viewColumns = getViewColumns();

  // ── Filtered bookings ──
  const filteredBookings = selectedBarberId
    ? bookings.filter(b => b.barber_id === selectedBarberId)
    : bookings;

  const bookingsForDateAndBarber = (date: Date, barberId?: string) =>
    filteredBookings.filter(b => {
      const bd = new Date(b.start_at);
      const sameDay = isSameDay(bd, date);
      if (!sameDay) return false;
      if (barberId) return b.barber_id === barberId;
      return true;
    });

  // ── Day view columns (one per barber) ──
  const dayViewBarbers = selectedBarberId
    ? barbers.filter(b => b.id === selectedBarberId)
    : barbers;

  // ── Selected booking price ──
  const selectedBookingPrice = selectedBooking
    ? (selectedBooking.booking_services?.[0]?.price_bhd ?? 0)
    : 0;
  const selectedBookingPriceStr = Number(selectedBookingPrice).toFixed(3);
  const selectedBookingBarberName = selectedBooking?.barbers?.display_name ?? 'Staff';
  const selectedBookingBarberInitial = selectedBookingBarberName.charAt(0);

  // ── Month picker ──
  const monthDays = getMonthDays(monthPickerDate);

  // ── Render booking block ──
  const renderBookingBlock = (b: Booking, colWidth: number, colIdx: number) => {
    const start = new Date(b.start_at);
    const end = b.end_at ? new Date(b.end_at) : new Date(start.getTime() + 30 * 60000);
    const startMins = start.getHours() * 60 + start.getMinutes();
    const endMins = end.getHours() * 60 + end.getMinutes();
    const baseTop = (startMins / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 28);
    const dragOffset = dragOffsets[b.id] ?? 0;
    const top = baseTop + dragOffset;
    const clientName = b.profiles?.full_name ?? b.customer_name ?? 'Walk-in';
    const serviceName = b.booking_services?.[0]?.service_name_en ?? 'Service';
    const startLabel = formatTime(start);
    const endLabel = formatTime(end);
    const bColor = statusColor(b.status);
    const panResponder = createDragResponder(b);

    return (
      <Animated.View
        key={b.id}
        {...panResponder.panHandlers}
        style={[
          styles.bookingBlock,
          {
            top,
            height,
            width: colWidth - 6,
            borderLeftColor: bColor,
            backgroundColor: bColor + '22',
          },
        ]}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => {
            console.log('[Calendar] Booking block tapped:', b.id, 'customer:', b.customer_name);
            setSelectedBooking(b);
            setDetailTab('details');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.blockTime} numberOfLines={1}>{startLabel} - {endLabel}</Text>
          <Text style={styles.blockClient} numberOfLines={1}>{clientName}</Text>
          {height > 40 && <Text style={styles.blockService} numberOfLines={1}>{serviceName}</Text>}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ── Time grid (shared for day/3day/week) ──
  const renderTimeGrid = (columns: { date: Date; label: string; sublabel?: string; barberId?: string }[], colW: number) => (
    <View style={{ flex: 1 }}>
      {/* Column headers */}
      <View style={{ flexDirection: 'row', marginLeft: TIME_COL_WIDTH }}>
        {columns.map((col, i) => {
          const isToday = isSameDay(col.date, new Date());
          const isSelected = isSameDay(col.date, selectedDate);
          return (
            <TouchableOpacity
              key={i}
              style={[styles.colHeader, { width: colW }]}
              onPress={() => {
                console.log('[Calendar] Column header tapped:', col.label);
                setSelectedDate(col.date);
              }}
            >
              <Text style={[styles.colHeaderSub, isToday && { color: P.accent }]}>{col.label}</Text>
              <View style={[styles.colHeaderCircle, isSelected && { backgroundColor: P.accent }, isToday && !isSelected && { borderWidth: 1, borderColor: P.accent }]}>
                <Text style={[styles.colHeaderNum, isSelected && { color: '#fff' }]}>{col.sublabel ?? col.date.getDate()}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Scrollable grid */}
      <ScrollView ref={timeScrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row' }}>
          {/* Time column */}
          <View style={[styles.timeCol, { height: totalGridHeight }]}>
            {hours.map(h => (
              <View key={h} style={styles.hourLabelWrap}>
                <Text style={styles.hourText}>{formatHour(h)}</Text>
              </View>
            ))}
          </View>

          {/* Columns */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {columns.map((col, colIdx) => {
                const colBookings = bookingsForDateAndBarber(col.date, col.barberId);
                return (
                  <View key={colIdx} style={[styles.gridCol, { width: colW }]}>
                    {/* Hour lines */}
                    {hours.map(h => (
                      <TouchableOpacity
                        key={h}
                        style={styles.hourLine}
                        onPress={() => {
                          const dateStr = col.date.toISOString().split('T')[0];
                          const timeStr = `${String(h).padStart(2, '0')}:00`;
                          console.log('[Calendar] Empty slot tapped, date:', dateStr, 'time:', timeStr, 'barber:', col.barberId ?? 'any');
                          router.push(`/(partner)/new-booking?date=${dateStr}&time=${timeStr}${col.barberId ? `&barberId=${col.barberId}` : ''}` as never);
                        }}
                        activeOpacity={0.3}
                      />
                    ))}

                    {/* Now line */}
                    {isSameDay(col.date, new Date()) && nowTop >= 0 && nowTop <= totalGridHeight && (
                      <View style={[styles.nowLine, { top: nowTop }]} pointerEvents="none">
                        <View style={styles.nowDot} />
                        {colIdx === 0 && (
                          <View style={styles.nowPill}>
                            <Text style={styles.nowPillText}>{nowLabel}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Booking blocks */}
                    {colBookings.map((b, bi) => renderBookingBlock(b, colW, bi))}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );

  // ── Day view ──
  const renderDayView = () => {
    const cols = dayViewBarbers.map(bar => ({
      date: selectedDate,
      label: bar.display_name.split(' ')[0],
      sublabel: bar.display_name.charAt(0),
      barberId: bar.id,
    }));
    if (cols.length === 0) {
      cols.push({ date: selectedDate, label: 'All', sublabel: '?', barberId: undefined as any });
    }
    return renderTimeGrid(cols, COL_WIDTH);
  };

  // ── 3-day view ──
  const render3DayView = () => {
    const cols = viewColumns.map(d => ({
      date: d,
      label: DAY_NAMES_SHORT[d.getDay()],
      sublabel: String(d.getDate()),
    }));
    return renderTimeGrid(cols, COL_WIDTH);
  };

  // ── Week view ──
  const renderWeekView = () => {
    const cols = viewColumns.map(d => ({
      date: d,
      label: DAY_LETTERS[d.getDay()],
      sublabel: String(d.getDate()),
    }));
    const weekColW = Math.max(COL_WIDTH, Math.floor((SCREEN_W - TIME_COL_WIDTH) / 7));
    return renderTimeGrid(cols, weekColW);
  };

  // ── Month view ──
  const renderMonthView = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const days = getMonthDays(selectedDate);
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    const cellW = Math.floor(SCREEN_W / 7);

    return (
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Day headers */}
        <View style={styles.monthDayHeaders}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <View key={i} style={[styles.monthDayHeaderCell, { width: cellW }]}>
              <Text style={styles.monthDayHeaderText}>{d}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.monthWeekRow}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={[styles.monthCell, { width: cellW }]} />;
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);
              const dayBookings = filteredBookings.filter(b => isSameDay(new Date(b.start_at), day));
              const pills = dayBookings.slice(0, 2);
              const extra = dayBookings.length - 2;
              return (
                <TouchableOpacity
                  key={di}
                  style={[styles.monthCell, { width: cellW }, isSelected && styles.monthCellSelected]}
                  onPress={() => {
                    console.log('[Calendar] Month cell tapped:', day.toDateString());
                    setSelectedDate(day);
                    setCalView('day');
                  }}
                >
                  <View style={[styles.monthDayCircle, isToday && styles.monthDayCircleToday, isSelected && styles.monthDayCircleSelected]}>
                    <Text style={[styles.monthDayNum, isToday && styles.monthDayNumToday, isSelected && styles.monthDayNumSelected]}>{day.getDate()}</Text>
                  </View>
                  {pills.map((b, bi) => {
                    const svc = b.booking_services?.[0]?.service_name_en ?? b.customer_name ?? 'Booking';
                    return (
                      <View key={bi} style={[styles.monthPill, { backgroundColor: statusColor(b.status) + '33', borderLeftColor: statusColor(b.status) }]}>
                        <Text style={[styles.monthPillText, { color: statusColor(b.status) }]} numberOfLines={1}>{svc}</Text>
                      </View>
                    );
                  })}
                  {extra > 0 && <Text style={styles.monthExtra}>+{extra} more</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  };

  // ── Barber filter chips ──
  const renderBarberChips = () => (
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
          onPress={() => { console.log('[Calendar] Barber filter:', b.display_name); setSelectedBarberId(b.id); }}
        >
          {b.avatar_url ? (
            <Image source={resolveImageSource(b.avatar_url)} style={styles.barberChipAvatar} />
          ) : (
            <View style={styles.barberChipAvatarPlaceholder}>
              <Text style={styles.barberChipAvatarText}>{b.display_name.charAt(0)}</Text>
            </View>
          )}
          <Text style={[styles.barberChipText, selectedBarberId === b.id && styles.barberChipTextActive]}>{b.display_name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const headerDateText = formatHeaderDate();
  const profileInitial = profile?.full_name?.charAt(0) ?? 'S';

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
        <TouchableOpacity
          style={styles.headerDateBtn}
          onPress={() => { console.log('[Calendar] Month picker opened'); setMonthPickerDate(new Date(selectedDate)); setShowMonthPicker(true); }}
        >
          <Text style={styles.headerDateText}>{headerDateText}</Text>
          <ChevronDown size={16} color={P.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {isDemo && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>Demo</Text>
            </View>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => console.log('[Calendar] Messages pressed')}>
            <MessageCircle size={20} color={P.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => { console.log('[Calendar] Notifications pressed'); router.push('/(partner)/notifications' as never); }}>
            <Bell size={20} color={P.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { console.log('[Calendar] New booking button pressed'); router.push('/(partner)/new-booking' as never); }}
            style={styles.addBtn}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{profileInitial}</Text>
          </View>
        </View>
      </View>

      {/* Barber filter chips */}
      {renderBarberChips()}

      {/* View switcher row */}
      <View style={styles.viewSwitcherRow}>
        <TouchableOpacity
          style={styles.viewSwitcherBtn}
          onPress={() => { console.log('[Calendar] View switcher opened'); setShowViewSwitcher(true); }}
        >
          <CalendarDays size={14} color={P.textSecondary} />
          <Text style={styles.viewSwitcherText}>
            {calView === 'day' ? 'Day' : calView === '3day' ? '3 Day' : calView === 'week' ? 'Week' : 'Month'}
          </Text>
          <ChevronDown size={12} color={P.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => { console.log('[Calendar] Refresh pressed'); fetchBookings(); }}>
          <RefreshCw size={14} color={P.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Calendar grid */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={P.accent} size="large" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {calView === 'day' && renderDayView()}
          {calView === '3day' && render3DayView()}
          {calView === 'week' && renderWeekView()}
          {calView === 'month' && renderMonthView()}
        </View>
      )}

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.bbBtn} onPress={() => { console.log('[Calendar] Bottom bar: Calendar pressed'); router.push('/(partner)/calendar' as never); }}>
          <CalendarDays size={22} color={P.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bbBtn} onPress={() => console.log('[Calendar] Bottom bar: Tag pressed')}>
          <Tag size={22} color={P.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bbBtn, styles.bbCenter]} onPress={() => { console.log('[Calendar] Bottom bar: New booking pressed'); router.push('/(partner)/new-booking' as never); }}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bbBtn} onPress={() => console.log('[Calendar] Bottom bar: Smile pressed')}>
          <Smile size={22} color={P.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bbBtn} onPress={() => { console.log('[Calendar] Bottom bar: More pressed'); router.push('/(partner)/more' as never); }}>
          <Grid3x3 size={22} color={P.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Booking Detail Sheet ── */}
      <Modal visible={!!selectedBooking} transparent animationType="slide" onRequestClose={() => setSelectedBooking(null)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />

            {/* Sale header */}
            <View style={styles.saleHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.saleTitle}>Sale</Text>
                <Text style={styles.saleSubtitle}>
                  {selectedBooking ? new Date(selectedBooking.start_at).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
                  {' • '}
                  {selectedBookingBarberInitial}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { console.log('[Calendar] Detail sheet closed'); setSelectedBooking(null); }}>
                <X size={22} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Status + actions row */}
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(selectedBooking?.status ?? '') + '22', borderColor: statusColor(selectedBooking?.status ?? '') }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor(selectedBooking?.status ?? '') }]} />
                <Text style={[styles.statusBadgeText, { color: statusColor(selectedBooking?.status ?? '') }]}>
                  {statusLabel(selectedBooking?.status ?? '')}
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
              <TouchableOpacity style={styles.moreBtn} onPress={() => console.log('[Calendar] More options pressed for booking:', selectedBooking?.id)}>
                <MoreHorizontal size={20} color={P.text} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
              {(['details', 'activity'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, detailTab === tab && styles.tabActive]}
                  onPress={() => { console.log('[Calendar] Detail tab switched to:', tab); setDetailTab(tab); }}
                >
                  <Text style={[styles.tabText, detailTab === tab && styles.tabTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {detailTab === 'details' && selectedBooking && (
                <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
                  {/* Client row */}
                  <View style={styles.walkInRow}>
                    <View style={styles.walkInAvatar}>
                      <Text style={styles.walkInAvatarText}>
                        {(selectedBooking.profiles?.full_name ?? selectedBooking.customer_name ?? 'W').charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.walkInName}>
                        {selectedBooking.profiles?.full_name ?? selectedBooking.customer_name ?? 'Walk-In'}
                      </Text>
                      {selectedBooking.source === 'walk_in' && (
                        <Text style={styles.walkInLabel}>Walk-in</Text>
                      )}
                    </View>
                  </View>

                  {/* Sale card */}
                  <View style={styles.saleCard}>
                    <Text style={styles.saleCardTitle}>Sale #1</Text>
                    <Text style={styles.saleCardDate}>
                      {new Date(selectedBooking.start_at).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>

                    {(selectedBooking.booking_services ?? []).map((svc, si) => {
                      const svcPrice = Number(svc.price_bhd).toFixed(3);
                      const svcTime = formatTime(new Date(selectedBooking.start_at));
                      const svcDuration = svc.duration_minutes;
                      const svcBarber = selectedBooking.barbers?.display_name ?? 'Barber';
                      return (
                        <View key={si} style={styles.saleServiceRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.saleServiceName}>{svc.service_name_en}</Text>
                            <Text style={styles.saleServiceMeta}>
                              {svcTime}
                            </Text>
                            <Text style={styles.saleServiceMeta}>
                              {svcDuration}min · {svcBarber}
                            </Text>
                          </View>
                          <Text style={styles.saleServicePrice}>BHD {svcPrice}</Text>
                        </View>
                      );
                    })}

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
                <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                  <Text style={styles.activityMonthLabel}>
                    {new Date(selectedBooking.start_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <View style={styles.activityItem}>
                    <View style={styles.activityLine} />
                    <View style={styles.activityDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle}>Sale created</Text>
                      <Text style={styles.activitySub}>
                        Today at {formatTime(new Date(selectedBooking.start_at))}
                      </Text>
                    </View>
                    <View style={styles.activityAvatar}>
                      <Text style={styles.activityAvatarText}>{selectedBookingBarberInitial}</Text>
                    </View>
                  </View>
                  {selectedBooking.payment_status === 'paid' && (
                    <View style={styles.activityItem}>
                      <View style={[styles.activityLine, { backgroundColor: P.success + '44' }]} />
                      <View style={[styles.activityDot, { backgroundColor: P.success }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activityTitle}>BHD {selectedBookingPriceStr} paid by cash</Text>
                        <Text style={styles.activitySub}>
                          Today at {formatTime(new Date(selectedBooking.start_at))}
                        </Text>
                      </View>
                      <View style={[styles.activityAvatar, { backgroundColor: P.success + '22' }]}>
                        <DollarSign size={14} color={P.success} />
                      </View>
                    </View>
                  )}
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

      {/* ── Payment Select Sheet ── */}
      <Modal visible={showPaymentSelect} transparent animationType="slide" onRequestClose={() => setShowPaymentSelect(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>Select payment</Text>
              <TouchableOpacity onPress={() => { console.log('[Calendar] Payment select closed'); setShowPaymentSelect(false); }}>
                <X size={22} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentGrid}>
              {[
                { icon: <DollarSign size={28} color={P.success} />, label: 'Cash', onPress: () => { console.log('[Calendar] Cash payment selected'); setShowCashModal(true); } },
                { icon: <Gift size={28} color={P.accent} />, label: 'Gift card', onPress: () => console.log('[Calendar] Gift card selected') },
                { icon: <Zap size={28} color={P.warning} />, label: 'Split payment', onPress: () => console.log('[Calendar] Split payment selected') },
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
                <Text style={styles.paymentFooterSub}>To pay</Text>
              </View>
              <Text style={styles.paymentFooterAmount}>BHD {selectedBookingPriceStr}</Text>
            </View>

            <TouchableOpacity
              style={styles.saveUnpaidBtn}
              onPress={() => { console.log('[Calendar] Save unpaid pressed'); setShowPaymentSelect(false); setSelectedBooking(null); }}
            >
              <Text style={styles.saveUnpaidText}>Save unpaid</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Cash Amount Sheet ── */}
      <Modal visible={showCashModal} transparent animationType="slide" onRequestClose={() => setShowCashModal(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.cashHeader}>
              <View style={{ width: 32 }} />
              <Text style={styles.cashTitle}>Add cash amount</Text>
              <TouchableOpacity onPress={() => { console.log('[Calendar] Cash modal closed'); setShowCashModal(false); }}>
                <X size={22} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.cashAmountRow}>
              <Text style={styles.cashCurrency}>BHD</Text>
              <Text style={styles.cashAmount}>{cashAmount || '0'}</Text>
              <View style={styles.cashCursor} />
            </View>

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

            <View style={styles.keypad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(k => (
                <TouchableOpacity
                  key={k}
                  style={styles.keypadBtn}
                  onPress={() => { console.log('[Calendar] Keypad pressed:', k); handleKeypad(k); }}
                >
                  <Text style={styles.keypadBtnText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.cashFooterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cashFooterLabel}>
                  Cash received by
                  <Text style={{ color: P.accent }}> {selectedBookingBarberName}</Text>
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

      {/* ── View Switcher Sheet ── */}
      <Modal visible={showViewSwitcher} transparent animationType="slide" onRequestClose={() => setShowViewSwitcher(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.viewSwitcherHeader}>
              <Text style={styles.viewSwitcherTitle}>Calendar Views</Text>
              <TouchableOpacity onPress={() => { console.log('[Calendar] View switcher closed'); setShowViewSwitcher(false); }}>
                <X size={22} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 3-col row */}
            <View style={styles.viewCardsRow}>
              {(['day', '3day', 'week'] as const).map(v => {
                const isActive = calView === v;
                const label = v === 'day' ? 'Day' : v === '3day' ? '3 day' : 'Week';
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.viewCard, isActive && styles.viewCardActive]}
                    onPress={() => {
                      console.log('[Calendar] View switched to:', v);
                      setCalView(v);
                      setShowViewSwitcher(false);
                    }}
                  >
                    <CalendarDays size={22} color={isActive ? P.accent : P.textSecondary} />
                    <Text style={[styles.viewCardText, isActive && styles.viewCardTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Month card */}
            <View style={[styles.viewCardsRow, { marginTop: 10 }]}>
              <TouchableOpacity
                style={[styles.viewCard, styles.viewCardWide, calView === 'month' && styles.viewCardActive]}
                onPress={() => {
                  console.log('[Calendar] View switched to: month');
                  setCalView('month');
                  setShowViewSwitcher(false);
                }}
              >
                <CalendarDays size={22} color={calView === 'month' ? P.accent : P.textSecondary} />
                <Text style={[styles.viewCardText, calView === 'month' && styles.viewCardTextActive]}>Month</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.viewDivider} />

            {[
              { label: 'Filters', onPress: () => console.log('[Calendar] Filters pressed') },
              { label: 'Waitlist', onPress: () => console.log('[Calendar] Waitlist pressed') },
              { label: 'Personal calendar settings', onPress: () => console.log('[Calendar] Personal calendar settings pressed') },
            ].map((row, i) => (
              <TouchableOpacity key={i} style={styles.viewMenuRow} onPress={row.onPress}>
                <Text style={styles.viewMenuRowText}>{row.label}</Text>
                <ChevronRight size={18} color={P.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Month Picker Sheet ── */}
      <Modal visible={showMonthPicker} transparent animationType="slide" onRequestClose={() => setShowMonthPicker(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.monthPickerHeader}>
              <Text style={styles.monthPickerTitle}>
                {MONTH_NAMES[monthPickerDate.getMonth()]} {monthPickerDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => { console.log('[Calendar] Month picker closed'); setShowMonthPicker(false); }}>
                <X size={22} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChips}>
              {['In 1 week', 'In 2 weeks', 'In 3 weeks', 'In 4 weeks'].map((label, i) => {
                const d = new Date();
                d.setDate(d.getDate() + (i + 1) * 7);
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.quickChip}
                    onPress={() => {
                      console.log('[Calendar] Quick chip pressed:', label);
                      setSelectedDate(d);
                      setMonthPickerDate(d);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text style={styles.quickChipText}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Month nav */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => {
                  const d = new Date(monthPickerDate);
                  d.setMonth(d.getMonth() - 1);
                  console.log('[Calendar] Month picker prev month');
                  setMonthPickerDate(d);
                }}
              >
                <ChevronDown size={18} color={P.textSecondary} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>
              <Text style={styles.monthNavLabel}>
                {MONTH_NAMES[monthPickerDate.getMonth()]} {monthPickerDate.getFullYear()}
              </Text>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => {
                  const d = new Date(monthPickerDate);
                  d.setMonth(d.getMonth() + 1);
                  console.log('[Calendar] Month picker next month');
                  setMonthPickerDate(d);
                }}
              >
                <ChevronDown size={18} color={P.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Day headers */}
              <View style={styles.pickerDayHeaders}>
                {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d, i) => (
                  <View key={i} style={styles.pickerDayHeaderCell}>
                    <Text style={styles.pickerDayHeaderText}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              {(() => {
                const days = getMonthDays(monthPickerDate);
                const weeks: (Date | null)[][] = [];
                for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
                return weeks.map((week, wi) => (
                  <View key={wi} style={styles.pickerWeekRow}>
                    {week.map((day, di) => {
                      if (!day) return <View key={di} style={styles.pickerCell} />;
                      const isToday = isSameDay(day, new Date());
                      const isSelected = isSameDay(day, selectedDate);
                      return (
                        <TouchableOpacity
                          key={di}
                          style={styles.pickerCell}
                          onPress={() => {
                            console.log('[Calendar] Month picker date selected:', day.toDateString());
                            setSelectedDate(day);
                            setShowMonthPicker(false);
                          }}
                        >
                          <View style={[
                            styles.pickerDayCircle,
                            isToday && styles.pickerDayCircleToday,
                            isSelected && styles.pickerDayCircleSelected,
                          ]}>
                            <Text style={[
                              styles.pickerDayNum,
                              isToday && styles.pickerDayNumToday,
                              isSelected && styles.pickerDayNumSelected,
                            ]}>
                              {day.getDate()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ));
              })()}
            </ScrollView>
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
    backgroundColor: 'rgba(20,20,40,0.97)',
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  headerDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerDateText: { color: P.text, fontSize: 16, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 6 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: P.accent },
  avatarText: { color: P.accent, fontSize: 13, fontWeight: '700' },
  demoBadge: { backgroundColor: P.surfaceElevated, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: P.border },
  demoBadgeText: { color: P.textTertiary, fontSize: 10, fontWeight: '600' },

  // Barber chips
  barberChipsScroll: { maxHeight: 48, marginBottom: 2 },
  barberChipsContent: { paddingHorizontal: 14, gap: 8, alignItems: 'center' },
  barberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: P.surface, borderWidth: 1, borderColor: P.border },
  barberChipActive: { backgroundColor: P.accentLight, borderColor: P.accent },
  barberChipText: { color: P.textSecondary, fontSize: 12, fontWeight: '500' },
  barberChipTextActive: { color: P.accent, fontWeight: '600' },
  barberChipAvatar: { width: 20, height: 20, borderRadius: 10 },
  barberChipAvatarPlaceholder: { width: 20, height: 20, borderRadius: 10, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  barberChipAvatarText: { color: P.accent, fontSize: 9, fontWeight: '700' },

  // View switcher row
  viewSwitcherRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: P.divider },
  viewSwitcherBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: P.surface, borderWidth: 1, borderColor: P.border },
  viewSwitcherText: { color: P.textSecondary, fontSize: 12, fontWeight: '600' },
  refreshBtn: { padding: 6 },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Column headers
  colHeader: { alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.divider, borderLeftWidth: 1, borderLeftColor: P.divider },
  colHeaderSub: { color: P.textSecondary, fontSize: 10, fontWeight: '600', marginBottom: 4 },
  colHeaderCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  colHeaderNum: { color: P.text, fontSize: 13, fontWeight: '600' },

  // Time grid
  timeCol: { width: TIME_COL_WIDTH },
  hourLabelWrap: { height: HOUR_HEIGHT, justifyContent: 'flex-start', paddingTop: 4, paddingLeft: 8 },
  hourText: { color: P.textTertiary, fontSize: 10 },
  gridCol: { borderLeftWidth: 1, borderLeftColor: P.divider, position: 'relative' },
  hourLine: { height: HOUR_HEIGHT, borderTopWidth: 1, borderTopColor: P.divider },

  // Now line
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: P.danger, zIndex: 10, flexDirection: 'row', alignItems: 'center' },
  nowDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: P.danger, marginLeft: -5 },
  nowPill: { position: 'absolute', left: 8, top: -10, backgroundColor: P.danger, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  nowPillText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Booking block
  bookingBlock: {
    position: 'absolute',
    left: 3,
    borderRadius: 6,
    borderLeftWidth: 3,
    padding: 5,
    overflow: 'hidden',
  },
  blockTime: { color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: '600' },
  blockClient: { color: P.text, fontSize: 11, fontWeight: '700', marginTop: 1 },
  blockService: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 1 },

  // Month view
  monthDayHeaders: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: P.divider },
  monthDayHeaderCell: { alignItems: 'center', paddingVertical: 8 },
  monthDayHeaderText: { color: P.textTertiary, fontSize: 11, fontWeight: '600' },
  monthWeekRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: P.divider },
  monthCell: { minHeight: 80, borderRightWidth: 1, borderRightColor: P.divider, padding: 4 },
  monthCellSelected: { backgroundColor: P.accentLight },
  monthDayCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  monthDayCircleToday: { borderWidth: 1.5, borderColor: P.accent },
  monthDayCircleSelected: { backgroundColor: P.accent },
  monthDayNum: { color: P.textSecondary, fontSize: 12, fontWeight: '600' },
  monthDayNumToday: { color: P.accent },
  monthDayNumSelected: { color: '#fff' },
  monthPill: { borderRadius: 3, borderLeftWidth: 2, paddingHorizontal: 4, paddingVertical: 1, marginBottom: 2 },
  monthPillText: { fontSize: 9, fontWeight: '600' },
  monthExtra: { color: P.textTertiary, fontSize: 9, fontWeight: '600', marginTop: 1 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: P.surface,
    borderTopWidth: 1,
    borderTopColor: P.border,
    paddingTop: 10,
  },
  bbBtn: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  bbCenter: { width: 48, height: 48, borderRadius: 24, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center', padding: 0 },

  // Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: P.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: P.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },

  // Sale header
  saleHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 14 },
  saleTitle: { color: P.text, fontSize: 24, fontWeight: '700' },
  saleSubtitle: { color: P.textSecondary, fontSize: 13, marginTop: 2 },

  // Status row
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },
  rebookBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: P.border },
  rebookBtnText: { color: P.text, fontSize: 13, fontWeight: '600' },
  moreBtn: { padding: 6, marginLeft: 'auto' },

  // Tabs
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: P.divider, marginHorizontal: 20 },
  tab: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 24 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: P.text },
  tabText: { color: P.textSecondary, fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: P.text },

  // Walk-in row
  walkInRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: P.surfaceElevated, borderRadius: 12, padding: 14 },
  walkInAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  walkInAvatarText: { color: P.accent, fontSize: 16, fontWeight: '700' },
  walkInName: { color: P.text, fontSize: 15, fontWeight: '600' },
  walkInLabel: { color: P.textSecondary, fontSize: 12, marginTop: 2 },

  // Sale card
  saleCard: { backgroundColor: P.surfaceElevated, borderRadius: 12, padding: 16 },
  saleCardTitle: { color: P.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  saleCardDate: { color: P.textSecondary, fontSize: 12, marginBottom: 12 },
  saleServiceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  saleServiceName: { color: P.text, fontSize: 14, fontWeight: '600' },
  saleServiceMeta: { color: P.textSecondary, fontSize: 12, marginTop: 1 },
  saleServicePrice: { color: P.text, fontSize: 14, fontWeight: '700' },
  saleDivider: { height: 1, backgroundColor: P.divider, marginVertical: 12 },
  saleTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  saleTotalLabel: { color: P.textSecondary, fontSize: 14 },
  saleTotalValue: { color: P.textSecondary, fontSize: 14 },

  // Activity
  activityMonthLabel: { color: P.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 16 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16, position: 'relative' },
  activityLine: { position: 'absolute', left: 16, top: 20, bottom: -16, width: 1, backgroundColor: P.divider },
  activityDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: P.accent, marginTop: 4, zIndex: 1 },
  activityTitle: { color: P.text, fontSize: 14, fontWeight: '600' },
  activitySub: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  activityAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  activityAvatarText: { color: P.accent, fontSize: 13, fontWeight: '700' },
  activityFooter: { color: P.textTertiary, fontSize: 12, textAlign: 'center', paddingVertical: 12 },

  // Sheet footer
  sheetFooter: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.divider },
  checkoutBtn: { backgroundColor: P.text, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  checkoutBtnText: { color: P.bg, fontSize: 16, fontWeight: '700' },

  // Payment select
  paymentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  paymentTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, paddingVertical: 8 },
  paymentOption: { width: (SCREEN_W - 52) / 2, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 24, borderRadius: 14, borderWidth: 1, borderColor: P.border, backgroundColor: P.surfaceElevated },
  paymentOptionLabel: { color: P.text, fontSize: 14, fontWeight: '600' },
  paymentFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: P.divider },
  paymentFooterLabel: { color: P.text, fontSize: 14, fontWeight: '600' },
  paymentFooterSub: { color: P.textSecondary, fontSize: 13, marginTop: 2 },
  paymentFooterAmount: { color: P.text, fontSize: 16, fontWeight: '700' },
  saveUnpaidBtn: { marginHorizontal: 20, marginTop: 4, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: P.border, alignItems: 'center' },
  saveUnpaidText: { color: P.text, fontSize: 15, fontWeight: '600' },

  // Cash modal
  cashHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  cashTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  cashAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  cashCurrency: { color: P.text, fontSize: 28, fontWeight: '700' },
  cashAmount: { color: P.text, fontSize: 44, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  cashCursor: { width: 2, height: 44, backgroundColor: P.accent },
  cashChips: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  cashChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: P.border, backgroundColor: P.surfaceElevated },
  cashChipActive: { borderColor: P.accent, backgroundColor: P.accentLight },
  cashChipText: { color: P.textSecondary, fontSize: 13, fontWeight: '600' },
  cashChipTextActive: { color: P.accent },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 },
  keypadBtn: { width: '33.33%', height: 56, alignItems: 'center', justifyContent: 'center' },
  keypadBtnText: { color: P.text, fontSize: 22, fontWeight: '500' },
  cashFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.divider },
  cashFooterLabel: { color: P.textSecondary, fontSize: 13 },
  cashFooterSub: { color: P.textSecondary, fontSize: 13, marginTop: 2 },
  cashAddBtn: { backgroundColor: P.text, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  cashAddBtnText: { color: P.bg, fontSize: 15, fontWeight: '700' },

  // View switcher sheet
  viewSwitcherHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  viewSwitcherTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  viewCardsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  viewCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, borderRadius: 14, borderWidth: 1.5, borderColor: P.border, backgroundColor: P.surfaceElevated },
  viewCardActive: { borderColor: P.accent, backgroundColor: P.accentLight },
  viewCardWide: { flex: 0, width: 100 },
  viewCardText: { color: P.textSecondary, fontSize: 13, fontWeight: '600' },
  viewCardTextActive: { color: P.accent },
  viewDivider: { height: 1, backgroundColor: P.divider, marginHorizontal: 20, marginVertical: 16 },
  viewMenuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: P.divider },
  viewMenuRowText: { color: P.text, fontSize: 15, fontWeight: '500' },

  // Month picker sheet
  monthPickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  monthPickerTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  quickChips: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  quickChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: P.border, backgroundColor: P.surfaceElevated },
  quickChipText: { color: P.text, fontSize: 13, fontWeight: '500' },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  monthNavBtn: { padding: 8 },
  monthNavLabel: { color: P.text, fontSize: 16, fontWeight: '700' },
  pickerDayHeaders: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 4 },
  pickerDayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  pickerDayHeaderText: { color: P.textTertiary, fontSize: 11, fontWeight: '600' },
  pickerWeekRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 4 },
  pickerCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  pickerDayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pickerDayCircleToday: { borderWidth: 1.5, borderColor: P.accent },
  pickerDayCircleSelected: { backgroundColor: P.accent },
  pickerDayNum: { color: P.text, fontSize: 14, fontWeight: '500' },
  pickerDayNumToday: { color: P.accent, fontWeight: '700' },
  pickerDayNumSelected: { color: '#fff', fontWeight: '700' },
});
