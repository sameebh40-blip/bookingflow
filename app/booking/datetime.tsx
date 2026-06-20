import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

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

const TIME_SLOTS = [
  { time: '9:00 AM', available: true },
  { time: '9:30 AM', available: true },
  { time: '10:00 AM', available: false },
  { time: '10:30 AM', available: true },
  { time: '11:00 AM', available: true },
  { time: '11:30 AM', available: false },
  { time: '12:00 PM', available: true },
  { time: '12:30 PM', available: true },
  { time: '1:00 PM', available: false },
  { time: '1:30 PM', available: true },
  { time: '2:00 PM', available: true },
  { time: '2:30 PM', available: true },
  { time: '3:00 PM', available: false },
  { time: '3:30 PM', available: true },
  { time: '4:00 PM', available: true },
  { time: '4:30 PM', available: true },
  { time: '5:00 PM', available: true },
  { time: '5:30 PM', available: false },
  { time: '6:00 PM', available: true },
  { time: '6:30 PM', available: true },
];

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
          <Text style={styles.headerTitle}>Pick a date & time</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ProgressDots step={3} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date strip */}
        <Text style={styles.sectionLabel}>Select date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
          {dates.map((d, index) => {
            const isSelected = selectedDate === index;
            return (
              <AnimatedPressable
                key={d.full}
                onPress={() => handleDateSelect(index, d.day)}
                style={[styles.dateItem, isSelected && styles.dateItemSelected]}
              >
                <Text style={[styles.dateDayName, isSelected && styles.dateTextSelected]}>{d.day}</Text>
                <Text style={[styles.dateNumber, isSelected && styles.dateTextSelected]}>{d.date}</Text>
                <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>{d.month}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {/* Time slots */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Select time</Text>
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map((slot) => {
            const isSelected = selectedTime === slot.time;
            return (
              <AnimatedPressable
                key={slot.time}
                onPress={() => slot.available && handleTimeSelect(slot.time)}
                disabled={!slot.available}
                style={[
                  styles.timeSlot,
                  isSelected && styles.timeSlotSelected,
                  !slot.available && styles.timeSlotUnavailable,
                ]}
              >
                <Text style={[
                  styles.timeSlotText,
                  isSelected && styles.timeSlotTextSelected,
                  !slot.available && styles.timeSlotTextUnavailable,
                ]}>
                  {slot.time}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomLeft}>
          {selectedTime ? (
            <Text style={styles.selectedInfo}>
              {dates[selectedDate].day}, {dates[selectedDate].date} {dates[selectedDate].month} · {selectedTime}
            </Text>
          ) : (
            <Text style={styles.noSelection}>Select a time slot</Text>
          )}
        </View>
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
  dateDayName: { fontSize: 11, color: MADAR_COLORS.textSecondary, fontWeight: '500' },
  dateNumber: { fontSize: 20, fontWeight: '800', color: MADAR_COLORS.text },
  dateMonth: { fontSize: 10, color: MADAR_COLORS.textTertiary },
  dateTextSelected: { color: MADAR_COLORS.background },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    alignItems: 'center',
  },
  timeSlotSelected: { borderColor: MADAR_COLORS.gold, backgroundColor: MADAR_COLORS.goldMuted },
  timeSlotUnavailable: { opacity: 0.35 },
  timeSlotText: { fontSize: 13, color: MADAR_COLORS.text, fontWeight: '500' },
  timeSlotTextSelected: { color: MADAR_COLORS.gold, fontWeight: '700' },
  timeSlotTextUnavailable: { textDecorationLine: 'line-through', color: MADAR_COLORS.textTertiary },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderTopWidth: 1, borderTopColor: MADAR_COLORS.border,
  },
  bottomLeft: { flex: 1 },
  selectedInfo: { fontSize: 13, color: MADAR_COLORS.gold, fontWeight: '600' },
  noSelection: { fontSize: 13, color: MADAR_COLORS.textTertiary },
  continueBtn: { borderRadius: 12 },
  continueBtnGradient: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  continueBtnText: { fontSize: 15, fontWeight: '700', color: MADAR_COLORS.background },
});
