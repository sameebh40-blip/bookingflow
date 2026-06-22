import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import {
  Plus, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon,
  Clock, Check, DollarSign, RefreshCw, Bell,
} from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ─── Palette ────────────────────────────────────────────────────────────────
const P = {
  bg: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#242438',
  border: '#2A2A45',
  accent: '#7C3AED',
  accentLight: 'rgba(124,58,237,0.18)',
  gold: '#C9A84C',
  text: '#F0F0FF',
  textSecondary: '#9090B0',
  textTertiary: '#5A5A7A',
  success: '#4CAF7D',
  danger: '#E85454',
  warning: '#F59E0B',
  blue: '#3B82F6',
  teal: '#14B8A6',
  divider: '#1E1E35',
};

// ─── Grid geometry ──────────────────────────────────────────────────────────
const HOUR_HEIGHT = 80;
const PX_PER_MIN = HOUR_HEIGHT / 60; // 1.333 px per minute
const SNAP_MIN = 15;                 // snap dragging to 15-minute increments
const TIME_COL_W = 52;
const MIN_COL_W = 96;
const SCREEN_W = Dimensions.get('window').width;

// ─── Types ──────────────────────────────────────────────────────────────────
interface Booking {
  id: string;
  start_at: string;
  end_at: string | null;
  status: string;
  customer_name: string | null;
  barber_id: string | null;
  shop_id: string;
  service_name?: string | null;
  total_price?: number | null;
}
interface BarberRow { id: string; display_name: string; avatar_url: string | null; }
interface Column { key: string; barberId: string | null; label: string; initial: string; avatar: string | null; }

// ─── Status styling + workflow ────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Booked',    color: P.gold },
  confirmed:   { label: 'Confirmed', color: P.blue },
  arrived:     { label: 'Arrived',   color: P.teal },
  in_progress: { label: 'Started',   color: P.accent },
  completed:   { label: 'Completed', color: P.success },
  no_show:     { label: 'No-show',   color: P.danger },
  cancelled:   { label: 'Cancelled', color: P.textTertiary },
};
const STATUS_ACTIONS = ['confirmed', 'arrived', 'in_progress', 'completed', 'no_show', 'cancelled'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function resolveImageSource(source: string | null | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  return { uri: source };
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function minutesOf(iso: string) { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); }
function durationOf(b: Booking) {
  if (!b.end_at) return 30;
  const d = (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60000;
  return Math.max(15, Math.round(d));
}
function fmtTime(min: number) {
  const h = Math.floor(min / 60); const m = min % 60;
  const ampm = h >= 12 ? 'pm' : 'am'; const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

const todayAt = (h: number, m: number) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };
const DEMO_BARBERS: BarberRow[] = [
  { id: 'b1', display_name: 'Khaled', avatar_url: null },
  { id: 'b2', display_name: 'Wendy', avatar_url: null },
];
const DEMO_BOOKINGS: Booking[] = [
  { id: 'dc1', start_at: todayAt(9, 0), end_at: todayAt(9, 45), status: 'confirmed', customer_name: 'John Doe', barber_id: 'b1', shop_id: '', service_name: 'Haircut' },
  { id: 'dc2', start_at: todayAt(10, 30), end_at: todayAt(11, 15), status: 'pending', customer_name: 'Jack Doe', barber_id: 'b2', shop_id: '', service_name: 'Beard trim' },
  { id: 'dc3', start_at: todayAt(11, 30), end_at: todayAt(12, 45), status: 'arrived', customer_name: 'Jane Doe', barber_id: 'b1', shop_id: '', service_name: 'Color' },
];

// ─── Appointment block (draggable + resizable) ────────────────────────────────
function AppointmentBlock({
  booking, colIndex, numCols, colWidth, dayStartMin, scrollRef,
  onCommitMove, onCommitResize, onOpen,
}: {
  booking: Booking;
  colIndex: number;
  numCols: number;
  colWidth: number;
  dayStartMin: number;
  scrollRef: React.RefObject<any>;
  onCommitMove: (id: string, deltaMin: number, colShift: number) => void;
  onCommitResize: (id: string, newDuration: number) => void;
  onOpen: (b: Booking) => void;
}) {
  const startMin = minutesOf(booking.start_at);
  const durMin = durationOf(booking);
  const top = (startMin - dayStartMin) * PX_PER_MIN;
  const baseHeight = Math.max(durMin * PX_PER_MIN, 26);
  const left = TIME_COL_W + colIndex * colWidth;

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const dh = useSharedValue(0);
  const active = useSharedValue(0);

  const meta = STATUS_META[booking.status] ?? STATUS_META.pending;

  // Press & hold to pick up, then drag — disambiguates from grid scrolling.
  const move = Gesture.Pan()
    .activateAfterLongPress(200)
    .blocksExternalGesture(scrollRef)
    .onStart(() => { active.value = 1; })
    .onUpdate((e) => { tx.value = e.translationX; ty.value = e.translationY; })
    .onEnd((e) => {
      const deltaMin = Math.round((e.translationY / PX_PER_MIN) / SNAP_MIN) * SNAP_MIN;
      const colShift = Math.round(e.translationX / colWidth);
      runOnJS(onCommitMove)(booking.id, deltaMin, colShift);
      tx.value = withTiming(0, { duration: 120 });
      ty.value = withTiming(0, { duration: 120 });
      active.value = 0;
    });

  const tap = Gesture.Tap().maxDistance(10).onEnd(() => { runOnJS(onOpen)(booking); });
  const body = Gesture.Exclusive(move, tap);

  // Bottom edge: drag to change duration.
  const resize = Gesture.Pan()
    .blocksExternalGesture(scrollRef)
    .onStart(() => { active.value = 1; })
    .onUpdate((e) => { dh.value = e.translationY; })
    .onEnd((e) => {
      const newDur = Math.max(15, Math.round((durMin + e.translationY / PX_PER_MIN) / SNAP_MIN) * SNAP_MIN);
      runOnJS(onCommitResize)(booking.id, newDur);
      dh.value = withTiming(0, { duration: 120 });
      active.value = 0;
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: active.value ? 1.02 : 1 }],
    height: Math.max(baseHeight + dh.value, 26),
    zIndex: active.value ? 999 : 1,
    shadowOpacity: active.value ? 0.4 : 0,
  }));

  const tall = baseHeight > 42;
  return (
    <GestureDetector gesture={body}>
      <Animated.View
        style={[
          styles.appt,
          { left, top, width: colWidth - 4, backgroundColor: meta.color + '26', borderColor: meta.color },
          animStyle,
        ]}
      >
        <View style={[styles.apptAccent, { backgroundColor: meta.color }]} />
        <Text numberOfLines={1} style={styles.apptName}>{booking.customer_name || 'Walk-in'}</Text>
        {tall && (
          <Text numberOfLines={1} style={styles.apptMeta}>
            {fmtTime(startMin)} · {booking.service_name || meta.label}
          </Text>
        )}
        <GestureDetector gesture={resize}>
          <View style={styles.resizeHandle}>
            <View style={styles.resizeBar} />
          </View>
        </GestureDetector>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Main inner ────────────────────────────────────────────────────────────────
function PartnerCalendarInner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastY = useRef(new RNAnimated.Value(-80)).current;
  const gridScrollRef = useRef<any>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const fetchBarbers = useCallback(async () => {
    if (!shopId) { setBarbers(DEMO_BARBERS); return; }
    try {
      const { data } = await supabase
        .from('barbers')
        .select('id, display_name, avatar_url')
        .eq('shop_id', shopId)
        .limit(30);
      setBarbers(data && data.length > 0 ? (data as BarberRow[]) : []);
    } catch { setBarbers([]); }
  }, [shopId]);

  const fetchBookings = useCallback(async () => {
    if (!shopId) { setBookings(DEMO_BOOKINGS); setIsDemo(true); setLoading(false); return; }
    const dayStart = new Date(selectedDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate); dayEnd.setHours(23, 59, 59, 999);
    try {
      // Plain select (no join) so a service FK quirk can never blank the calendar.
      const { data, error } = await supabase
        .from('bookings')
        .select('id, start_at, end_at, status, customer_name, barber_id, shop_id, total_price, service_id')
        .eq('shop_id', shopId)
        .gte('start_at', dayStart.toISOString())
        .lte('start_at', dayEnd.toISOString())
        .order('start_at');
      if (error) console.log('[Calendar] fetchBookings error:', error.message);
      let rows: Booking[] = (data as any[]) ?? [];
      // Resolve service names in one extra lightweight query.
      const serviceIds = Array.from(new Set(rows.map((r: any) => r.service_id).filter(Boolean)));
      if (serviceIds.length > 0) {
        const { data: svcs } = await supabase.from('services').select('id, name').in('id', serviceIds);
        const nameById = new Map((svcs ?? []).map((s: any) => [s.id, s.name]));
        rows = rows.map((r: any) => ({ ...r, service_name: nameById.get(r.service_id) ?? null }));
      }
      setBookings(rows);
      setIsDemo(false);
    } catch (err) {
      console.log('[Calendar] fetchBookings exception:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [shopId, selectedDate]);

  useEffect(() => { fetchBarbers(); }, [fetchBarbers]);
  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ── Realtime: new/changed bookings land on the grid live ────────────────────
  useEffect(() => {
    if (!shopId) return;
    const channel = supabase
      .channel(`calendar-${shopId}-${Date.now()}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `shop_id=eq.${shopId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') showToast('New booking received');
          fetchBookings();
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shopId, fetchBookings]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    RNAnimated.sequence([
      RNAnimated.timing(toastY, { toValue: 0, duration: 260, useNativeDriver: true }),
      RNAnimated.delay(2600),
      RNAnimated.timing(toastY, { toValue: -80, duration: 260, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastY]);

  // ── Columns: an "Any" lane + one lane per staff member ──────────────────────
  const columns: Column[] = useMemo(() => {
    const staff = barbers.map((b) => ({
      key: b.id, barberId: b.id, label: b.display_name,
      initial: (b.display_name || '?').charAt(0).toUpperCase(), avatar: b.avatar_url,
    }));
    return [{ key: 'any', barberId: null, label: 'Any staff', initial: 'A', avatar: null }, ...staff];
  }, [barbers]);

  const numCols = columns.length;
  const colWidth = Math.max(MIN_COL_W, (SCREEN_W - TIME_COL_W) / numCols);
  const gridWidth = TIME_COL_W + numCols * colWidth;

  // ── Visible hour range (expands to fit the day's bookings) ──────────────────
  const dayBookings = bookings.filter((b) => sameDay(new Date(b.start_at), selectedDate));
  const { startHour, endHour } = useMemo(() => {
    let lo = 8, hi = 21;
    dayBookings.forEach((b) => {
      const s = Math.floor(minutesOf(b.start_at) / 60);
      const e = Math.ceil((minutesOf(b.start_at) + durationOf(b)) / 60);
      lo = Math.min(lo, s); hi = Math.max(hi, e);
    });
    return { startHour: Math.max(0, lo), endHour: Math.min(24, Math.max(hi, lo + 4)) };
  }, [dayBookings]);
  const dayStartMin = startHour * 60;
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;

  const colIndexFor = useCallback((b: Booking) => {
    const idx = columns.findIndex((c) => c.barberId && c.barberId === b.barber_id);
    return idx === -1 ? 0 : idx; // unmatched / null → "Any" lane
  }, [columns]);

  // ── Commit drag-move (time + staff lane) ────────────────────────────────────
  const commitMove = useCallback(async (id: string, deltaMin: number, colShift: number) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    const curCol = colIndexFor(b);
    const newCol = Math.max(0, Math.min(numCols - 1, curCol + colShift));
    const newBarberId = columns[newCol].barberId;
    const dur = durationOf(b);
    let newStartMin = minutesOf(b.start_at) + deltaMin;
    newStartMin = Math.max(dayStartMin, Math.min(newStartMin, endHour * 60 - dur));
    if (deltaMin === 0 && newBarberId === b.barber_id) return;

    const ns = new Date(b.start_at);
    ns.setHours(Math.floor(newStartMin / 60), newStartMin % 60, 0, 0);
    const ne = new Date(ns.getTime() + dur * 60000);
    const startIso = ns.toISOString(); const endIso = ne.toISOString();

    setBookings((prev) => prev.map((x) => x.id === id ? { ...x, start_at: startIso, end_at: endIso, barber_id: newBarberId } : x));
    if (isDemo || !shopId) return;
    const { error } = await supabase.from('bookings').update({ start_at: startIso, end_at: endIso, barber_id: newBarberId }).eq('id', id);
    if (error) { showToast('Could not move booking'); fetchBookings(); }
  }, [bookings, colIndexFor, columns, numCols, dayStartMin, endHour, isDemo, shopId, fetchBookings, showToast]);

  // ── Commit resize (duration) ────────────────────────────────────────────────
  const commitResize = useCallback(async (id: string, newDuration: number) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    const ne = new Date(new Date(b.start_at).getTime() + newDuration * 60000);
    const endIso = ne.toISOString();
    setBookings((prev) => prev.map((x) => x.id === id ? { ...x, end_at: endIso } : x));
    if (isDemo || !shopId) return;
    const { error } = await supabase.from('bookings').update({ end_at: endIso }).eq('id', id);
    if (error) { showToast('Could not resize booking'); fetchBookings(); }
  }, [bookings, isDemo, shopId, fetchBookings, showToast]);

  // ── Status change from the detail sheet ─────────────────────────────────────
  const changeStatus = useCallback(async (id: string, status: string) => {
    setBookings((prev) => prev.map((x) => x.id === id ? { ...x, status } : x));
    setSelected((s) => s && s.id === id ? { ...s, status } : s);
    if (isDemo || !shopId) { setSelected(null); return; }
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) showToast('Could not update status');
    setSelected(null);
  }, [isDemo, shopId, showToast]);

  // ── Setup gate ──────────────────────────────────────────────────────────────
  if (!shopId && !isDemo) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <CalendarIcon size={40} color={P.accent} />
        <Text style={styles.setupTitle}>Set up your shop</Text>
        <Text style={styles.setupSub}>Create your venue to start receiving bookings on your calendar.</Text>
        <Pressable style={styles.setupBtn} onPress={() => router.push('/(partner)/setup' as never)}>
          <Text style={styles.setupBtnText}>Complete setup →</Text>
        </Pressable>
      </View>
    );
  }

  const isToday = sameDay(selectedDate, new Date());
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nowTop = (nowMin - dayStartMin) * PX_PER_MIN;
  const dateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const shiftDay = (d: number) => { const n = new Date(selectedDate); n.setDate(n.getDate() + d); setSelectedDate(n); };

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dateNav}>
          <Pressable style={styles.navBtn} onPress={() => shiftDay(-1)} hitSlop={8}><ChevronLeft size={20} color={P.text} /></Pressable>
          <Pressable style={styles.dateLabelWrap} onPress={() => setSelectedDate(new Date())}>
            <Text style={styles.dateLabel}>{isToday ? 'Today' : dateLabel}</Text>
            {!isToday && <Text style={styles.dateSub}>{dateLabel}</Text>}
          </Pressable>
          <Pressable style={styles.navBtn} onPress={() => shiftDay(1)} hitSlop={8}><ChevronRight size={20} color={P.text} /></Pressable>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => fetchBookings()} hitSlop={8}><RefreshCw size={18} color={P.textSecondary} /></Pressable>
          {isDemo && <View style={styles.demoPill}><Text style={styles.demoPillText}>Demo</Text></View>}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={P.accent} size="large" /></View>
      ) : (
        <GHScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
          <View style={{ width: gridWidth }}>
            {/* Staff header row */}
            <View style={styles.staffRow}>
              <View style={{ width: TIME_COL_W }} />
              {columns.map((c) => (
                <View key={c.key} style={[styles.staffCell, { width: colWidth }]}>
                  <View style={styles.staffAvatar}>
                    {c.avatar
                      ? <Image source={resolveImageSource(c.avatar)} style={styles.staffAvatarImg} />
                      : <Text style={styles.staffInitial}>{c.initial}</Text>}
                  </View>
                  <Text numberOfLines={1} style={styles.staffName}>{c.label}</Text>
                </View>
              ))}
            </View>

            {/* Time grid body */}
            <GHScrollView
              ref={gridScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ height: totalHeight + 40, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ height: totalHeight }}>
                {/* Hour lines + labels */}
                {hours.map((h) => {
                  const y = (h * 60 - dayStartMin) * PX_PER_MIN;
                  return (
                    <View key={h} style={[styles.hourLine, { top: y, width: gridWidth }]}>
                      <Text style={styles.hourLabel}>{fmtTime(h * 60).replace(':00', '')}</Text>
                    </View>
                  );
                })}
                {/* Column separators */}
                {columns.map((c, i) => (
                  <View key={c.key} style={[styles.colSep, { left: TIME_COL_W + i * colWidth, height: totalHeight }]} />
                ))}
                {/* Now line */}
                {isToday && nowTop >= 0 && nowTop <= totalHeight && (
                  <View style={[styles.nowLine, { top: nowTop, width: gridWidth }]}>
                    <View style={styles.nowDot} />
                  </View>
                )}
                {/* Appointment blocks */}
                {dayBookings.map((b) => (
                  <AppointmentBlock
                    key={b.id}
                    booking={b}
                    colIndex={colIndexFor(b)}
                    numCols={numCols}
                    colWidth={colWidth}
                    dayStartMin={dayStartMin}
                    scrollRef={gridScrollRef}
                    onCommitMove={commitMove}
                    onCommitResize={commitResize}
                    onOpen={setSelected}
                  />
                ))}
              </View>
            </GHScrollView>
          </View>
        </GHScrollView>
      )}

      {/* Empty hint */}
      {!loading && dayBookings.length === 0 && (
        <View pointerEvents="none" style={styles.emptyHint}>
          <Text style={styles.emptyHintText}>No appointments {isToday ? 'today' : 'this day'}.{'\n'}Tap + to add one.</Text>
        </View>
      )}

      {/* FAB → new booking */}
      <Pressable style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => router.push('/(partner)/new-booking' as never)}>
        <Plus size={26} color="#fff" />
      </Pressable>

      {/* Toast */}
      {toast && (
        <RNAnimated.View style={[styles.toast, { top: insets.top + 8, transform: [{ translateY: toastY }] }]}>
          <Bell size={15} color="#fff" />
          <Text style={styles.toastText}>{toast}</Text>
        </RNAnimated.View>
      )}

      {/* Detail sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={(e) => e.stopPropagation()}>
            {selected && (() => {
              const meta = STATUS_META[selected.status] ?? STATUS_META.pending;
              const sMin = minutesOf(selected.start_at);
              const dur = durationOf(selected);
              return (
                <>
                  <View style={styles.sheetHandle} />
                  <View style={styles.sheetHeader}>
                    <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                    <Text style={styles.sheetName}>{selected.customer_name || 'Walk-in'}</Text>
                    <Pressable onPress={() => setSelected(null)} hitSlop={10}><X size={20} color={P.textSecondary} /></Pressable>
                  </View>
                  <View style={styles.sheetRow}><Clock size={15} color={P.textSecondary} /><Text style={styles.sheetRowText}>{fmtTime(sMin)} – {fmtTime(sMin + dur)} ({dur} min)</Text></View>
                  {selected.service_name && <View style={styles.sheetRow}><CalendarIcon size={15} color={P.textSecondary} /><Text style={styles.sheetRowText}>{selected.service_name}</Text></View>}
                  {selected.total_price != null && <View style={styles.sheetRow}><DollarSign size={15} color={P.textSecondary} /><Text style={styles.sheetRowText}>BHD {Number(selected.total_price).toFixed(3)}</Text></View>}
                  <View style={[styles.statusBadge, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
                    <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>

                  <Text style={styles.sheetSection}>Update status</Text>
                  <View style={styles.statusGrid}>
                    {STATUS_ACTIONS.map((s) => {
                      const m = STATUS_META[s];
                      const isCur = selected.status === s;
                      return (
                        <Pressable
                          key={s}
                          style={[styles.statusChip, { borderColor: m.color }, isCur && { backgroundColor: m.color + '22' }]}
                          onPress={() => changeStatus(selected.id, s)}
                        >
                          {isCur && <Check size={13} color={m.color} />}
                          <Text style={[styles.statusChipText, { color: m.color }]}>{m.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable style={styles.checkoutBtn} onPress={() => { setSelected(null); router.push('/(partner)/pos/new' as never); }}>
                    <DollarSign size={18} color="#fff" />
                    <Text style={styles.checkoutBtnText}>Checkout</Text>
                  </Pressable>
                  <Text style={styles.dragHint}>Tip: press & hold an appointment to move it (drag up/down to reschedule, sideways to reassign staff). Drag the bottom edge to change its length.</Text>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Error boundary (prevents white crash screen) ──────────────────────────────
class CalendarErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any) { console.log('[Calendar] render error:', err?.message); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.center}>
          <Text style={{ color: P.text, fontSize: 16, fontWeight: '700' }}>Something went wrong</Text>
          <Pressable style={styles.setupBtn} onPress={() => this.setState({ hasError: false })}>
            <Text style={styles.setupBtnText}>Reload calendar</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function PartnerCalendar() {
  return (
    <CalendarErrorBoundary>
      <PartnerCalendarInner />
    </CalendarErrorBoundary>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: P.bg, gap: 12, paddingHorizontal: 32 },
  setupTitle: { color: P.text, fontSize: 20, fontWeight: '800' },
  setupSub: { color: P.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  setupBtn: { backgroundColor: P.accent, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, marginTop: 8 },
  setupBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: P.surface },
  dateLabelWrap: { alignItems: 'center', minWidth: 96 },
  dateLabel: { color: P.text, fontSize: 17, fontWeight: '800' },
  dateSub: { color: P.textSecondary, fontSize: 11, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: P.surface },
  demoPill: { backgroundColor: P.warning + '22', borderColor: P.warning, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  demoPillText: { color: P.warning, fontSize: 11, fontWeight: '700' },

  staffRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: P.border, paddingVertical: 8, backgroundColor: P.surface },
  staffCell: { alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  staffAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  staffAvatarImg: { width: 34, height: 34 },
  staffInitial: { color: P.accent, fontWeight: '800', fontSize: 14 },
  staffName: { color: P.textSecondary, fontSize: 11, fontWeight: '600', maxWidth: '94%' },

  hourLine: { position: 'absolute', left: 0, height: 1, backgroundColor: P.divider, justifyContent: 'flex-start' },
  hourLabel: { position: 'absolute', left: 6, top: -7, color: P.textTertiary, fontSize: 11, width: TIME_COL_W - 8 },
  colSep: { position: 'absolute', top: 0, width: 1, backgroundColor: P.divider },
  nowLine: { position: 'absolute', left: 0, height: 2, backgroundColor: P.danger },
  nowDot: { position: 'absolute', left: TIME_COL_W - 4, top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: P.danger },

  appt: {
    position: 'absolute', borderRadius: 8, borderLeftWidth: 0, borderWidth: 1, paddingHorizontal: 8, paddingTop: 4,
    overflow: 'hidden', shadowColor: '#000', shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  apptAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  apptName: { color: P.text, fontSize: 12, fontWeight: '700' },
  apptMeta: { color: P.textSecondary, fontSize: 10, marginTop: 1 },
  resizeHandle: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 16, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
  resizeBar: { width: 24, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },

  emptyHint: { position: 'absolute', top: '46%', left: 0, right: 0, alignItems: 'center' },
  emptyHintText: { color: P.textTertiary, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center', shadowColor: P.accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },

  toast: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: P.accent, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, zIndex: 1000 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: P.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderColor: P.border },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: P.border, alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  sheetName: { color: P.text, fontSize: 18, fontWeight: '800', flex: 1 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  sheetRowText: { color: P.text, fontSize: 14 },
  statusBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  sheetSection: { color: P.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18, marginBottom: 10 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  statusChipText: { fontSize: 13, fontWeight: '600' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: P.accent, borderRadius: 12, paddingVertical: 14, marginTop: 18 },
  checkoutBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dragHint: { color: P.textTertiary, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 12 },
});
