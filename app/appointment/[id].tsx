import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Dimensions, Alert, Linking, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  MessageCircle,
  Store,
  ChevronRight,
  RefreshCw,
  X,
  MapPin,
  Check,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';

const { width: screenWidth } = Dimensions.get('window');

interface Service {
  name: string;
  price: number;
  staff: string;
  duration: number;
}

interface AppointmentDetail {
  id: string;
  shop_id: string;
  venue_name: string;
  venue_image: string;
  venue_address: string;
  date: string;
  duration: number;
  status: string;
  booking_ref: string;
  latitude: number;
  longitude: number;
  services: Service[];
  cancel_reason?: string;
}

const MOCK_APPT_DETAIL: Record<string, AppointmentDetail> = {
  '1': {
    id: '1',
    shop_id: '1',
    venue_name: 'Level Barber Shop',
    venue_image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
    venue_address: 'Avenue 11, Tubli, Bahrain',
    date: 'Today at 8:30 PM',
    duration: 30,
    status: 'confirmed',
    booking_ref: '44468B7A',
    latitude: 26.2235,
    longitude: 50.5876,
    services: [{ name: 'Haircut', price: 5, staff: 'Ahmed', duration: 30 }],
  },
  '2': {
    id: '2',
    shop_id: '2',
    venue_name: 'The Groom Room',
    venue_image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
    venue_address: 'Mall of Dilmunia, Shop 26, Bahrain',
    date: 'Fri, Jun 19, 2026 at 7:25 AM',
    duration: 45,
    status: 'confirmed',
    booking_ref: '55B7C2D1',
    latitude: 26.2235,
    longitude: 50.5876,
    services: [
      { name: 'Haircut & Beard Trim', price: 5, staff: 'Khalid', duration: 30 },
      { name: 'Hot Towel Shave', price: 2, staff: 'Khalid', duration: 15 },
    ],
  },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

const MAP_HTML = (lat: number, lng: number) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0}html,body,#map{width:100%;height:100%;background:#1a1a2e}</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false}).setView([${lat},${lng}],15);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);
var icon=L.divIcon({className:'',html:'<div style="background:#C9A84C;border-radius:50%;width:16px;height:16px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>',iconSize:[16,16],iconAnchor:[8,8]});
L.marker([${lat},${lng}],{icon:icon}).addTo(map);
</script></body></html>`;

export default function AppointmentDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const apptId = id ?? '1';

  const [appt, setAppt] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointment();
  }, [apptId]);

  const fetchAppointment = async () => {
    console.log('[AppointmentDetail] Fetching booking:', apptId);
    setLoading(true);
    try {
      const [bookingRes, servicesRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, start_at, end_at, status, price_bhd, total_price, cancel_reason, cancelled_reason, shop_id, barber_id, service_id, barbershops!shop_id(name, cover_url, address, lat, lng)')
          .eq('id', apptId)
          .single(),
        supabase
          .from('booking_services')
          .select('id, service_name_en, price_bhd, duration_minutes')
          .eq('booking_id', apptId),
      ]);

      if (bookingRes.error || !bookingRes.data) {
        console.log('[AppointmentDetail] Booking not found:', bookingRes.error?.message);
        setAppt(null);
        return;
      }

      const booking = bookingRes.data as any;
      const shop = booking.barbershops ?? {};
      const bookingServices = servicesRes.data ?? [];

      const totalDuration = bookingServices.length > 0
        ? bookingServices.reduce((sum: number, s: any) => sum + (s.duration_minutes ?? 30), 0)
        : 30;

      const mappedServices: Service[] = bookingServices.length > 0
        ? bookingServices.map((s: any) => ({
            name: s.service_name_en ?? 'Service',
            price: Number(s.price_bhd) || 0,
            staff: 'Specialist',
            duration: s.duration_minutes ?? 30,
          }))
        : [{ name: 'Service', price: Number(booking.price_bhd ?? booking.total_price ?? 0), staff: 'Specialist', duration: 30 }];

      const cancelReason = booking.cancel_reason ?? booking.cancelled_reason ?? undefined;

      const detail: AppointmentDetail = {
        id: booking.id,
        shop_id: booking.shop_id ?? '',
        venue_name: shop.name ?? 'Unknown',
        venue_image: shop.cover_url ?? '',
        venue_address: shop.address ?? '',
        date: booking.start_at ? formatDate(booking.start_at) : '',
        duration: totalDuration,
        status: booking.status ?? 'pending',
        booking_ref: String(booking.id).slice(-8).toUpperCase(),
        latitude: Number(shop.lat) || 26.2235,
        longitude: Number(shop.lng) || 50.5876,
        services: mappedServices,
        cancel_reason: cancelReason,
      };

      console.log('[AppointmentDetail] Loaded booking:', detail.id, 'status:', detail.status);
      setAppt(detail);
    } catch (err) {
      console.log('[AppointmentDetail] Exception fetching booking:', err);
      setAppt(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = useCallback(() => {
    console.log('[AppointmentDetail] Back pressed');
    router.back();
  }, [router]);

  const handleAddToCalendar = useCallback(() => {
    console.log('[AppointmentDetail] Add to calendar pressed for:', apptId);
  }, [apptId]);

  const handleSendMessage = useCallback(() => {
    if (!appt) return;
    console.log('[AppointmentDetail] Send message pressed, navigating to chat for shop:', appt.shop_id);
    router.push(`/chat/${appt.shop_id}`);
  }, [appt, router]);

  const handleVenueDetails = useCallback(() => {
    if (!appt) return;
    console.log('[AppointmentDetail] Venue details pressed, navigating to venue:', appt.shop_id);
    router.push(`/venue/${appt.shop_id}`);
  }, [appt, router]);

  const handleReschedule = useCallback(() => {
    if (!appt) return;
    console.log('[AppointmentDetail] Reschedule pressed for shop:', appt.shop_id);
    router.push(`/booking/datetime?venueId=${appt.shop_id}`);
  }, [appt, router]);

  const handleBookAgain = useCallback(() => {
    if (!appt) return;
    console.log('[AppointmentDetail] Book again pressed for shop:', appt.shop_id);
    router.push(`/venue/${appt.shop_id}`);
  }, [appt, router]);

  const handleCancelPress = useCallback(() => {
    if (!appt) return;
    console.log('[AppointmentDetail] Cancel appointment pressed for:', appt.id);
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: async () => {
          console.log('[AppointmentDetail] Confirmed cancel for:', appt.id);
          await supabase.from('bookings').update({ status: 'cancelled', cancel_reason: 'Customer cancelled via app' }).eq('id', appt.id);
          router.back();
        }},
      ]
    );
  }, [appt, router]);

  const handleGetDirections = useCallback(() => {
    if (!appt) return;
    console.log('[AppointmentDetail] Get directions pressed for:', appt.venue_address);
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${encodeURIComponent(appt.venue_address)}`
      : `geo:0,0?q=${encodeURIComponent(appt.venue_address)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(appt.venue_address ?? '')}`);
    });
  }, [appt]);

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={MADAR_COLORS.gold} />
      </View>
    );
  }

  if (!appt) return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }]}>
      <AnimatedPressable onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 12, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: MADAR_COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: MADAR_COLORS.border }}>
        <ArrowLeft size={20} color={MADAR_COLORS.text} />
      </AnimatedPressable>
      <Text style={{ color: MADAR_COLORS.textSecondary, fontSize: 16 }}>Booking not found</Text>
    </View>
  );

  const totalPrice = appt.services.reduce((s: number, sv: Service) => s + sv.price, 0);
  const totalPriceStr = totalPrice.toFixed(3);
  const mapHtml = MAP_HTML(appt.latitude, appt.longitude);
  const backBtnTop = insets.top + 12;

  const isPast = appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'no_show';

  // Status badge config
  let badgeBg = 'rgba(76,175,125,0.15)';
  let badgeColor = MADAR_COLORS.success;
  let badgeLabel = 'Confirmed';
  let BadgeIcon = Check;

  if (appt.status === 'completed') {
    badgeBg = 'rgba(76,175,125,0.15)';
    badgeColor = MADAR_COLORS.success;
    badgeLabel = 'Completed';
    BadgeIcon = Check;
  } else if (appt.status === 'cancelled') {
    badgeBg = 'rgba(232,84,84,0.15)';
    badgeColor = MADAR_COLORS.danger;
    badgeLabel = 'Cancelled';
    BadgeIcon = X;
  } else if (appt.status === 'no_show') {
    badgeBg = 'rgba(232,84,84,0.15)';
    badgeColor = MADAR_COLORS.danger;
    badgeLabel = 'No show';
    BadgeIcon = X;
  } else if (appt.status === 'rescheduled') {
    badgeBg = 'rgba(201,168,76,0.15)';
    badgeColor = MADAR_COLORS.gold;
    badgeLabel = 'Rescheduled';
    BadgeIcon = RefreshCw;
  }

  const cancelReason = appt.cancel_reason;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: appt.venue_image }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(10,10,15,0.92)']}
            style={StyleSheet.absoluteFillObject}
          />
          <AnimatedPressable
            onPress={handleBack}
            style={[styles.backBtn, { top: backBtnTop }]}
          >
            <ArrowLeft size={20} color="#fff" />
          </AnimatedPressable>
          <View style={styles.heroNameContainer}>
            <Text style={styles.heroVenueName}>{appt.venue_name}</Text>
          </View>
        </View>

        {/* Main card */}
        <View style={styles.mainCard}>
          {/* Status badge */}
          <View style={[styles.confirmedBadge, { backgroundColor: badgeBg }]}>
            <BadgeIcon size={14} color={badgeColor} />
            <Text style={[styles.confirmedText, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>

          {/* Cancel reason box */}
          {appt.status === 'cancelled' && cancelReason ? (
            <View style={styles.cancelReasonBox}>
              <Text style={styles.cancelReasonTitle}>Cancellation reason</Text>
              <Text style={styles.cancelReasonText}>{cancelReason}</Text>
            </View>
          ) : null}

          {/* Date + duration */}
          <Text style={styles.dateText}>{appt.date}</Text>
          <Text style={styles.durationText}>{appt.duration} min duration</Text>

          {/* Action rows */}
          {!isPast && (
            <AnimatedPressable onPress={handleAddToCalendar} style={styles.actionRow}>
              <View style={[styles.actionIcon, { backgroundColor: MADAR_COLORS.goldMuted }]}>
                <Calendar size={18} color={MADAR_COLORS.gold} />
              </View>
              <Text style={styles.actionLabel}>Add to calendar</Text>
              <ChevronRight size={18} color={MADAR_COLORS.textTertiary} />
            </AnimatedPressable>
          )}

          {isPast && (
            <AnimatedPressable onPress={handleBookAgain} style={styles.actionRow}>
              <View style={[styles.actionIcon, { backgroundColor: MADAR_COLORS.goldMuted }]}>
                <RefreshCw size={18} color={MADAR_COLORS.gold} />
              </View>
              <Text style={styles.actionLabel}>Book again</Text>
              <ChevronRight size={18} color={MADAR_COLORS.textTertiary} />
            </AnimatedPressable>
          )}

          <AnimatedPressable onPress={handleSendMessage} style={styles.actionRow}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(123,94,167,0.15)' }]}>
              <MessageCircle size={18} color="#7B5EA7" />
            </View>
            <Text style={styles.actionLabel}>Send message</Text>
            <ChevronRight size={18} color={MADAR_COLORS.textTertiary} />
          </AnimatedPressable>

          <AnimatedPressable onPress={handleVenueDetails} style={styles.actionRow}>
            <View style={[styles.actionIcon, { backgroundColor: MADAR_COLORS.surfaceSecondary }]}>
              <Store size={18} color={MADAR_COLORS.textSecondary} />
            </View>
            <Text style={styles.actionLabel}>Venue details</Text>
            <ChevronRight size={18} color={MADAR_COLORS.textTertiary} />
          </AnimatedPressable>
        </View>

        {/* Overview section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Overview</Text>
          {appt.services.map((svc: Service, i: number) => {
            const svcPriceStr = svc.price.toFixed(3);
            const staffLine = `${svc.duration} min with ${svc.staff}`;
            return (
              <View key={i} style={styles.serviceRow}>
                <View style={styles.serviceRowTop}>
                  <Text style={styles.serviceName}>{svc.name}</Text>
                  <Text style={styles.servicePrice}>BHD {svcPriceStr}</Text>
                </View>
                <Text style={styles.serviceStaff}>{staffLine}</Text>
              </View>
            );
          })}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>BHD {totalPriceStr}</Text>
          </View>
        </View>

        {/* More details section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>More details</Text>
          <View style={styles.policyBox}>
            <Text style={styles.policyTitle}>Cancellation policy</Text>
            <Text style={styles.policyText}>You can cancel at any time before your appointment.</Text>
          </View>
          {!isPast && (
            <>
              <AnimatedPressable onPress={handleReschedule} style={styles.actionRow}>
                <View style={[styles.actionIcon, { backgroundColor: MADAR_COLORS.goldMuted }]}>
                  <RefreshCw size={18} color={MADAR_COLORS.gold} />
                </View>
                <Text style={styles.actionLabel}>Reschedule appointment</Text>
                <ChevronRight size={18} color={MADAR_COLORS.textTertiary} />
              </AnimatedPressable>
              <AnimatedPressable onPress={handleCancelPress} style={styles.cancelRow}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(232,84,84,0.15)' }]}>
                  <X size={18} color={MADAR_COLORS.danger} />
                </View>
                <Text style={styles.cancelLabel}>Cancel appointment</Text>
                <ChevronRight size={18} color={MADAR_COLORS.danger} />
              </AnimatedPressable>
            </>
          )}
        </View>

        {/* Getting there section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Getting there</Text>
          <View style={styles.mapContainer}>
            <WebView
              source={{ html: mapHtml }}
              style={styles.mapWebView}
              scrollEnabled={false}
              originWhitelist={['*']}
            />
          </View>
          <View style={styles.addressRow}>
            <MapPin size={16} color={MADAR_COLORS.textSecondary} style={styles.addressIcon} />
            <Text style={styles.addressText}>{appt.venue_address}</Text>
          </View>
          <AnimatedPressable onPress={handleGetDirections}>
            <Text style={styles.directionsLink}>Get directions</Text>
          </AnimatedPressable>
        </View>

        <Text style={styles.bookingRef}>Booking ref: {appt.booking_ref}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MADAR_COLORS.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  heroContainer: {
    height: 240,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13,13,20,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroNameContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  heroVenueName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 32,
  },
  mainCard: {
    backgroundColor: MADAR_COLORS.surface,
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  confirmedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cancelReasonBox: {
    backgroundColor: 'rgba(232,84,84,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,84,84,0.3)',
  },
  cancelReasonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MADAR_COLORS.danger,
    marginBottom: 4,
  },
  cancelReasonText: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
  },
  dateText: {
    fontSize: 22,
    fontWeight: '800',
    color: MADAR_COLORS.text,
    marginBottom: 4,
  },
  durationText: {
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    color: MADAR_COLORS.text,
    fontWeight: '500',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    marginBottom: 14,
  },
  serviceRow: {
    marginBottom: 12,
  },
  serviceRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: MADAR_COLORS.text,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  serviceStaff: {
    fontSize: 12,
    color: MADAR_COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: MADAR_COLORS.border,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: MADAR_COLORS.gold,
  },
  policyBox: {
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    marginBottom: 6,
  },
  policyText: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
    lineHeight: 20,
  },
  cancelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(232,84,84,0.08)',
    borderRadius: 12,
    padding: 14,
  },
  cancelLabel: {
    flex: 1,
    fontSize: 15,
    color: MADAR_COLORS.danger,
    fontWeight: '500',
  },
  mapContainer: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  mapWebView: {
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  addressIcon: {
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    lineHeight: 20,
  },
  directionsLink: {
    fontSize: 14,
    color: MADAR_COLORS.gold,
    fontWeight: '600',
  },
  bookingRef: {
    textAlign: 'center',
    fontSize: 12,
    color: MADAR_COLORS.textTertiary,
    marginTop: 24,
    marginBottom: 8,
  },
});
