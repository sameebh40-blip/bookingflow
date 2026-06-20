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
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 52) / 2;

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
}

const MOCK_VENUES: Venue[] = [
  { id: '1', name: 'Level Barber Shop', category: 'Barber', rating: 5.0, review_count: 1336, distance_km: 0.75, address: 'Bu Ashira', image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', starting_price: 5, is_open: true },
  { id: '2', name: 'test account', category: 'Barber', rating: 0.0, review_count: 0, distance_km: 0, address: 'Location unavailable', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', starting_price: 8, is_open: true },
  { id: '3', name: 'Luxe Spa & Wellness', category: 'Spa', rating: 4.8, review_count: 287, distance_km: 2.1, address: 'Seef District', image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', starting_price: 25, is_open: false },
  { id: '4', name: 'Nail Studio Pro', category: 'Nails', rating: 4.9, review_count: 412, distance_km: 1.3, address: 'Adliya', image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', starting_price: 12, is_open: true },
];

const MOCK_BARBERS: Barber[] = [
  { id: '1', name: 'majed barber', rating: 5.0, bookings: 6, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', rank: 1 },
  { id: '2', name: 'alili barber', rating: 0.0, bookings: 0, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', rank: 2 },
  { id: '3', name: 'majed', rating: 0.0, bookings: 0, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', rank: 3 },
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

function SkeletonCard() {
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
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonImage} />
      <View style={{ padding: 10, gap: 6 }}>
        <View style={[styles.skeletonLine, { width: '70%' }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 10 }]} />
      </View>
    </Animated.View>
  );
}

function CompactVenueCard({ venue, onPress }: { venue: Venue; onPress: () => void }) {
  const distanceStr = venue.distance_km < 1
    ? `${Math.round(venue.distance_km * 1000)}m`
    : `${venue.distance_km.toFixed(1)} km`;
  const ratingStr = Number(venue.rating).toFixed(1);

  return (
    <AnimatedPressable onPress={onPress} style={styles.compactCard}>
      <View style={styles.compactImageContainer}>
        <Image
          source={resolveImageSource(venue.image_url)}
          style={styles.compactImage}
          resizeMode="cover"
        />
        {venue.is_open && (
          <View style={styles.openBadge}>
            <Text style={styles.openBadgeText}>Open</Text>
          </View>
        )}
      </View>
      <View style={styles.compactInfo}>
        <Text style={styles.compactName} numberOfLines={1}>{venue.name}</Text>
        <View style={styles.compactRatingRow}>
          <Star size={11} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
          <Text style={styles.compactRating}>{ratingStr}</Text>
          <Text style={styles.compactReviews}>({venue.review_count})</Text>
        </View>
        <View style={styles.compactLocationRow}>
          <MapPin size={10} color={MADAR_COLORS.textTertiary} />
          <Text style={styles.compactLocation} numberOfLines={1}>
            {venue.address}
            {venue.distance_km > 0 ? `, ${distanceStr}` : ''}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const RANK_COLORS: Record<number, string> = {
  1: '#C9A84C',
  2: '#A8A8A8',
  3: '#CD7F32',
};

function BarberPodiumCard({ barber, elevated }: { barber: Barber; elevated: boolean }) {
  const avatarSize = elevated ? 72 : 60;
  const rankColor = RANK_COLORS[barber.rank] ?? MADAR_COLORS.textSecondary;
  const ratingStr = Number(barber.rating).toFixed(1);
  const bookingsText = `${barber.bookings} bookings`;

  return (
    <View style={[styles.podiumCard, elevated && styles.podiumCardElevated]}>
      <View style={{ position: 'relative', alignSelf: 'center' }}>
        <Image
          source={resolveImageSource(barber.avatar)}
          style={[styles.podiumAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
        />
        <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
          <Text style={styles.rankBadgeText}>{barber.rank}</Text>
        </View>
      </View>
      <View style={styles.topBarberBadge}>
        <Scissors size={9} color={MADAR_COLORS.background} />
        <Text style={styles.topBarberBadgeText}>TOP BARBER</Text>
      </View>
      <View style={styles.podiumRatingRow}>
        <Star size={11} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
        <Text style={styles.podiumRating}>{ratingStr}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{barber.name}</Text>
      <Text style={styles.podiumBookings}>{bookingsText}</Text>
    </View>
  );
}

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

  // Arrange barbers for podium: rank2, rank1, rank3
  const rank1 = barbers.find(b => b.rank === 1);
  const rank2 = barbers.find(b => b.rank === 2);
  const rank3 = barbers.find(b => b.rank === 3);

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
          <Text style={styles.searchPlaceholder}>Browse all treatments</Text>
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
                    <NotificationBell />
          
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

      {/* Nearby Shops — 2-column grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby shops</Text>
          <AnimatedPressable onPress={handleSeeAllNearby}>
            <Text style={styles.seeAll}>View all</Text>
          </AnimatedPressable>
        </View>

        {loading ? (
          <View style={styles.gridRow}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <View style={styles.venueGrid}>
            {venues.slice(0, 4).map((venue, index) => (
              <AnimatedListItem key={venue.id} index={index}>
                <CompactVenueCard
                  venue={venue}
                  onPress={() => handleVenuePress(venue.id, venue.name)}
                />
              </AnimatedListItem>
            ))}
          </View>
        )}
      </View>

      {/* Top Barbers — podium layout */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Barbers</Text>
          <AnimatedPressable onPress={handleSeeAllBarbers}>
            <Text style={styles.seeAll}>View all</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.podiumContainer}>
          {rank2 && <BarberPodiumCard barber={rank2} elevated={false} />}
          {rank1 && <BarberPodiumCard barber={rank1} elevated={true} />}
          {rank3 && <BarberPodiumCard barber={rank3} elevated={false} />}
        </View>
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
    marginBottom: 24,
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
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  // 2-column grid
  venueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  compactCard: {
    width: CARD_WIDTH,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  compactImageContainer: {
    position: 'relative',
  },
  compactImage: {
    width: '100%',
    height: 110,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  openBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: MADAR_COLORS.success,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  openBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  compactInfo: {
    padding: 10,
    gap: 4,
  },
  compactName: {
    fontSize: 13,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  compactRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  compactRating: {
    fontSize: 11,
    color: MADAR_COLORS.gold,
    fontWeight: '600',
  },
  compactReviews: {
    fontSize: 11,
    color: MADAR_COLORS.textTertiary,
  },
  compactLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  compactLocation: {
    fontSize: 11,
    color: MADAR_COLORS.textSecondary,
    flex: 1,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  skeletonImage: {
    width: '100%',
    height: 110,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
  },
  // Podium
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    gap: 6,
    marginBottom: 0,
  },
  podiumCardElevated: {
    marginBottom: 20,
    borderColor: MADAR_COLORS.goldBorder,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
  },
  podiumAvatar: {
    borderWidth: 2,
    borderColor: MADAR_COLORS.goldBorder,
  },
  rankBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  topBarberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: MADAR_COLORS.gold,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  topBarberBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: MADAR_COLORS.background,
    letterSpacing: 0.5,
  },
  podiumRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  podiumRating: {
    fontSize: 12,
    color: MADAR_COLORS.gold,
    fontWeight: '700',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    textAlign: 'center',
  },
  podiumBookings: {
    fontSize: 10,
    color: MADAR_COLORS.textSecondary,
    textAlign: 'center',
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
