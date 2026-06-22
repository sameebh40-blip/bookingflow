import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Check, CheckCheck } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

function getPublicUrl(path: string | null | undefined, bucket = 'shop-covers'): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

interface Message {
  id: string;
  text: string;
  is_from_venue: boolean;
  created_at: string;
  read?: boolean;
}

type Row = Message | { id: string; _sep: string };

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { venueId: venueIdParam } = useLocalSearchParams<{ venueId: string }>();
  const venueId = Array.isArray(venueIdParam) ? venueIdParam[0] : venueIdParam;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [venueName, setVenueName] = useState('Venue');
  const [venueImage, setVenueImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const scrollEnd = useCallback((animated = true) => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated }), 80);
  }, []);

  const markIncomingRead = useCallback(async () => {
    if (!venueId || !user) return;
    await supabase.from('messages').update({ read: true })
      .eq('venue_id', venueId).eq('client_id', user.id).eq('is_from_venue', true).eq('read', false);
  }, [venueId, user]);

  useEffect(() => {
    if (!venueId || !user) { setLoading(false); return; }
    let active = true;

    (async () => {
      const { data: shop } = await supabase.from('barbershops').select('name, cover_url').eq('id', venueId).maybeSingle();
      if (active && shop) { setVenueName(shop.name ?? 'Venue'); setVenueImage(getPublicUrl(shop.cover_url)); }

      const { data } = await supabase
        .from('messages')
        .select('id, text, is_from_venue, created_at, read')
        .eq('venue_id', venueId)
        .eq('client_id', user.id)
        .order('created_at', { ascending: true });
      if (active) {
        setMessages((data ?? []) as Message[]);
        setLoading(false);
        if (data && data.length) scrollEnd(false);
        markIncomingRead();
      }
    })();

    const channel = supabase
      .channel(`chat:${venueId}:${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `venue_id=eq.${venueId}` },
        (payload) => {
          const msg = payload.new as any;
          if (msg.client_id !== user.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const withoutTemp = prev.filter((m) => !(m.id.startsWith('tmp-') && m.text === msg.text && m.is_from_venue === msg.is_from_venue));
            return [...withoutTemp, msg as Message];
          });
          scrollEnd();
          if (msg.is_from_venue) markIncomingRead();
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `venue_id=eq.${venueId}` },
        (payload) => {
          const msg = payload.new as any;
          if (msg.client_id !== user.id) return;
          setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, read: msg.read } : m));
        })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, user?.id]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !venueId || !user) return;
    setInputText('');
    setSending(true);
    const temp: Message = { id: `tmp-${Date.now()}`, text, is_from_venue: false, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, temp]);
    scrollEnd();
    try {
      const { error } = await supabase.from('messages').insert({
        venue_id: venueId, sender_id: user.id, client_id: user.id, text, is_from_venue: false,
      });
      if (error) {
        // mark failed by removing the temp bubble + restoring text
        setMessages((prev) => prev.filter((m) => m.id !== temp.id));
        setInputText(text);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, venueId, user, scrollEnd]);

  // Build rows with day separators
  const rows: Row[] = [];
  let lastDay = '';
  for (const m of messages) {
    const k = dayKey(m.created_at);
    if (k !== lastDay) { rows.push({ id: `sep-${k}`, _sep: dayLabel(m.created_at) }); lastDay = k; }
    rows.push(m);
  }

  const initials = (venueName || 'V').trim().charAt(0).toUpperCase();

  const renderItem = ({ item }: { item: Row }) => {
    if ('_sep' in item) {
      return (
        <View style={styles.sepWrap}><View style={styles.sepPill}><Text style={styles.sepText}>{item._sep}</Text></View></View>
      );
    }
    const isUser = !item.is_from_venue;
    const t = (() => { try { return new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } })();
    return (
      <View style={[styles.row, isUser && styles.rowUser]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleVenue]}>
          <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{item.text}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.msgTime, isUser && styles.msgTimeUser]}>{t}</Text>
            {isUser && !item.id.startsWith('tmp-') && (
              item.read
                ? <CheckCheck size={14} color="#0A6B2E" />
                : <Check size={14} color="rgba(10,10,15,0.5)" />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        {venueImage ? (
          <Image source={{ uri: venueImage }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{initials}</Text></View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{venueName}</Text>
          <Text style={styles.onlineText}>● Online</Text>
        </View>
      </View>

      {!user ? (
        <View style={styles.center}><Text style={styles.dim}>Please sign in to message this venue.</Text></View>
      ) : loading ? (
        <View style={styles.center}><ActivityIndicator color={MADAR_COLORS.gold} /></View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={rows}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scrollEnd(false)}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 40 }}>💬</Text>
              <Text style={styles.dim}>{'No messages yet.\nSay hello to start the conversation.'}</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor={MADAR_COLORS.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          editable={!!user}
        />
        <AnimatedPressable
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          style={[styles.sendBtn, (!inputText.trim() || sending) && { opacity: 0.4 }]}
        >
          <Send size={18} color={MADAR_COLORS.background} />
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: MADAR_COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { backgroundColor: MADAR_COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#0A0A0F', fontWeight: '800', fontSize: 16 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.text },
  onlineText: { fontSize: 12, color: MADAR_COLORS.success, marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 40 },
  dim: { color: MADAR_COLORS.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  list: { paddingHorizontal: 16, paddingVertical: 16, gap: 8, flexGrow: 1 },
  sepWrap: { alignItems: 'center', marginVertical: 8 },
  sepPill: { backgroundColor: MADAR_COLORS.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: MADAR_COLORS.border },
  sepText: { color: MADAR_COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, gap: 3 },
  bubbleVenue: { backgroundColor: MADAR_COLORS.surface, borderWidth: 1, borderColor: MADAR_COLORS.border, borderBottomLeftRadius: 5 },
  bubbleUser: { backgroundColor: MADAR_COLORS.gold, borderBottomRightRadius: 5 },
  msgText: { fontSize: 15, color: MADAR_COLORS.text, lineHeight: 21 },
  msgTextUser: { color: '#0A0A0F' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-end' },
  msgTime: { fontSize: 10, color: MADAR_COLORS.textTertiary },
  msgTimeUser: { color: 'rgba(10,10,15,0.55)' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: MADAR_COLORS.surface, borderTopWidth: 1, borderTopColor: MADAR_COLORS.border,
  },
  input: {
    flex: 1, backgroundColor: MADAR_COLORS.background, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: MADAR_COLORS.text,
    maxHeight: 110, borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: MADAR_COLORS.gold, alignItems: 'center', justifyContent: 'center' },
});
