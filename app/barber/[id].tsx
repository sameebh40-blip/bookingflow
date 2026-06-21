import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  FlatList,
  ImageSourcePropType,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Share2, Heart, Star, Clock, ChevronDown, ChevronUp, Scissors } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const { width: screenWidth } = Dimensions.get('window');

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
  avatar: string;
}

interface BarberProfile {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  review_count: number;
  bookings: number;
  years_experience: number;
  bio: string;
  avatar: string;
  cover: string;
  services: Service[];
  gallery: string[];
  reviews: Review[];
}

const MOCK_BARBER_PROFILES: Record<string, BarberProfile> = {
  '1': {
    id: '1',
    name: 'Majed Al-Rashid',
    specialty: 'Fade Specialist',
    rating: 5.0,
    review_count: 12,
    bookings: 6,
    years_experience: 8,
    bio: 'Specializing in modern fades and classic cuts. Trained in London and Dubai with over 8 years of experience creating the perfect look for every client.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    cover: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
    services: [
      { id: 's1', name: 'Classic Fade', duration: 30, price: 8 },
      { id: 's2', name: 'Skin Fade', duration: 45, price: 12 },
      { id: 's3', name: 'Beard Trim', duration: 20, price: 5 },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400',
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400',
    ],
    reviews: [
      { id: 'r1', name: 'Ahmed K.', rating: 5, comment: 'Best fade in Bahrain! Always delivers perfection.', date: '2 days ago', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
      { id: 'r2', name: 'Khalid M.', rating: 5, comment: 'Amazing work, very professional.', date: '1 week ago', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
    ],
  },
};

const ALL_BARBERS_FALLBACK = [
  { id: '2', name: 'alili barber', specialty: 'Classic Cuts', rating: 0.0, review_count: 0, bookings: 0, years_experience: 3, bio: 'Master of classic cuts and modern styles. Passionate about delivering the perfect look every time.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', cover: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800' },
  { id: '3', name: 'majed', specialty: 'Beard Styling', rating: 0.0, review_count: 0, bookings: 0, years_experience: 2, bio: 'Beard styling expert with a passion for precision grooming and modern barbering techniques.', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', cover: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800' },
  { id: '4', name: 'Omar Saleh', specialty: 'Hot Towel Shave', rating: 4.8, review_count: 54, bookings: 32, years_experience: 7, bio: 'Traditional hot towel shave specialist bringing old-school barbering to modern Bahrain.', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200', cover: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800' },
  { id: '5', name: 'Faisal Al-Mansoori', specialty: 'Skin Fade', rating: 4.7, review_count: 41, bookings: 28, years_experience: 4, bio: 'Skin fade specialist known for clean lines and attention to detail.', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200', cover: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800' },
  { id: '6', name: 'Hassan Al-Zayed', specialty: 'Color & Highlights', rating: 4.6, review_count: 28, bookings: 19, years_experience: 5, bio: 'Color specialist and modern stylist with expertise in highlights, toning, and creative cuts.', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200', cover: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800' },
];

const GENERIC_SERVICES: Service[] = [
  { id: 's1', name: 'Classic Haircut', duration: 30, price: 8 },
  { id: 's2', name: 'Fade Cut', duration: 45, price: 12 },
  { id: 's3', name: 'Beard Trim', duration: 20, price: 5 },
  { id: 's4', name: 'Full Grooming', duration: 60, price: 18 },
];

const GENERIC_GALLERY = [
  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400',
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400',
];

const GENERIC_REVIEWS: Review[] = [
  { id: 'r1', name: 'Ahmed K.', rating: 5, comment: 'Excellent service, highly recommend!', date: '3 days ago', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
  { id: 'r2', name: 'Khalid M.', rating: 5, comment: 'Very professional and skilled barber.', date: '1 week ago', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function BarberProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isFavourite, setIsFavourite] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [starRating, setStarRating] = useState(0);

  const getProfile = (): BarberProfile => {
    if (id && MOCK_BARBER_PROFILES[id]) {
      return MOCK_BARBER_PROFILES[id];
    }
    const fallback = ALL_BARBERS_FALLBACK.find(b => b.id === id);
    if (fallback) {
      return {
        ...fallback,
        services: GENERIC_SERVICES,
        gallery: GENERIC_GALLERY,
        reviews: GENERIC_REVIEWS,
      };
    }
    return MOCK_BARBER_PROFILES['1'];
  };

  const barber = getProfile();
  const ratingStr = Number(barber.rating).toFixed(1);
  const ratingFloor = Math.floor(barber.rating);

  const handleBack = useCallback(() => {
    console.log('[BarberProfile] Back pressed');
    router.back();
  }, [router]);

  const handleShare = useCallback(() => {
    console.log('[BarberProfile] Share pressed for barber:', barber.id, barber.name);
  }, [barber]);

  const handleFavourite = useCallback(() => {
    console.log('[BarberProfile] Favourite toggled for barber:', barber.id, barber.name);
    setIsFavourite(prev => !prev);
  }, [barber]);

  const handleBookNow = useCallback(() => {
    console.log('[BarberProfile] Book Now pressed for barber:', barber.id, barber.name);
    router.push(`/booking/services?barberId=${barber.id}`);
  }, [barber, router]);

  const handleServiceBook = useCallback((service: Service) => {
    console.log('[BarberProfile] Service book pressed:', service.id, service.name, 'barber:', barber.id);
    router.push(`/booking/services?barberId=${barber.id}`);
  }, [barber, router]);

  const handleToggleBio = useCallback(() => {
    console.log('[BarberProfile] Bio expanded toggled');
    setBioExpanded(prev => !prev);
  }, []);

  const handleStarPress = useCallback((star: number) => {
    console.log('[BarberProfile] Star rating pressed:', star);
    setStarRating(star);
  }, []);

  const stars = [1, 2, 3, 4, 5];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero cover */}
      <View style={styles.heroContainer}>
        <Image
          source={resolveImageSource(barber.cover)}
          style={styles.coverImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.95)']}
          style={styles.coverGradient}
        />
        {/* Back button */}
        <AnimatedPressable
          onPress={handleBack}
          style={[styles.heroBtn, { position: 'absolute', top: insets.top + 12, left: 16 }]}
        >
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        {/* Share + Heart buttons */}
        <View style={[styles.heroBtnGroup, { top: insets.top + 12, right: 16 }]}>
          <AnimatedPressable onPress={handleShare} style={styles.heroBtn}>
            <Share2 size={18} color={MADAR_COLORS.text} />
          </AnimatedPressable>
          <AnimatedPressable onPress={handleFavourite} style={styles.heroBtn}>
            <Heart
              size={18}
              color={isFavourite ? MADAR_COLORS.danger : MADAR_COLORS.text}
              fill={isFavourite ? MADAR_COLORS.danger : 'transparent'}
            />
          </AnimatedPressable>
        </View>
      </View>

      {/* Profile info */}
      <View style={styles.profileSection}>
        <Image source={resolveImageSource(barber.avatar)} style={styles.avatar} />
        <Text style={styles.barberName}>{barber.name}</Text>
        <Text style={styles.barberSpecialty}>{barber.specialty}</Text>
        <View style={styles.ratingRow}>
          {stars.map((s) => (
            <Star
              key={s}
              size={16}
              color={MADAR_COLORS.gold}
              fill={s <= ratingFloor ? MADAR_COLORS.gold : 'transparent'}
            />
          ))}
          <Text style={styles.ratingText}>{ratingStr}</Text>
          <Text style={styles.reviewCount}>({barber.review_count} reviews)</Text>
        </View>
      </View>

      {/* Book Now button */}
      <AnimatedPressable onPress={handleBookNow} style={styles.bookNowBtn}>
        <Text style={styles.bookNowText}>Book Now</Text>
      </AnimatedPressable>

      {/* Stats card */}
      <View style={styles.statsCard}>
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
          <Text style={styles.statNumber}>{barber.review_count}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text
          style={styles.bioText}
          numberOfLines={bioExpanded ? undefined : 3}
        >
          {barber.bio}
        </Text>
        <AnimatedPressable onPress={handleToggleBio} style={styles.readMoreBtn}>
          <Text style={styles.readMoreText}>{bioExpanded ? 'Show less' : 'Read more'}</Text>
        </AnimatedPressable>
      </View>

      {/* Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services</Text>
        {barber.services.map((service) => {
          const priceStr = `BHD ${service.price}`;
          const durationStr = `${service.duration} min`;
          return (
            <View key={service.id} style={styles.serviceRow}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <View style={styles.serviceMeta}>
                  <Clock size={12} color={MADAR_COLORS.textSecondary} />
                  <Text style={styles.serviceDuration}>{durationStr}</Text>
                </View>
              </View>
              <View style={styles.serviceRight}>
                <Text style={styles.servicePrice}>{priceStr}</Text>
                <AnimatedPressable
                  onPress={() => handleServiceBook(service)}
                  style={styles.serviceBookBtn}
                >
                  <Text style={styles.serviceBookBtnText}>Book</Text>
                </AnimatedPressable>
              </View>
            </View>
          );
        })}
      </View>

      {/* Gallery */}
      <View style={styles.gallerySection}>
        <Text style={[styles.sectionTitle, { marginHorizontal: 16 }]}>Work Gallery</Text>
        <FlatList
          data={barber.gallery}
          keyExtractor={(item, index) => `gallery-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <Image
              source={resolveImageSource(item)}
              style={styles.galleryImage}
              resizeMode="cover"
            />
          )}
        />
      </View>

      {/* Reviews */}
      <View style={styles.section}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <View style={styles.reviewsSummary}>
            <Star size={14} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
            <Text style={styles.reviewsAvg}>{ratingStr}</Text>
            <Text style={styles.reviewsTotal}>({barber.review_count})</Text>
          </View>
        </View>

        {barber.reviews.map((review) => {
          const reviewStars = [1, 2, 3, 4, 5];
          const reviewFloor = Math.floor(review.rating);
          return (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Image source={resolveImageSource(review.avatar)} style={styles.reviewAvatar} />
                <Text style={styles.reviewName}>{review.name}</Text>
                <Text style={styles.reviewDate}>{review.date}</Text>
              </View>
              <View style={styles.reviewStarsRow}>
                {reviewStars.map((s) => (
                  <Star
                    key={s}
                    size={14}
                    color={MADAR_COLORS.gold}
                    fill={s <= reviewFloor ? MADAR_COLORS.gold : 'transparent'}
                  />
                ))}
              </View>
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MADAR_COLORS.background,
  },
  heroContainer: {
    position: 'relative',
    height: 260,
  },
  coverImage: {
    width: '100%',
    height: 260,
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13,13,20,0.85)',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBtnGroup: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 8,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: -50,
    paddingHorizontal: 16,
    gap: 6,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: MADAR_COLORS.gold,
    backgroundColor: MADAR_COLORS.surface,
    zIndex: 1,
  },
  barberName: {
    fontSize: 22,
    fontWeight: '800',
    color: MADAR_COLORS.text,
    textAlign: 'center',
    marginTop: 10,
  },
  barberSpecialty: {
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 14,
    color: MADAR_COLORS.gold,
    fontWeight: '700',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
  },
  bookNowBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: MADAR_COLORS.gold,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookNowText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A0A0F',
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: MADAR_COLORS.border,
    alignSelf: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: MADAR_COLORS.gold,
  },
  statLabel: {
    fontSize: 11,
    color: MADAR_COLORS.textSecondary,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  gallerySection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    lineHeight: 22,
  },
  readMoreBtn: {
    marginTop: 6,
  },
  readMoreText: {
    fontSize: 13,
    color: MADAR_COLORS.gold,
    fontWeight: '600',
  },
  serviceRow: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    gap: 4,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: MADAR_COLORS.text,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceDuration: {
    fontSize: 12,
    color: MADAR_COLORS.textSecondary,
  },
  serviceRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: MADAR_COLORS.gold,
  },
  serviceBookBtn: {
    borderWidth: 1,
    borderColor: MADAR_COLORS.goldBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  serviceBookBtnText: {
    fontSize: 12,
    color: MADAR_COLORS.gold,
    fontWeight: '600',
  },
  galleryImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewsAvg: {
    fontSize: 15,
    fontWeight: '700',
    color: MADAR_COLORS.gold,
  },
  reviewsTotal: {
    fontSize: 13,
    color: MADAR_COLORS.textTertiary,
  },
  reviewCard: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewName: {
    fontSize: 13,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    flex: 1,
  },
  reviewDate: {
    fontSize: 11,
    color: MADAR_COLORS.textTertiary,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 13,
    color: MADAR_COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 6,
  },
});
