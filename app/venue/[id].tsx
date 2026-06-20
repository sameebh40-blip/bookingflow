import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
  FlatList,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  Heart,
  Star,
  MapPin,
  Clock,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';

const { width: screenWidth } = Dimensions.get('window');

interface Venue {
  id: string;
  name: string;
  category: string;
  rating: number;
  review_count: number;
  distance_km: number;
  address: string;
  image_url: string;
  starting_price: number;
  description?: string;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
}

interface Staff {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  avatar: string;
}

const MOCK_VENUES: Record<string, Venue> = {
  '1': { id: '1', name: 'Level Barber Shop', category: 'Barber', rating: 5.0, review_count: 1336, distance_km: 0.75, address: 'Avenue 11, Tubli, Bahrain', image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', starting_price: 5, description: 'Level Barber Shop is a premium barbershop offering the finest cuts and grooming services in Bahrain. Our skilled barbers are dedicated to providing an exceptional experience with every visit.' },
  '2': { id: '2', name: 'The Groom Room', category: 'Barber', rating: 5.0, review_count: 513, distance_km: 14.6, address: 'Mall of Dilmunia, Shop 26, Building...', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', starting_price: 8, description: 'The Groom Room Barber Shop is an upscale, bespoke gentleman\'s barber shop that offers today\'s progressive gentlemen a haven where he can sit back, relax and experience the finest grooming.' },
  '3': { id: '3', name: 'Luxe Spa & Wellness', category: 'Spa', rating: 4.8, review_count: 287, distance_km: 2.1, address: 'Seef District, Manama', image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', starting_price: 25, description: 'A sanctuary of relaxation and rejuvenation in the heart of Manama. Our expert therapists offer a range of treatments designed to restore balance and harmony.' },
  '4': { id: '4', name: 'Nail Studio Pro', category: 'Nails', rating: 4.9, review_count: 412, distance_km: 1.3, address: 'Adliya, Manama', image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', starting_price: 12, description: 'Professional nail care and artistry. From classic manicures to intricate nail art, our technicians deliver flawless results every time.' },
};

const MOCK_SERVICES: Service[] = [
  { id: '1', name: 'Classic Haircut', duration: 30, price: 5, category: 'Hair' },
  { id: '2', name: 'Fade + Beard Trim', duration: 45, price: 8, category: 'Hair' },
  { id: '3', name: 'Hot Towel Shave', duration: 30, price: 7, category: 'Shaving' },
  { id: '4', name: 'Hair + Beard Combo', duration: 60, price: 12, category: 'Packages' },
  { id: '5', name: 'Kids Haircut', duration: 20, price: 4, category: 'Hair' },
];

const MOCK_STAFF: Staff[] = [
  { id: '1', name: 'Ahmed', specialty: 'Fade specialist', rating: 5.0, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  { id: '2', name: 'Khalid', specialty: 'Classic cuts', rating: 4.9, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
  { id: '3', name: 'Omar', specialty: 'Beard styling', rating: 4.8, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' },
];

const VENUE_IMAGES = [
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800',
];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function VenueDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isFavourite, setIsFavourite] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchVenueData();
  }, [id]);

  const fetchVenueData = async () => {
    console.log('[VenueDetail] Fetching venue:', id);
    try {
      const { data, error } = await supabase.from('venues').select('*').eq('id', id).single();
      if (error || !data) {
        console.log('[VenueDetail] Using mock venue data');
        setVenue(MOCK_VENUES[id ?? '1'] ?? MOCK_VENUES['1']);
      } else {
        setVenue(data);
      }
    } catch {
      setVenue(MOCK_VENUES[id ?? '1'] ?? MOCK_VENUES['1']);
    }

    try {
      const { data, error } = await supabase.from('services').select('*').eq('venue_id', id);
      if (error || !data || data.length === 0) {
        setServices(MOCK_SERVICES);
      } else {
        setServices(data);
      }
    } catch {
      setServices(MOCK_SERVICES);
    }
  };

  const toggleService = useCallback((serviceId: string, serviceName: string) => {
    console.log('[VenueDetail] Toggle service:', serviceId, serviceName);
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  }, []);

  const handleBookNow = useCallback(() => {
    console.log('[VenueDetail] Book now pressed, venue:', id, 'selected services:', Array.from(selectedServices));
    router.push(`/booking/services?venueId=${id}`);
  }, [id, selectedServices, router]);

  const handleBack = useCallback(() => {
    console.log('[VenueDetail] Back pressed');
    router.back();
  }, [router]);

  const handleShare = useCallback(() => {
    console.log('[VenueDetail] Share pressed');
  }, []);

  const handleFavourite = useCallback(() => {
    console.log('[VenueDetail] Favourite toggled:', !isFavourite);
    setIsFavourite(f => !f);
  }, [isFavourite]);

  const totalPrice = services
    .filter(s => selectedServices.has(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const servicesByCategory = services.reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  if (!venue) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: MADAR_COLORS.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  const descText = venue.description ?? '';
  const shortDesc = descText.slice(0, 120);
  const hasMore = descText.length > 120;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Photo carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            data={VENUE_IMAGES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setCurrentImage(index);
            }}
            renderItem={({ item }) => (
              <Image source={resolveImageSource(item)} style={styles.carouselImage} resizeMode="cover" />
            )}
            keyExtractor={(_, i) => String(i)}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent']}
            style={styles.carouselTopGradient}
          />
          {/* Back button */}
          <AnimatedPressable
            onPress={handleBack}
            style={[styles.carouselBtn, { top: insets.top + 12, left: 16 }]}
          >
            <ArrowLeft size={20} color="#fff" />
          </AnimatedPressable>
          {/* Share + Heart */}
          <View style={[styles.carouselBtnRow, { top: insets.top + 12, right: 16 }]}>
            <AnimatedPressable onPress={handleShare} style={styles.carouselBtn}>
              <Share2 size={18} color="#fff" />
            </AnimatedPressable>
            <AnimatedPressable onPress={handleFavourite} style={styles.carouselBtn}>
              <Heart
                size={18}
                color={isFavourite ? MADAR_COLORS.danger : '#fff'}
                fill={isFavourite ? MADAR_COLORS.danger : 'transparent'}
              />
            </AnimatedPressable>
          </View>
          {/* Image counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>{currentImage + 1}/{VENUE_IMAGES.length}</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{venue.category}</Text>
            </View>
          </View>

          <View style={styles.ratingRow}>
            <Star size={14} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
            <Text style={styles.ratingText}>{Number(venue.rating).toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({venue.review_count.toLocaleString()})</Text>
            <Text style={styles.dot}>·</Text>
            <Clock size={13} color={MADAR_COLORS.success} />
            <Text style={styles.openText}>Open until 9:00 PM</Text>
          </View>

          <View style={styles.addressPill}>
            <MapPin size={14} color={MADAR_COLORS.gold} />
            <Text style={styles.addressText} numberOfLines={1}>
              {Number(venue.distance_km).toFixed(1)} km · {venue.address}
            </Text>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descText}>
              {descExpanded ? descText : shortDesc}
              {hasMore && !descExpanded ? '...' : ''}
            </Text>
            {hasMore && (
              <AnimatedPressable
                onPress={() => {
                  console.log('[VenueDetail] Read more pressed');
                  setDescExpanded(e => !e);
                }}
              >
                <Text style={styles.readMore}>{descExpanded ? 'Show less' : 'Read more'}</Text>
              </AnimatedPressable>
            )}
          </View>

          {/* Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services ({services.length})</Text>
            {Object.entries(servicesByCategory).map(([category, catServices]) => (
              <View key={category} style={styles.serviceCategory}>
                <Text style={styles.serviceCategoryTitle}>{category}</Text>
                {catServices.map((service) => {
                  const isSelected = selectedServices.has(service.id);
                  return (
                    <View key={service.id} style={styles.serviceRow}>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <Text style={styles.serviceMeta}>{service.duration} min · BHD {service.price}</Text>
                      </View>
                      <AnimatedPressable
                        onPress={() => toggleService(service.id, service.name)}
                        style={[styles.addBtn, isSelected && styles.addBtnSelected]}
                      >
                        <Plus size={16} color={isSelected ? MADAR_COLORS.background : MADAR_COLORS.gold} />
                      </AnimatedPressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Staff */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our team</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {MOCK_STAFF.map((staff) => (
                <AnimatedPressable
                  key={staff.id}
                  onPress={() => console.log('[VenueDetail] Staff pressed:', staff.id, staff.name)}
                  style={styles.staffCard}
                >
                  <Image source={resolveImageSource(staff.avatar)} style={styles.staffAvatar} />
                  <Text style={styles.staffName}>{staff.name}</Text>
                  <Text style={styles.staffSpecialty}>{staff.specialty}</Text>
                  <View style={styles.staffRating}>
                    <Star size={10} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
                    <Text style={styles.staffRatingText}>{staff.rating}</Text>
                  </View>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomLeft}>
          <Text style={styles.servicesAvailable}>{services.length} services available</Text>
          {selectedServices.size > 0 && (
            <Text style={styles.selectedTotal}>
              {selectedServices.size} selected · BHD {totalPrice}
            </Text>
          )}
        </View>
        <AnimatedPressable onPress={handleBookNow} style={styles.bookNowBtn}>
          <LinearGradient
            colors={['#C9A84C', '#E8C96A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookNowGradient}
          >
            <Text style={styles.bookNowText}>Book now</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  carouselContainer: { height: 300, position: 'relative' },
  carouselImage: { width: screenWidth, height: 300 },
  carouselTopGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  carouselBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselBtnRow: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 8,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  infoCard: {
    backgroundColor: MADAR_COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 20,
  },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  venueName: { fontSize: 24, fontWeight: '800', color: MADAR_COLORS.text, flex: 1, letterSpacing: -0.5 },
  categoryBadge: {
    backgroundColor: MADAR_COLORS.goldMuted,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MADAR_COLORS.goldBorder,
  },
  categoryBadgeText: { fontSize: 12, color: MADAR_COLORS.gold, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  ratingText: { fontSize: 14, color: MADAR_COLORS.gold, fontWeight: '700' },
  reviewCount: { fontSize: 13, color: MADAR_COLORS.textSecondary },
  dot: { color: MADAR_COLORS.textTertiary },
  openText: { fontSize: 13, color: MADAR_COLORS.success, fontWeight: '500' },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  addressText: { fontSize: 13, color: MADAR_COLORS.textSecondary, flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: MADAR_COLORS.text, marginBottom: 12, letterSpacing: -0.2 },
  descText: { fontSize: 14, color: MADAR_COLORS.textSecondary, lineHeight: 22 },
  readMore: { fontSize: 14, color: MADAR_COLORS.gold, fontWeight: '600', marginTop: 6 },
  serviceCategory: { marginBottom: 16 },
  serviceCategoryTitle: { fontSize: 13, color: MADAR_COLORS.gold, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MADAR_COLORS.divider,
  },
  serviceInfo: { flex: 1, gap: 3 },
  serviceName: { fontSize: 15, fontWeight: '600', color: MADAR_COLORS.text },
  serviceMeta: { fontSize: 12, color: MADAR_COLORS.textSecondary },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: MADAR_COLORS.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnSelected: { backgroundColor: MADAR_COLORS.gold, borderColor: MADAR_COLORS.gold },
  staffCard: {
    width: 100,
    alignItems: 'center',
    gap: 6,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  staffAvatar: { width: 56, height: 56, borderRadius: 28 },
  staffName: { fontSize: 13, fontWeight: '700', color: MADAR_COLORS.text, textAlign: 'center' },
  staffSpecialty: { fontSize: 10, color: MADAR_COLORS.textSecondary, textAlign: 'center' },
  staffRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  staffRatingText: { fontSize: 11, color: MADAR_COLORS.gold, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: MADAR_COLORS.border,
  },
  bottomLeft: { gap: 2 },
  servicesAvailable: { fontSize: 13, color: MADAR_COLORS.textSecondary },
  selectedTotal: { fontSize: 14, color: MADAR_COLORS.gold, fontWeight: '700' },
  bookNowBtn: { borderRadius: 24 },
  bookNowGradient: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 24 },
  bookNowText: { fontSize: 15, fontWeight: '700', color: MADAR_COLORS.background },
});
