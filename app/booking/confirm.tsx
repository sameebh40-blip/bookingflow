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
import {
  ArrowLeft,
  Check,
  Calendar,
  Clock,
  Scissors,
  DollarSign,
  MapPin,
  MessageSquare,
  BookOpen,
} from 'lucide-react-native';
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
  '5': { name: 'kids', price: 0 },
  '6': { name: 'Beard Styling', price: 5 },
};

const MOCK_STAFF: Record<string, { name: string; avatar: string }> = {
  'any': { name: 'Any available', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  '1': { name: 'majed barber', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  '2': { name: 'Khalid Hassan', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
  '3': { name: 'Omar Saleh', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' },
};

const STAR_PARTICLES = [
  { top: '8%', left: '10%', size: 6, opacity: 0.6, char: '✦' },
  { top: '12%', left: '80%', size: 8, opacity: 0.4, char: '✦' },
  { top: '5%', left: '55%', size: 5, opacity: 0.5, char: '·' },
  { top: '20%', left: '25%', size: 4, opacity: 0.3, char: '✦' },
  { top: '18%', left: '70%', size: 6, opacity: 0.5, char: '·' },
  { top: '30%', left: '5%', size: 5, opacity: 0.4, char: '✦' },
  { top: '35%', left: '90%', size: 7, opacity: 0.3, char: '·' },
  { top: '25%', left: '45%', size: 4, opacity: 0.6, char: '✦' },
  { top: '40%', left: '15%', size: 6, opacity: 0.3, char: '·' },
  { top: '45%', left: '75%', size: 5, opacity: 0.5, char: '✦' },
  { top: '55%', left: '30%', size: 4, opacity: 0.4, char: '·' },
  { top: '60%', left: '85%', size: 6, opacity: 0.3, char: '✦' },
];

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
  const staffInfo = MOCK_STAFF[staffId ?? 'any'] ?? MOCK_STAFF['any'];
  const staffName = staffInfo.name;
  const staffAvatar = staffInfo.avatar;

  const serviceNameDisplay = selectedServices.length > 0 ? selectedServices[0].name : 'kids';

  const dateObj = date ? new Date(date) : new Date();
  const dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const priceDisplay = `${totalPrice.toFixed(3)} BHD`;
  const timeDisplay = time ?? '17:30';

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

  const handleViewBookings = useCallback(() => {
    console.log('[Booking/Confirm] View Booking pressed, navigating to bookings');
    router.replace('/(tabs)/bookings');
  }, [router]);

  const handleAddCalendar = useCallback(() => {
    console.log('[Booking/Confirm] Add to Calendar pressed');
  }, []);

  const handleGetDirections = useCallback(() => {
    console.log('[Booking/Confirm] Get Directions pressed');
  }, []);

  const handleViewBookingCard = useCallback(() => {
    console.log('[Booking/Confirm] View Booking card pressed');
    router.replace('/(tabs)/bookings');
  }, [router]);

  const handleMessageShop = useCallback(() => {
    console.log('[Booking/Confirm] Message Shop pressed');
    router.push(`/chat/${venueId}`);
  }, [router, venueId]);

  const handleBack = useCallback(() => {
    console.log('[Booking/Confirm] Back pressed');
    router.back();
  }, [router]);

  if (confirmed) {
    return (
      <View style={[styles.confirmedContainer, { paddingTop: insets.top }]}>
        {/* Star particles */}
        {STAR_PARTICLES.map((p, i) => (
          <Text
            key={i}
            style={{
              position: 'absolute',
              top: p.top as any,
              left: p.left as any,
              fontSize: p.size,
              color: i % 3 === 0 ? MADAR_COLORS.gold : '#fff',
              opacity: p.opacity,
            }}
          >
            {p.char}
          </Text>
        ))}

        <ScrollView
          contentContainerStyle={[styles.confirmedContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Gold checkmark */}
          <View style={styles.checkCircle}>
            <Check size={40} color="#000" strokeWidth={3} />
          </View>

          <Text style={styles.confirmedTitle}>Booking Confirmed!</Text>
          <Text style={styles.confirmedSubtitle}>Your appointment is all set.</Text>

          {/* Barber card */}
          <View style={styles.barberCard}>
            <Image source={resolveImageSource(staffAvatar)} style={styles.barberAvatar} />
            <View style={styles.barberInfo}>
              <Text style={styles.barberName}>{staffName}</Text>
              <Text style={styles.barberSpecialty}>Fade Specialist</Text>
            </View>
          </View>

          {/* Details card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Scissors size={16} color={MADAR_COLORS.gold} />
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue}>{serviceNameDisplay}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Calendar size={16} color={MADAR_COLORS.gold} />
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{dateDisplay}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Clock size={16} color={MADAR_COLORS.gold} />
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{timeDisplay}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <DollarSign size={16} color={MADAR_COLORS.gold} />
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>{priceDisplay}</Text>
            </View>
          </View>

          {/* 2x2 action grid */}
          <View style={styles.actionGrid}>
            <AnimatedPressable onPress={handleAddCalendar} style={styles.actionCard}>
              <Calendar size={20} color={MADAR_COLORS.gold} />
              <Text style={styles.actionLabel}>Add to Calendar</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleGetDirections} style={styles.actionCard}>
              <MapPin size={20} color={MADAR_COLORS.gold} />
              <Text style={styles.actionLabel}>Get Directions</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleViewBookingCard} style={styles.actionCard}>
              <BookOpen size={20} color={MADAR_COLORS.gold} />
              <Text style={styles.actionLabel}>View Booking</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleMessageShop} style={styles.actionCard}>
              <MessageSquare size={20} color={MADAR_COLORS.gold} />
              <Text style={styles.actionLabel}>Message Shop</Text>
            </AnimatedPressable>
          </View>

          {/* View Booking button */}
          <AnimatedPressable onPress={handleViewBookings} style={styles.viewBookingBtn}>
            <LinearGradient
              colors={['#C9A84C', '#E8C96A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.viewBookingGradient}
            >
              <BookOpen size={18} color={MADAR_COLORS.background} />
              <Text style={styles.viewBookingText}>View Booking</Text>
            </LinearGradient>
          </AnimatedPressable>
        </ScrollView>
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
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Clock size={16} color={MADAR_COLORS.gold} />
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{timeDisplay}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Scissors size={16} color={MADAR_COLORS.gold} />
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
  // Confirmed state
  confirmedContainer: {
    flex: 1,
    backgroundColor: MADAR_COLORS.background,
  },
  confirmedContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
    gap: 16,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: MADAR_COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  confirmedTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: MADAR_COLORS.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  confirmedSubtitle: {
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    textAlign: 'center',
  },
  barberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    width: '100%',
  },
  barberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  barberInfo: {
    gap: 3,
  },
  barberName: {
    fontSize: 16,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  barberSpecialty: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
  },
  detailsCard: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: MADAR_COLORS.text,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  detailDivider: {
    height: 1,
    backgroundColor: MADAR_COLORS.divider,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  actionLabel: {
    fontSize: 13,
    color: MADAR_COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  viewBookingBtn: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 4,
  },
  viewBookingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 28,
  },
  viewBookingText: {
    fontSize: 16,
    fontWeight: '700',
    color: MADAR_COLORS.background,
  },
  // Pre-confirm state
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
  confirmBtn: { borderRadius: 28 },
  confirmBtnGradient: { paddingVertical: 16, borderRadius: 28, alignItems: 'center' },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.background },
});
