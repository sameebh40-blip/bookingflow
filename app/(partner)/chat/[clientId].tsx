import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Send } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

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

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  is_from_venue: boolean;
}

export default function PartnerChatThread() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { profile, user } = useAuth();
  const shopId = profile?.shop_id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [clientName, setClientName] = useState('Client');
  const scrollRef = useRef<ScrollView>(null);

  const fetchMessages = useCallback(async () => {
    if (!shopId || !clientId) return;
    console.log('[PartnerChatThread] Fetching messages for client:', clientId);
    try {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, text, created_at, is_from_venue')
        .eq('venue_id', shopId)
        .or(`sender_id.eq.${clientId},is_from_venue.eq.true`)
        .order('created_at', { ascending: true });
      setMessages((data as Message[]) ?? []);
    } catch (err) {
      console.log('[PartnerChatThread] fetchMessages error:', err);
    } finally {
      setLoading(false);
    }
  }, [shopId, clientId]);

  useEffect(() => {
    fetchMessages();
    // Fetch client name
    supabase.from('profiles').select('full_name').eq('id', clientId).single().then(({ data }) => {
      if (data) setClientName(data.full_name ?? 'Client');
    });
  }, [fetchMessages, clientId]);

  useEffect(() => {
    if (!shopId) return;
    const channel = supabase
      .channel(`partner-chat-thread-${shopId}-${clientId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `venue_id=eq.${shopId}` }, (payload) => {
        console.log('[PartnerChatThread] New message:', payload.new);
        const msg = payload.new as Message;
        if (msg.sender_id === clientId || msg.is_from_venue) {
          setMessages(prev => [...prev, msg]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shopId, clientId]);

  const sendMessage = async () => {
    if (!inputText.trim() || !shopId || !user) return;
    console.log('[PartnerChatThread] Send message pressed:', inputText.trim());
    setSending(true);
    const text = inputText.trim();
    setInputText('');
    try {
      const { error } = await supabase.from('messages').insert({
        venue_id: shopId,
        sender_id: user.id,
        text,
        is_from_venue: true,
        created_at: new Date().toISOString(),
      });
      if (error) console.log('[PartnerChatThread] send error:', error.message);
      else {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.log('[PartnerChatThread] sendMessage exception:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { console.log('[PartnerChatThread] Back pressed'); router.back(); }} style={styles.backBtn}>
          <ChevronLeft size={22} color={P.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{clientName}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={P.accent} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map(msg => {
            const isVenue = msg.is_from_venue;
            const timeText = new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            return (
              <View key={msg.id} style={[styles.msgWrap, isVenue ? styles.msgWrapRight : styles.msgWrapLeft]}>
                <View style={[styles.bubble, isVenue ? styles.bubbleVenue : styles.bubbleClient]}>
                  <Text style={[styles.bubbleText, isVenue && styles.bubbleTextVenue]}>{msg.text}</Text>
                </View>
                <Text style={styles.timeText}>{timeText}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={P.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: P.border },
  headerTitle: { color: P.text, fontSize: 17, fontWeight: '700' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgWrap: { marginBottom: 12, maxWidth: '80%' },
  msgWrapLeft: { alignSelf: 'flex-start' },
  msgWrapRight: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleClient: { backgroundColor: P.surface, borderBottomLeftRadius: 4 },
  bubbleVenue: { backgroundColor: P.accent, borderBottomRightRadius: 4 },
  bubbleText: { color: P.text, fontSize: 15 },
  bubbleTextVenue: { color: '#fff' },
  timeText: { color: P.textTertiary, fontSize: 10, marginTop: 3, paddingHorizontal: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: P.surface, borderTopWidth: 1, borderTopColor: P.border },
  input: { flex: 1, backgroundColor: P.surfaceElevated, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: P.text, fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: P.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
