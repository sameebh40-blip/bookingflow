import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  MapPin,
  Play,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Reel {
  id: string;
  business: string;
  caption: string;
  location: string;
  likes: number;
  saves: number;
  shares: number;
  comments: number;
  image_url: string;
  venue_id: string;
}

const MOCK_REELS: Reel[] = [
  { id: '1', business: 'Level Barber Shop', caption: 'Fresh fade for the weekend 💈 Book your slot now!', location: 'Tubli, Bahrain', likes: 1240, saves: 89, shares: 45, comments: 32, image_url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800', venue_id: '1' },
  { id: '2', business: 'Luxe Spa & Wellness', caption: 'Relax and rejuvenate with our signature massage 🌿', location: 'Seef, Manama', likes: 876, saves: 120, shares: 67, comments: 18, image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800', venue_id: '3' },
  { id: '3', business: 'Nail Studio Pro', caption: 'New gel collection just arrived ✨ Limited slots!', location: 'Adliya, Manama', likes: 543, saves: 78, shares: 23, comments: 41, image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', venue_id: '4' },
  { id: '4', business: 'The Groom Room', caption: 'Classic gentleman\'s cut — timeless style 🎩', location: 'Dilmunia, Bahrain', likes: 2100, saves: 234, shares: 89, comments: 56, image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', venue_id: '2' },
];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function ReelItem({ reel, isActive }: { reel: Reel; isActive: boolean }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localLikes, setLocalLikes] = useState(reel.likes);

  const handleLike = useCallback(() => {
    console.log('[Reels] Like pressed:', reel.id, reel.business);
    setLiked(l => !l);
    setLocalLikes(n => liked ? n - 1 : n + 1);
  }, [liked, reel.id, reel.business]);

  const handleSave = useCallback(() => {
    console.log('[Reels] Save pressed:', reel.id);
    setSaved(s => !s);
  }, [reel.id]);

  const handleShare = useCallback(() => {
    console.log('[Reels] Share pressed:', reel.id);
  }, [reel.id]);

  const handleBook = useCallback(() => {
    console.log('[Reels] Book now pressed:', reel.venue_id, reel.business);
    router.push(`/venue/${reel.venue_id}`);
  }, [reel.venue_id, reel.business, router]);

  const handleProfile = useCallback(() => {
    console.log('[Reels] View profile pressed:', reel.venue_id);
    router.push(`/venue/${reel.venue_id}`);
  }, [reel.venue_id, router]);

  return (
    <View style={styles.reelContainer}>
      <Image source={resolveImageSource(reel.image_url)} style={styles.reelBackground} resizeMode="cover" />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />

      {/* Play indicator */}
      <View style={styles.playIndicator}>
        <Play size={40} color="rgba(255,255,255,0.6)" fill="rgba(255,255,255,0.6)" />
      </View>

      {/* Bottom content */}
      <View style={styles.bottomContent}>
        {/* Left side */}
        <View style={styles.leftContent}>
          <Text style={styles.businessName}>{reel.business}</Text>
          <Text style={styles.caption} numberOfLines={2}>{reel.caption}</Text>
          <View style={styles.locationRow}>
            <MapPin size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.locationText}>{reel.location}</Text>
          </View>
          <View style={styles.actionBtns}>
            <AnimatedPressable onPress={handleBook} style={styles.bookNowBtn}>
              <Text style={styles.bookNowText}>Book now</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleProfile} style={styles.viewProfileBtn}>
              <Text style={styles.viewProfileText}>View profile</Text>
            </AnimatedPressable>
          </View>
        </View>

        {/* Right side actions */}
        <View style={styles.rightActions}>
          <AnimatedPressable onPress={handleLike} style={styles.actionBtn}>
            <Heart
              size={28}
              color={liked ? MADAR_COLORS.danger : '#fff'}
              fill={liked ? MADAR_COLORS.danger : 'transparent'}
            />
            <Text style={styles.actionCount}>{localLikes.toLocaleString()}</Text>
          </AnimatedPressable>

          <AnimatedPressable onPress={() => console.log('[Reels] Comment pressed:', reel.id)} style={styles.actionBtn}>
            <MessageCircle size={28} color="#fff" />
            <Text style={styles.actionCount}>{reel.comments}</Text>
          </AnimatedPressable>

          <AnimatedPressable onPress={handleSave} style={styles.actionBtn}>
            <Bookmark
              size={28}
              color={saved ? MADAR_COLORS.gold : '#fff'}
              fill={saved ? MADAR_COLORS.gold : 'transparent'}
            />
            <Text style={styles.actionCount}>{reel.saves}</Text>
          </AnimatedPressable>

          <AnimatedPressable onPress={handleShare} style={styles.actionBtn}>
            <Share2 size={28} color="#fff" />
            <Text style={styles.actionCount}>{reel.shares}</Text>
          </AnimatedPressable>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '40%' }]} />
      </View>
    </View>
  );
}

export default function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleClose = useCallback(() => {
    console.log('[Reels] Close pressed');
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_REELS}
        renderItem={({ item, index }) => (
          <ReelItem reel={item} isActive={activeIndex === index} />
        )}
        keyExtractor={item => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / screenHeight);
          console.log('[Reels] Scrolled to reel:', index);
          setActiveIndex(index);
        }}
        snapToInterval={screenHeight}
        decelerationRate="fast"
      />

      {/* Close button */}
      <AnimatedPressable
        onPress={handleClose}
        style={[styles.closeBtn, { top: insets.top + 12 }]}
      >
        <X size={20} color="#fff" />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  reelContainer: {
    width: screenWidth,
    height: screenHeight,
    position: 'relative',
  },
  reelBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  playIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    gap: 12,
  },
  leftContent: { flex: 1, gap: 8 },
  businessName: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  caption: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  actionBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  bookNowBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: MADAR_COLORS.gold,
  },
  bookNowText: { fontSize: 13, fontWeight: '700', color: MADAR_COLORS.background },
  viewProfileBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
  },
  viewProfileText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  rightActions: { gap: 20, alignItems: 'center', paddingBottom: 8 },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 12, color: '#fff', fontWeight: '600' },
  progressBar: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
});
