import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  ScrollView,
  Image,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  SlidersHorizontal,
  ArrowLeft,
  Heart,
  Star,
  MapPin,
  Clock,
  ChevronDown,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SNAP_COLLAPSED = screenHeight * 0.12;
const SNAP_HALF = screenHeight * 0.45;
const SNAP_FULL = screenHeight * 0.85;

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
  { featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3C7680' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#023e58' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'transit', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'transit.line', elementType: 'geometry.fill', stylers: [{ color: '#283d6a' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#3a4762' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

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
  latitude: number;
  longitude: number;
  is_open?: boolean;
}

const MOCK_VENUES: Venue[] = [
  { id: '1', name: 'Level Barber Shop', category: 'Barber', rating: 5.0, review_count: 1336, distance_km: 0.75, address: 'Avenue 11, Tubli', image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', starting_price: 5, latitude: 26.2235, longitude: 50.5876, is_open: true },
  { id: '2', name: 'The Groom Room', category: 'Barber', rating: 5.0, review_count: 513, distance_km: 14.6, address: 'Mall of Dilmunia', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', starting_price: 8, latitude: 26.2335, longitude: 50.5976, is_open: true },
  { id: '3', name: 'Luxe Spa & Wellness', category: 'Spa', rating: 4.8, review_count: 287, distance_km: 2.1, address: 'Seef District, Manama', image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', starting_price: 25, latitude: 26.2135, longitude: 50.5776, is_open: false },
  { id: '4', name: 'Nail Studio Pro', category: 'Nails', rating: 4.9, review_count: 412, distance_km: 1.3, address: 'Adliya, Manama', image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', starting_price: 12, latitude: 26.2185, longitude: 50.5826, is_open: true },
];

const FILTERS = ['Amenities', 'Options', 'Service type', 'Price', 'Rating', 'Distance', 'Open now'];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

// Lazy-load react-native-maps to avoid web crashes
let MapView: React.ComponentType<any> | null = null;
let Marker: React.ComponentType<any> | null = null;
let PROVIDER_GOOGLE: string | null = null;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch (e) {
    console.log('[MapSearch] react-native-maps not available:', e);
  }
}

export default function MapSearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());

  const sheetHeight = useRef(new Animated.Value(SNAP_HALF)).current;
  const lastHeight = useRef(SNAP_HALF);

  const snapToPoint = useCallback((point: number) => {
    lastHeight.current = point;
    Animated.spring(sheetHeight, {
      toValue: point,
      useNativeDriver: false,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [sheetHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        const newHeight = lastHeight.current - gestureState.dy;
        const clamped = Math.max(SNAP_COLLAPSED, Math.min(SNAP_FULL, newHeight));
        sheetHeight.setValue(clamped);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentHeight = lastHeight.current - gestureState.dy;
        const velocity = -gestureState.vy;
        let target: number;
        if (velocity > 0.5) {
          target = currentHeight > SNAP_HALF ? SNAP_FULL : SNAP_HALF;
        } else if (velocity < -0.5) {
          target = currentHeight < SNAP_HALF ? SNAP_COLLAPSED : SNAP_HALF;
        } else {
          const distToCollapsed = Math.abs(currentHeight - SNAP_COLLAPSED);
          const distToHalf = Math.abs(currentHeight - SNAP_HALF);
          const distToFull = Math.abs(currentHeight - SNAP_FULL);
          const minDist = Math.min(distToCollapsed, distToHalf, distToFull);
          if (minDist === distToCollapsed) target = SNAP_COLLAPSED;
          else if (minDist === distToHalf) target = SNAP_HALF;
          else target = SNAP_FULL;
        }
        snapToPoint(target);
      },
    })
  ).current;

  const handleMarkerPress = useCallback((venueId: string, venueName: string) => {
    console.log('[MapSearch] Marker pressed:', venueId, venueName);
    setSelectedVenueId(venueId);
    snapToPoint(SNAP_HALF);
  }, [snapToPoint]);

  const handleVenuePress = useCallback((id: string, name: string) => {
    console.log('[MapSearch] Venue card pressed:', id, name);
    router.push(`/venue/${id}`);
  }, [router]);

  const handleFilterPress = useCallback((filter: string) => {
    console.log('[MapSearch] Filter pressed:', filter);
    if (filter === 'Amenities') router.push('/filter-amenities');
    else if (filter === 'Options') router.push('/filter-options');
    else if (filter === 'Service type') router.push('/filter-service-type');
  }, [router]);

  const handleSearchPress = useCallback(() => {
    console.log('[MapSearch] Search bar pressed');
    router.push('/search-modal');
  }, [router]);

  const handleBack = useCallback(() => {
    console.log('[MapSearch] Back pressed');
    router.back();
  }, [router]);

  const toggleFavourite = useCallback((id: string) => {
    console.log('[MapSearch] Toggle favourite:', id);
    setFavourites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const distanceText = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const topOffset = insets.top + 12;

  return (
    <View style={styles.container}>
      {/* Map */}
      {MapView && Marker ? (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE as any}
          customMapStyle={DARK_MAP_STYLE}
          initialRegion={{
            latitude: 26.2235,
            longitude: 50.5876,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {MOCK_VENUES.map((venue) => {
            const isSelected = selectedVenueId === venue.id;
            const ratingStr = Number(venue.rating).toFixed(1);
            return (
              <Marker
                key={venue.id}
                coordinate={{ latitude: venue.latitude, longitude: venue.longitude }}
                onPress={() => handleMarkerPress(venue.id, venue.name)}
              >
                <View style={[styles.markerBubble, isSelected && styles.markerBubbleSelected]}>
                  <Text style={[styles.markerText, isSelected && styles.markerTextSelected]}>
                    {ratingStr}
                  </Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
      ) : (
        <View style={styles.mapFallback}>
          <Text style={styles.mapFallbackText}>Map view</Text>
          <Text style={styles.mapFallbackSub}>Bahrain · 77 venues</Text>
        </View>
      )}

      {/* Top search bar */}
      <View style={[styles.topBar, { top: topOffset }]}>
        <AnimatedPressable onPress={handleSearchPress} style={styles.searchPill}>
          <Search size={16} color={MADAR_COLORS.gold} />
          <Text style={styles.searchPillText}>All treatments · Map area</Text>
          <View style={styles.filterCircle}>
            <SlidersHorizontal size={14} color={MADAR_COLORS.textSecondary} />
          </View>
        </AnimatedPressable>
      </View>

      {/* Back button */}
      <AnimatedPressable
        onPress={handleBack}
        style={[styles.backBtn, { top: topOffset + 60 }]}
      >
        <ArrowLeft size={20} color={MADAR_COLORS.text} />
      </AnimatedPressable>

      {/* Bottom sheet */}
      <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.dragHandle} />
          <Text style={styles.venueCountText}>77 venues in map area</Text>
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
              <ChevronDown size={11} color={MADAR_COLORS.textSecondary} />
            </AnimatedPressable>
          ))}
        </ScrollView>

        {/* Venue list */}
        <ScrollView
          style={styles.venueList}
          contentContainerStyle={styles.venueListContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {MOCK_VENUES.map((venue, index) => {
            const isSelected = selectedVenueId === venue.id;
            const nextSlot = index % 2 === 0 ? '6:30 PM' : '7:00 PM';
            const badges = index === 0
              ? ['Top rated', 'Open now']
              : index === 1
              ? ['Open now', 'Men only']
              : ['Open now'];
            const ratingStr = Number(venue.rating).toFixed(1);

            return (
              <AnimatedPressable
                key={venue.id}
                onPress={() => handleVenuePress(venue.id, venue.name)}
                style={[styles.venueCard, isSelected && styles.venueCardSelected]}
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
                      <View
                        key={b}
                        style={[
                          styles.badge,
                          b === 'Top rated' && styles.badgeGold,
                          b === 'Men only' && styles.badgeBlue,
                        ]}
                      >
                        <Text style={[styles.badgeText, b === 'Top rated' && styles.badgeTextDark]}>
                          {b}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.venueInfo}>
                  <View style={styles.venueRow}>
                    <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                    <View style={styles.ratingBadge}>
                      <Star size={11} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
                      <Text style={styles.ratingText}>{ratingStr}</Text>
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
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MADAR_COLORS.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0e1626',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapFallbackText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8ec3b9',
  },
  mapFallbackSub: {
    fontSize: 14,
    color: '#4e6d70',
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(13,13,20,0.9)',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: MADAR_COLORS.goldBorder,
  },
  searchPillText: {
    flex: 1,
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    fontWeight: '500',
  },
  filterCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13,13,20,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  markerBubble: {
    backgroundColor: '#1C1C26',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#C9A84C',
  },
  markerBubbleSelected: {
    backgroundColor: '#C9A84C',
  },
  markerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C9A84C',
  },
  markerTextSelected: {
    color: '#000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: MADAR_COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: MADAR_COLORS.border,
    overflow: 'hidden',
  },
  dragArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: MADAR_COLORS.textTertiary,
    marginBottom: 8,
  },
  venueCountText: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
    fontWeight: '500',
  },
  filtersScroll: {
    marginBottom: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  filterChipText: {
    fontSize: 12,
    color: MADAR_COLORS.textSecondary,
    fontWeight: '500',
  },
  venueList: {
    flex: 1,
  },
  venueListContent: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 8,
  },
  venueCard: {
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  venueCardSelected: {
    borderColor: MADAR_COLORS.gold,
  },
  venueImageContainer: {
    position: 'relative',
  },
  venueImage: {
    width: '100%',
    height: 160,
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
  badgesRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(76,175,125,0.9)',
  },
  badgeGold: {
    backgroundColor: MADAR_COLORS.gold,
  },
  badgeBlue: {
    backgroundColor: 'rgba(123,94,167,0.9)',
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  badgeTextDark: {
    color: MADAR_COLORS.background,
  },
  venueInfo: {
    padding: 14,
    gap: 6,
  },
  venueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  venueName: {
    fontSize: 16,
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
  },
  venueFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: MADAR_COLORS.textTertiary,
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
  nextSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextSlotText: {
    fontSize: 12,
    color: MADAR_COLORS.success,
    fontWeight: '500',
  },
});
