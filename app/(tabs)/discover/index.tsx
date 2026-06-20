import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  SlidersHorizontal,
  Heart,
  Star,
  MapPin,
  Play,
  ChevronDown,
  Scissors,
  Sparkles,
  Hand,
  Waves,
  Eye,
  Dumbbell,
  Grid3x3,
  Clock,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Map } from '@/components/Map';
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
}

const MOCK_VENUES: Venue[] = [
  { id: '1', name: 'Level Barber Shop', category: 'Barber', rating: 5.0, review_count: 1336, distance_km: 0.75, address: 'Avenue 11, Tubli, Bahrain', image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', starting_price: 5 },
  { id: '2', name: 'The Groom Room', category: 'Barber', rating: 5.0, review_count: 513, distance_km: 14.6, address: 'Mall of Dilmunia, Shop 26', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', starting_price: 8 },
  { id: '3', name: 'Luxe Spa & Wellness', category: 'Spa', rating: 4.8, review_count: 287, distance_km: 2.1, address: 'Seef District, Manama', image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', starting_price: 25 },
  { id: '4', name: 'Nail Studio Pro', category: 'Nails', rating: 4.9, review_count: 412, distance_km: 1.3, address: 'Adliya, Manama', image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', starting_price: 12 },
];

const MOCK_REELS = [
  { id: '1', business: 'Level Barber', likes: 1240, image_url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400' },
  { id: '2', business: 'Luxe Spa', likes: 876, image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' },
  { id: '3', business: 'Nail Studio', likes: 543, image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400' },
  { id: '4', business: 'Groom Room', likes: 2100, image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400' },
];

const MOCK_OFFERS = [
  { id: '1', name: 'Classic Haircut + Beard', venue: 'Level Barber', original: 12, discounted: 8, discount: 33, image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400' },
  { id: '2', name: 'Full Body Massage', venue: 'Luxe Spa', original: 40, discounted: 28, discount: 30, image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400' },
  { id: '3', name: 'Gel Manicure', venue: 'Nail Studio', original: 18, discounted: 12, discount: 33, image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400' },
];

const MOCK_BARBERS = [
  { id: '1', name: 'Ahmed Al-Rashid', specialty: 'Fade specialist', rating: 5.0, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  { id: '2', name: 'Khalid Hassan', specialty: 'Classic cuts', rating: 4.9, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
  { id: '3', name: 'Omar Saleh', specialty: 'Beard styling', rating: 4.8, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' },
];

const CATEGORIES = [
  { id: 'all', label: 'All', Icon: Grid3x3 },
  { id: 'barber', label: 'Barber', Icon: Scissors },
  { id: 'salon', label: 'Salon', Icon: Sparkles },
  { id: 'nails', label: 'Nails', Icon: Hand },
  { id: 'spa', label: 'Spa', Icon: Waves },
  { id: 'brows', label: 'Brows', Icon: Eye },
  { id: 'fitness', label: 'Fitness', Icon: Dumbbell },
];

const FILTERS = ['Amenities', 'Options', 'Service type', 'Price', 'Rating', 'Distance', 'Open now'];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [venues, setVenues] = useState<Venue[]>(MOCK_VENUES);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());

  const mapMarkers = venues.map((v, i) => ({
    id: v.id,
    latitude: 26.2235 + i * 0.01,
    longitude: 50.5876 + i * 0.01,
    title: v.name,
    description: v.category,
  }));

  const toggleFavourite = useCallback((id: string) => {
    console.log('[Discover] Toggle favourite:', id);
    setFavourites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleVenuePress = useCallback((id: string, name: string) => {
    console.log('[Discover] Venue pressed:', id, name);
    router.push(`/venue/${id}`);
  }, [router]);

  const handleSearchPress = useCallback(() => {
    console.log('[Discover] Search pressed');
    router.push('/search-modal');
  }, [router]);

  const handleFilterPress = useCallback((filter: string) => {
    console.log('[Discover] Filter pressed:', filter);
    if (filter === 'Amenities') router.push('/filter-amenities');
    else if (filter === 'Options') router.push('/filter-options');
    else if (filter === 'Service type') router.push('/filter-service-type');
  }, [router]);

  const handleReelsPress = useCallback(() => {
    console.log('[Discover] See all reels pressed');
    router.push('/reels');
  }, [router]);

  const distanceText = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.pageTitle}>Discover</Text>

      {/* Search bar */}
      <AnimatedPressable onPress={handleSearchPress} style={styles.searchBar}>
        <Search size={18} color={MADAR_COLORS.textTertiary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.searchTitle}>All treatments</Text>
          <Text style={styles.searchSub}>Map area</Text>
        </View>
        <View style={styles.filterIconBtn}>
          <SlidersHorizontal size={16} color={MADAR_COLORS.textSecondary} />
        </View>
      </AnimatedPressable>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        style={styles.categoriesScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const CatIcon = cat.Icon;
          return (
            <AnimatedPressable
              key={cat.id}
              onPress={() => {
                console.log('[Discover] Category pressed:', cat.id);
                setActiveCategory(cat.id);
              }}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
            >
              <CatIcon size={13} color={isActive ? MADAR_COLORS.background : MADAR_COLORS.textSecondary} />
              <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      {/* Map section */}
      <View style={styles.mapContainer}>
        <Map
          markers={mapMarkers}
          initialRegion={{ latitude: 26.2235, longitude: 50.5876, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
          style={styles.map}
        />
        <View style={styles.mapBadge}>
          <Text style={styles.mapBadgeText}>77 venues in map area</Text>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {FILTERS.map((filter) => (
          <AnimatedPressable
            key={filter}
            onPress={() => handleFilterPress(filter)}
            style={styles.filterChip}
          >
            <Text style={styles.filterChipText}>{filter}</Text>
            <ChevronDown size={12} color={MADAR_COLORS.textSecondary} />
          </AnimatedPressable>
        ))}
      </ScrollView>

      {/* Venue count */}
      <Text style={styles.venueCount}>{venues.length} venues in map area</Text>

      {/* Venue cards */}
      {venues.map((venue, index) => {
        const nextSlot = index % 2 === 0 ? '6:30 PM' : '7:00 PM';
        const badges = index === 0 ? ['Top rated', 'Open now'] : index === 1 ? ['Open now', 'Men only'] : ['Open now'];
        return (
          <AnimatedListItem key={venue.id} index={index}>
            <AnimatedPressable
              onPress={() => handleVenuePress(venue.id, venue.name)}
              style={styles.venueCard}
            >
              <View style={styles.venueImageContainer}>
                <Image
                  source={resolveImageSource(venue.image_url)}
                  style={styles.venueImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.5)']}
                  style={styles.venueImageGradient}
                />
                <AnimatedPressable
                  onPress={() => toggleFavourite(venue.id)}
                  style={styles.heartButton}
                >
                  <Heart
                    size={18}
                    color={favourites.has(venue.id) ? MADAR_COLORS.danger : '#fff'}
                    fill={favourites.has(venue.id) ? MADAR_COLORS.danger : 'transparent'}
                  />
                </AnimatedPressable>
                <View style={styles.badgesRow}>
                  {badges.map(b => (
                    <View key={b} style={[styles.badge, b === 'Top rated' && styles.badgeGold]}>
                      <Text style={[styles.badgeText, b === 'Top rated' && styles.badgeTextGold]}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.venueInfo}>
                <View style={styles.venueRow}>
                  <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Star size={11} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
                    <Text style={styles.ratingText}>{Number(venue.rating).toFixed(1)}</Text>
                  </View>
                </View>
                <Text style={styles.venueMeta}>{venue.category} · {venue.address}</Text>
                <View style={styles.venueFooter}>
                  <View style={styles.venueFooterLeft}>
                    <MapPin size={12} color={MADAR_COLORS.textTertiary} />
                    <Text style={styles.distanceText}>{distanceText(venue.distance_km)}</Text>
                    <Text style={styles.reviewCount}>· {venue.review_count.toLocaleString()} reviews</Text>
                  </View>
                  <Text style={styles.venuePrice}>From BHD {venue.starting_price}</Text>
                </View>
                <View style={styles.nextSlotRow}>
                  <Clock size={12} color={MADAR_COLORS.success} />
                  <Text style={styles.nextSlotText}>Next: {nextSlot}</Text>
                </View>
              </View>
            </AnimatedPressable>
          </AnimatedListItem>
        );
      })}

      {/* Reels section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured reels</Text>
          <AnimatedPressable onPress={handleReelsPress}>
            <Text style={styles.seeAll}>See all</Text>
          </AnimatedPressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {MOCK_REELS.map((reel) => (
            <AnimatedPressable
              key={reel.id}
              onPress={() => {
                console.log('[Discover] Reel pressed:', reel.id);
                router.push('/reels');
              }}
              style={styles.reelCard}
            >
              <Image source={resolveImageSource(reel.image_url)} style={styles.reelImage} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.reelGradient} />
              <View style={styles.reelPlayBtn}>
                <Play size={20} color="#fff" fill="#fff" />
              </View>
              <View style={styles.reelBottom}>
                <Text style={styles.reelBusiness} numberOfLines={1}>{reel.business}</Text>
                <View style={styles.reelLikes}>
                  <Heart size={12} color="#fff" />
                  <Text style={styles.reelLikesText}>{reel.likes.toLocaleString()}</Text>
                </View>
              </View>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>

      {/* Trending offers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending offers</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {MOCK_OFFERS.map((offer) => (
            <AnimatedPressable
              key={offer.id}
              onPress={() => {
                console.log('[Discover] Offer pressed:', offer.id, offer.name);
                router.push(`/venue/${offer.id}`);
              }}
              style={styles.offerCard}
            >
              <Image source={resolveImageSource(offer.image_url)} style={styles.offerImage} resizeMode="cover" />
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{offer.discount}% OFF</Text>
              </View>
              <View style={styles.offerInfo}>
                <Text style={styles.offerName} numberOfLines={2}>{offer.name}</Text>
                <Text style={styles.offerVenue}>{offer.venue}</Text>
                <View style={styles.offerPriceRow}>
                  <Text style={styles.offerOriginal}>BHD {offer.original}</Text>
                  <Text style={styles.offerDiscounted}>BHD {offer.discounted}</Text>
                </View>
              </View>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>

      {/* Top barbers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top barbers</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {MOCK_BARBERS.map((barber) => (
            <AnimatedPressable
              key={barber.id}
              onPress={() => console.log('[Discover] Barber pressed:', barber.id, barber.name)}
              style={styles.barberCard}
            >
              <Image source={resolveImageSource(barber.avatar)} style={styles.barberAvatar} />
              <Text style={styles.barberName} numberOfLines={1}>{barber.name}</Text>
              <Text style={styles.barberSpecialty} numberOfLines={1}>{barber.specialty}</Text>
              <View style={styles.barberRating}>
                <Star size={10} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
                <Text style={styles.barberRatingText}>{barber.rating}</Text>
              </View>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Discover] Book barber pressed:', barber.id);
                  router.push(`/venue/${barber.id}`);
                }}
                style={styles.bookBarberBtn}
              >
                <Text style={styles.bookBarberText}>Book</Text>
              </AnimatedPressable>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  content: { paddingHorizontal: 20 },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: MADAR_COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    marginBottom: 16,
  },
  searchTitle: { fontSize: 15, fontWeight: '600', color: MADAR_COLORS.text },
  searchSub: { fontSize: 12, color: MADAR_COLORS.textSecondary },
  filterIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesScroll: { marginHorizontal: -20, marginBottom: 16 },
  categoriesContainer: { paddingHorizontal: 20, gap: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  categoryChipActive: { backgroundColor: MADAR_COLORS.gold, borderColor: MADAR_COLORS.gold },
  categoryLabel: { fontSize: 12, color: MADAR_COLORS.textSecondary, fontWeight: '500' },
  categoryLabelActive: { color: MADAR_COLORS.background, fontWeight: '600' },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  map: { flex: 1, borderRadius: 16 },
  mapBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  mapBadgeText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  filtersScroll: { marginHorizontal: -20, marginBottom: 12 },
  filtersContainer: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  filterChipText: { fontSize: 12, color: MADAR_COLORS.textSecondary, fontWeight: '500' },
  venueCount: { fontSize: 13, color: MADAR_COLORS.textSecondary, marginBottom: 16, textAlign: 'center' },
  venueCard: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  venueImageContainer: { position: 'relative' },
  venueImage: { width: '100%', height: 200 },
  venueImageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesRow: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(76,175,125,0.9)',
  },
  badgeGold: { backgroundColor: MADAR_COLORS.gold },
  badgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  badgeTextGold: { color: MADAR_COLORS.background },
  venueInfo: { padding: 16, gap: 6 },
  venueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  venueName: { fontSize: 18, fontWeight: '700', color: MADAR_COLORS.text, flex: 1, letterSpacing: -0.2 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: MADAR_COLORS.goldMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: { fontSize: 12, color: MADAR_COLORS.gold, fontWeight: '700' },
  venueMeta: { fontSize: 13, color: MADAR_COLORS.textSecondary },
  venueFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  venueFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distanceText: { fontSize: 12, color: MADAR_COLORS.textTertiary },
  reviewCount: { fontSize: 12, color: MADAR_COLORS.textTertiary },
  venuePrice: { fontSize: 13, color: MADAR_COLORS.gold, fontWeight: '600' },
  nextSlotRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextSlotText: { fontSize: 12, color: MADAR_COLORS.success, fontWeight: '500' },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: MADAR_COLORS.text, letterSpacing: -0.3 },
  seeAll: { fontSize: 14, color: MADAR_COLORS.gold, fontWeight: '600' },
  reelCard: {
    width: 160,
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  reelImage: { width: '100%', height: '100%' },
  reelGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  reelPlayBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelBottom: { position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  reelBusiness: { fontSize: 12, color: '#fff', fontWeight: '600', flex: 1 },
  reelLikes: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reelLikesText: { fontSize: 11, color: '#fff' },
  offerCard: {
    width: 200,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  offerImage: { width: '100%', height: 120 },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: MADAR_COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountText: { fontSize: 11, color: MADAR_COLORS.background, fontWeight: '800' },
  offerInfo: { padding: 12, gap: 4 },
  offerName: { fontSize: 13, fontWeight: '700', color: MADAR_COLORS.text },
  offerVenue: { fontSize: 11, color: MADAR_COLORS.textSecondary },
  offerPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  offerOriginal: { fontSize: 12, color: MADAR_COLORS.textTertiary, textDecorationLine: 'line-through' },
  offerDiscounted: { fontSize: 14, color: MADAR_COLORS.gold, fontWeight: '700' },
  barberCard: {
    width: 140,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  barberAvatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 4 },
  barberName: { fontSize: 13, fontWeight: '700', color: MADAR_COLORS.text, textAlign: 'center' },
  barberSpecialty: { fontSize: 11, color: MADAR_COLORS.textSecondary, textAlign: 'center' },
  barberRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  barberRatingText: { fontSize: 11, color: MADAR_COLORS.gold, fontWeight: '600' },
  bookBarberBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MADAR_COLORS.goldBorder,
  },
  bookBarberText: { fontSize: 12, color: MADAR_COLORS.gold, fontWeight: '600' },
});
