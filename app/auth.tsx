import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tabAnim = useRef(new Animated.Value(0)).current;

  const switchMode = useCallback((newMode: 'signin' | 'signup') => {
    console.log('[Auth] Mode switched to:', newMode);
    setMode(newMode);
    setError('');
    Animated.spring(tabAnim, {
      toValue: newMode === 'signin' ? 0 : 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 120,
    }).start();
  }, [tabAnim]);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    console.log('[Auth] Submit pressed, mode:', mode, 'email:', email);
    setLoading(true);
    setError('');

    try {
      if (mode === 'signin') {
        const { error: signInError } = await signIn(email.trim(), password);
        if (signInError) {
          setError(signInError.message ?? 'Sign in failed. Check your credentials.');
          return;
        }
      } else {
        const { error: signUpError } = await signUp(email.trim(), password, fullName.trim());
        if (signUpError) {
          setError(signUpError.message ?? 'Sign up failed. Please try again.');
          return;
        }
      }
      console.log('[Auth] Auth success, navigating to home');
      router.replace('/(tabs)/(home)');
    } catch (err) {
      console.log('[Auth] Unexpected error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, fullName, signIn, signUp, router]);

  const handleSkip = useCallback(() => {
    console.log('[Auth] Skip pressed');
    router.replace('/(tabs)/(home)');
  }, [router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <LinearGradient
            colors={['#C9A84C', '#E8C96A', '#C9A84C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoGradient}
          >
            <Text style={styles.logoText}>H</Text>
          </LinearGradient>
          <Text style={styles.appName}>Hallaq</Text>
          <Text style={styles.appSubtitle}>Your premium grooming experience</Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabSwitcher}>
          <AnimatedPressable
            onPress={() => switchMode('signin')}
            style={[styles.tabBtn, mode === 'signin' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, mode === 'signin' && styles.tabBtnTextActive]}>
              Sign in
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => switchMode('signup')}
            style={[styles.tabBtn, mode === 'signup' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, mode === 'signup' && styles.tabBtnTextActive]}>
              Create account
            </Text>
          </AnimatedPressable>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full name</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={MADAR_COLORS.textTertiary} />
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor={MADAR_COLORS.textTertiary}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email address</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={MADAR_COLORS.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={MADAR_COLORS.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={MADAR_COLORS.textTertiary} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Your password"
                placeholderTextColor={MADAR_COLORS.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <AnimatedPressable
                onPress={() => {
                  console.log('[Auth] Toggle password visibility');
                  setShowPassword(!showPassword);
                }}
              >
                {showPassword
                  ? <EyeOff size={18} color={MADAR_COLORS.textTertiary} />
                  : <Eye size={18} color={MADAR_COLORS.textTertiary} />
                }
              </AnimatedPressable>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <AnimatedPressable
            onPress={handleSubmit}
            disabled={loading}
            style={styles.submitBtn}
          >
            <LinearGradient
              colors={['#C9A84C', '#E8C96A', '#C9A84C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtnGradient}
            >
              <Text style={styles.submitBtnText}>
                {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            </LinearGradient>
          </AnimatedPressable>

          <AnimatedPressable onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Continue as guest</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  content: { paddingHorizontal: 24 },
  logoSection: { alignItems: 'center', marginBottom: 40, gap: 8 },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: { fontSize: 36, fontWeight: '900', color: MADAR_COLORS.background },
  appName: { fontSize: 32, fontWeight: '800', color: MADAR_COLORS.text, letterSpacing: -0.5 },
  appSubtitle: { fontSize: 15, color: MADAR_COLORS.textSecondary, textAlign: 'center' },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: MADAR_COLORS.surfaceElevated },
  tabBtnText: { fontSize: 14, color: MADAR_COLORS.textSecondary, fontWeight: '500' },
  tabBtnTextActive: { color: MADAR_COLORS.gold, fontWeight: '700' },
  form: { gap: 16 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13, color: MADAR_COLORS.textSecondary, fontWeight: '600', letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  input: { flex: 1, fontSize: 15, color: MADAR_COLORS.text },
  errorBox: {
    backgroundColor: 'rgba(232,84,84,0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,84,84,0.3)',
  },
  errorText: { fontSize: 13, color: MADAR_COLORS.danger, textAlign: 'center' },
  submitBtn: { marginTop: 8 },
  submitBtnGradient: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.background },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 14, color: MADAR_COLORS.textSecondary },
});
