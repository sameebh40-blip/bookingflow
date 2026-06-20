import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  FlatList,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  MapPin,
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
  image_url: string;
  avatar: string;
}

const MOCK_REELS: Reel[] = [
  { id: '1', business: 'Level Barber', caption: 'Fresh fade for the weekend 🔥', location: 'Tubli, Bahrain', likes: 1240, saves: 89, image_url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&h=1400&fit=crop', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
  { id: '2', business: 'Luxe Spa', caption: 'Relax and unwind with our signature massage', location: 'Seef, Manama', likes: 876, saves: 234, image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=1400&fit=crop', avatar: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=100' },
  { id: '3', business: 'Nail Studio Pro', caption: 'New gel collection just dropped ✨', location: 'Adliya, Manama', likes: 543, saves: 67, image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=1400&fit=crop', avatar: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=100' },
  { id: '4', business: 'The Groom Room', caption: 'Classic cuts, modern style', location: 'Dilmunia, Bahrain', likes: 2100, saves: 445, image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&h=1400&fit=crop', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
  { id: '5', business: 'Brow Studio', caption: 'Perfect brows every time 👁️', location: 'Juffair, Manama', likes: 987, saves: 123, image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=1400&fit=crop', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function ReelItem({ item }: { item: Reel }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const likeCount = liked ? item.likes + 1 : item.likes;
  const saveCount = saved ? item.saves + 1 : item.saves;

  const handleLike = useCallback(() => {
    console.log('[Discover/Reels] Like pressed, reel:', item.id);
    setLiked(prev => !prev);
  }, [item.id]);

  const handleSave = useCallback(() => {
    console.log('[Discover/Reels] Save pressed, reel:', item.id);
    setSaved(prev => !prev);
  }, [item.id]);

  const handleShare = useCallback(() => {
    console.log('[Discover/Reels] Share pressed, reel:', item.id);
  }, [item.id]);

  const handleMessage = useCallback(() => {
    console.log('[Discover/Reels] Message pressed, reel:', item.id);
  }, [item.id]);

  const handleBookNow = useCallback(() => {
    console.log('[Discover/Reels] Book now pressed, business:', item.business);
    router.push(`/venue/${item.id}`);
  }, [item.id, item.business, router]);

  const handleViewProfile = useCallback(() => {
    console.log('[Discover/Reels] View profile pressed, business:', item.business);
    router.push(`/venue/${item.id}`);
  }, [item.id, item.business, router]);

  const likeCountStr = likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : String(likeCount);
  const saveCountStr = saveCount >= 1000 ? `${(saveCount / 1000).toFixed(1)}k` : String(saveCount);

  return (
    <View style={[styles.reelContainer, { height: screenHeight }]}>
      <Image
        source={resolveImageSource(item.image_url)}
        style={styles.reelBackground}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
        locations={[0.3, 0.6, 1]}
        style={styles.reelGradient}
      />

      {/* Right side actions */}
      <View style={[styles.rightActions, { bottom: insets.bottom + 100 }]}>
        <AnimatedPressable onPress={handleLike} style={styles.actionBtn}>
          <Heart
            size={28}
            color={liked ? MADAR_COLORS.danger : '#fff'}
            fill={liked ? MADAR_COLORS.danger : 'transparent'}
          />
          <Text style={styles.actionCount}>{likeCountStr}</Text>
        </AnimatedPressable>

        <AnimatedPressable onPress={handleSave} style={styles.actionBtn}>
          <Bookmark
            size={26}
            color={saved ? MADAR_COLORS.gold : '#fff'}
            fill={saved ? MADAR_COLORS.gold : 'transparent'}
          />
          <Text style={styles.actionCount}>{saveCountStr}</Text>
        </AnimatedPressable>

        <AnimatedPressable onPress={handleShare} style={styles.actionBtn}>
          <Share2 size={26} color="#fff" />
        </AnimatedPressable>

        <AnimatedPressable onPress={handleMessage} style={styles.actionBtn}>
          <MessageCircle size={26} color="#fff" />
        </AnimatedPressable>
      </View>

      {/* Bottom left info */}
      <View style={[styles.bottomInfo, { bottom: insets.bottom + 100 }]}>
        <View style={styles.businessRow}>
          <Image source={resolveImageSource(item.avatar)} style={styles.businessAvatar} />
          <Text style={styles.businessName}>{item.business}</Text>
        </View>
        <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
        <View style={styles.locationRow}>
          <MapPin size={12} color="rgba(255,255,255,0.8)" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
        <View style={styles.ctaRow}>
          <AnimatedPressable onPress={handleBookNow} style={styles.bookNowBtn}>
            <LinearGradient
              colors={['#C9A84C', '#E8C96A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bookNowGradient}
            >
              <Text style={styles.bookNowText}>Book now</Text>
            </LinearGradient>
          </AnimatedPressable>
          <AnimatedPressable onPress={handleViewProfile} style={styles.viewProfileBtn}>
            <Text style={styles.viewProfileText}>View profile</Text>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = useCallback(() => {
    console.log('[Discover/Reels] Back pressed');
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_REELS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReelItem item={item} />}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={screenHeight}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems.length > 0) {
            console.log('[Discover/Reels] Viewing reel:', viewableItems[0].item.id);
          }
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      {/* Top overlay */}
      <View style={[styles.topOverlay, { top: insets.top + 12 }]} pointerEvents="box-none">
        <Text style={styles.reelsTitle}>Reels</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  reelsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  reelContainer: {
    width: screenWidth,
    position: 'relative',
    backgroundColor: '#000',
  },
  reelBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  reelGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.6,
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
    gap: 20,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  bottomInfo: {
    position: 'absolute',
    left: 16,
    right: 80,
    gap: 8,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  businessAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  caption: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  bookNowBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  bookNowGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bookNowText: {
    fontSize: 14,
    fontWeight: '700',
    color: MADAR_COLORS.background,
  },
  viewProfileBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
