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
import { useRouter } from 'expo-router';
import {
  MapPin,
  ChevronDown,
  Search,
  Scissors,
  Sparkles,
  Hand,
  Waves,
  Heart,
  Eye,
  Dumbbell,
  Home as HomeIcon,
  Grid3x3,
  Star,
  RefreshCw,
  Play,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const { width: screenWidth } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = screenWidth * 0.44;

interface Venue {
  id: string;
  name: string;
  category: string;
  rating: number;
  review_count: number;
  distance_km: number;
  address: string;
  image_url: string;
  logo_url?: string;
  starting_price: number;
  is_open?: boolean;
}

interface Barber {
  id: string;
  name: string;
  rating: number;
  bookings: number;
  avatar: string;
  rank: number;
  specialty?: string;
  review_count?: number;
}

const MOCK_VENUES: Venue[] = [
  { id: '1', name: 'Level Barber Shop', category: 'Barber', rating: 5.0, review_count: 1336, distance_km: 0.75, address: 'Bu Ashira', image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', starting_price: 5, is_open: true },
  { id: '2', name: 'The Groom Room', category: 'Barber', rating: 4.7, review_count: 210, distance_km: 1.2, address: 'Seef District', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', starting_price: 8, is_open: true },
  { id: '3', name: 'Luxe Spa & Wellness', category: 'Spa', rating: 4.8, review_count: 287, distance_km: 2.1, address: 'Seef District', image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', starting_price: 25, is_open: false },
  { id: '4', name: 'Nail Studio Pro', category: 'Nails', rating: 4.9, review_count: 412, distance_km: 1.3, address: 'Adliya', image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', starting_price: 12, is_open: true },
];

const MOCK_BARBERS: Barber[] = [
  { id: '1', name: 'Majed Al-Rashid', specialty: 'Fade Specialist', rating: 5.0, bookings: 6, review_count: 2, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', rank: 1 },
  { id: '2', name: 'alili barber', specialty: 'Classic Cuts', rating: 0.0, bookings: 0, review_count: 0, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', rank: 2 },
  { id: '3', name: 'majed', specialty: 'Beard Styling', rating: 0.0, bookings: 0, review_count: 0, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', rank: 3 },
];

const MOCK_REELS = [
  { id: '1', business: 'Level Barber', duration: '02:04', image_url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=600&fit=crop' },
  { id: '2', business: 'Luxe Spa', duration: '01:30', image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=600&fit=crop' },
  { id: '3', business: 'Nail Studio', duration: '00:45', image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=600&fit=crop' },
  { id: '4', business: 'Groom Room', duration: '03:12', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=600&fit=crop' },
];

const MOCK_REBOOK = [
  { id: '1', name: 'Level Barber Shop', price: 7, items: 2, image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400' },
  { id: '2', name: 'The Groom Room', price: 14, items: 2, image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400' },
];

const CATEGORIES = [
  { id: 'all', label: 'All', Icon: Grid3x3 },
  { id: 'barber', label: 'Barber', Icon: Scissors },
  { id: 'salon', label: 'Salon', Icon: Sparkles },
  { id: 'nails', label: 'Nails', Icon: Hand },
  { id: 'spa', label: 'Spa', Icon: Waves },
  { id: 'massage', label: 'Massage', Icon: Heart },
  { id: 'brows', label: 'Brows & Lashes', Icon: Eye },
  { id: 'fitness', label: 'Fitness', Icon: Dumbbell },
  { id: 'home', label: 'Home service', Icon: HomeIcon },
];


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
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function SkeletonCarouselCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.carouselCard, { opacity }]}>
      <View style={styles.carouselSkeletonImage} />
      <View style={{ padding: 8, gap: 6 }}>
        <View style={[styles.skeletonLine, { width: '70%' }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 10 }]} />
      </View>
    </Animated.View>
  );
}

function CarouselVenueCard({ venue, onPress }: { venue: Venue; onPress: () => void }) {
  const distanceStr = venue.distance_km < 1
    ? `${Math.round(venue.distance_km * 1000)}m`
    : `${venue.distance_km.toFixed(1)} km`;
  const ratingStr = Number(venue.rating).toFixed(1);

  return (
    <AnimatedPressable onPress={onPress} style={styles.carouselCard}>
      <View style={styles.carouselImageContainer}>
        <Image
          source={resolveImageSource(venue.image_url)}
          style={styles.carouselImage}
          resizeMode="cover"
        />
        {venue.is_open && (
          <View style={styles.openBadge}>
            <Text style={styles.openBadgeText}>Open</Text>
          </View>
        )}
      </View>
      <View style={styles.carouselInfo}>
        <Text style={styles.carouselName} numberOfLines={1}>{venue.name}</Text>
        <Text style={styles.carouselCategory} numberOfLines={1}>{venue.category}</Text>
        <View style={styles.carouselRatingRow}>
          <Star size={11} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
          <Text style={styles.carouselRating}>{ratingStr}</Text>
          <MapPin size={10} color={MADAR_COLORS.textTertiary} />
          <Text style={styles.carouselDistance}>{distanceStr}</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function SimpleBarberCard({ barber, onPress }: { barber: Barber; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} style={simpleBarberStyles.card}>
      <Image source={resolveImageSource(barber.avatar)} style={simpleBarberStyles.avatar} />
      <Text style={simpleBarberStyles.name} numberOfLines={1}>{barber.name}</Text>
      <Text style={simpleBarberStyles.specialty} numberOfLines={1}>{barber.specialty ?? 'Barber'}</Text>
    </AnimatedPressable>
  );
}

const simpleBarberStyles = StyleSheet.create({
  card: { width: 80, alignItems: 'center', gap: 6 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: MADAR_COLORS.border },
  name: { fontSize: 12, fontWeight: '700', color: MADAR_COLORS.text, textAlign: 'center' },
  specialty: { fontSize: 10, color: MADAR_COLORS.textSecondary, textAlign: 'center' },
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>(MOCK_BARBERS);
  const [loading, setLoading] = useState(true);

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const userName = user?.user_metadata?.full_name?.split(' ')[0] ?? null;
  const greetingText = userName ? `${greeting}, ${userName}` : 'Discover Madar';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    console.log('[Home] Fetching venues and barbers from Supabase');
    setLoading(true);
    try {
      const [venuesRes, barbersRes] = await Promise.all([
        supabase.from('venues').select('*').limit(10),
        supabase.from('staff').select('*').order('rating', { ascending: false }).limit(3),
      ]);

      if (venuesRes.error || !venuesRes.data || venuesRes.data.length === 0) {
        console.log('[Home] Using mock venues:', venuesRes.error?.message);
        setVenues(MOCK_VENUES);
      } else {
        console.log('[Home] Loaded', venuesRes.data.length, 'venues');
        setVenues(venuesRes.data);
      }

      if (barbersRes.error || !barbersRes.data || barbersRes.data.length === 0) {
        console.log('[Home] Using mock barbers:', barbersRes.error?.message);
        setBarbers(MOCK_BARBERS);
      } else {
        console.log('[Home] Loaded', barbersRes.data.length, 'barbers');
        setBarbers(barbersRes.data.map((b: Barber, i: number) => ({ ...b, rank: i + 1 })));
      }
    } catch (err) {
      console.log('[Home] Exception, using mock data:', err);
      setVenues(MOCK_VENUES);
      setBarbers(MOCK_BARBERS);
    } finally {
      setLoading(false);
    }
  };

  const handleVenuePress = useCallback((id: string, name: string) => {
    console.log('[Home] Venue card pressed:', id, name);
    router.push(`/venue/${id}`);
  }, [router]);

  const handleSearchPress = useCallback(() => {
    console.log('[Home] Search bar pressed');
    router.push('/map-search');
  }, [router]);

  const handleCategoryPress = useCallback((id: string, label: string) => {
    console.log('[Home] Category pressed:', id, label);
    setActiveCategory(id);
  }, []);

  const handleSeeAllNearby = useCallback(() => {
    console.log('[Home] See all nearby pressed');
    router.push('/map-search');
  }, [router]);

  const handleSeeAllBarbers = useCallback(() => {
    console.log('[Home] See all barbers pressed');
    router.push('/top-barbers');
  }, [router]);

  const handleSeeAllReels = useCallback(() => {
    console.log('[Home] See all reels pressed');
    router.push('/(tabs)/discover');
  }, [router]);

  const handleRebook = useCallback((id: string, name: string) => {
    console.log('[Home] Rebook pressed:', id, name);
    router.push(`/venue/${id}`);
  }, [router]);

  const handleReelPress = useCallback((id: string) => {
    console.log('[Home] Reel pressed:', id);
    router.push('/(tabs)/discover');
  }, [router]);

  const handleBarberPress = useCallback((id: string, name: string) => {
    console.log('[Home] Barber card pressed:', id, name);
    router.push(`/barber/${id}`);
  }, [router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => console.log('[Home] Location pressed')} style={styles.locationRow}>
          <MapPin size={16} color={MADAR_COLORS.gold} strokeWidth={2} />
          <Text style={styles.locationText}>Current location</Text>
          <ChevronDown size={14} color={MADAR_COLORS.textSecondary} />
        </AnimatedPressable>

        <Text style={styles.greeting}>{greetingText}</Text>

        <AnimatedPressable onPress={handleSearchPress} style={styles.searchBar}>
          <Search size={18} color={MADAR_COLORS.textTertiary} />
          <Text style={styles.searchPlaceholder}>Any treatments, venues or professionals</Text>
        </AnimatedPressable>
      </View>

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
              onPress={() => handleCategoryPress(cat.id, cat.label)}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
            >
              <CatIcon
                size={14}
                color={isActive ? MADAR_COLORS.background : MADAR_COLORS.textSecondary}
                strokeWidth={2}
              />
              <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      {/* Book again section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Book again</Text>
          <AnimatedPressable onPress={() => console.log('[Home] See all rebook pressed')}>
            <Text style={styles.seeAll}>See all</Text>
          </AnimatedPressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rebookScroll}
        >
          {MOCK_REBOOK.map((item, index) => (
            <AnimatedListItem key={item.id} index={index}>
              <AnimatedPressable
                onPress={() => handleRebook(item.id, item.name)}
                style={styles.rebookCard}
              >
                <Image
                  source={resolveImageSource(item.image_url)}
                  style={styles.rebookImage}
                  resizeMode="cover"
                />
                <View style={styles.rebookInfo}>
                  <Text style={styles.rebookName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.rebookMeta}>
                    BHD {item.price} · {item.items} items
                  </Text>
                  <AnimatedPressable
                    onPress={() => handleRebook(item.id, item.name)}
                    style={styles.rebookButton}
                  >
                    <RefreshCw size={12} color={MADAR_COLORS.gold} />
                    <Text style={styles.rebookButtonText}>Rebook</Text>
                  </AnimatedPressable>
                </View>
              </AnimatedPressable>
            </AnimatedListItem>
          ))}
        </ScrollView>
      </View>

      {/* Nearby Shops — horizontal carousel */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby shops</Text>
          <AnimatedPressable onPress={handleSeeAllNearby}>
            <Text style={styles.seeAll}>View all</Text>
          </AnimatedPressable>
        </View>

        {loading ? (
          <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: -20, paddingHorizontal: 20 }}>
            <SkeletonCarouselCard />
            <SkeletonCarouselCard />
          </View>
        ) : (
          <FlatList
            data={venues}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CAROUSEL_CARD_WIDTH + 12}
            decelerationRate="fast"
            pagingEnabled={false}
            style={{ marginHorizontal: -20 }}
            contentContainerStyle={styles.carouselContent}
            renderItem={({ item, index }) => (
              <AnimatedListItem index={index}>
                <CarouselVenueCard
                  venue={item}
                  onPress={() => handleVenuePress(item.id, item.name)}
                />
              </AnimatedListItem>
            )}
          />
        )}
      </View>

      {/* Top Barbers — horizontal FlatList of rect cards */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Barbers</Text>
          <AnimatedPressable onPress={handleSeeAllBarbers}>
            <Text style={styles.seeAll}>View all</Text>
          </AnimatedPressable>
        </View>

        <FlatList
          data={barbers.slice(0, 10)}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={92}
          decelerationRate="fast"
          contentContainerStyle={styles.barbersListContent}
          renderItem={({ item }) => (
            <SimpleBarberCard
              barber={item}
              onPress={() => handleBarberPress(item.id, item.name)}
            />
          )}
        />
      </View>

      {/* Trending Reels */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Reels</Text>
          <AnimatedPressable onPress={handleSeeAllReels}>
            <Text style={styles.seeAll}>View all</Text>
          </AnimatedPressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {MOCK_REELS.map((reel) => (
            <AnimatedPressable
              key={reel.id}
              onPress={() => handleReelPress(reel.id)}
              style={styles.reelCard}
            >
              <Image source={resolveImageSource(reel.image_url)} style={styles.reelImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                style={styles.reelGradient}
              />
              <View style={styles.trendingBadge}>
                <Text style={styles.trendingBadgeText}>TRENDING</Text>
              </View>
              <View style={styles.reelPlayBtn}>
                <Play size={14} color="#fff" fill="#fff" />
              </View>
              <Text style={styles.reelDuration}>{reel.duration}</Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MADAR_COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    fontWeight: '500',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: MADAR_COLORS.textTertiary,
    flex: 1,
  },
  categoriesScroll: {
    marginHorizontal: -20,
    marginBottom: 20,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: MADAR_COLORS.gold,
    borderColor: MADAR_COLORS.gold,
  },
  categoryLabel: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: MADAR_COLORS.background,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 14,
    color: MADAR_COLORS.gold,
    fontWeight: '600',
  },
  rebookScroll: {
    gap: 12,
  },
  rebookCard: {
    width: 200,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  rebookImage: {
    width: '100%',
    height: 120,
  },
  rebookInfo: {
    padding: 12,
    gap: 4,
  },
  rebookName: {
    fontSize: 14,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  rebookMeta: {
    fontSize: 12,
    color: MADAR_COLORS.textSecondary,
    marginBottom: 8,
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MADAR_COLORS.goldBorder,
  },
  rebookButtonText: {
    fontSize: 12,
    color: MADAR_COLORS.gold,
    fontWeight: '600',
  },
  // Carousel
  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  carouselCard: {
    width: CAROUSEL_CARD_WIDTH,
    height: 200,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  carouselImageContainer: {
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: 130,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  openBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF7D',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  openBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  carouselInfo: {
    padding: 8,
    backgroundColor: MADAR_COLORS.surface,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    gap: 3,
  },
  carouselName: {
    fontSize: 13,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  carouselCategory: {
    fontSize: 11,
    color: MADAR_COLORS.textSecondary,
  },
  carouselRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  carouselRating: {
    fontSize: 11,
    color: MADAR_COLORS.gold,
    fontWeight: '600',
  },
  carouselDistance: {
    fontSize: 11,
    color: MADAR_COLORS.textSecondary,
  },
  carouselSkeletonImage: {
    width: '100%',
    height: 130,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
  },
  // Barber simple cards (horizontal FlatList)
  barbersListContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  // Reels
  reelCard: {
    width: 120,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  reelImage: {
    width: '100%',
    height: '100%',
  },
  reelGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: MADAR_COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  trendingBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: MADAR_COLORS.background,
    letterSpacing: 0.5,
  },
  reelPlayBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelDuration: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
});
