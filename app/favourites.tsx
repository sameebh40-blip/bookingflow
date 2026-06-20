import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, Star } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface FavVenue {
  id: string;
  name: string;
  category: string;
  rating: number;
  image_url: string;
}

const MOCK_FAVS: FavVenue[] = [
  { id: '1', name: 'Level Barber Shop', category: 'Barber', rating: 5.0, image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400' },
  { id: '2', name: 'The Groom Room', category: 'Barber', rating: 5.0, image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400' },
  { id: '3', name: 'Luxe Spa & Wellness', category: 'Spa', rating: 4.8, image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400' },
];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
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
  const [favs, setFavs] = useState<FavVenue[]>(MOCK_FAVS);

  const handleRemove = (id: string, name: string) => {
    console.log('[Favourites] Remove favourite:', id, name);
    setFavs(prev => prev.filter(f => f.id !== id));
  };

  const handleBook = (id: string, name: string) => {
    console.log('[Favourites] Book pressed:', id, name);
    router.push(`/venue/${id}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => {
          console.log('[Favourites] Back pressed');
          router.back();
        }} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Favourites</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {favs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Heart size={32} color={MADAR_COLORS.gold} />
            </View>
            <Text style={styles.emptyTitle}>No favourites yet</Text>
            <Text style={styles.emptySubtitle}>Save venues you love to quickly find them later</Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[Favourites] Discover venues pressed');
                router.push('/(tabs)/discover');
              }}
              style={styles.discoverBtn}
            >
              <Text style={styles.discoverBtnText}>Discover venues</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {favs.map((venue, index) => (
              <AnimatedListItem key={venue.id} index={index}>
                <AnimatedPressable
                  onPress={() => handleBook(venue.id, venue.name)}
                  style={styles.venueCard}
                >
                  <View style={styles.imageContainer}>
                    <Image source={resolveImageSource(venue.image_url)} style={styles.venueImage} resizeMode="cover" />
                    <AnimatedPressable
                      onPress={() => handleRemove(venue.id, venue.name)}
                      style={styles.heartBtn}
                    >
                      <Heart size={16} color={MADAR_COLORS.danger} fill={MADAR_COLORS.danger} />
                    </AnimatedPressable>
                  </View>
                  <View style={styles.venueInfo}>
                    <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                    <View style={styles.ratingRow}>
                      <Star size={10} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
                      <Text style={styles.ratingText}>{venue.rating}</Text>
                      <Text style={styles.categoryText}>{venue.category}</Text>
                    </View>
                    <AnimatedPressable
                      onPress={() => handleBook(venue.id, venue.name)}
                      style={styles.bookBtn}
                    >
                      <Text style={styles.bookBtnText}>Book</Text>
                    </AnimatedPressable>
                  </View>
                </AnimatedPressable>
              </AnimatedListItem>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: MADAR_COLORS.text, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  venueCard: {
    width: '47%',
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  imageContainer: { position: 'relative' },
  venueImage: { width: '100%', height: 120 },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  venueInfo: { padding: 10, gap: 6 },
  venueName: { fontSize: 13, fontWeight: '700', color: MADAR_COLORS.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 11, color: MADAR_COLORS.gold, fontWeight: '600' },
  categoryText: { fontSize: 11, color: MADAR_COLORS.textTertiary },
  bookBtn: {
    paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: MADAR_COLORS.goldBorder,
    alignItems: 'center',
  },
  bookBtnText: { fontSize: 12, color: MADAR_COLORS.gold, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: MADAR_COLORS.goldMuted,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: MADAR_COLORS.text },
  emptySubtitle: { fontSize: 14, color: MADAR_COLORS.textSecondary, textAlign: 'center', maxWidth: 260 },
  discoverBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, backgroundColor: MADAR_COLORS.gold,
  },
  discoverBtnText: { fontSize: 14, color: MADAR_COLORS.background, fontWeight: '700' },
});
