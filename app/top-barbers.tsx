import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Star, Award, MapPin, Calendar } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';

const { width: screenWidth } = Dimensions.get('window');

interface BarberProfile {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  bookings: number;
  reviews: number;
  avatar: string;
  cover: string;
  rank: number;
}

const ALL_BARBERS: BarberProfile[] = [
  { id: '1', name: 'Majed Al-Rashid', specialty: 'Fade Specialist', rating: 5.0, bookings: 6, reviews: 12, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', cover: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', rank: 1 },
  { id: '2', name: 'Ali Hassan', specialty: 'Classic Cuts', rating: 4.9, bookings: 45, reviews: 89, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', cover: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', rank: 2 },
  { id: '3', name: 'Khalid Nasser', specialty: 'Beard Styling', rating: 4.8, bookings: 38, reviews: 67, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', cover: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800', rank: 3 },
  { id: '4', name: 'Omar Saleh', specialty: 'Hot Towel Shave', rating: 4.8, bookings: 32, reviews: 54, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200', cover: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', rank: 4 },
  { id: '5', name: 'Faisal Al-Mansoori', specialty: 'Skin Fade', rating: 4.7, bookings: 28, reviews: 41, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200', cover: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', rank: 5 },
];

const RANK_COLORS: Record<number, string> = {
  1: '#C9A84C',
  2: '#A8A8A8',
  3: '#CD7F32',
};

const FILTER_CHIPS = [
  { id: 'all', label: 'All Barbers', icon: Award },
  { id: 'near', label: 'Near Me', icon: MapPin },
  { id: 'top', label: 'Top Rated', icon: Star },
  { id: 'new', label: 'New', icon: Calendar },
];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function BarberCard({ barber, index, onPress, onBook }: {
  barber: BarberProfile;
  index: number;
  onPress: () => void;
  onBook: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const rankColor = RANK_COLORS[barber.rank] ?? MADAR_COLORS.textSecondary;
  const ratingStr = Number(barber.rating).toFixed(1);
  const isRank1 = barber.rank === 1;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.barberCardWrapper, { opacity, transform: [{ translateY }] }]}>
      <AnimatedPressable onPress={onPress} style={styles.barberCard}>
        {/* Cover photo */}
        <View style={styles.coverContainer}>
          <Image
            source={resolveImageSource(barber.cover)}
            style={styles.coverImage}
            resizeMode="cover"
          />
          {/* Rank badge */}
          <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
            <Text style={styles.rankBadgeText}>{barber.rank}</Text>
          </View>
        </View>

        {/* Avatar overlapping cover */}
        <View style={styles.avatarContainer}>
          <Image
            source={resolveImageSource(barber.avatar)}
            style={[
              styles.avatar,
              { borderColor: isRank1 ? '#C9A84C' : MADAR_COLORS.surface },
            ]}
          />
        </View>

        {/* Info */}
        <View style={styles.barberInfo}>
          <Text style={styles.barberName}>{barber.name}</Text>
          <View style={styles.topBarberBadge}>
            <Text style={styles.topBarberBadgeText}>TOP BARBER</Text>
          </View>
          <Text style={styles.barberSpecialty}>{barber.specialty}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{barber.bookings}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{ratingStr}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{barber.reviews}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
          </View>

          {/* Book button */}
          <AnimatedPressable onPress={onBook} style={styles.bookBtn}>
            <Text style={styles.bookBtnText}>Book Now</Text>
          </AnimatedPressable>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function TopBarbersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('all');
  const [barbers, setBarbers] = useState<BarberProfile[]>(ALL_BARBERS);

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    console.log('[TopBarbers] Fetching barbers from Supabase');
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('rating', { ascending: false })
        .limit(20);
      if (error || !data || data.length === 0) {
        console.log('[TopBarbers] Using mock barbers:', error?.message);
        setBarbers(ALL_BARBERS);
      } else {
        console.log('[TopBarbers] Loaded', data.length, 'barbers');
        setBarbers(data.map((b: BarberProfile, i: number) => ({ ...b, rank: i + 1 })));
      }
    } catch (err) {
      console.log('[TopBarbers] Exception, using mock:', err);
      setBarbers(ALL_BARBERS);
    }
  };

  const handleBack = useCallback(() => {
    console.log('[TopBarbers] Back pressed');
    router.back();
  }, [router]);

  const handleFilterPress = useCallback((id: string, label: string) => {
    console.log('[TopBarbers] Filter pressed:', id, label);
    setActiveFilter(id);
  }, []);

  const handleBarberPress = useCallback((id: string, name: string) => {
    console.log('[TopBarbers] Barber card pressed:', id, name);
    router.push(`/barber/${id}`);
  }, [router]);

  const handleBookPress = useCallback((id: string, name: string) => {
    console.log('[TopBarbers] Book pressed for barber:', id, name);
    router.push(`/booking/services?barberId=${id}`);
  }, [router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Top Barbers</Text>
          <Text style={styles.headerSubtitle}>Ranked by ratings, bookings & reviews</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.id;
          const ChipIcon = chip.icon;
          return (
            <AnimatedPressable
              key={chip.id}
              onPress={() => handleFilterPress(chip.id, chip.label)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <ChipIcon
                size={13}
                color={isActive ? MADAR_COLORS.background : MADAR_COLORS.textSecondary}
              />
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {chip.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      {/* Barber cards */}
      {barbers.map((barber, index) => (
        <BarberCard
          key={barber.id}
          barber={barber}
          index={index}
          onPress={() => handleBarberPress(barber.id, barber.name)}
          onBook={() => handleBookPress(barber.id, barber.name)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MADAR_COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: MADAR_COLORS.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
    textAlign: 'center',
  },
  filtersScroll: {
    marginHorizontal: -16,
    marginBottom: 20,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
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
  filterChipActive: {
    backgroundColor: MADAR_COLORS.gold,
    borderColor: MADAR_COLORS.gold,
  },
  filterChipText: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: MADAR_COLORS.background,
    fontWeight: '600',
  },
  barberCardWrapper: {
    marginBottom: 16,
  },
  barberCard: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    overflow: 'hidden',
  },
  coverContainer: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -32,
    marginBottom: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
  },
  barberInfo: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  barberName: {
    fontSize: 18,
    fontWeight: '800',
    color: MADAR_COLORS.text,
    textAlign: 'center',
  },
  topBarberBadge: {
    backgroundColor: MADAR_COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: MADAR_COLORS.goldBorder,
  },
  topBarberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: MADAR_COLORS.gold,
    letterSpacing: 0.5,
  },
  barberSpecialty: {
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: MADAR_COLORS.divider,
    marginVertical: 10,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: MADAR_COLORS.gold,
  },
  statLabel: {
    fontSize: 11,
    color: MADAR_COLORS.textSecondary,
  },
  bookBtn: {
    backgroundColor: MADAR_COLORS.gold,
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  bookBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A0A0F',
  },
});
