import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  ImageSourcePropType,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Info, MapPin, Star, Calendar, Award } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const { width: screenWidth } = Dimensions.get('window');

interface BarberProfile {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  bookings: number;
  review_count: number;
  avatar: string;
  rank: number;
}

const ALL_BARBERS: BarberProfile[] = [
  { id: '1', name: 'Majed Al-Rashid', specialty: 'Fade Specialist', rating: 5.0, bookings: 6, review_count: 2, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', rank: 1 },
  { id: '2', name: 'alili barber', specialty: 'Classic Cuts', rating: 0.0, bookings: 0, review_count: 0, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', rank: 2 },
  { id: '3', name: 'majed', specialty: 'Beard Styling', rating: 0.0, bookings: 0, review_count: 0, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', rank: 3 },
  { id: '4', name: 'Omar Saleh', specialty: 'Hot Towel Shave', rating: 4.8, bookings: 32, review_count: 54, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200', rank: 4 },
  { id: '5', name: 'Faisal Al-Mansoori', specialty: 'Skin Fade', rating: 4.7, bookings: 28, review_count: 41, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200', rank: 5 },
  { id: '6', name: 'Hassan Al-Zayed', specialty: 'Color & Highlights', rating: 4.6, bookings: 19, review_count: 28, avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200', rank: 6 },
];

const RANK_COLORS: Record<number, string> = {
  1: '#C9A84C',
  2: '#A8A8A8',
  3: '#CD7F32',
};

const FILTER_CHIPS = [
  { id: 'all', label: '✦ All Barbers' },
  { id: 'near', label: '📍 Near Me' },
  { id: 'top', label: '☆ Top Rated' },
  { id: 'new', label: '📅 New' },
];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function PodiumCard({
  barber,
  elevated,
  onPress,
}: {
  barber: BarberProfile;
  elevated: boolean;
  onPress: () => void;
}) {
  const rankColor = RANK_COLORS[barber.rank] ?? MADAR_COLORS.textSecondary;
  const avatarSize = elevated ? 80 : 64;
  const avatarRadius = avatarSize / 2;
  const badgeSize = elevated ? 32 : 28;
  const badgeRadius = badgeSize / 2;
  const nameFontSize = elevated ? 15 : 13;
  const ratingFontSize = elevated ? 13 : 11;
  const ratingStr = Number(barber.rating).toFixed(1);
  const reviewText = `${ratingStr} ★ (${barber.review_count})`;
  const bookingsText = `${barber.bookings} bookings`;

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.podiumCard, elevated && styles.podiumCardElevated]}
    >
      {/* Rank badge */}
      <View style={[styles.podiumBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeRadius, backgroundColor: rankColor }]}>
        <Text style={[styles.podiumBadgeText, { fontSize: elevated ? 15 : 13 }]}>{barber.rank}</Text>
      </View>
      {/* Avatar */}
      <Image
        source={resolveImageSource(barber.avatar)}
        style={[
          styles.podiumAvatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarRadius,
            borderColor: rankColor,
            borderWidth: elevated ? 3 : 2,
          },
        ]}
      />
      {/* TOP BARBER pill */}
      <View style={styles.podiumTopPill}>
        <Text style={styles.podiumTopPillText}>🏆 TOP BARBER</Text>
      </View>
      {/* Name */}
      <Text style={[styles.podiumName, { fontSize: nameFontSize }]} numberOfLines={1}>{barber.name}</Text>
      {/* Rating */}
      <Text style={[styles.podiumRating, { fontSize: ratingFontSize }]}>{reviewText}</Text>
      {/* Bookings */}
      <Text style={styles.podiumBookings}>{bookingsText}</Text>
    </AnimatedPressable>
  );
}

function RankedListCard({ barber, index, onPress }: { barber: BarberProfile; index: number; onPress: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const ratingStr = Number(barber.rating).toFixed(1);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable onPress={onPress} style={styles.rankedCard}>
        {/* Rank number */}
        <Text style={styles.rankedNumber}>{barber.rank}</Text>
        {/* Avatar */}
        <Image source={resolveImageSource(barber.avatar)} style={styles.rankedAvatar} />
        {/* Middle info */}
        <View style={styles.rankedMiddle}>
          <Text style={styles.rankedName}>{barber.name}</Text>
          <Text style={styles.rankedSpecialty}>{barber.specialty}</Text>
          <View style={styles.rankedTopPill}>
            <Text style={styles.rankedTopPillText}>TOP BARBER</Text>
          </View>
        </View>
        {/* Right stats */}
        <View style={styles.rankedRight}>
          <Text style={styles.rankedRating}>{ratingStr} ★</Text>
          <Text style={styles.rankedBookings}>{barber.bookings} bookings</Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function TopBarbersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('all');

  const podiumBarbers = ALL_BARBERS.filter(b => b.rank <= 3);
  const rank1 = podiumBarbers.find(b => b.rank === 1);
  const rank2 = podiumBarbers.find(b => b.rank === 2);
  const rank3 = podiumBarbers.find(b => b.rank === 3);
  const rankedList = ALL_BARBERS.filter(b => b.rank > 3);

  const handleBack = useCallback(() => {
    console.log('[TopBarbers] Back pressed');
    router.back();
  }, [router]);

  const handleInfo = useCallback(() => {
    console.log('[TopBarbers] Info pressed');
  }, []);

  const handleFilterPress = useCallback((id: string, label: string) => {
    console.log('[TopBarbers] Filter pressed:', id, label);
    setActiveFilter(id);
  }, []);

  const handleBarberPress = useCallback((id: string, name: string) => {
    console.log('[TopBarbers] Barber pressed:', id, name);
    router.push(`/barber/${id}`);
  }, [router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={handleBack} style={styles.headerBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Top Barbers</Text>
          <Text style={styles.headerSubtitle}>Ranked by ratings, bookings and reviews</Text>
        </View>
        <AnimatedPressable onPress={handleInfo} style={styles.headerBtn}>
          <Info size={20} color={MADAR_COLORS.textSecondary} />
        </AnimatedPressable>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filtersScroll}
      >
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <AnimatedPressable
              key={chip.id}
              onPress={() => handleFilterPress(chip.id, chip.label)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {chip.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      {/* Podium */}
      <View style={styles.podiumRow}>
        {rank2 && (
          <PodiumCard
            barber={rank2}
            elevated={false}
            onPress={() => handleBarberPress(rank2.id, rank2.name)}
          />
        )}
        {rank1 && (
          <PodiumCard
            barber={rank1}
            elevated={true}
            onPress={() => handleBarberPress(rank1.id, rank1.name)}
          />
        )}
        {rank3 && (
          <PodiumCard
            barber={rank3}
            elevated={false}
            onPress={() => handleBarberPress(rank3.id, rank3.name)}
          />
        )}
      </View>

      {/* Rankings note */}
      <Text style={styles.rankingsNote}>
        Rankings update from live ratings, reviews and completed bookings.
      </Text>

      {/* Ranked list (rank 4+) */}
      <View style={styles.rankedListContainer}>
        {rankedList.map((barber, index) => (
          <RankedListCard
            key={barber.id}
            barber={barber}
            index={index}
            onPress={() => handleBarberPress(barber.id, barber.name)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MADAR_COLORS.background,
  },
  content: {
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  headerBtn: {
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
    gap: 2,
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
    marginTop: 16,
    flexGrow: 0,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
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
    fontWeight: '700',
  },
  // Podium
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 24,
  },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  podiumCardElevated: {
    paddingBottom: 24,
  },
  podiumBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBadgeText: {
    fontWeight: '800',
    color: '#fff',
  },
  podiumAvatar: {
    // dynamic styles applied inline
  },
  podiumTopPill: {
    backgroundColor: MADAR_COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: MADAR_COLORS.goldBorder,
  },
  podiumTopPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: MADAR_COLORS.gold,
  },
  podiumName: {
    fontWeight: '700',
    color: MADAR_COLORS.text,
    textAlign: 'center',
  },
  podiumRating: {
    color: MADAR_COLORS.gold,
    fontWeight: '600',
    textAlign: 'center',
  },
  podiumBookings: {
    fontSize: 11,
    color: MADAR_COLORS.textSecondary,
    textAlign: 'center',
  },
  rankingsNote: {
    fontSize: 12,
    color: MADAR_COLORS.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 16,
  },
  rankedListContainer: {
    marginTop: 16,
  },
  rankedCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankedNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: MADAR_COLORS.gold,
    width: 28,
    textAlign: 'center',
  },
  rankedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  rankedMiddle: {
    flex: 1,
    gap: 3,
  },
  rankedName: {
    fontSize: 14,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  rankedSpecialty: {
    fontSize: 12,
    color: MADAR_COLORS.textSecondary,
  },
  rankedTopPill: {
    alignSelf: 'flex-start',
    backgroundColor: MADAR_COLORS.goldMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: MADAR_COLORS.goldBorder,
    marginTop: 2,
  },
  rankedTopPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: MADAR_COLORS.gold,
  },
  rankedRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  rankedRating: {
    fontSize: 13,
    color: MADAR_COLORS.gold,
    fontWeight: '700',
  },
  rankedBookings: {
    fontSize: 11,
    color: MADAR_COLORS.textSecondary,
  },
});
