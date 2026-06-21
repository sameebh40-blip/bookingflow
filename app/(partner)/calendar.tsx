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
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus, X, Check } from 'lucide-react-native';
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
  gold: '#C9A84C',
  text: '#F0F0FF',
  textSecondary: '#9090B0',
  textTertiary: '#5A5A7A',
  success: '#4CAF7D',
  danger: '#E85454',
  warning: '#F59E0B',
  divider: '#1E1E35',
};

const HOUR_HEIGHT = 60;
const START_HOUR = 8;
const END_HOUR = 22;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
  profiles?: { full_name: string; avatar_url: string } | null;
  barbers?: { display_name: string } | null;
  services?: { name: string; duration_minutes: number } | null;
}

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function statusColor(status: string) {
  if (status === 'confirmed') return P.success;
  if (status === 'pending') return P.warning;
  if (status === 'cancelled') return P.danger;
  if (status === 'completed') return P.accent;
  return P.textSecondary;
}

export default function PartnerCalendar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const weekDates = getWeekDates(weekOffset);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const fetchBookings = useCallback(async () => {
    if (!shopId) return;
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    weekEnd.setHours(23, 59, 59, 999);
    console.log('[Calendar] Fetching bookings for week:', weekStart.toDateString());
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, start_at, end_at, status, price_bhd, customer_name, customer_profile_id, barber_id, service_id, profiles!customer_profile_id(full_name, avatar_url), barbers!barber_id(display_name), services!service_id(name, duration_minutes)')
        .eq('shop_id', shopId)
        .gte('start_at', weekStart.toISOString())
        .lte('start_at', weekEnd.toISOString())
        .order('start_at');
      setBookings((data as Booking[]) ?? []);
      console.log('[Calendar] Bookings loaded:', data?.length ?? 0);
    } catch (err) {
      console.log('[Calendar] fetchBookings error:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [shopId, weekOffset]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time
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

  const changeWeek = (dir: number) => {
    console.log('[Calendar] Week changed:', dir > 0 ? 'next' : 'prev');
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: dir * -30, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    setWeekOffset(prev => prev + dir);
  };

  const dayBookings = bookings.filter(b => {
    const d = new Date(b.start_at);
    return d.toDateString() === selectedDate.toDateString();
  });

  const confirmBooking = async (id: string) => {
    console.log('[Calendar] Confirm booking:', id);
    setActionLoading(true);
    try {
      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);
      await fetchBookings();
      setSelectedBooking(null);
    } catch (err) {
      console.log('[Calendar] confirmBooking error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const cancelBooking = async (id: string) => {
    console.log('[Calendar] Cancel booking:', id, 'reason:', cancelReason);
    setActionLoading(true);
    try {
      await supabase.from('bookings').update({ status: 'cancelled', cancel_reason: cancelReason }).eq('id', id);
      await fetchBookings();
      setSelectedBooking(null);
      setShowCancelInput(false);
      setCancelReason('');
    } catch (err) {
      console.log('[Calendar] cancelBooking error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity onPress={() => { console.log('[Calendar] New booking FAB'); router.push('/(partner)/new-booking' as never); }} style={styles.addBtn}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Week strip */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.weekArrow}>
          <ChevronLeft size={20} color={P.textSecondary} />
        </TouchableOpacity>
        <Animated.View style={[styles.weekStrip, { transform: [{ translateX: slideAnim }] }]}>
          {weekDates.map((date, i) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
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
              </TouchableOpacity>
            );
          })}
        </Animated.View>
        <TouchableOpacity onPress={() => changeWeek(1)} style={styles.weekArrow}>
          <ChevronRight size={20} color={P.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Time grid */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={P.accent} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {/* Hour labels */}
            <View style={styles.hourLabels}>
              {hours.map(h => (
                <View key={h} style={styles.hourLabel}>
                  <Text style={styles.hourText}>
                    {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
                  </Text>
                </View>
              ))}
            </View>
            {/* Booking blocks */}
            <View style={styles.gridContent}>
              {hours.map(h => (
                <View key={h} style={styles.hourLine} />
              ))}
              {dayBookings.map(booking => {
                const start = new Date(booking.start_at);
                const end = booking.end_at ? new Date(booking.end_at) : new Date(start.getTime() + 30 * 60000);
                const startHour = start.getHours() + start.getMinutes() / 60;
                const endHour = end.getHours() + end.getMinutes() / 60;
                const top = (startHour - START_HOUR) * HOUR_HEIGHT;
                const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 30);
                const clientName = booking.profiles?.full_name ?? booking.customer_name ?? 'Walk-in';
                const serviceName = booking.services?.name ?? 'Service';
                const borderColor = statusColor(booking.status);

                return (
                  <TouchableOpacity
                    key={booking.id}
                    style={[styles.bookingBlock, { top, height, borderLeftColor: borderColor }]}
                    onPress={() => {
                      console.log('[Calendar] Booking block tapped:', booking.id);
                      setSelectedBooking(booking);
                    }}
                  >
                    <Text style={styles.blockClient} numberOfLines={1}>{clientName}</Text>
                    <Text style={styles.blockService} numberOfLines={1}>{serviceName}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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

      {/* Bottom sheet */}
      <Modal visible={!!selectedBooking} transparent animationType="slide" onRequestClose={() => setSelectedBooking(null)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Booking Details</Text>
              <TouchableOpacity onPress={() => { setSelectedBooking(null); setShowCancelInput(false); }}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedBooking && (
              <>
                <View style={styles.sheetRow}>
                  <Text style={styles.sheetLabel}>Client</Text>
                  <Text style={styles.sheetValue}>{selectedBooking.profiles?.full_name ?? selectedBooking.customer_name ?? 'Walk-in'}</Text>
                </View>
                <View style={styles.sheetRow}>
                  <Text style={styles.sheetLabel}>Service</Text>
                  <Text style={styles.sheetValue}>{selectedBooking.services?.name ?? '—'}</Text>
                </View>
                <View style={styles.sheetRow}>
                  <Text style={styles.sheetLabel}>Time</Text>
                  <Text style={styles.sheetValue}>{new Date(selectedBooking.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
                </View>
                <View style={styles.sheetRow}>
                  <Text style={styles.sheetLabel}>Barber</Text>
                  <Text style={styles.sheetValue}>{selectedBooking.barbers?.display_name ?? 'Any'}</Text>
                </View>
                <View style={styles.sheetRow}>
                  <Text style={styles.sheetLabel}>Price</Text>
                  <Text style={[styles.sheetValue, { color: P.gold }]}>BHD {Number(selectedBooking.price_bhd).toFixed(3)}</Text>
                </View>
                <View style={styles.sheetRow}>
                  <Text style={styles.sheetLabel}>Status</Text>
                  <View style={[styles.badge, { backgroundColor: statusColor(selectedBooking.status) + '22' }]}>
                    <Text style={[styles.badgeText, { color: statusColor(selectedBooking.status) }]}>{selectedBooking.status}</Text>
                  </View>
                </View>

                {showCancelInput && (
                  <TextInput
                    style={styles.cancelInput}
                    placeholder="Reason for cancellation..."
                    placeholderTextColor={P.textTertiary}
                    value={cancelReason}
                    onChangeText={setCancelReason}
                  />
                )}

                <View style={styles.sheetActions}>
                  {selectedBooking.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: P.success }]}
                      onPress={() => confirmBooking(selectedBooking.id)}
                      disabled={actionLoading}
                    >
                      <Check size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                  {selectedBooking.status !== 'cancelled' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: P.danger }]}
                      onPress={() => {
                        if (!showCancelInput) {
                          setShowCancelInput(true);
                        } else {
                          cancelBooking(selectedBooking.id);
                        }
                      }}
                      disabled={actionLoading}
                    >
                      <X size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>{showCancelInput ? 'Confirm Cancel' : 'Cancel'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center' },
  weekNav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8 },
  weekArrow: { padding: 8 },
  weekStrip: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  dayItem: { alignItems: 'center', gap: 4 },
  dayLetter: { color: P.textSecondary, fontSize: 11, fontWeight: '600' },
  dayLetterActive: { color: P.accent },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCircleActive: { backgroundColor: P.accent },
  dayCircleToday: { borderWidth: 1, borderColor: P.accent },
  dayNum: { color: P.text, fontSize: 14, fontWeight: '600' },
  dayNumActive: { color: '#fff' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', minHeight: (END_HOUR - START_HOUR) * HOUR_HEIGHT },
  hourLabels: { width: 56, paddingTop: 0 },
  hourLabel: { height: HOUR_HEIGHT, justifyContent: 'flex-start', paddingTop: 4, paddingLeft: 8 },
  hourText: { color: P.textTertiary, fontSize: 10 },
  gridContent: { flex: 1, position: 'relative' },
  hourLine: { height: HOUR_HEIGHT, borderTopWidth: 1, borderTopColor: P.divider },
  bookingBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    backgroundColor: P.surfaceElevated,
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 6,
    overflow: 'hidden',
  },
  blockClient: { color: P.text, fontSize: 12, fontWeight: '600' },
  blockService: { color: P.textSecondary, fontSize: 10, marginTop: 2 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: P.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: P.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: P.divider },
  sheetLabel: { color: P.textSecondary, fontSize: 14 },
  sheetValue: { color: P.text, fontSize: 14, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cancelInput: { backgroundColor: P.surfaceElevated, borderRadius: 10, padding: 12, color: P.text, marginTop: 12, borderWidth: 1, borderColor: P.border },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
