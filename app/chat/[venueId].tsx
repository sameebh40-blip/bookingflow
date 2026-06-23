import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ChatPanel from '@/components/ChatPanel';

export default function ChatScreen() {
  const router = useRouter();
  const { venueId: p } = useLocalSearchParams<{ venueId: string }>();
  const venueId = Array.isArray(p) ? p[0] : p;
  return <ChatPanel venueId={venueId} onBack={() => router.back()} />;
}
