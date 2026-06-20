import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Image,
  TextInput,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, MessageCircle } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Conversation {
  id: string;
  venue_name: string;
  avatar: string;
  last_message: string;
  timestamp: string;
  unread: number;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: '11111111-1111-1111-1111-111111111111', venue_name: 'Level Barber Shop', avatar: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=100', last_message: 'Your appointment is confirmed for tomorrow at 7:25 AM', timestamp: '2h ago', unread: 2 },
  { id: '22222222-2222-2222-2222-222222222222', venue_name: 'The Groom Room', avatar: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=100', last_message: 'Thank you for your visit! We hope to see you again.', timestamp: 'Yesterday', unread: 0 },
  { id: '33333333-3333-3333-3333-333333333333', venue_name: 'Luxe Spa & Wellness', avatar: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=100', last_message: 'We have a special offer for you this weekend!', timestamp: 'Mon', unread: 1 },
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
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    console.log('[Messages] Fetching conversations from Supabase');
    try {
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*, venues(id, name, image_url)')
        .order('created_at', { ascending: false });

      if (!error && msgs && msgs.length > 0) {
        console.log('[Messages] Loaded', msgs.length, 'messages, grouping by venue');
        const seen = new Set<string>();
        const convs: Conversation[] = [];
        for (const msg of msgs) {
          if (!seen.has(msg.venue_id) && msg.venues) {
            seen.add(msg.venue_id);
            convs.push({
              id: msg.venue_id,
              venue_name: msg.venues.name ?? 'Venue',
              avatar: msg.venues.image_url ?? '',
              last_message: msg.text ?? '',
              timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              unread: 0,
            });
          }
        }
        setConversations(convs.length > 0 ? convs : MOCK_CONVERSATIONS);
      } else {
        console.log('[Messages] Using mock conversations:', error?.message);
        setConversations(MOCK_CONVERSATIONS);
      }
    } catch (err) {
      console.log('[Messages] Exception, using mock:', err);
      setConversations(MOCK_CONVERSATIONS);
    } finally {
      setLoading(false);
    }
  };

  const filtered = conversations.filter(c =>
    c.venue_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationPress = (id: string, name: string) => {
    console.log('[Messages] Conversation pressed:', id, name);
    router.push(`/chat/${id}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Messages</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={16} color={MADAR_COLORS.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          placeholderTextColor={MADAR_COLORS.textTertiary}
          value={searchQuery}
          onChangeText={(text) => {
            console.log('[Messages] Search query changed:', text);
            setSearchQuery(text);
          }}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MessageCircle size={32} color={MADAR_COLORS.gold} />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>Messages from venues will appear here</Text>
          </View>
        ) : (
          filtered.map((conv, index) => (
            <AnimatedListItem key={conv.id} index={index}>
              <AnimatedPressable
                onPress={() => handleConversationPress(conv.id, conv.venue_name)}
                style={styles.conversationRow}
              >
                <View style={styles.avatarContainer}>
                  <Image
                    source={resolveImageSource(conv.avatar)}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                  {conv.unread > 0 && (
                    <View style={styles.onlineDot} />
                  )}
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.convHeader}>
                    <Text style={styles.convName} numberOfLines={1}>{conv.venue_name}</Text>
                    <Text style={styles.convTime}>{conv.timestamp}</Text>
                  </View>
                  <View style={styles.convFooter}>
                    <Text style={styles.convPreview} numberOfLines={1}>{conv.last_message}</Text>
                    {conv.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{conv.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            </AnimatedListItem>
          ))
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  pageTitle: { fontSize: 32, fontWeight: '800', color: MADAR_COLORS.text, letterSpacing: -0.5 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: MADAR_COLORS.text,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MADAR_COLORS.divider,
    gap: 12,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: MADAR_COLORS.success,
    borderWidth: 2,
    borderColor: MADAR_COLORS.background,
  },
  convInfo: { flex: 1, gap: 4 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '700', color: MADAR_COLORS.text, flex: 1 },
  convTime: { fontSize: 12, color: MADAR_COLORS.textTertiary },
  convFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convPreview: { fontSize: 13, color: MADAR_COLORS.textSecondary, flex: 1 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: MADAR_COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { fontSize: 11, color: MADAR_COLORS.background, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: MADAR_COLORS.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: MADAR_COLORS.text },
  emptySubtitle: { fontSize: 14, color: MADAR_COLORS.textSecondary, textAlign: 'center', maxWidth: 260 },
});
