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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Search, SlidersHorizontal, Heart, Star, MapPin, AlignJustify, ChevronDown, X, Store, Users, Crosshair } from 'lucide-react-native';
import * as Location from 'expo-location';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SNAP_COLLAPSED = 80;
const SNAP_HALF = screenHeight * 0.45;
const SNAP_FULL = screenHeight * 0.82;

const DEFAULT_LAT = 26.2235;
const DEFAULT_LNG = 50.5876;

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

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateMapHtml(venues: Venue[], userLat: number, userLng: number): string {
  const venueData = venues
    .filter(v => v.latitude && v.longitude)
    .map(v => ({ id: v.id, rating: v.rating, lat: v.latitude, lng: v.longitude }));

  const venueJson = JSON.stringify(venueData);

  return `<!DOCTYPE html>
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
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${userLat}, ${userLng}], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);
    
    var venues = ${venueJson};
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

    // User location dot
    var userLat = ${userLat};
    var userLng = ${userLng};
    if (userLat && userLng) {
      var userIcon = L.divIcon({
        className: '',
        html: '<div style="background:#4A90E2;border-radius:50%;width:14px;height:14px;border:3px solid #fff;box-shadow:0 0 0 4px rgba(74,144,226,0.3)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
    }
    
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

    window.centerOnUser = function(lat, lng) {
      map.setView([lat, lng], 14);
    };
  </script>
</body>
</html>`;
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
  const [searchMode, setSearchMode] = useState<'venues' | 'barbers'>('venues');
  const [sortMode, setSortMode] = useState<'best' | 'nearest' | 'top_rated'>('best');
  const [maxPrice, setMaxPrice] = useState(284);
  const [showSearchByModal, setShowSearchByModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);

  // Request location on mount
  useEffect(() => {
    const requestLocation = async () => {
      console.log('[MapSearch] Requesting location permission');
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          console.log('[MapSearch] User location obtained:', lat, lng);
          setUserLocation({ lat, lng });
          // Update venue distances
          setVenues(prev => prev.map(v => ({
            ...v,
            distance_km: (v.latitude && v.longitude)
              ? haversine(lat, lng, v.latitude, v.longitude)
              : v.distance_km,
          })).sort((a, b) => a.distance_km - b.distance_km));
          setMapKey(k => k + 1);
        } else {
          console.log('[MapSearch] Location permission denied, using default');
        }
      } catch (err) {
        console.log('[MapSearch] Location error:', err);
      } finally {
        setLocating(false);
      }
    };
    requestLocation();
  }, []);

  useEffect(() => {
    const fetchVenues = async () => {
      console.log('[MapSearch] Fetching barbershops from Supabase');
      try {
        const { data, error } = await supabase
          .from('barbershops')
          .select('id, name, category, rating_avg, address, cover_url, lat, lng, is_active, status')
          .eq('status', 'approved')
          .limit(20);
        if (!error && data && data.length > 0) {
          console.log('[MapSearch] Loaded', data.length, 'barbershops');
          const userLat = userLocation?.lat ?? DEFAULT_LAT;
          const userLng = userLocation?.lng ?? DEFAULT_LNG;
          const mapped: Venue[] = data.map((b: any) => {
            const vLat = b.lat ?? DEFAULT_LAT;
            const vLng = b.lng ?? DEFAULT_LNG;
            return {
              id: b.id,
              name: b.name,
              category: b.category ?? 'Barber',
              rating: Number(b.rating_avg) || 0,
              review_count: 0,
              distance_km: haversine(userLat, userLng, vLat, vLng),
              address: b.address ?? '',
              image_url: b.cover_url?.startsWith('http') ? b.cover_url : 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
              latitude: vLat,
              longitude: vLng,
              is_open: b.is_active,
              starting_price: 5,
              next_slot: '',
            };
          }).sort((a: Venue, b: Venue) => a.distance_km - b.distance_km);
          setVenues(mapped);
          setMapKey(k => k + 1);
        } else {
          console.log('[MapSearch] Using mock venues:', error?.message);
        }
      } catch (err) {
        console.log('[MapSearch] Exception fetching venues:', err);
      }
    };
    fetchVenues();
  }, [userLocation]);

  const effectiveLat = userLocation?.lat ?? DEFAULT_LAT;
  const effectiveLng = userLocation?.lng ?? DEFAULT_LNG;
  const mapHtml = generateMapHtml(venues, effectiveLat, effectiveLng);

  const filteredVenues = venues.filter(v =>
    !searchQuery ||
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleMyLocation = useCallback(() => {
    console.log('[MapSearch] My location button pressed');
    if (userLocation) {
      webViewRef.current?.injectJavaScript(`window.centerOnUser(${userLocation.lat}, ${userLocation.lng}); true;`);
    }
  }, [userLocation]);

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress') {
        console.log('[MapSearch] Marker pressed for venue:', data.venueId);
        setSelectedVenueId(data.venueId);
        snapToPoint(SNAP_HALF);
        const idx = venues.findIndex(v => v.id === data.venueId);
        if (idx >= 0) {
          setTimeout(() => {
            venueListRef.current?.scrollTo({ y: idx * 280, animated: true });
          }, 350);
        }
      } else if (data.type === 'mapMove') {
        console.log('[MapSearch] Map moved to:', data.lat, data.lng);
      }
    } catch (e) {}
  }, [snapToPoint, venues]);

  const handleVenueCardPress = useCallback((id: string, name: string) => {
    console.log('[MapSearch] Venue card pressed:', id, name);
    router.push(`/venue/${id}`);
  }, [router]);

  const handleVenueCardSelect = useCallback((id: string) => {
    console.log('[MapSearch] Venue card selected on map:', id);
    setSelectedVenueId(id);
    selectMarkerOnMap(id);
  }, [selectMarkerOnMap]);

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
        style={styles.map}
        originWhitelist={['*']}
        onMessage={handleWebViewMessage}
        scrollEnabled={false}
        javaScriptEnabled
      />

      {/* Locating indicator */}
      {locating && (
        <View style={[styles.locatingBadge, { top: insets.top + 70 }]}>
          <ActivityIndicator size="small" color="#4A90E2" />
          <Text style={styles.locatingText}>Locating you...</Text>
        </View>
      )}

      {/* My location button */}
      {userLocation && (
        <AnimatedPressable
          onPress={handleMyLocation}
          style={[styles.myLocationBtn, { top: insets.top + 70 }]}
        >
          <Crosshair size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
      )}

      {/* Search bar */}
      <View style={[styles.searchBarContainer, { top: insets.top + 12 }]}>
        <View style={styles.searchBarPill}>
          <Search size={18} color="#888" />
          <View style={{ flex: 1 }}>
            <Text style={styles.searchBarTitle}>All treatments</Text>
            <Text style={styles.searchBarSub}>Map area</Text>
          </View>
          <AnimatedPressable onPress={() => { console.log('[MapSearch] Menu button pressed'); setShowSearchByModal(true); }} style={styles.searchBarMenuBtn}>
            <AlignJustify size={18} color={MADAR_COLORS.text} />
          </AnimatedPressable>
        </View>
      </View>

      {/* Bottom sheet */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.dragHandle} />
        </View>

        {/* Filter bar */}
        <View style={styles.filterBar}>
          <AnimatedPressable style={styles.filterIconBtn} onPress={() => { console.log('[MapSearch] Filter icon pressed'); setShowSortModal(true); }}>
            <SlidersHorizontal size={16} color={MADAR_COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable style={styles.filterChipDropdown} onPress={() => { console.log('[MapSearch] Venues/Professionals chip pressed'); setShowSearchByModal(true); }}>
            <Text style={styles.filterChipDropdownText}>{searchMode === 'barbers' ? 'Professionals' : 'Venues'}</Text>
            <ChevronDown size={14} color={MADAR_COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable style={styles.filterChipDropdown} onPress={() => { console.log('[MapSearch] Sort chip pressed'); setShowSortModal(true); }}>
            <Text style={styles.filterChipDropdownText}>{sortMode === 'nearest' ? 'Nearest' : sortMode === 'top_rated' ? 'Top rated' : 'Best match'}</Text>
            <ChevronDown size={14} color={MADAR_COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable style={styles.filterChipDropdown} onPress={() => { console.log('[MapSearch] Price chip pressed'); setShowPriceModal(true); }}>
            <Text style={styles.filterChipDropdownText}>Price</Text>
            <ChevronDown size={14} color={MADAR_COLORS.text} />
          </AnimatedPressable>
        </View>

        {/* Venue count */}
        <Text style={styles.venueCount}>{filteredVenues.length} venues in map area</Text>

        {/* Venue list */}
        <ScrollView
          ref={venueListRef}
          style={styles.venueList}
          contentContainerStyle={styles.venueListContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          scrollEnabled={true}
          onScroll={(e) => {
            if (e.nativeEvent.contentOffset.y > 2 && !sheetAtFull) {
              console.log('[MapSearch] Venue list scroll detected, expanding sheet to full');
              snapToPoint(SNAP_FULL);
            }
          }}
          scrollEventThrottle={16}
        >
          {filteredVenues.map((venue) => {
            const isSelected = selectedVenueId === venue.id;
            const ratingStr = Number(venue.rating).toFixed(1);
            const distanceStr = venue.distance_km < 1
              ? `${Math.round(venue.distance_km * 1000)}m`
              : `${venue.distance_km.toFixed(1)} km`;
            const distanceAddress = `${distanceStr} · ${venue.address}`;
            const categoryReviews = `${venue.category} · ${venue.review_count} reviews`;
            const fromPrice = `From BHD ${venue.starting_price}`;
            const nextSlot = venue.next_slot ? `Next: ${venue.next_slot}` : '';

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
                    {nextSlot ? <Text style={styles.venueNextSlot}>{nextSlot}</Text> : null}
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>

      {/* Search by modal */}
      {showSearchByModal && (
        <AnimatedPressable
          style={styles.modalOverlay}
          onPress={() => setShowSearchByModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search by</Text>
              <AnimatedPressable onPress={() => setShowSearchByModal(false)}>
                <X size={20} color={MADAR_COLORS.text} />
              </AnimatedPressable>
            </View>
            <View style={styles.modalOptions}>
              <AnimatedPressable
                style={[styles.modalOption, searchMode === 'venues' && styles.modalOptionActive]}
                onPress={() => { console.log('[MapSearch] Search mode set to venues'); setSearchMode('venues'); setShowSearchByModal(false); }}
              >
                <Store size={24} color={searchMode === 'venues' ? MADAR_COLORS.gold : MADAR_COLORS.textSecondary} />
                <Text style={[styles.modalOptionText, searchMode === 'venues' && styles.modalOptionTextActive]}>Venues</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.modalOption, searchMode === 'barbers' && styles.modalOptionActive]}
                onPress={() => { console.log('[MapSearch] Search mode set to barbers'); setSearchMode('barbers'); setShowSearchByModal(false); }}
              >
                <Users size={24} color={searchMode === 'barbers' ? MADAR_COLORS.gold : MADAR_COLORS.textSecondary} />
                <Text style={[styles.modalOptionText, searchMode === 'barbers' && styles.modalOptionTextActive]}>Professionals</Text>
              </AnimatedPressable>
            </View>
          </View>
        </AnimatedPressable>
      )}

      {/* Sort by modal */}
      {showSortModal && (
        <AnimatedPressable
          style={styles.modalOverlay}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort by</Text>
              <AnimatedPressable onPress={() => setShowSortModal(false)}>
                <X size={20} color={MADAR_COLORS.text} />
              </AnimatedPressable>
            </View>
            <View style={styles.modalOptions}>
              {[
                { id: 'best', label: 'Best match', Icon: Heart },
                { id: 'nearest', label: 'Nearest', Icon: MapPin },
                { id: 'top_rated', label: 'Top rated', Icon: Star },
              ].map(({ id, label, Icon }) => (
                <AnimatedPressable
                  key={id}
                  style={[styles.modalOption, sortMode === id && styles.modalOptionActive]}
                  onPress={() => { console.log('[MapSearch] Sort mode set to:', id); setSortMode(id as any); setShowSortModal(false); }}
                >
                  <Icon size={24} color={sortMode === id ? MADAR_COLORS.gold : MADAR_COLORS.textSecondary} />
                  <Text style={[styles.modalOptionText, sortMode === id && styles.modalOptionTextActive]}>{label}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        </AnimatedPressable>
      )}

      {/* Price modal */}
      {showPriceModal && (
        <AnimatedPressable
          style={styles.modalOverlay}
          onPress={() => setShowPriceModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Price</Text>
              <AnimatedPressable onPress={() => setShowPriceModal(false)}>
                <X size={20} color={MADAR_COLORS.text} />
              </AnimatedPressable>
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: MADAR_COLORS.textSecondary, fontSize: 14 }}>Maximum price</Text>
                <Text style={{ color: MADAR_COLORS.text, fontWeight: '600', fontSize: 14 }}>BHD {maxPrice}+</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <AnimatedPressable
                  style={[styles.filterChipDropdown, { flex: 1, justifyContent: 'center' }]}
                  onPress={() => { console.log('[MapSearch] Price filter cleared'); setShowPriceModal(false); }}
                >
                  <Text style={styles.filterChipDropdownText}>Clear</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.filterChipDropdown, { flex: 1, justifyContent: 'center', backgroundColor: MADAR_COLORS.text, borderColor: MADAR_COLORS.text }]}
                  onPress={() => { console.log('[MapSearch] Price filter applied, max:', maxPrice); setShowPriceModal(false); }}
                >
                  <Text style={[styles.filterChipDropdownText, { color: MADAR_COLORS.background }]}>Apply</Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </AnimatedPressable>
      )}
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
    bottom: 0,
  },
  locatingBadge: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locatingText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  myLocationBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  searchBarContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
  searchBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 28,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  searchBarSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  searchBarMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    backgroundColor: MADAR_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    backgroundColor: MADAR_COLORS.surface,
  },
  filterChipDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: MADAR_COLORS.text,
  },
  venueCount: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modalSheet: {
    backgroundColor: MADAR_COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: MADAR_COLORS.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  modalOptions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  modalOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
  },
  modalOptionActive: {
    borderColor: MADAR_COLORS.gold,
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: MADAR_COLORS.textSecondary,
  },
  modalOptionTextActive: {
    color: MADAR_COLORS.gold,
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
