import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Info, Star, Scissors, MapPin, Award, Calendar } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';

interface Barber {
  id: string;
  name: string;
  rating: number;
  bookings: number;
  avatar: string;
  rank: number;
}

const ALL_BARBERS: Barber[] = [
  { id: '1', name: 'majed barber', rating: 5.0, bookings: 6, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', rank: 1 },
  { id: '2', name: 'alili barber', rating: 0.0, bookings: 0, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', rank: 2 },
  { id: '3', name: 'majed', rating: 0.0, bookings: 0, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', rank: 3 },
  { id: '4', name: 'Ahmed Al-Rashid', rating: 4.9, bookings: 45, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200', rank: 4 },
  { id: '5', name: 'Khalid Hassan', rating: 4.8, bookings: 38, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200', rank: 5 },
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

function PodiumCard({ barber, elevated }: { barber: Barber; elevated: boolean }) {
  const avatarSize = elevated ? 80 : 64;
  const rankColor = RANK_COLORS[barber.rank] ?? MADAR_COLORS.textSecondary;
  const ratingStr = Number(barber.rating).toFixed(1);
  const bookingsText = `${barber.bookings} bookings`;

  return (
    <View style={[styles.podiumCard, elevated && styles.podiumCardElevated]}>
      <View style={{ position: 'relative', alignSelf: 'center' }}>
        <Image
          source={resolveImageSource(barber.avatar)}
          style={[
            styles.podiumAvatar,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
            elevated && styles.podiumAvatarElevated,
          ]}
        />
        <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
          <Text style={styles.rankBadgeText}>{barber.rank}</Text>
        </View>
      </View>
      <Text style={[styles.podiumName, elevated && styles.podiumNameElevated]} numberOfLines={1}>
        {barber.name}
      </Text>
      <View style={styles.topBarberBadge}>
        <Scissors size={9} color={MADAR_COLORS.background} />
        <Text style={styles.topBarberBadgeText}>TOP BARBER</Text>
      </View>
      <View style={styles.podiumRatingRow}>
        <Star size={12} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
        <Text style={styles.podiumRating}>{ratingStr}</Text>
        <Text style={styles.podiumRatingCount}>(0)</Text>
      </View>
      <Text style={styles.podiumBookings}>{bookingsText}</Text>
    </View>
  );
}

export default function TopBarbersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('all');
  const [barbers, setBarbers] = useState<Barber[]>(ALL_BARBERS);

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
        setBarbers(data.map((b: Barber, i: number) => ({ ...b, rank: i + 1 })));
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
    console.log('[TopBarbers] Barber pressed:', id, name);
  }, []);

  const rank1 = barbers.find(b => b.rank === 1);
  const rank2 = barbers.find(b => b.rank === 2);
  const rank3 = barbers.find(b => b.rank === 3);
  const restBarbers = barbers.filter(b => b.rank > 3);

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
          <Text style={styles.headerSubtitle}>Ranked by ratings, bookings and reviews</Text>
        </View>
        <AnimatedPressable
          onPress={() => console.log('[TopBarbers] Info pressed')}
          style={styles.infoBtn}
        >
          <Info size={20} color={MADAR_COLORS.textSecondary} />
        </AnimatedPressable>
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

      {/* Podium */}
      <View style={styles.podiumContainer}>
        {rank2 && <PodiumCard barber={rank2} elevated={false} />}
        {rank1 && <PodiumCard barber={rank1} elevated={true} />}
        {rank3 && <PodiumCard barber={rank3} elevated={false} />}
      </View>

      {/* Rankings note */}
      <Text style={styles.rankingsNote}>
        Rankings update from live ratings, reviews and completed bookings.
      </Text>

      {/* Ranked list (4+) */}
      {restBarbers.length > 0 && (
        <View style={styles.rankedList}>
          {restBarbers.map((barber, index) => {
            const ratingStr = Number(barber.rating).toFixed(1);
            return (
              <React.Fragment key={barber.id}>
                <AnimatedPressable
                  onPress={() => handleBarberPress(barber.id, barber.name)}
                  style={styles.rankedRow}
                >
                  <Text style={styles.rankedNumber}>{barber.rank}</Text>
                  <Image source={resolveImageSource(barber.avatar)} style={styles.rankedAvatar} />
                  <View style={styles.rankedInfo}>
                    <Text style={styles.rankedName} numberOfLines={1}>{barber.name}</Text>
                    <View style={styles.topBarberBadgeSmall}>
                      <Scissors size={8} color={MADAR_COLORS.background} />
                      <Text style={styles.topBarberBadgeTextSmall}>TOP BARBER</Text>
                    </View>
                  </View>
                  <View style={styles.rankedRight}>
                    <View style={styles.rankedRatingRow}>
                      <Star size={11} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
                      <Text style={styles.rankedRating}>{ratingStr}</Text>
                    </View>
                    <Text style={styles.rankedBookings}>{barber.bookings} bookings</Text>
                  </View>
                </AnimatedPressable>
                {index < restBarbers.length - 1 && <View style={styles.rowDivider} />}
              </React.Fragment>
            );
          })}
        </View>
      )}
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
    fontWeight: '700',
    color: MADAR_COLORS.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
    textAlign: 'center',
  },
  infoBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersScroll: {
    marginHorizontal: -20,
    marginBottom: 24,
  },
  filtersContainer: {
    paddingHorizontal: 20,
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
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
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
  },
  podiumCardElevated: {
    marginBottom: 20,
    borderColor: MADAR_COLORS.goldBorder,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
  },
  podiumAvatar: {
    borderWidth: 2,
    borderColor: MADAR_COLORS.border,
  },
  podiumAvatarElevated: {
    borderColor: MADAR_COLORS.gold,
  },
  rankBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    textAlign: 'center',
  },
  podiumNameElevated: {
    fontSize: 14,
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
  podiumRatingCount: {
    fontSize: 11,
    color: MADAR_COLORS.textTertiary,
  },
  podiumBookings: {
    fontSize: 10,
    color: MADAR_COLORS.textSecondary,
    textAlign: 'center',
  },
  rankingsNote: {
    fontSize: 12,
    color: MADAR_COLORS.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
    lineHeight: 18,
  },
  rankedList: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    overflow: 'hidden',
  },
  rankedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rankedNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: MADAR_COLORS.gold,
    width: 28,
    textAlign: 'center',
  },
  rankedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  rankedInfo: {
    flex: 1,
    gap: 4,
  },
  rankedName: {
    fontSize: 14,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  topBarberBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: MADAR_COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  topBarberBadgeTextSmall: {
    fontSize: 7,
    fontWeight: '800',
    color: MADAR_COLORS.background,
    letterSpacing: 0.5,
  },
  rankedRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  rankedRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  rowDivider: {
    height: 1,
    backgroundColor: MADAR_COLORS.divider,
    marginHorizontal: 16,
  },
});
