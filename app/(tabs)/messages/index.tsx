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
  Modal,
} from 'react-native';
import ChatPanel from '@/components/ChatPanel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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


function getPublicUrl(path: string | null | undefined, bucket = 'shop-covers'): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [openVenueId, setOpenVenueId] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    fetchConversations();
    if (!user) return;

    // Remove any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`messages-list-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${user.id}` }, () => {
        console.log('[Messages] Realtime INSERT received, refreshing conversations');
        fetchConversations();
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchConversations = async () => {
    console.log('[Messages] Fetching conversations from Supabase, user:', user?.id);
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    try {
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('id, venue_id, text, created_at, is_from_venue, client_id, sender_id')
        .or(`sender_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error || !msgs || msgs.length === 0) {
        console.log('[Messages] No messages found for user:', error?.message);
        setConversations([]);
        setLoading(false);
        return;
      }

      console.log('[Messages] Loaded', msgs.length, 'messages, fetching shop details');
      const venueIds = [...new Set(msgs.map((m: any) => m.venue_id).filter(Boolean))] as string[];

      const { data: shops } = await supabase
        .from('barbershops')
        .select('id, name, cover_url')
        .in('id', venueIds);

      const shopMap: Record<string, { name: string; cover_url: string }> = {};
      for (const shop of (shops ?? [])) shopMap[shop.id] = shop;

      const seen = new Set<string>();
      const convs: Conversation[] = [];
      for (const msg of msgs) {
        if (!msg.venue_id || seen.has(msg.venue_id)) continue;
        seen.add(msg.venue_id);
        const shop = shopMap[msg.venue_id];
        convs.push({
          id: msg.venue_id,
          venue_name: shop?.name ?? 'Venue',
          avatar: getPublicUrl(shop?.cover_url),
          last_message: msg.text ?? '',
          timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
        });
      }

      console.log('[Messages] Built', convs.length, 'conversations');
      setConversations(convs);
    } catch (err) {
      console.log('[Messages] Exception:', err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = conversations.filter(c =>
    c.venue_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationPress = (id: string, name: string) => {
    console.log('[Messages] Conversation pressed → opening chat overlay for venue:', id, name);
    if (!id) return;
    // Open the chat as an in-screen overlay (no router navigation = can't fail to open).
    setOpenVenueId(id);
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

      {/* Chat opens as a full-screen native modal — presents over everything,
          no router navigation, so it cannot fail to open from the nested tab. */}
      <Modal
        visible={!!openVenueId}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setOpenVenueId(null)}
      >
        {openVenueId && <ChatPanel venueId={openVenueId} onBack={() => setOpenVenueId(null)} />}
      </Modal>
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
