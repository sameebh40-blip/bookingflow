import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, User, Mail, Phone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState(user?.user_metadata?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.user_metadata?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'ME';

  const handleSave = useCallback(async () => {
    console.log('[EditProfile] Save changes pressed, name:', name, 'phone:', phone);
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    router.back();
  }, [name, phone, router]);

  const handleBack = useCallback(() => {
    console.log('[EditProfile] Back pressed');
    router.back();
  }, [router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <AnimatedPressable
            onPress={() => console.log('[EditProfile] Change avatar pressed')}
            style={styles.cameraBtn}
          >
            <Camera size={16} color={MADAR_COLORS.background} />
          </AnimatedPressable>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full name</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color={MADAR_COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={MADAR_COLORS.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email address</Text>
            <View style={[styles.inputWrapper, styles.inputDisabled]}>
              <Mail size={18} color={MADAR_COLORS.textTertiary} />
              <TextInput
                style={[styles.input, { color: MADAR_COLORS.textTertiary }]}
                value={email}
                editable={false}
                keyboardType="email-address"
              />
            </View>
            <Text style={styles.inputHint}>Email cannot be changed</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone number</Text>
            <View style={styles.inputWrapper}>
              <Phone size={18} color={MADAR_COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="+973 XXXX XXXX"
                placeholderTextColor={MADAR_COLORS.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <AnimatedPressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          <LinearGradient
            colors={['#C9A84C', '#E8C96A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtnGradient}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save changes'}</Text>
          </LinearGradient>
        </AnimatedPressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: { paddingHorizontal: 20, gap: 20 },
  avatarSection: { alignItems: 'center', paddingVertical: 20, position: 'relative' },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: MADAR_COLORS.purpleMuted,
    borderWidth: 2, borderColor: MADAR_COLORS.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 28, fontWeight: '800', color: MADAR_COLORS.purple },
  cameraBtn: {
    position: 'absolute', bottom: 16, right: '35%',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: MADAR_COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: MADAR_COLORS.background,
  },
  form: { gap: 16 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13, color: MADAR_COLORS.textSecondary, fontWeight: '600', letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  inputDisabled: { opacity: 0.6 },
  input: { flex: 1, fontSize: 15, color: MADAR_COLORS.text },
  inputHint: { fontSize: 11, color: MADAR_COLORS.textTertiary },
  saveBtn: { borderRadius: 12 },
  saveBtnGradient: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.background },
});
