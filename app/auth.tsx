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
import { Eye, EyeOff, Mail, Lock, User, Store, Scissors } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const P = {
  bg: '#0F0F1A',
  surface: '#1A1A2E',
  border: '#2A2A45',
  accent: '#7C3AED',
  gold: '#C9A84C',
  goldLight: '#E8C96A',
  text: '#F0F0FF',
  textSecondary: '#9090B0',
  textTertiary: '#5A5A7A',
  danger: '#E85454',
};

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  // Top-level mode: client or partner
  const [userType, setUserType] = useState<'client' | 'partner'>('client');
  // Sub-mode: signin or signup
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const modeAnim = useRef(new Animated.Value(0)).current;
  const subTabAnim = useRef(new Animated.Value(0)).current;

  const accent = userType === 'partner' ? P.accent : P.gold;
  const accentLight = userType === 'partner' ? '#E8C96A' : P.goldLight;

  const switchUserType = useCallback((type: 'client' | 'partner') => {
    console.log('[Auth] User type switched to:', type);
    setUserType(type);
    setError('');
    setMode('signin');
    Animated.timing(modeAnim, {
      toValue: type === 'client' ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [modeAnim]);

  const switchMode = useCallback((newMode: 'signin' | 'signup') => {
    console.log('[Auth] Sub-mode switched to:', newMode);
    setMode(newMode);
    setError('');
    Animated.timing(subTabAnim, {
      toValue: newMode === 'signin' ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [subTabAnim]);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (mode === 'signup' && userType === 'client' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    console.log('[Auth] Submit pressed, userType:', userType, 'mode:', mode, 'email:', email);
    setLoading(true);
    setError('');

    try {
      if (mode === 'signin') {
        const { error: signInError } = await signIn(email.trim(), password);
        if (signInError) {
          setError(signInError.message ?? 'Sign in failed. Check your credentials.');
          return;
        }
        // Check role after sign in
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          const role = profileData?.role ?? 'customer';
          console.log('[Auth] Sign in success, role:', role);
          if (userType === 'partner') {
            if (role === 'shop_owner' || role === 'barber') {
              router.replace('/(partner)');
            } else {
              setError('This account is not a partner account');
              await supabase.auth.signOut();
              return;
            }
          } else {
            if (role === 'shop_owner' || role === 'barber') {
              router.replace('/(partner)');
            } else {
              router.replace('/(tabs)/(home)');
            }
          }
        }
      } else {
        // Sign up
        const { error: signUpError } = await signUp(email.trim(), password, fullName.trim());
        if (signUpError) {
          setError(signUpError.message ?? 'Sign up failed. Please try again.');
          return;
        }
        console.log('[Auth] Sign up success, userType:', userType);

        if (userType === 'partner') {
          // Upsert profile with shop_owner role
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('profiles').upsert({
              id: user.id,
              role: 'shop_owner',
              full_name: fullName.trim(),
            });
            console.log('[Auth] Partner profile upserted, navigating to setup');
          }
          router.replace('/(partner)/setup');
        } else {
          router.replace('/(tabs)/(home)');
        }
      }
    } catch (err) {
      console.log('[Auth] Unexpected error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [mode, userType, email, password, fullName, confirmPassword, signIn, signUp, router]);

  const handleSkip = useCallback(() => {
    console.log('[Auth] Continue as guest pressed');
    router.replace('/(tabs)/(home)');
  }, [router]);

  const isPartner = userType === 'partner';
  const submitLabel = loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top mode switcher */}
        <View style={styles.typeSwitcher}>
          <AnimatedPressable
            onPress={() => switchUserType('client')}
            style={[styles.typeBtn, !isPartner && styles.typeBtnActiveClient]}
          >
            <Scissors size={16} color={!isPartner ? '#0A0A0F' : P.textSecondary} />
            <Text style={[styles.typeBtnText, !isPartner && styles.typeBtnTextActiveClient]}>
              Client
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => switchUserType('partner')}
            style={[styles.typeBtn, isPartner && styles.typeBtnActivePartner]}
          >
            <Store size={16} color={isPartner ? '#fff' : P.textSecondary} />
            <Text style={[styles.typeBtnText, isPartner && styles.typeBtnTextActivePartner]}>
              Partner
            </Text>
          </AnimatedPressable>
        </View>

        {/* Logo section */}
        <View style={styles.logoSection}>
          {isPartner ? (
            <LinearGradient
              colors={['#7C3AED', '#9B59B6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Store size={36} color="#fff" />
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={['#C9A84C', '#E8C96A', '#C9A84C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>H</Text>
            </LinearGradient>
          )}
          <Text style={styles.appName}>
            {isPartner ? 'Hallaq Business' : 'Hallaq'}
          </Text>
          <Text style={styles.appSubtitle}>
            {isPartner ? 'Manage your shop' : 'Book your perfect look'}
          </Text>
        </View>

        {/* Sign in / Sign up sub-tabs */}
        <View style={styles.subTabSwitcher}>
          <AnimatedPressable
            onPress={() => switchMode('signin')}
            style={[styles.subTabBtn, mode === 'signin' && { borderBottomColor: accent, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.subTabText, mode === 'signin' && { color: accent, fontWeight: '700' }]}>
              Sign in
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => switchMode('signup')}
            style={[styles.subTabBtn, mode === 'signup' && { borderBottomColor: accent, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.subTabText, mode === 'signup' && { color: accent, fontWeight: '700' }]}>
              Create account
            </Text>
          </AnimatedPressable>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full name</Text>
              <View style={[styles.inputWrapper, { borderColor: P.border }]}>
                <User size={18} color={P.textTertiary} />
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor={P.textTertiary}
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
            <View style={[styles.inputWrapper, { borderColor: P.border }]}>
              <Mail size={18} color={P.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={P.textTertiary}
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
            <View style={[styles.inputWrapper, { borderColor: P.border }]}>
              <Lock size={18} color={P.textTertiary} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Your password"
                placeholderTextColor={P.textTertiary}
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
                  ? <EyeOff size={18} color={P.textTertiary} />
                  : <Eye size={18} color={P.textTertiary} />
                }
              </AnimatedPressable>
            </View>
          </View>

          {mode === 'signup' && userType === 'client' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm password</Text>
              <View style={[styles.inputWrapper, { borderColor: P.border }]}>
                <Lock size={18} color={P.textTertiary} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Confirm your password"
                  placeholderTextColor={P.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>
            </View>
          )}

          {mode === 'signup' && userType === 'partner' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Shop name</Text>
              <View style={[styles.inputWrapper, { borderColor: P.border }]}>
                <Store size={18} color={P.textTertiary} />
                <TextInput
                  style={styles.input}
                  placeholder="Your shop name"
                  placeholderTextColor={P.textTertiary}
                  value={shopName}
                  onChangeText={setShopName}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>
            </View>
          )}

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
              colors={isPartner ? ['#7C3AED', '#9B59B6', '#7C3AED'] : ['#C9A84C', '#E8C96A', '#C9A84C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtnGradient}
            >
              <Text style={[styles.submitBtnText, { color: isPartner ? '#fff' : '#0A0A0F' }]}>
                {submitLabel}
              </Text>
            </LinearGradient>
          </AnimatedPressable>

          {!isPartner && (
            <AnimatedPressable onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Continue as guest</Text>
            </AnimatedPressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  content: { paddingHorizontal: 24 },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: P.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: P.border,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  typeBtnActiveClient: {
    backgroundColor: P.gold,
  },
  typeBtnActivePartner: {
    backgroundColor: P.accent,
  },
  typeBtnText: {
    fontSize: 15,
    color: P.textSecondary,
    fontWeight: '600',
  },
  typeBtnTextActiveClient: {
    color: '#0A0A0F',
    fontWeight: '700',
  },
  typeBtnTextActivePartner: {
    color: '#fff',
    fontWeight: '700',
  },
  logoSection: { alignItems: 'center', marginBottom: 32, gap: 8 },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: { fontSize: 40, fontWeight: '900', color: '#0A0A0F' },
  appName: { fontSize: 30, fontWeight: '800', color: P.text, letterSpacing: -0.5 },
  appSubtitle: { fontSize: 15, color: P.textSecondary, textAlign: 'center' },
  subTabSwitcher: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: P.border,
    marginBottom: 24,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabText: {
    fontSize: 15,
    color: P.textSecondary,
    fontWeight: '500',
  },
  form: { gap: 16 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13, color: P.textSecondary, fontWeight: '600', letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: P.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, color: P.text },
  errorBox: {
    backgroundColor: 'rgba(232,84,84,0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,84,84,0.3)',
  },
  errorText: { fontSize: 13, color: P.danger, textAlign: 'center' },
  submitBtn: { marginTop: 8 },
  submitBtnGradient: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 14, color: P.textSecondary },
});
