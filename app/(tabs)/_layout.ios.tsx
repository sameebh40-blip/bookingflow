import React from 'react';
import { View, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { MADAR_COLORS } from '@/constants/Colors';

const { width: screenWidth } = Dimensions.get('window');

const TABS = [
  { name: '(home)', route: '/(tabs)/(home)' as const, icon: 'home', label: 'Home' },
  { name: 'discover', route: '/(tabs)/discover' as const, icon: 'compass', label: 'Discover' },
  { name: 'bookings', route: '/(tabs)/bookings' as const, icon: 'calendar-days', label: 'Bookings' },
  { name: 'messages', route: '/(tabs)/messages' as const, icon: 'message-circle', label: 'Messages' },
  { name: 'profile', route: '/(tabs)/profile' as const, icon: 'user', label: 'Profile' },
];

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: MADAR_COLORS.background }}>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="(home)" />
        <Stack.Screen name="discover/index" />
        <Stack.Screen name="bookings/index" />
        <Stack.Screen name="messages/index" />
        <Stack.Screen name="profile/index" />
      </Stack>
      <FloatingTabBar tabs={TABS} containerWidth={screenWidth - 48} />
    </View>
  );
}
