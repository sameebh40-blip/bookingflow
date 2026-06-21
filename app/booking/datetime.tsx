import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, ChevronDown, Plus, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DateItem {
  day: string;
  date: number;
  month: string;
  full: string;
}

function generateDates(count: number): DateItem[] {
  const dates: DateItem[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      day: DAYS[d.getDay()],
      date: d.getDate(),
      month: MONTHS[d.getMonth()],
      full: d.toISOString(),
    });
  }
  return dates;
}

function generateSlots(open: string, close: string, bookedTimes: string[]): { time: string; available: boolean }[] {
  const slots: { time: string; available: boolean }[] = [];
  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  let h = openH, m = openM;
  while (h * 60 + m < closeH * 60 + closeM) {
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push({ time, available: !bookedTimes.includes(time) });
    m += 30;
    if (m >= 60) { h++; m -= 60; }
  }
  return slots;
}

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={styles.progressDots}>
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={[styles.dot, s === step && styles.dotActive, s < step && styles.dotDone]} />
      ))}
    </View>
  );
}

export default function BookingDatetimeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { venueId, services, staffId } = useLocalSearchParams<{ venueId: string; services: string; staffId: string }>();
  const dates = generateDates(14);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const staffName = staffId && staffId !== 'any' ? 'Barber selected' : 'Any barber';

  const fetchAvailability = useCallback(async () => {
    if (!venueId) return;
    const dateObj = new Date(dates[selectedDate].full);
    const dayIndex = dateObj.getDay();
    console.log('[Booking/DateTime] Fetching availability for venueId:', venueId, 'date:', dates[selectedDate].full, 'dayIndex:', dayIndex);
    setLoadingSlots(true);
    try {
      const { data: shopData } = await supabase
        .from('barbershops')
        .select('opening_hours')
        .eq('id', venueId)
        .single();

      const openingHours = shopData?.opening_hours as Record<string, unknown> | null;
      const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const dayKey = DAY_KEYS[dayIndex];
      const rawDay = openingHours?.[dayKey] ?? openingHours?.[String(dayIndex)];

      // Parse value — could be "10:00-22:00" string OR { open, close, enabled } object
      let openTime = '09:00';
      let closeTime = '18:00';
      let dayEnabled = true;

      if (rawDay === null || rawDay === undefined) {
        // no entry for this day — use fallback
      } else if (typeof rawDay === 'string') {
        // format: "10:00-22:00"
        const parts = (rawDay as string).split('-');
        if (parts.length === 2) {
          openTime = parts[0].trim();
          closeTime = parts[1].trim();
        }
      } else if (typeof rawDay === 'object') {
        const obj = rawDay as { open?: string; close?: string; enabled?: boolean };
        if (obj.enabled === false) { dayEnabled = false; }
        if (obj.open) openTime = obj.open;
        if (obj.close) closeTime = obj.close;
      }

      if (!dayEnabled) {
        console.log('[Booking/DateTime] Venue closed on this day');
        setTimeSlots([]);
        setLoadingSlots(false);
        return;
      }

      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('start_at, duration_minutes')
        .eq('shop_id', venueId)
        .eq('status', 'confirmed')
        .gte('start_at', startOfDay.toISOString())
        .lte('start_at', endOfDay.toISOString());

      const bookedTimes = (bookingsData ?? []).map((b: any) =>
        new Date(b.start_at).toTimeString().slice(0, 5)
      );

      console.log('[Booking/DateTime] Booked times:', bookedTimes);
      const slots = generateSlots(openTime, closeTime, bookedTimes);
      setTimeSlots(slots);
    } catch (err) {
      console.log('[Booking/DateTime] fetchAvailability error:', err);
      setTimeSlots(generateSlots('09:00', '18:00', []));
    } finally {
      setLoadingSlots(false);
    }
  }, [venueId, selectedDate, dates]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleDateSelect = useCallback((index: number, day: string) => {
    console.log('[Booking/DateTime] Date selected:', index, day);
    setSelectedDate(index);
    setSelectedTime(null);
  }, []);

  const handleTimeSelect = useCallback((time: string) => {
    console.log('[Booking/DateTime] Time selected:', time);
    setSelectedTime(time);
  }, []);

  const handleContinue = useCallback(() => {
    if (!selectedTime) return;
    const dateStr = dates[selectedDate].full;
    console.log('[Booking/DateTime] Continue pressed, date:', dateStr, 'time:', selectedTime);
    router.push(`/booking/confirm?venueId=${venueId}&services=${services}&staffId=${staffId}&date=${encodeURIComponent(dateStr)}&time=${encodeURIComponent(selectedTime)}`);
  }, [selectedTime, selectedDate, dates, venueId, services, staffId, router]);

  const handleBack = useCallback(() => {
    console.log('[Booking/DateTime] Back pressed');
    router.back();
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Select date and time</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ProgressDots step={3} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Barber pill */}
        <AnimatedPressable
          onPress={() => console.log('[Booking/DateTime] Barber pill pressed')}
          style={styles.barberPill}
        >
          <User size={14} color={MADAR_COLORS.textSecondary} />
          <Text style={styles.barberPillText}>{staffName}</Text>
          <ChevronDown size={14} color={MADAR_COLORS.textSecondary} />
        </AnimatedPressable>

        {/* Date strip */}
        <Text style={styles.sectionLabel}>Select a date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
          {dates.map((d, index) => {
            const isSelected = selectedDate === index;
            return (
              <AnimatedPressable
                key={d.full}
                onPress={() => handleDateSelect(index, d.day)}
                style={[styles.dateItem, isSelected && styles.dateItemSelected]}
              >
                <Text style={[styles.dateDayName, isSelected && styles.dateTextSelected]}>{d.day.toUpperCase()}</Text>
                <Text style={[styles.dateNumber, isSelected && styles.dateTextSelected]}>{d.date}</Text>
                <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>{d.month.toUpperCase()}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {/* Time slots */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Pick a time</Text>
        {loadingSlots ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={MADAR_COLORS.gold} />
          </View>
        ) : timeSlots.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Text style={{ color: MADAR_COLORS.textSecondary, fontSize: 14 }}>No available slots for this day</Text>
          </View>
        ) : (
          <View style={styles.timeList}>
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time;
              const isBooked = !slot.available;

              if (isBooked) {
                return (
                  <View key={slot.time} style={styles.timeRowBooked}>
                    <Text style={styles.timeTextBooked}>{slot.time}</Text>
                    <Text style={styles.bookedLabel}>Booked</Text>
                  </View>
                );
              }

              return (
                <AnimatedPressable
                  key={slot.time}
                  onPress={() => handleTimeSelect(slot.time)}
                  style={[styles.timeRow, isSelected && styles.timeRowSelected]}
                >
                  <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>
                    {slot.time}
                  </Text>
                  {isSelected ? (
                    <View style={styles.checkCircle}>
                      <Check size={14} color="#000" strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={styles.plusCircle}>
                      <Plus size={14} color={MADAR_COLORS.textSecondary} strokeWidth={2} />
                    </View>
                  )}
                </AnimatedPressable>
              );
            })}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Full-width continue button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {!selectedTime && (
          <Text style={styles.noSelection}>Select a time slot</Text>
        )}
        <AnimatedPressable
          onPress={handleContinue}
          disabled={!selectedTime}
          style={styles.continueBtn}
        >
          <LinearGradient
            colors={selectedTime ? ['#C9A84C', '#E8C96A'] : [MADAR_COLORS.surfaceSecondary, MADAR_COLORS.surfaceSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnGradient}
          >
            <Text style={[styles.continueBtnText, !selectedTime && { color: MADAR_COLORS.textTertiary }]}>
              Continue
            </Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: MADAR_COLORS.text },
  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: MADAR_COLORS.surfaceSecondary },
  dotActive: { backgroundColor: MADAR_COLORS.gold, width: 24 },
  dotDone: { backgroundColor: MADAR_COLORS.goldMuted },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  barberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
  },
  barberPillText: {
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    fontWeight: '500',
  },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: MADAR_COLORS.text, marginBottom: 12 },
  dateStrip: { gap: 8, paddingBottom: 4 },
  dateItem: {
    width: 64,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    alignItems: 'center',
    gap: 2,
  },
  dateItemSelected: { backgroundColor: MADAR_COLORS.gold, borderColor: MADAR_COLORS.gold },
  dateDayName: { fontSize: 10, color: MADAR_COLORS.textSecondary, fontWeight: '600', letterSpacing: 0.5 },
  dateNumber: { fontSize: 22, fontWeight: '800', color: MADAR_COLORS.text },
  dateMonth: { fontSize: 9, color: MADAR_COLORS.textTertiary, fontWeight: '600', letterSpacing: 0.5 },
  dateTextSelected: { color: MADAR_COLORS.background },
  timeList: {
    gap: 10,
  },
  timeRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  timeRowSelected: {
    backgroundColor: MADAR_COLORS.goldMuted,
    borderColor: MADAR_COLORS.gold,
  },
  timeRowBooked: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(232,84,84,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232,84,84,0.3)',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: MADAR_COLORS.text,
  },
  timeTextSelected: {
    color: MADAR_COLORS.gold,
  },
  timeTextBooked: {
    fontSize: 16,
    fontWeight: '600',
    color: MADAR_COLORS.danger,
    textDecorationLine: 'line-through',
  },
  bookedLabel: {
    fontSize: 13,
    color: MADAR_COLORS.danger,
    fontWeight: '600',
  },
  plusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: MADAR_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MADAR_COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: MADAR_COLORS.border,
    gap: 8,
  },
  noSelection: {
    fontSize: 13,
    color: MADAR_COLORS.textTertiary,
    textAlign: 'center',
  },
  continueBtn: { borderRadius: 28 },
  continueBtnGradient: { paddingVertical: 16, borderRadius: 28, alignItems: 'center' },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.background },
});
