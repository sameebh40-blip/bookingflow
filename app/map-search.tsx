import React, { useRef, useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Search, SlidersHorizontal, Heart, Star, MapPin, Clock } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MAP_HEIGHT = screenHeight * 0.55;
const SNAP_COLLAPSED = 80;
const SNAP_HALF = screenHeight * 0.45;
const SNAP_FULL = screenHeight * 0.82;

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
  is_open: boolean;
  next_slot: string;
  latitude: number;
  longitude: number;
  is_top_rated?: boolean;
  men_only?: boolean;
}

const MOCK_VENUES: Venue[] = [
  { id: '1', name: 'Level Barber Shop', category: 'Hair Salon', rating: 5.0, review_count: 1336, distance_km: 0.75, address: 'Level Barber Shop Avenue 11, Tubli', image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', starting_price: 5, is_open: true, next_slot: '6:30 PM', latitude: 26.2235, longitude: 50.5876, is_top_rated: true, men_only: true },
  { id: '2', name: 'The Groom Room', category: 'Barber', rating: 4.9, review_count: 892, distance_km: 1.2, address: 'Seef District, Manama', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', starting_price: 8, is_open: true, next_slot: '7:00 PM', latitude: 26.2310, longitude: 50.5950, is_top_rated: false, men_only: false },
  { id: '3', name: 'Luxe Spa & Wellness', category: 'Spa', rating: 4.8, review_count: 287, distance_km: 2.1, address: 'Adliya, Manama', image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', starting_price: 25, is_open: false, next_slot: '10:00 AM', latitude: 26.2150, longitude: 50.5800, is_top_rated: true, men_only: false },
  { id: '4', name: 'Nail Studio Pro', category: 'Nails', rating: 4.9, review_count: 412, distance_km: 1.3, address: 'Juffair, Manama', image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', starting_price: 12, is_open: true, next_slot: '5:45 PM', latitude: 26.2180, longitude: 50.6020, is_top_rated: false, men_only: false },
  { id: '5', name: 'Fade Masters', category: 'Barber', rating: 4.7, review_count: 156, distance_km: 0.9, address: 'Gudaibiya, Manama', image_url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800', starting_price: 6, is_open: true, next_slot: '8:00 PM', latitude: 26.2260, longitude: 50.5820, is_top_rated: false, men_only: true },
];

const FILTER_CHIPS = [
  { id: 'venues', label: 'Venues ▾', route: null },
  { id: 'best', label: 'Best match ▾', route: null },
  { id: 'price', label: 'Price ▾', route: null },
  { id: 'amenities', label: 'Amenities ▾', route: '/filter-amenities' },
  { id: 'options', label: 'Options ▾', route: '/filter-options' },
  { id: 'service', label: 'Service type ▾', route: '/filter-service-type' },
];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const MAP_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #0A0A0F; }
    .rating-marker {
      background: #1a1a2e;
      border: 2px solid rgba(255,255,255,0.15);
      border-radius: 20px;
      padding: 5px 12px;
      color: white;
      font-size: 14px;
      font-weight: 700;
      font-family: -apple-system, sans-serif;
      white-space: nowrap;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(0,0,0,0.5);
      position: relative;
    }
    .rating-marker::after {
      content: '';
      position: absolute;
      bottom: -7px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 7px solid #1a1a2e;
    }
    .rating-marker.selected {
      background: #C9A84C;
      border-color: #E8C96A;
      color: #0A0A0F;
    }
    .rating-marker.selected::after {
      border-top-color: #C9A84C;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([26.2235, 50.5876], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);
    
    var venues = VENUES_JSON_PLACEHOLDER;
    var markers = {};
    var selectedId = null;
    
    venues.forEach(function(venue) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="rating-marker" id="marker-' + venue.id + '">' + venue.rating.toFixed(1) + '</div>',
        iconSize: null,
        iconAnchor: [20, 15]
      });
      var marker = L.marker([venue.lat, venue.lng], { icon: icon }).addTo(map);
      marker.on('click', function() {
        if (selectedId && document.getElementById('marker-' + selectedId)) {
          document.getElementById('marker-' + selectedId).classList.remove('selected');
        }
        selectedId = venue.id;
        document.getElementById('marker-' + venue.id).classList.add('selected');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', venueId: venue.id }));
      });
      markers[venue.id] = marker;
    });
    
    map.on('moveend', function() {
      var center = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapMove', lat: center.lat, lng: center.lng }));
    });
    
    window.selectMarker = function(id) {
      if (selectedId && document.getElementById('marker-' + selectedId)) {
        document.getElementById('marker-' + selectedId).classList.remove('selected');
      }
      selectedId = id;
      if (document.getElementById('marker-' + id)) {
        document.getElementById('marker-' + id).classList.add('selected');
      }
    };
  </script>
</body>
</html>`;

function generateMapHtml(venues: Venue[]): string {
  const venueData = venues
    .filter(v => v.latitude && v.longitude)
    .map(v => ({ id: v.id, rating: v.rating, lat: v.latitude, lng: v.longitude }));
  return MAP_HTML_TEMPLATE.replace('VENUES_JSON_PLACEHOLDER', JSON.stringify(venueData));
}

export default function MapSearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string }>();
  const webViewRef = useRef<WebView>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [sheetAtFull, setSheetAtFull] = useState(false);
  const sheetHeight = useRef(new Animated.Value(SNAP_HALF)).current;
  const lastHeight = useRef(SNAP_HALF);
  const venueListRef = useRef<ScrollView>(null);
  const [venues, setVenues] = useState<Venue[]>(MOCK_VENUES);
  const [mapKey, setMapKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState(params.query ?? '');

  useEffect(() => {
    const fetchVenues = async () => {
      console.log('[MapSearch] Fetching venues from Supabase');
      try {
        const { data, error } = await supabase.from('venues').select('*');
        if (!error && data && data.length > 0) {
          console.log('[MapSearch] Loaded', data.length, 'venues');
          setVenues(data);
          setMapKey(k => k + 1);
        } else {
          console.log('[MapSearch] Using mock venues:', error?.message);
        }
      } catch (err) {
        console.log('[MapSearch] Exception fetching venues:', err);
      }
    };
    fetchVenues();
  }, []);

  const mapHtml = generateMapHtml(venues);

  const snapToPoint = useCallback((target: number) => {
    lastHeight.current = target;
    setSheetAtFull(target === SNAP_FULL);
    Animated.spring(sheetHeight, {
      toValue: target,
      useNativeDriver: false,
      tension: 65,
      friction: 11,
    }).start();
  }, [sheetHeight]);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 8,
    onPanResponderMove: (_, gs) => {
      const newH = lastHeight.current - gs.dy;
      sheetHeight.setValue(Math.max(SNAP_COLLAPSED, Math.min(SNAP_FULL, newH)));
    },
    onPanResponderRelease: (_, gs) => {
      const cur = lastHeight.current - gs.dy;
      const vel = -gs.vy;
      let target: number;
      if (vel > 0.5) {
        target = cur > SNAP_HALF ? SNAP_FULL : SNAP_HALF;
      } else if (vel < -0.5) {
        target = cur < SNAP_HALF ? SNAP_COLLAPSED : SNAP_HALF;
      } else {
        const dists = [SNAP_COLLAPSED, SNAP_HALF, SNAP_FULL].map(s => Math.abs(cur - s));
        const minIdx = dists.indexOf(Math.min(...dists));
        target = [SNAP_COLLAPSED, SNAP_HALF, SNAP_FULL][minIdx];
      }
      snapToPoint(target);
    },
  })).current;

  const selectMarkerOnMap = useCallback((id: string) => {
    webViewRef.current?.injectJavaScript(`window.selectMarker('${id}'); true;`);
  }, []);

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress') {
        console.log('[MapSearch] Marker pressed for venue:', data.venueId);
        setSelectedVenueId(data.venueId);
        snapToPoint(SNAP_HALF);
      } else if (data.type === 'mapMove') {
        console.log('[MapSearch] Map moved to:', data.lat, data.lng);
      }
    } catch (e) {}
  }, [snapToPoint]);

  const handleVenueCardPress = useCallback((id: string, name: string) => {
    console.log('[MapSearch] Venue card pressed:', id, name);
    router.push(`/venue/${id}`);
  }, [router]);

  const handleVenueCardSelect = useCallback((id: string) => {
    console.log('[MapSearch] Venue card selected on map:', id);
    setSelectedVenueId(id);
    selectMarkerOnMap(id);
  }, [selectMarkerOnMap]);

  const handleFilterChip = useCallback((chip: typeof FILTER_CHIPS[0]) => {
    console.log('[MapSearch] Filter chip pressed:', chip.id);
    if (chip.route) {
      router.push(chip.route as any);
    }
  }, [router]);

  const handleSearchPress = useCallback(() => {
    console.log('[MapSearch] Search bar pressed');
    router.push('/search-modal');
  }, [router]);

  const handleHeartPress = useCallback((id: string, name: string) => {
    console.log('[MapSearch] Heart pressed for venue:', id, name);
  }, []);

  return (
    <View style={styles.container}>
      {/* WebView Map */}
      <WebView
        key={mapKey}
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={[styles.map, { height: MAP_HEIGHT }]}
        originWhitelist={['*']}
        onMessage={handleWebViewMessage}
        scrollEnabled={false}
        javaScriptEnabled
      />

      {/* Floating search bar */}
      <AnimatedPressable
        onPress={handleSearchPress}
        style={[styles.searchBar, { top: insets.top + 12 }]}
      >
        <Search size={16} color='#666' />
        <Text style={styles.searchText}>All treatments · Map area</Text>
        <SlidersHorizontal size={16} color='#666' />
      </AnimatedPressable>

      {/* Bottom sheet */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.dragHandle} />
          <Text style={styles.venueCount}>77 venues in map area</Text>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsContent}
          style={styles.filterChipsScroll}
        >
          <AnimatedPressable
            onPress={() => console.log('[MapSearch] Filter icon pressed')}
            style={styles.filterIconBtn}
          >
            <SlidersHorizontal size={16} color={MADAR_COLORS.text} />
          </AnimatedPressable>
          {FILTER_CHIPS.map((chip) => (
            <AnimatedPressable
              key={chip.id}
              onPress={() => handleFilterChip(chip)}
              style={styles.filterChip}
            >
              <Text style={styles.filterChipText}>{chip.label}</Text>
            </AnimatedPressable>
          ))}
        </ScrollView>

        {/* Venue list */}
        <ScrollView
          ref={venueListRef}
          style={styles.venueList}
          contentContainerStyle={styles.venueListContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          scrollEnabled={sheetAtFull}
          onScrollBeginDrag={() => {
            console.log('[MapSearch] Venue list scroll started, expanding sheet');
            if (!sheetAtFull) snapToPoint(SNAP_FULL);
          }}
        >
          {venues.filter(v =>
            !searchQuery ||
            v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.category.toLowerCase().includes(searchQuery.toLowerCase())
          ).map((venue) => {
            const isSelected = selectedVenueId === venue.id;
            const ratingStr = Number(venue.rating).toFixed(1);
            const distanceStr = venue.distance_km < 1
              ? `${Math.round(venue.distance_km * 1000)}m`
              : `${venue.distance_km.toFixed(1)} km`;
            const distanceAddress = `${distanceStr} · ${venue.address}`;
            const categoryReviews = `${venue.category} · ${venue.review_count} reviews`;
            const fromPrice = `From BHD ${venue.starting_price}`;
            const nextSlot = `Next: ${venue.next_slot}`;

            return (
              <AnimatedPressable
                key={venue.id}
                onPress={() => {
                  handleVenueCardSelect(venue.id);
                  handleVenueCardPress(venue.id, venue.name);
                }}
                style={[styles.venueCard, isSelected && styles.venueCardSelected]}
              >
                {/* Cover image */}
                <View style={styles.venueImageContainer}>
                  <Image
                    source={resolveImageSource(venue.image_url)}
                    style={styles.venueImage}
                    resizeMode="cover"
                  />
                  <AnimatedPressable
                    onPress={() => handleHeartPress(venue.id, venue.name)}
                    style={styles.heartBtn}
                  >
                    <Heart size={16} color="#fff" />
                  </AnimatedPressable>
                </View>
                {/* Info below image */}
                <View style={styles.venueInfo}>
                  {/* Row 1: Name + Rating */}
                  <View style={styles.venueRow1}>
                    <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                    <View style={styles.venueRatingBadge}>
                      <Star size={13} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
                      <Text style={styles.venueRating}>{ratingStr}</Text>
                    </View>
                  </View>
                  {/* Row 2: distance · address */}
                  <Text style={styles.venueDistanceAddress} numberOfLines={1}>{distanceAddress}</Text>
                  {/* Row 3: category · reviews */}
                  <Text style={styles.venueCategoryReviews}>{categoryReviews}</Text>
                  {/* Row 4: price + next slot */}
                  <View style={styles.venuePriceRow}>
                    <Text style={styles.venuePrice}>{fromPrice}</Text>
                    <Text style={styles.venueNextSlot}>{nextSlot}</Text>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  searchBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  searchText: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#13131A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(201,168,76,0.15)',
    overflow: 'hidden',
  },
  dragArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5C5855',
    marginBottom: 8,
  },
  venueCount: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
    marginBottom: 12,
  },
  filterChipsScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  filterChipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChip: {
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  filterChipText: {
    fontSize: 13,
    color: MADAR_COLORS.text,
    fontWeight: '500',
  },
  venueList: {
    flex: 1,
  },
  venueListContent: {
    paddingBottom: 120,
  },
  venueCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  venueCardSelected: {
    // highlight handled via image border
  },
  venueImageContainer: {
    position: 'relative',
  },
  venueImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
  },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueInfo: {
    paddingTop: 10,
    gap: 4,
  },
  venueRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  venueName: {
    fontSize: 18,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    flex: 1,
  },
  venueRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  venueRating: {
    fontSize: 14,
    color: MADAR_COLORS.gold,
    fontWeight: '700',
  },
  venueDistanceAddress: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
  },
  venueCategoryReviews: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
  },
  venuePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  venuePrice: {
    fontSize: 13,
    color: MADAR_COLORS.gold,
    fontWeight: '600',
  },
  venueNextSlot: {
    fontSize: 13,
    color: MADAR_COLORS.success,
    fontWeight: '600',
  },
});
