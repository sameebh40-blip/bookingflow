import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Image,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share2, Heart, Star, MapPin, Clock } from 'lucide-react-native';
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
  is_open?: boolean;
  open_until?: string;
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

interface Review {
  id: string;
  name: string;
  initials: string;
  rating: number;
  comment: string;
  date: string;
}

const MOCK_VENUES: Record<string, Venue> = {
  '1': { id: '1', name: 'Level Barber Shop', category: 'Barber', rating: 5.0, review_count: 1336, distance_km: 0.75, address: 'Avenue 11, Tubli, Bahrain', image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', starting_price: 5, description: 'Level Barber Shop is a premium barbershop offering the finest cuts and grooming services in Bahrain. Our skilled barbers are dedicated to providing an exceptional experience with every visit. We specialize in modern fades, classic cuts, and beard grooming.', is_open: true, open_until: '9:00 PM' },
  '2': { id: '2', name: 'The Groom Room', category: 'Barber', rating: 5.0, review_count: 513, distance_km: 14.6, address: 'Mall of Dilmunia, Shop 26', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', starting_price: 8, description: "The Groom Room is an upscale gentleman's barber shop offering today's progressive gentlemen a haven where he can sit back, relax and experience the finest grooming.", is_open: true, open_until: '8:00 PM' },
  '3': { id: '3', name: 'Luxe Spa & Wellness', category: 'Spa', rating: 4.8, review_count: 287, distance_km: 2.1, address: 'Seef District, Manama', image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', starting_price: 25, description: 'A sanctuary of relaxation and rejuvenation in the heart of Manama.', is_open: false, open_until: '10:00 PM' },
};

const MOCK_SERVICES: Service[] = [
  { id: '1', name: 'Classic Haircut', duration: 30, price: 5, category: 'Hair' },
  { id: '2', name: 'Fade + Beard Trim', duration: 45, price: 8, category: 'Hair' },
  { id: '3', name: 'Hot Towel Shave', duration: 30, price: 7, category: 'Shaving' },
  { id: '4', name: 'Hair + Beard Combo', duration: 60, price: 12, category: 'Packages' },
  { id: '5', name: 'Kids Haircut', duration: 20, price: 4, category: 'Hair' },
  { id: '6', name: 'Skin Fade', duration: 45, price: 10, category: 'Hair' },
];

const MOCK_STAFF: Staff[] = [
  { id: '1', name: 'Ahmed', specialty: 'Fade specialist', rating: 5.0, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  { id: '2', name: 'Khalid', specialty: 'Classic cuts', rating: 4.9, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
  { id: '3', name: 'Omar', specialty: 'Beard styling', rating: 4.8, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' },
];

const MOCK_REVIEWS: Review[] = [
  { id: '1', name: 'Sdiqa A', initials: 'SA', rating: 5, comment: 'Perfect experience 😍 arti the best', date: 'Fri, Jun 19, 2026 at 1:39 PM' },
  { id: '2', name: 'Abrar M', initials: 'AM', rating: 5, comment: 'Amazing service, will definitely come back!', date: 'Tue, Jun 16, 2026 at 9:06 PM' },
  { id: '3', name: 'Khalid S', initials: 'KS', rating: 4, comment: 'Great haircut, very professional staff.', date: 'Mon, Jun 14, 2026 at 3:22 PM' },
];

const VENUE_IMAGES_FALLBACK = [
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800',
];

const TABS = ['Photos', 'About', 'Services', 'Team', 'Reviews', 'Other'];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [staff, setStaff] = useState<Staff[]>(MOCK_STAFF);
  const [isFavourite, setIsFavourite] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [activeTab, setActiveTab] = useState('Photos');
  const scrollViewRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);

  const aboutY = useRef(0);
  const servicesY = useRef(0);
  const teamY = useRef(0);
  const reviewsY = useRef(0);
  const otherY = useRef(0);

  useEffect(() => {
    fetchVenueData();
  }, [id]);

  const fetchVenueData = async () => {
    console.log('[VenueDetail] Fetching venue data for id:', id);
    try {
      const [venueRes, servicesRes, reviewsRes, staffRes] = await Promise.all([
        supabase.from('venues').select('*').eq('id', id).single(),
        supabase.from('venue_services').select('*').eq('venue_id', id),
        supabase.from('venue_reviews').select('*').eq('venue_id', id).order('created_at', { ascending: false }),
        supabase.from('staff').select('*').eq('venue_id', id),
      ]);

      console.log('[VenueDetail] Venue fetch result:', venueRes.error?.message ?? 'ok');
      setVenue(venueRes.error || !venueRes.data ? (MOCK_VENUES[id ?? '1'] ?? MOCK_VENUES['1']) : venueRes.data);

      console.log('[VenueDetail] Services fetch result:', servicesRes.error?.message ?? 'ok', 'count:', servicesRes.data?.length ?? 0);
      setServices(servicesRes.error || !servicesRes.data || servicesRes.data.length === 0 ? MOCK_SERVICES : servicesRes.data);

      console.log('[VenueDetail] Reviews fetch result:', reviewsRes.error?.message ?? 'ok', 'count:', reviewsRes.data?.length ?? 0);
      if (reviewsRes.data && reviewsRes.data.length > 0) {
        setReviews(reviewsRes.data);
      }

      console.log('[VenueDetail] Staff fetch result:', staffRes.error?.message ?? 'ok', 'count:', staffRes.data?.length ?? 0);
      if (staffRes.data && staffRes.data.length > 0) {
        setStaff(staffRes.data);
      }
    } catch (err) {
      console.log('[VenueDetail] Exception fetching venue data:', err);
      setVenue(MOCK_VENUES[id ?? '1'] ?? MOCK_VENUES['1']);
      setServices(MOCK_SERVICES);
    }
  };

  const handleTabPress = (tab: string) => {
    console.log('[VenueDetail] Tab pressed:', tab);
    setActiveTab(tab);
    const yMap: Record<string, number> = {
      Photos: 0,
      About: aboutY.current,
      Services: servicesY.current,
      Team: teamY.current,
      Reviews: reviewsY.current,
      Other: otherY.current,
    };
    scrollViewRef.current?.scrollTo({ y: yMap[tab] ?? 0, animated: true });
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y < aboutY.current - 60) setActiveTab('Photos');
    else if (y < servicesY.current - 60) setActiveTab('About');
    else if (y < teamY.current - 60) setActiveTab('Services');
    else if (y < reviewsY.current - 60) setActiveTab('Team');
    else if (y < otherY.current - 60) setActiveTab('Reviews');
    else setActiveTab('Other');
  };

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
  const shortDesc = descText.slice(0, 140);
  const hasMore = descText.length > 140;
  const ratingFixed = Number(venue.rating).toFixed(1);
  const distanceFixed = Number(venue.distance_km).toFixed(1);
  const openStatusText = venue.is_open
    ? `Open until ${venue.open_until ?? '9:00 PM'}`
    : 'Closed';
  const openStatusColor = venue.is_open ? MADAR_COLORS.success : MADAR_COLORS.danger;
  const reviewCountText = venue.review_count.toLocaleString();
  const servicesCountText = `${services.length} services available`;
  const starsFilled = Math.round(venue.rating);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── PHOTO CAROUSEL ── */}
        {(() => {
          const venueImages = venue.image_url
            ? [venue.image_url, ...VENUE_IMAGES_FALLBACK.filter(u => u !== venue.image_url).slice(0, 2)]
            : VENUE_IMAGES_FALLBACK;
          return (
            <View style={{ height: 300, position: 'relative' }}>
              <FlatList
                data={venueImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                  console.log('[VenueDetail] Photo swiped to index:', index);
                  setCurrentImage(index);
                }}
                renderItem={({ item }) => (
                  <Image
                    source={resolveImageSource(item)}
                    style={{ width: screenWidth, height: 300 }}
                    resizeMode="cover"
                  />
                )}
                keyExtractor={(_, i) => String(i)}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.45)', 'transparent']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100 }}
              />
              {/* Back */}
              <AnimatedPressable
                onPress={() => {
                  console.log('[VenueDetail] Back pressed');
                  router.back();
                }}
                style={[styles.carouselBtn, { top: insets.top + 12, left: 16 }]}
              >
                <ArrowLeft size={20} color="#fff" />
              </AnimatedPressable>
              {/* Share + Heart */}
              <View style={{ position: 'absolute', top: insets.top + 12, right: 16, flexDirection: 'row', gap: 8 }}>
                <AnimatedPressable
                  onPress={() => console.log('[VenueDetail] Share pressed')}
                  style={styles.carouselBtn}
                >
                  <Share2 size={18} color="#fff" />
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[VenueDetail] Favourite toggled:', !isFavourite);
                    setIsFavourite(f => !f);
                  }}
                  style={styles.carouselBtn}
                >
                  <Heart
                    size={18}
                    color={isFavourite ? MADAR_COLORS.danger : '#fff'}
                    fill={isFavourite ? MADAR_COLORS.danger : 'transparent'}
                  />
                </AnimatedPressable>
              </View>
              {/* Dot indicators */}
              <View style={styles.dotRow}>
                {venueImages.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === currentImage && styles.dotActive]}
                  />
                ))}
              </View>
            </View>
          );
        })()}

        {/* ── VENUE INFO CARD ── */}
        <View style={styles.infoCard}>
          <Text style={styles.venueName}>{venue.name}</Text>
          <Text style={styles.categoryText}>{venue.category}</Text>
          <View style={styles.ratingRow}>
            <Star size={14} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
            <Text style={styles.ratingText}>{ratingFixed}</Text>
            <Text style={styles.reviewCount}>({reviewCountText})</Text>
            <Text style={styles.separatorDot}>·</Text>
            <Clock size={13} color={openStatusColor} />
            <Text style={[styles.openText, { color: openStatusColor }]}>{openStatusText}</Text>
          </View>
          <View style={styles.addressPill}>
            <MapPin size={14} color={MADAR_COLORS.gold} />
            <Text style={styles.addressText} numberOfLines={1}>
              {distanceFixed}
            </Text>
            <Text style={styles.addressText} numberOfLines={1}>
              km ·
            </Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {venue.address}
            </Text>
          </View>
        </View>

        {/* ── STICKY TAB BAR ── */}
        <View style={styles.tabBar}>
          <ScrollView
            ref={tabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <AnimatedPressable
                  key={tab}
                  onPress={() => handleTabPress(tab)}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── ABOUT SECTION ── */}
        <View
          style={styles.section}
          onLayout={(e) => { aboutY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.descText}>
            {descExpanded ? descText : shortDesc}
            {hasMore && !descExpanded ? '...' : ''}
          </Text>
          {hasMore && (
            <AnimatedPressable
              onPress={() => {
                console.log('[VenueDetail] Read more toggled');
                setDescExpanded(e => !e);
              }}
            >
              <Text style={styles.readMore}>{descExpanded ? 'Show less' : 'Read more'}</Text>
            </AnimatedPressable>
          )}
        </View>

        {/* ── SERVICES SECTION ── */}
        <View
          style={styles.section}
          onLayout={(e) => { servicesY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>Services</Text>
          {Object.entries(servicesByCategory).map(([cat, svcs]) => (
            <View key={cat} style={{ marginBottom: 12 }}>
              <Text style={styles.categoryHeader}>{cat}</Text>
              {svcs.map((svc) => {
                const priceFixed = svc.price.toFixed(2);
                return (
                  <View key={svc.id} style={styles.serviceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{svc.name}</Text>
                      <Text style={styles.serviceDuration}>{svc.duration} min</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={styles.servicePrice}>BHD {priceFixed}</Text>
                      <AnimatedPressable
                        onPress={() => {
                          console.log('[VenueDetail] Book service pressed:', svc.id, svc.name);
                          router.push(`/booking/services?venueId=${id}`);
                        }}
                        style={styles.bookServiceBtn}
                      >
                        <Text style={styles.bookServiceBtnText}>Book</Text>
                      </AnimatedPressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
          <AnimatedPressable
            onPress={() => {
              console.log('[VenueDetail] See all services pressed');
              router.push(`/booking/services?venueId=${id}`);
            }}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllBtnText}>See all {services.length} services</Text>
          </AnimatedPressable>
        </View>

        {/* ── TEAM SECTION ── */}
        <View
          style={styles.section}
          onLayout={(e) => { teamY.current = e.nativeEvent.layout.y; }}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team</Text>
            <AnimatedPressable onPress={() => console.log('[VenueDetail] See all team pressed')}>
              <Text style={styles.seeAllLink}>See all</Text>
            </AnimatedPressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            {staff.map((member) => {
              const memberRating = Number(member.rating).toFixed(1);
              const memberAvatar = member.avatar ?? member.avatar_url ?? '';
              return (
                <AnimatedPressable
                  key={member.id}
                  onPress={() => {
                    console.log('[VenueDetail] Staff pressed:', member.id, member.name);
                    router.push(`/barber/${member.id}`);
                  }}
                  style={{ alignItems: 'center', gap: 6 }}
                >
                  <Image
                    source={resolveImageSource(memberAvatar)}
                    style={{ width: 72, height: 72, borderRadius: 36 }}
                    resizeMode="cover"
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Star size={11} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
                    <Text style={{ fontSize: 11, color: MADAR_COLORS.gold, fontWeight: '700' }}>{memberRating}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: MADAR_COLORS.text, fontWeight: '600' }}>{member.name}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* ── REVIEWS SECTION ── */}
        <View
          style={styles.section}
          onLayout={(e) => { reviewsY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>Reviews</Text>
          {/* Summary */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  size={20}
                  color={MADAR_COLORS.gold}
                  fill={i <= starsFilled ? MADAR_COLORS.gold : 'transparent'}
                />
              ))}
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: MADAR_COLORS.text }}>{ratingFixed}</Text>
            <Text style={{ fontSize: 14, color: MADAR_COLORS.textSecondary }}>({reviewCountText})</Text>
          </View>
          {/* Review cards */}
          {reviews.map((review) => {
            const reviewStarsFilled = Number(review.rating);
            const reviewName = review.name ?? review.reviewer_name ?? 'Anonymous';
            const reviewInitials = review.initials ?? reviewName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
            const reviewDate = review.date ?? (review.created_at ? new Date(review.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '');
            const reviewComment = review.comment ?? review.text ?? '';
            return (
              <View key={review.id} style={styles.reviewCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: MADAR_COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: MADAR_COLORS.textSecondary }}>{reviewInitials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: MADAR_COLORS.text }}>{reviewName}</Text>
                    <Text style={{ fontSize: 11, color: MADAR_COLORS.textTertiary }}>{reviewDate}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 2, marginBottom: 6 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      size={14}
                      color={MADAR_COLORS.gold}
                      fill={i <= reviewStarsFilled ? MADAR_COLORS.gold : 'transparent'}
                    />
                  ))}
                </View>
                <Text style={{ fontSize: 13, color: MADAR_COLORS.textSecondary, lineHeight: 20 }}>{reviewComment}</Text>
              </View>
            );
          })}
          <AnimatedPressable
            style={styles.seeAllBtn}
            onPress={() => console.log('[VenueDetail] See all reviews pressed')}
          >
            <Text style={styles.seeAllBtnText}>See all {reviewCountText} reviews</Text>
          </AnimatedPressable>
        </View>

        {/* ── OTHER SECTION (Opening times) ── */}
        <View
          style={styles.section}
          onLayout={(e) => { otherY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>Opening times</Text>
          {DAYS.map((day) => (
            <View
              key={day}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: MADAR_COLORS.border }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MADAR_COLORS.success, marginRight: 12 }} />
              <Text style={{ flex: 1, fontSize: 14, color: MADAR_COLORS.text }}>{day}</Text>
              <Text style={{ fontSize: 14, color: MADAR_COLORS.textSecondary }}>10:00 AM – 8:00 PM</Text>
            </View>
          ))}
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Additional information</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: MADAR_COLORS.success, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, color: MADAR_COLORS.success, fontWeight: '700' }}>✓</Text>
              </View>
              <Text style={{ fontSize: 14, color: MADAR_COLORS.textSecondary }}>Instant confirmation</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── STICKY BOTTOM BAR ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.bottomBarText}>{servicesCountText}</Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[VenueDetail] Book now pressed, venue:', id);
            router.push(`/booking/services?venueId=${id}`);
          }}
          style={styles.bookNowBtn}
        >
          <Text style={styles.bookNowBtnText}>Book now</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  carouselBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13,13,20,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  dotRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 18,
  },
  infoCard: {
    backgroundColor: MADAR_COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: MADAR_COLORS.border,
  },
  venueName: { fontSize: 24, fontWeight: '800', color: MADAR_COLORS.text, letterSpacing: -0.3 },
  categoryText: { fontSize: 14, color: MADAR_COLORS.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  ratingText: { fontSize: 14, fontWeight: '700', color: MADAR_COLORS.gold },
  reviewCount: { fontSize: 13, color: MADAR_COLORS.textSecondary },
  separatorDot: { fontSize: 13, color: MADAR_COLORS.textTertiary },
  openText: { fontSize: 13, fontWeight: '500' },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  addressText: { fontSize: 13, color: MADAR_COLORS.textSecondary },
  // Tab bar
  tabBar: {
    backgroundColor: MADAR_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: MADAR_COLORS.border,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: MADAR_COLORS.gold },
  tabText: { fontSize: 14, color: MADAR_COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: MADAR_COLORS.gold, fontWeight: '700' },
  // Sections
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: MADAR_COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: MADAR_COLORS.text, marginBottom: 12 },
  categoryHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: MADAR_COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  descText: { fontSize: 14, color: MADAR_COLORS.textSecondary, lineHeight: 22 },
  readMore: { fontSize: 14, color: MADAR_COLORS.gold, fontWeight: '600', marginTop: 6 },
  seeAllLink: { fontSize: 14, color: MADAR_COLORS.gold, fontWeight: '600' },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MADAR_COLORS.border,
  },
  serviceName: { fontSize: 14, fontWeight: '600', color: MADAR_COLORS.text },
  serviceDuration: { fontSize: 12, color: MADAR_COLORS.textSecondary, marginTop: 2 },
  servicePrice: { fontSize: 14, fontWeight: '700', color: MADAR_COLORS.text },
  bookServiceBtn: {
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  bookServiceBtnText: { fontSize: 13, color: MADAR_COLORS.text, fontWeight: '600' },
  seeAllBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  seeAllBtnText: { fontSize: 14, color: MADAR_COLORS.textSecondary, fontWeight: '500' },
  reviewCard: {
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: MADAR_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: MADAR_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  bottomBarText: { fontSize: 14, color: MADAR_COLORS.textSecondary },
  bookNowBtn: {
    backgroundColor: MADAR_COLORS.gold,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  bookNowBtnText: { fontSize: 15, fontWeight: '800', color: '#0A0A0F' },
});
