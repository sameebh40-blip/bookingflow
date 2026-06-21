import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Globe, ChevronRight, LogOut, Trash2 } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, deleteAccount } = useAuth();
  const [notifications, setNotifications] = useState({
    bookingReminders: true,
    promotions: false,
    messages: true,
    newVenues: false,
  });

  const handleToggle = useCallback((key: keyof typeof notifications) => {
    console.log('[Settings] Toggle notification:', key, !notifications[key]);
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  }, [notifications]);

  const handleSignOut = useCallback(async () => {
    console.log('[Settings] Sign out pressed');
    await signOut();
    router.replace('/auth');
  }, [signOut, router]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[Settings] Delete account confirmed');
            const { error } = await deleteAccount();
            if (error) {
              Alert.alert('Error', 'Failed to delete account. Please contact support.');
            } else {
              router.replace('/auth');
            }
          },
        },
      ]
    );
  }, [deleteAccount, router]);

  const handleBack = useCallback(() => {
    console.log('[Settings] Back pressed');
    router.back();
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          {[
            { key: 'bookingReminders' as const, label: 'Booking reminders', desc: 'Get reminded before your appointments' },
            { key: 'promotions' as const, label: 'Promotions & offers', desc: 'Receive special deals and discounts' },
            { key: 'messages' as const, label: 'Messages', desc: 'Notifications for new messages' },
            { key: 'newVenues' as const, label: 'New venues nearby', desc: 'Discover new venues in your area' },
          ].map((item, index, arr) => (
            <View key={item.key} style={[styles.settingRow, index < arr.length - 1 && styles.settingRowBorder]}>
              <View style={styles.settingLeft}>
                <Bell size={18} color={MADAR_COLORS.textSecondary} />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingDesc}>{item.desc}</Text>
                </View>
              </View>
              <Switch
                value={notifications[item.key]}
                onValueChange={() => handleToggle(item.key)}
                trackColor={{ false: MADAR_COLORS.surfaceSecondary, true: MADAR_COLORS.goldMuted }}
                thumbColor={notifications[item.key] ? MADAR_COLORS.gold : MADAR_COLORS.textTertiary}
              />
            </View>
          ))}
        </View>

        {/* Language */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Preferences</Text>
        <View style={styles.card}>
          <AnimatedPressable
            onPress={() => console.log('[Settings] Language pressed')}
            style={styles.settingRow}
          >
            <View style={styles.settingLeft}>
              <Globe size={18} color={MADAR_COLORS.textSecondary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Language</Text>
                <Text style={styles.settingDesc}>English</Text>
              </View>
            </View>
            <ChevronRight size={16} color={MADAR_COLORS.textTertiary} />
          </AnimatedPressable>
        </View>

        {/* Sign out */}
        <AnimatedPressable onPress={handleSignOut} style={[styles.signOutBtn, { marginTop: 32 }]}>
          <LogOut size={18} color={MADAR_COLORS.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </AnimatedPressable>

        {/* Delete account */}
        <AnimatedPressable onPress={handleDeleteAccount} style={[styles.deleteBtn, { marginTop: 12 }]}>
          <Trash2 size={18} color={MADAR_COLORS.textTertiary} />
          <Text style={styles.deleteText}>Delete account</Text>
        </AnimatedPressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: MADAR_COLORS.text, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 12, color: MADAR_COLORS.textTertiary, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  card: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: MADAR_COLORS.divider },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingInfo: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: MADAR_COLORS.text },
  settingDesc: { fontSize: 12, color: MADAR_COLORS.textSecondary },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: 'rgba(232,84,84,0.1)',
    borderWidth: 1, borderColor: 'rgba(232,84,84,0.2)',
  },
  signOutText: { fontSize: 15, color: MADAR_COLORS.danger, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  deleteText: { fontSize: 15, color: MADAR_COLORS.textTertiary, fontWeight: '600' },
});
