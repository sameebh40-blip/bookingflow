import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

const MOCK_MESSAGES: Message[] = [
  { id: '1', text: 'Hello! How can we help you today?', isUser: false, timestamp: '10:00 AM' },
  { id: '2', text: 'Hi, I wanted to ask about your availability this weekend.', isUser: true, timestamp: '10:02 AM' },
  { id: '3', text: 'We have slots available on Saturday from 10 AM to 6 PM. Would you like to book?', isUser: false, timestamp: '10:03 AM' },
  { id: '4', text: 'Yes, I\'d like to book a Classic Haircut for Saturday at 2 PM.', isUser: true, timestamp: '10:05 AM' },
  { id: '5', text: 'Your appointment is confirmed for Saturday at 2:00 PM. See you then!', isUser: false, timestamp: '10:06 AM' },
];

const VENUE_NAMES: Record<string, string> = {
  '1': 'Level Barber Shop',
  '2': 'The Groom Room',
  '3': 'Luxe Spa & Wellness',
  '4': 'Nail Studio Pro',
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const venueName = VENUE_NAMES[venueId ?? '1'] ?? 'Venue';

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    console.log('[Chat] Message sent:', inputText.trim(), 'to venue:', venueId);
    const newMessage: Message = {
      id: String(Date.now()),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Simulate reply
    setTimeout(() => {
      const reply: Message = {
        id: String(Date.now() + 1),
        text: 'Thank you for your message! We\'ll get back to you shortly.',
        isUser: false,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, reply]);
    }, 1500);
  }, [inputText, venueId]);

  const handleBack = useCallback(() => {
    console.log('[Chat] Back pressed');
    router.back();
  }, [router]);

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageRow, item.isUser && styles.messageRowUser]}>
      <View style={[styles.messageBubble, item.isUser ? styles.messageBubbleUser : styles.messageBubbleVenue]}>
        <Text style={[styles.messageText, item.isUser && styles.messageTextUser]}>{item.text}</Text>
        <Text style={[styles.messageTime, item.isUser && styles.messageTimeUser]}>{item.timestamp}</Text>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle} numberOfLines={1}>{venueName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
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
          style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: MADAR_COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: MADAR_COLORS.text, textAlign: 'center' },
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
  messageTextUser: { color: MADAR_COLORS.background },
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
