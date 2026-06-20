import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Animated,
  Dimensions,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, Star, MapPin } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 44) / 2;

interface FavVenue {
  id: string;
  name: string;
  category: string;
  rating: number;
  distance_km: number;
  image_url: string;
}

const MOCK_FAVOURITES: FavVenue[] = [
  { id: '1', name: 'Level Barber Shop', category: 'Barber', rating: 5.0, distance_km: 0.75, image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800' },
  { id: '2', name: 'Luxe Spa', category: 'Spa', rating: 4.8, distance_km: 2.1, image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800' },
  { id: '3', name: 'The Groom Room', category: 'Barber', rating: 4.9, distance_km: 1.2, image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800' },
  { id: '4', name: 'Nail Studio Pro', category: 'Nails', rating: 4.9, distance_km: 1.3, image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800' },
];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 70, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function FavouritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [favs, setFavs] = useState<FavVenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavourites();
  }, []);

  const fetchFavourites = async () => {
    console.log('[Favourites] Fetching favourites from Supabase');
    try {
      if (!user) {
        console.log('[Favourites] No user, using mock data');
        setFavs(MOCK_FAVOURITES);
        return;
      }
      const { data, error } = await supabase
        .from('favourites')
        .select('*, venues(*)')
        .eq('user_id', user.id);
      if (error || !data || data.length === 0) {
        console.log('[Favourites] Using mock data:', error?.message);
        setFavs(MOCK_FAVOURITES);
      } else {
        console.log('[Favourites] Loaded', data.length, 'favourites');
        const mapped = data.map((row: any) => ({
          id: row.venues?.id ?? row.venue_id,
          name: row.venues?.name ?? 'Unknown',
          category: row.venues?.category ?? '',
          rating: row.venues?.rating ?? 0,
          distance_km: row.venues?.distance_km ?? 0,
          image_url: row.venues?.image_url ?? '',
        }));
        setFavs(mapped);
      }
    } catch (err) {
      console.log('[Favourites] Exception, using mock data:', err);
      setFavs(MOCK_FAVOURITES);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (id: string, name: string) => {
    console.log('[Favourites] Remove favourite pressed:', id, name);
    setFavs(prev => prev.filter(f => f.id !== id));
  };

  const handleBook = (id: string, name: string) => {
    console.log('[Favourites] Book pressed:', id, name);
    router.push(`/venue/${id}`);
  };

  const handleBack = () => {
    console.log('[Favourites] Back pressed');
    router.back();
  };

  const handleDiscover = () => {
    console.log('[Favourites] Discover venues pressed');
    router.push('/map-search');
  };

  const heartCount = favs.length;

  const renderItem = ({ item, index }: { item: FavVenue; index: number }) => {
    const ratingStr = Number(item.rating).toFixed(1);
    const distanceStr = item.distance_km < 1
      ? `${Math.round(item.distance_km * 1000)}m`
      : `${item.distance_km.toFixed(1)} km`;

    return (
      <AnimatedCard index={index}>
        <AnimatedPressable
          onPress={() => handleBook(item.id, item.name)}
          style={styles.venueCard}
        >
          <View style={styles.imageContainer}>
            <Image
              source={resolveImageSource(item.image_url)}
              style={styles.venueImage}
              resizeMode="cover"
            />
            <AnimatedPressable
              onPress={() => handleRemove(item.id, item.name)}
              style={styles.heartBtn}
            >
              <Heart size={16} color={MADAR_COLORS.danger} fill={MADAR_COLORS.danger} />
            </AnimatedPressable>
          </View>
          <View style={styles.venueInfo}>
            <Text style={styles.venueName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.ratingRow}>
              <Star size={10} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
              <Text style={styles.ratingText}>{ratingStr}</Text>
            </View>
            <View style={styles.distanceRow}>
              <MapPin size={10} color={MADAR_COLORS.textTertiary} />
              <Text style={styles.distanceText}>{distanceStr}</Text>
            </View>
            <AnimatedPressable
              onPress={() => handleBook(item.id, item.name)}
              style={styles.bookBtn}
            >
              <Text style={styles.bookBtnText}>Book</Text>
            </AnimatedPressable>
          </View>
        </AnimatedPressable>
      </AnimatedCard>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Favourites</Text>
        <View style={styles.heartCountBadge}>
          <Heart size={14} color={MADAR_COLORS.danger} fill={MADAR_COLORS.danger} />
          <Text style={styles.heartCountText}>{heartCount}</Text>
        </View>
      </View>

      {favs.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Heart size={32} color={MADAR_COLORS.gold} />
          </View>
          <Text style={styles.emptyTitle}>No favourites yet</Text>
          <Text style={styles.emptySubtitle}>Save venues you love to quickly find them later</Text>
          <AnimatedPressable onPress={handleDiscover} style={styles.discoverBtn}>
            <Text style={styles.discoverBtnText}>Discover venues</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={favs}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MADAR_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    textAlign: 'center',
  },
  heartCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  heartCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 120,
  },
  columnWrapper: {
    gap: 12,
  },
  venueCard: {
    width: CARD_WIDTH,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  imageContainer: {
    position: 'relative',
  },
  venueImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueInfo: {
    padding: 10,
    backgroundColor: MADAR_COLORS.surface,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    gap: 4,
  },
  venueName: {
    fontSize: 13,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    color: MADAR_COLORS.gold,
    fontWeight: '600',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceText: {
    fontSize: 11,
    color: MADAR_COLORS.textSecondary,
  },
  bookBtn: {
    backgroundColor: MADAR_COLORS.goldMuted,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  bookBtnText: {
    fontSize: 12,
    color: MADAR_COLORS.gold,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: MADAR_COLORS.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    textAlign: 'center',
  },
  discoverBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: MADAR_COLORS.gold,
  },
  discoverBtnText: {
    fontSize: 14,
    color: MADAR_COLORS.background,
    fontWeight: '700',
  },
});
