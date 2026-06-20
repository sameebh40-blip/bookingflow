import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle, Calendar, Clock, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
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

const MOCK_SERVICES: Record<string, { name: string; price: number }> = {
  '1': { name: 'Classic Haircut', price: 5 },
  '2': { name: 'Fade + Beard Trim', price: 8 },
  '3': { name: 'Hot Towel Shave', price: 7 },
  '4': { name: 'Hair + Beard Combo', price: 12 },
  '5': { name: 'Kids Haircut', price: 4 },
  '6': { name: 'Beard Styling', price: 5 },
};

const MOCK_STAFF: Record<string, string> = {
  'any': 'Any available',
  '1': 'Ahmed Al-Rashid',
  '2': 'Khalid Hassan',
  '3': 'Omar Saleh',
};

export default function BookingConfirmScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { venueId, services, staffId, date, time } = useLocalSearchParams<{
    venueId: string;
    services: string;
    staffId: string;
    date: string;
    time: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const serviceIds = (services ?? '').split(',').filter(Boolean);
  const selectedServices = serviceIds.map(id => MOCK_SERVICES[id]).filter(Boolean);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const staffName = MOCK_STAFF[staffId ?? 'any'] ?? 'Any available';

  const dateObj = date ? new Date(date) : new Date();
  const dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const handleConfirm = useCallback(async () => {
    console.log('[Booking/Confirm] Confirm booking pressed, venueId:', venueId, 'services:', serviceIds, 'staff:', staffId, 'date:', date, 'time:', time);
    setLoading(true);
    try {
      if (user) {
        const { error } = await supabase.from('appointments').insert({
          user_id: user.id,
          venue_id: venueId,
          staff_id: staffId !== 'any' ? staffId : null,
          date: date,
          time: time,
          services: serviceIds,
          total_price: totalPrice,
          status: 'upcoming',
        });
        if (error) {
          console.log('[Booking/Confirm] Supabase insert error (non-fatal):', error.message);
        } else {
          console.log('[Booking/Confirm] Appointment saved to Supabase');
        }
      }
      setConfirmed(true);
    } catch (err) {
      console.log('[Booking/Confirm] Exception:', err);
      setConfirmed(true);
    } finally {
      setLoading(false);
    }
  }, [user, venueId, serviceIds, staffId, date, time, totalPrice]);

  const handleDone = useCallback(() => {
    console.log('[Booking/Confirm] Done pressed, navigating to bookings');
    router.replace('/(tabs)/bookings');
  }, [router]);

  const handleBack = useCallback(() => {
    console.log('[Booking/Confirm] Back pressed');
    router.back();
  }, [router]);

  if (confirmed) {
    return (
      <View style={[styles.container, styles.successContainer, { paddingTop: insets.top }]}>
        <View style={styles.successIcon}>
          <CheckCircle size={64} color={MADAR_COLORS.success} />
        </View>
        <Text style={styles.successTitle}>Booking confirmed!</Text>
        <Text style={styles.successSubtitle}>
          Your appointment has been booked successfully. We'll send you a reminder before your visit.
        </Text>
        <AnimatedPressable onPress={handleDone} style={styles.doneBtn}>
          <LinearGradient
            colors={['#C9A84C', '#E8C96A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.doneBtnGradient}
          >
            <Text style={styles.doneBtnText}>View my bookings</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Confirm booking</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ProgressDots step={4} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Venue card */}
        <View style={styles.summaryCard}>
          <Image
            source={resolveImageSource('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400')}
            style={styles.venueImage}
            resizeMode="cover"
          />
          <View style={styles.venueInfo}>
            <Text style={styles.venueName}>Level Barber Shop</Text>
            <Text style={styles.venueAddress}>Avenue 11, Tubli, Bahrain</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Calendar size={16} color={MADAR_COLORS.gold} />
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{dateDisplay}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Clock size={16} color={MADAR_COLORS.gold} />
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{time ?? 'N/A'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <User size={16} color={MADAR_COLORS.gold} />
            <Text style={styles.detailLabel}>Specialist</Text>
            <Text style={styles.detailValue}>{staffName}</Text>
          </View>
        </View>

        {/* Services */}
        <View style={styles.servicesCard}>
          <Text style={styles.servicesTitle}>Services</Text>
          {selectedServices.map((s, i) => (
            <View key={i} style={styles.serviceRow}>
              <Text style={styles.serviceName}>{s.name}</Text>
              <Text style={styles.servicePrice}>BHD {s.price}</Text>
            </View>
          ))}
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>BHD {totalPrice.toFixed(3)}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <AnimatedPressable
          onPress={handleConfirm}
          disabled={loading}
          style={styles.confirmBtn}
        >
          <LinearGradient
            colors={['#C9A84C', '#E8C96A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmBtnGradient}
          >
            <Text style={styles.confirmBtnText}>
              {loading ? 'Confirming...' : 'Confirm booking'}
            </Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  successContainer: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 },
  successIcon: {
    width: 120, height: 120, borderRadius: 30,
    backgroundColor: 'rgba(76,175,125,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: MADAR_COLORS.text, letterSpacing: -0.5 },
  successSubtitle: { fontSize: 15, color: MADAR_COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  doneBtn: { marginTop: 16, width: '100%', borderRadius: 12 },
  doneBtnGradient: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.background },
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
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  summaryCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    alignItems: 'center',
  },
  venueImage: { width: 64, height: 64, borderRadius: 12 },
  venueInfo: { flex: 1, gap: 4 },
  venueName: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.text },
  venueAddress: { fontSize: 12, color: MADAR_COLORS.textSecondary },
  detailsCard: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  detailLabel: { fontSize: 14, color: MADAR_COLORS.textSecondary, flex: 1 },
  detailValue: { fontSize: 14, color: MADAR_COLORS.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: MADAR_COLORS.divider },
  servicesCard: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    gap: 12,
  },
  servicesTitle: { fontSize: 15, fontWeight: '700', color: MADAR_COLORS.text },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontSize: 14, color: MADAR_COLORS.textSecondary },
  servicePrice: { fontSize: 14, color: MADAR_COLORS.text, fontWeight: '600' },
  totalDivider: { height: 1, backgroundColor: MADAR_COLORS.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.text },
  totalPrice: { fontSize: 20, fontWeight: '800', color: MADAR_COLORS.gold, letterSpacing: -0.3 },
  bottomBar: {
    paddingHorizontal: 20, paddingTop: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderTopWidth: 1, borderTopColor: MADAR_COLORS.border,
  },
  confirmBtn: { borderRadius: 12 },
  confirmBtnGradient: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.background },
});
