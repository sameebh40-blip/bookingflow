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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
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
  { id: '1', name: 'Level Barber Shop', category: 'Barber', rating: 5.0, review_count: 1336, distance_km: 0.75, address: 'Avenue 11, Tubli', image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', starting_price: 5 },
  { id: '2', name: 'The Groom Room', category: 'Barber', rating: 5.0, review_count: 513, distance_km: 14.6, address: 'Mall of Dilmunia, Shop 26', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', starting_price: 8 },
  { id: '3', name: 'Luxe Spa & Wellness', category: 'Spa', rating: 4.8, review_count: 287, distance_km: 2.1, address: 'Seef District, Manama', image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', starting_price: 25 },
  { id: '4', name: 'Nail Studio Pro', category: 'Nails', rating: 4.9, review_count: 412, distance_km: 1.3, address: 'Adliya, Manama', image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', starting_price: 12 },
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
      <View style={{ padding: 12, gap: 8 }}>
        <View style={[styles.skeletonLine, { width: '70%' }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 10 }]} />
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const userName = user?.user_metadata?.full_name?.split(' ')[0] ?? null;
  const greetingText = userName ? `${greeting}, ${userName}` : 'Discover Madar';

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    console.log('[Home] Fetching venues from Supabase');
    setLoading(true);
    try {
      const { data, error } = await supabase.from('venues').select('*').limit(10);
      if (error || !data || data.length === 0) {
        console.log('[Home] Using mock venues (Supabase error or empty):', error?.message);
        setVenues(MOCK_VENUES);
      } else {
        console.log('[Home] Loaded', data.length, 'venues from Supabase');
        setVenues(data);
      }
    } catch (err) {
      console.log('[Home] Supabase exception, using mock data:', err);
      setVenues(MOCK_VENUES);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavourite = useCallback((id: string) => {
    console.log('[Home] Toggle favourite:', id);
    setFavourites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleVenuePress = useCallback((id: string, name: string) => {
    console.log('[Home] Venue card pressed:', id, name);
    router.push(`/venue/${id}`);
  }, [router]);

  const handleSearchPress = useCallback(() => {
    console.log('[Home] Search bar pressed');
    router.push('/search-modal');
  }, [router]);

  const handleCategoryPress = useCallback((id: string, label: string) => {
    console.log('[Home] Category pressed:', id, label);
    setActiveCategory(id);
  }, []);

  const handleSeeAllNearby = useCallback(() => {
    console.log('[Home] See all nearby pressed');
    router.push('/(tabs)/discover');
  }, [router]);

  const handleRebook = useCallback((id: string, name: string) => {
    console.log('[Home] Rebook pressed:', id, name);
    router.push(`/venue/${id}`);
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
      <View style={styles.header}>
        <AnimatedPressable onPress={() => console.log('[Home] Location pressed')} style={styles.locationRow}>
          <MapPin size={16} color={MADAR_COLORS.gold} strokeWidth={2} />
          <Text style={styles.locationText}>Current location</Text>
          <ChevronDown size={14} color={MADAR_COLORS.textSecondary} />
        </AnimatedPressable>

        <Text style={styles.greeting}>{greetingText}</Text>

        {/* Search bar */}
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

      {/* Nearby venues */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby venues</Text>
          <AnimatedPressable onPress={handleSeeAllNearby}>
            <Text style={styles.seeAll}>See all</Text>
          </AnimatedPressable>
        </View>

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          venues.map((venue, index) => (
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
                    colors={['transparent', 'rgba(0,0,0,0.4)']}
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
                </View>
                <View style={styles.venueInfo}>
                  <View style={styles.venueRow}>
                    <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                    <View style={styles.ratingBadge}>
                      <Star size={11} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
                      <Text style={styles.ratingText}>{Number(venue.rating).toFixed(1)}</Text>
                    </View>
                  </View>
                  <Text style={styles.venueMeta}>
                    {venue.category} · {distanceText(venue.distance_km)}
                  </Text>
                  <View style={styles.venueFooter}>
                    <Text style={styles.reviewCount}>{venue.review_count.toLocaleString()} reviews</Text>
                    <Text style={styles.venuePrice}>From BHD {venue.starting_price}</Text>
                  </View>
                </View>
              </AnimatedPressable>
            </AnimatedListItem>
          ))
        )}
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
  venueCard: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  venueImageContainer: {
    position: 'relative',
  },
  venueImage: {
    width: '100%',
    height: 180,
  },
  venueImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
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
  venueInfo: {
    padding: 16,
    gap: 6,
  },
  venueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  venueName: {
    fontSize: 17,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: MADAR_COLORS.goldMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    color: MADAR_COLORS.gold,
    fontWeight: '700',
  },
  venueMeta: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
  },
  venueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: MADAR_COLORS.textTertiary,
  },
  venuePrice: {
    fontSize: 13,
    color: MADAR_COLORS.gold,
    fontWeight: '600',
  },
  skeletonCard: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  skeletonImage: {
    width: '100%',
    height: 180,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
  },
});
