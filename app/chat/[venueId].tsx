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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  text: string;
  is_from_venue: boolean;
  created_at: string;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [venueName, setVenueName] = useState('Venue');
  const [venueImage, setVenueImage] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchVenueInfo();
    fetchMessages();

    // Subscribe to realtime inserts
    const channel = supabase
      .channel(`messages:${venueId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `venue_id=eq.${venueId}` },
        (payload) => {
          const msg = payload.new as any;
          console.log('[Chat] Realtime message received:', msg.id, 'from_venue:', msg.is_from_venue);
          if (msg.sender_id === user?.id || msg.is_from_venue === true || msg.client_id === user?.id) {
            setMessages(prev => [...prev, msg as Message]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId]);

  const fetchVenueInfo = async () => {
    console.log('[Chat] Fetching barbershop info for:', venueId);
    try {
      const { data } = await supabase.from('barbershops').select('name, cover_url').eq('id', venueId).single();
      if (data) {
        setVenueName(data.name ?? 'Venue');
        setVenueImage(data.cover_url ?? '');
      }
    } catch (err) {
      console.log('[Chat] Could not fetch venue info:', err);
    }
  };

  const fetchMessages = async () => {
    console.log('[Chat] Fetching messages for venue:', venueId, 'user:', user?.id ?? 'anonymous');
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: true });

      if (user) {
        query = query.or(`sender_id.eq.${user.id},is_from_venue.eq.true,client_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        console.log('[Chat] Loaded', data.length, 'messages for user');
        setMessages(data);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      } else {
        console.log('[Chat] No messages yet');
        setMessages([]);
      }
    } catch (err) {
      console.log('[Chat] Exception fetching messages:', err);
    }
  };

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    console.log('[Chat] Sending message:', text, 'to venue:', venueId);
    setInputText('');

    // Optimistic update
    const optimistic: Message = {
      id: String(Date.now()),
      text,
      is_from_venue: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { error } = await supabase.from('messages').insert({
        venue_id: venueId,
        sender_id: user?.id ?? null,
        client_id: user?.id ?? null,
        text,
        is_from_venue: false,
      });
      if (error) {
        console.log('[Chat] Error inserting message:', error.message);
      }
    } catch (err) {
      console.log('[Chat] Exception sending message:', err);
    }
  }, [inputText, venueId, user]);

  const handleBack = useCallback(() => {
    console.log('[Chat] Back pressed');
    router.back();
  }, [router]);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = !item.is_from_venue;
    const timeStr = formatTime(item.created_at);
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleVenue]}>
          <Text style={[styles.messageText, isUser && styles.messageTextUser]}>{item.text}</Text>
          <Text style={[styles.messageTime, isUser && styles.messageTimeUser]}>{timeStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        {venueImage ? (
          <Image source={{ uri: venueImage }} style={styles.venueAvatar} resizeMode="cover" />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{venueName}</Text>
          <Text style={styles.onlineText}>● Online</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 }}>
            <Text style={{ fontSize: 40 }}>💬</Text>
            <Text style={{ color: MADAR_COLORS.textSecondary, fontSize: 15, textAlign: 'center' }}>
              {'No messages yet.\nSend a message to start the conversation.'}
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={MADAR_COLORS.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <AnimatedPressable
          onPress={handleSend}
          disabled={!inputText.trim()}
          style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4, backgroundColor: MADAR_COLORS.surfaceSecondary }]}
        >
          <Send size={18} color={inputText.trim() ? MADAR_COLORS.background : MADAR_COLORS.textTertiary} />
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MADAR_COLORS.border,
    gap: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  venueAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.text },
  onlineText: { fontSize: 12, color: MADAR_COLORS.success, marginTop: 1 },
  messagesList: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  messageRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    gap: 4,
  },
  messageBubbleVenue: {
    backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    borderBottomLeftRadius: 4,
  },
  messageBubbleUser: {
    backgroundColor: MADAR_COLORS.gold,
    borderBottomRightRadius: 4,
  },
  messageText: { fontSize: 14, color: MADAR_COLORS.text, lineHeight: 20 },
  messageTextUser: { color: '#0A0A0F' },
  messageTime: { fontSize: 10, color: MADAR_COLORS.textTertiary, alignSelf: 'flex-end' },
  messageTimeUser: { color: 'rgba(10,10,15,0.6)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: MADAR_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: MADAR_COLORS.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: MADAR_COLORS.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: MADAR_COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
  },
});
