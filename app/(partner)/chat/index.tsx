import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const P = {
  bg: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#242438',
  border: '#2A2A45',
  accent: '#7C3AED',
  accentLight: 'rgba(124,58,237,0.15)',
  gold: '#C9A84C',
  text: '#F0F0FF',
  textSecondary: '#9090B0',
  textTertiary: '#5A5A7A',
  success: '#4CAF7D',
  danger: '#E85454',
  warning: '#F59E0B',
  divider: '#1E1E35',
};

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  is_from_venue: boolean;
}

interface Conversation {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

export default function PartnerChatList() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!shopId) return;
    console.log('[PartnerChat] Fetching conversations for shop:', shopId);
    try {
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_id, text, created_at, is_from_venue')
        .eq('venue_id', shopId)
        .order('created_at', { ascending: false });

      const allMsgs = (msgs ?? []) as Message[];
      const clientMsgs = allMsgs.filter(m => !m.is_from_venue && m.sender_id);
      const grouped = new Map<string, Message[]>();
      for (const m of clientMsgs) {
        if (!grouped.has(m.sender_id)) grouped.set(m.sender_id, []);
        grouped.get(m.sender_id)!.push(m);
      }

      const senderIds = Array.from(grouped.keys());
      const profileMap = new Map<string, { full_name: string; avatar_url?: string }>();
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', senderIds);
        for (const p of (profiles ?? []) as { id: string; full_name: string; avatar_url?: string }[]) {
          profileMap.set(p.id, p);
        }
      }

      const convList: Conversation[] = [];
      for (const [senderId, messages] of grouped.entries()) {
        const p = profileMap.get(senderId);
        const last = messages[0];
        const unread = messages.filter(m => !m.is_from_venue).length;
        convList.push({
          senderId,
          senderName: p?.full_name ?? 'Unknown',
          senderAvatar: p?.avatar_url,
          lastMessage: last.text,
          lastTime: new Date(last.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          unreadCount: unread,
        });
      }
      setConversations(convList);
      console.log('[PartnerChat] Loaded', convList.length, 'conversations');
    } catch (err) {
      console.log('[PartnerChat] fetchConversations error:', err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!shopId) return;
    const channel = supabase
      .channel(`partner-chat-list-${shopId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `venue_id=eq.${shopId}` }, () => {
        console.log('[PartnerChat] New message received, refreshing');
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shopId, fetchConversations]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={P.accent} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageCircle size={48} color={P.textTertiary} />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySub}>Client messages will appear here</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {conversations.map(conv => {
            const initials = conv.senderName.charAt(0).toUpperCase();
            return (
              <AnimatedPressable
                key={conv.senderId}
                onPress={() => {
                  console.log('[PartnerChat] Conversation tapped:', conv.senderId);
                  router.push(`/(partner)/chat/${conv.senderId}` as never);
                }}
              >
                <View style={styles.convRow}>
                  {conv.senderAvatar ? (
                    <Image source={resolveImageSource(conv.senderAvatar)} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>{initials}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.senderName}>{conv.senderName}</Text>
                    <Text style={styles.lastMsg} numberOfLines={1}>{conv.lastMessage}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.timeText}>{conv.lastTime}</Text>
                    {conv.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{conv.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { color: P.textSecondary, fontSize: 16, fontWeight: '600' },
  emptySub: { color: P.textTertiary, fontSize: 13 },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: P.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: P.border },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: P.accent, fontSize: 20, fontWeight: '700' },
  senderName: { color: P.text, fontSize: 15, fontWeight: '600' },
  lastMsg: { color: P.textSecondary, fontSize: 13, marginTop: 2 },
  timeText: { color: P.textTertiary, fontSize: 11 },
  unreadBadge: { backgroundColor: P.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
