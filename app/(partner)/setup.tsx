import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Pressable,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  Camera,
  Clock,
  Image as ImageIcon,
  Scissors,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Fresha warm near-black palette
const F = {
  bg: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#222222',
  border: '#2A2A2A',
  accent: '#7C3AED',
  accentLight: 'rgba(124,58,237,0.15)',
  text: '#F5F0E8',
  textSec: '#8A8A8A',
  textTer: '#555555',
  success: '#22C55E',
  danger: '#E85454',
  divider: '#1E1E1E',
};

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

// ─── AnimatedPressable ────────────────────────────────────────────────────────
function AnimatedPressable({
  onPress,
  style,
  children,
  disabled,
  scaleValue = 0.97,
  ...props
}: {
  onPress?: () => void;
  style?: any;
  children: React.ReactNode;
  disabled?: boolean;
  scaleValue?: number;
  [key: string]: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateIn = useCallback(() => {
    Animated.spring(scale, { toValue: scaleValue, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale, scaleValue]);
  const animateOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);
  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.5 }]}>
      <Pressable
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={onPress}
        disabled={disabled}
        style={style}
        {...props}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── Staggered field wrapper ──────────────────────────────────────────────────
function FadeField({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: index * 70, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SHOP_CATEGORIES = ['Barbershop', 'Salon', 'Spa', 'Nails', 'Tattoo', 'Other'];
const SERVICE_CATEGORIES = ['Haircut', 'Beard', 'Color', 'Facial', 'Nails', 'Other'];
const DURATION_OPTIONS = ['15', '30', '45', '60', '90'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const defaultHours = Array.from({ length: 7 }, (_, i) => ({
  open: '09:00',
  close: '21:00',
  enabled: i >= 1 && i <= 6,
}));

const TOTAL_CONTENT_STEPS = 5;

// Segment labels for 3-segment progress bar
// Segment 0: steps 1-2 "Business info"
// Segment 1: steps 3-4 "Profile content"
// Segment 2: step 5 "Go live"
const SEGMENTS = ['Business info', 'Profile content', 'Go live'];

function getSegmentState(segIndex: number, step: number): 'active' | 'done' | 'inactive' {
  // seg 0 covers steps 1-2, seg 1 covers steps 3-4, seg 2 covers step 5
  const segStepRanges = [[1, 2], [3, 4], [5, 5]];
  const [lo, hi] = segStepRanges[segIndex];
  if (step > hi) return 'done';
  if (step >= lo) return 'active';
  return 'inactive';
}

// ─── Upload helper ────────────────────────────────────────────────────────────
async function uploadImage(bucket: string, localUri: string): Promise<string | null> {
  try {
    console.log('[Setup] Uploading image to bucket:', bucket, 'uri:', localUri);
    const response = await fetch(localUri);
    const blob = await response.blob();
    const fileName = `${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) {
      console.log('[Setup] Upload error:', error.message);
      return null;
    }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    console.log('[Setup] Upload success, url:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.log('[Setup] uploadImage exception:', err);
    return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ShopSetup() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshProfile } = useAuth();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Step 1 – Basic Info
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('Barbershop');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 – Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  // Step 3 – Photos
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);

  // Step 4 – Hours
  const [hours, setHours] = useState(defaultHours);

  // Step 5 – First Service
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('30');
  const [serviceCategory, setServiceCategory] = useState('Haircut');

  // ─── Animations ──────────────────────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Slide transition
  const goToStep = useCallback(
    (next: number) => {
      const direction = next > step ? 1 : -1;
      slideAnim.setValue(direction * SCREEN_WIDTH);
      Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
      setStep(next);
    },
    [step, slideAnim]
  );

  // ─── Validation ───────────────────────────────────────────────────────────
  const canProceed = useCallback(() => {
    if (step === 1) return shopName.trim().length > 0;
    if (step === 2) return address.trim().length > 0;
    return true;
  }, [step, shopName, address]);

  // ─── Location ─────────────────────────────────────────────────────────────
  const detectLocation = async () => {
    console.log('[Setup] Detect location button pressed');
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow location access to auto-fill your address.');
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      console.log('[Setup] Location obtained:', loc.coords.latitude, loc.coords.longitude);
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geocode[0]) {
        const g = geocode[0];
        const street = [g.streetNumber, g.street].filter(Boolean).join(' ');
        setAddress(street || g.name || '');
        setCity(g.city || g.subregion || '');
        setCountry(g.country || '');
        setLat(loc.coords.latitude);
        setLng(loc.coords.longitude);
        console.log('[Setup] Reverse geocode result:', g);
      }
    } catch (err) {
      console.log('[Setup] detectLocation error:', err);
    } finally {
      setLocating(false);
    }
  };

  // ─── Image picker ─────────────────────────────────────────────────────────
  const pickImage = async (type: 'cover' | 'logo') => {
    console.log('[Setup] Pick image pressed, type:', type);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: type === 'cover' ? [16, 9] : [1, 1],
      });
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      console.log('[Setup] Image picked:', type, uri);
      if (type === 'cover') setCoverUri(uri);
      else setLogoUri(uri);
    } catch (err) {
      console.log('[Setup] pickImage error:', err);
    }
  };

  // ─── Finish ───────────────────────────────────────────────────────────────
  const finish = async (skipService = false) => {
    if (!user) return;
    console.log('[Setup] Finish setup pressed, skipService:', skipService);
    setSaving(true);
    setSaveError('');
    try {
      let coverUrl: string | null = null;
      let logoUrl: string | null = null;
      if (coverUri) {
        console.log('[Setup] Uploading cover image...');
        coverUrl = await uploadImage('shop-covers', coverUri);
      }
      if (logoUri) {
        console.log('[Setup] Uploading logo image...');
        logoUrl = await uploadImage('shop-logos', logoUri);
      }

      const openingHoursObj: Record<string, { open: string; close: string; enabled: boolean }> = {};
      hours.forEach((h, i) => { openingHoursObj[i] = h; });

      const fullAddress = [address, city, country].filter(Boolean).join(', ');

      console.log('[Setup] Inserting barbershop record...');
      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: shopName,
          category,
          phone,
          description,
          address: fullAddress,
          lat,
          lng,
          cover_url: coverUrl,
          logo_url: logoUrl,
          opening_hours: openingHoursObj,
          owner_profile_id: user.id,
          is_active: true,
          status: 'active',
        })
        .select('id')
        .single();

      if (shopError) {
        console.log('[Setup] Insert shop error:', shopError.message);
        setSaveError('Could not create your venue. Please try again.');
        setSaving(false);
        return;
      }

      const shopId = shopData.id;
      console.log('[Setup] Shop created with id:', shopId);

      await supabase.from('profiles').update({ role: 'shop_owner' }).eq('id', user.id);
      console.log('[Setup] Profile role updated to shop_owner');

      if (!skipService && serviceName.trim()) {
        console.log('[Setup] Inserting first service:', serviceName);
        await supabase.from('services').insert({
          shop_id: shopId,
          name: serviceName,
          price_bhd: parseFloat(servicePrice) || 0,
          duration_minutes: parseInt(serviceDuration) || 30,
          category: serviceCategory,
          is_active: true,
        });
      }

      await refreshProfile();
      console.log('[Setup] Setup complete, navigating to partner dashboard');
      router.replace('/(partner)');
    } catch (err) {
      console.log('[Setup] finish exception:', err);
      setSaveError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Step content ─────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <BasicInfoStep
            shopName={shopName} setShopName={setShopName}
            category={category} setCategory={setCategory}
            phone={phone} setPhone={setPhone}
            description={description} setDescription={setDescription}
          />
        );
      case 2:
        return (
          <LocationStep
            address={address} setAddress={setAddress}
            city={city} setCity={setCity}
            country={country} setCountry={setCountry}
            lat={lat} lng={lng}
            locating={locating} onDetect={detectLocation}
          />
        );
      case 3:
        return (
          <PhotosStep
            coverUri={coverUri} logoUri={logoUri}
            onPickCover={() => pickImage('cover')}
            onPickLogo={() => pickImage('logo')}
          />
        );
      case 4:
        return <HoursStep hours={hours} setHours={setHours} />;
      case 5:
        return (
          <ServiceStep
            serviceName={serviceName} setServiceName={setServiceName}
            servicePrice={servicePrice} setServicePrice={setServicePrice}
            serviceDuration={serviceDuration} setServiceDuration={setServiceDuration}
            serviceCategory={serviceCategory} setServiceCategory={setServiceCategory}
          />
        );
      default:
        return null;
    }
  };

  // ─── Welcome screen ───────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <WelcomeStep orbScale={orbScale} onStart={() => { console.log('[Setup] Get started pressed'); goToStep(1); }} insets={insets} />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header: back arrow + close button */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => { console.log('[Setup] Back pressed from step:', step); goToStep(step - 1); }}
          style={styles.headerIconBtn}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={20} color={F.text} />
        </AnimatedPressable>
        <View style={{ flex: 1 }} />
        <AnimatedPressable
          onPress={() => { console.log('[Setup] Close pressed'); router.replace('/(partner)'); }}
          style={styles.headerIconBtn}
          accessibilityLabel="Close setup"
        >
          <X size={18} color={F.textSec} />
        </AnimatedPressable>
      </View>

      {/* 3-segment progress bar */}
      <View style={styles.segmentRow}>
        {SEGMENTS.map((label, i) => {
          const state = getSegmentState(i, step);
          return (
            <View key={i} style={styles.segmentItem}>
              <View
                style={[
                  styles.segmentBar,
                  state === 'active' && styles.segmentBarActive,
                  state === 'done' && styles.segmentBarDone,
                ]}
              />
              <Text style={[styles.segmentLabel, state !== 'inactive' && styles.segmentLabelActive]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Scrollable content */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderStep()}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {step < TOTAL_CONTENT_STEPS ? (
          <AnimatedPressable
            onPress={() => { console.log('[Setup] Continue pressed from step:', step); goToStep(step + 1); }}
            disabled={!canProceed()}
            style={[styles.primaryBtn, !canProceed() && styles.primaryBtnDisabled]}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </AnimatedPressable>
        ) : (
          <View style={styles.finishColumn}>
            {saveError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{saveError}</Text>
              </View>
            ) : null}
            <AnimatedPressable
              onPress={() => { console.log('[Setup] Skip service pressed'); finish(true); }}
              style={styles.skipLink}
              disabled={saving}
            >
              <Text style={styles.skipLinkText}>Skip for now</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => { console.log('[Setup] Finish setup pressed'); finish(false); }}
              disabled={saving}
              style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Finish setup</Text>
              )}
            </AnimatedPressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Welcome Step ─────────────────────────────────────────────────────────────
function WelcomeStep({
  orbScale,
  onStart,
  insets,
}: {
  orbScale: Animated.Value;
  onStart: () => void;
  insets: { top: number; bottom: number };
}) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(32)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.welcomeContainer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
      {/* Icon orb */}
      <Animated.View style={[styles.orbWrapper, { transform: [{ scale: orbScale }] }]}>
        <View style={styles.orbOuter} />
        <View style={styles.orbInner} />
        <View style={styles.orbIconContainer}>
          <Scissors size={36} color={F.accent} strokeWidth={1.5} />
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View style={[styles.welcomeTextBlock, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <Text style={styles.welcomeHeadline}>{"Let's set up\nyour venue"}</Text>
        <Text style={styles.welcomeSub}>It only takes a few minutes to get your shop live and start accepting bookings.</Text>

        <View style={styles.welcomeFeatures}>
          {[
            { icon: <MapPin size={16} color={F.accent} />, label: 'Set your location' },
            { icon: <Clock size={16} color={F.accent} />, label: 'Configure opening hours' },
            { icon: <Scissors size={16} color={F.accent} />, label: 'Add your first service' },
          ].map((f, i) => (
            <View key={i} style={styles.welcomeFeatureRow}>
              <View style={styles.welcomeFeatureIcon}>{f.icon}</View>
              <Text style={styles.welcomeFeatureText}>{f.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* CTA */}
      <Animated.View style={{ opacity: fadeIn, width: '100%' }}>
        <AnimatedPressable onPress={onStart} style={styles.welcomeBtn}>
          <Text style={styles.welcomeBtnText}>Continue</Text>
          <ChevronRight size={18} color="#fff" />
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

// ─── Basic Info Step ──────────────────────────────────────────────────────────
function BasicInfoStep({
  shopName, setShopName, category, setCategory, phone, setPhone, description, setDescription,
}: {
  shopName: string; setShopName: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  description: string; setDescription: (v: string) => void;
}) {
  return (
    <View style={styles.stepContent}>
      <FadeField index={0}>
        <Text style={styles.stepHeading}>Venue essentials</Text>
        <Text style={styles.stepSubheading}>Tell us about your business</Text>
      </FadeField>

      <FadeField index={1}>
        <Text style={styles.fieldLabel}>Shop name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={shopName}
          onChangeText={setShopName}
          placeholder="e.g. The Barber Shop"
          placeholderTextColor={F.textTer}
          autoFocus
          returnKeyType="next"
        />
      </FadeField>

      <FadeField index={2}>
        <Text style={styles.fieldLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {SHOP_CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <AnimatedPressable
                key={c}
                onPress={() => { console.log('[Setup] Shop category selected:', c); setCategory(c); }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </FadeField>

      <FadeField index={3}>
        <Text style={styles.fieldLabel}>Phone number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+973 XXXX XXXX"
          placeholderTextColor={F.textTer}
          keyboardType="phone-pad"
          returnKeyType="next"
        />
      </FadeField>

      <FadeField index={4}>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Tell clients what makes your shop special..."
          placeholderTextColor={F.textTer}
          multiline
          textAlignVertical="top"
          returnKeyType="done"
        />
      </FadeField>
    </View>
  );
}

// ─── Location Step ────────────────────────────────────────────────────────────
function LocationStep({
  address, setAddress, city, setCity, country, setCountry, lat, lng, locating, onDetect,
}: {
  address: string; setAddress: (v: string) => void;
  city: string; setCity: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  lat: number | null; lng: number | null;
  locating: boolean; onDetect: () => void;
}) {
  const hasCoords = lat !== null && lng !== null;
  const latDisplay = lat !== null ? lat.toFixed(5) : '';
  const lngDisplay = lng !== null ? lng.toFixed(5) : '';

  return (
    <View style={styles.stepContent}>
      <FadeField index={0}>
        <Text style={styles.stepHeading}>Where is your business located?</Text>
        <Text style={styles.stepSubheading}>Help clients find you</Text>
      </FadeField>

      <FadeField index={1}>
        <AnimatedPressable onPress={onDetect} style={styles.locationBtn} disabled={locating}>
          {locating ? (
            <ActivityIndicator size="small" color={F.accent} />
          ) : (
            <MapPin size={18} color={F.accent} />
          )}
          <Text style={styles.locationBtnText}>
            {locating ? 'Detecting location…' : 'Use my current location'}
          </Text>
        </AnimatedPressable>
      </FadeField>

      {hasCoords && (
        <FadeField index={2}>
          <View style={styles.coordsBadge}>
            <MapPin size={12} color={F.success} />
            <Text style={styles.coordsText}>{latDisplay}, {lngDisplay}</Text>
          </View>
        </FadeField>
      )}

      <FadeField index={3}>
        <Text style={styles.fieldLabel}>Street address <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. 12 Al Fateh Highway"
          placeholderTextColor={F.textTer}
          returnKeyType="next"
        />
      </FadeField>

      <FadeField index={4}>
        <Text style={styles.fieldLabel}>City</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Manama"
          placeholderTextColor={F.textTer}
          returnKeyType="next"
        />
      </FadeField>

      <FadeField index={5}>
        <Text style={styles.fieldLabel}>Country</Text>
        <TextInput
          style={styles.input}
          value={country}
          onChangeText={setCountry}
          placeholder="e.g. Bahrain"
          placeholderTextColor={F.textTer}
          returnKeyType="done"
        />
      </FadeField>
    </View>
  );
}

// ─── Photos Step ──────────────────────────────────────────────────────────────
function PhotosStep({
  coverUri, logoUri, onPickCover, onPickLogo,
}: {
  coverUri: string | null; logoUri: string | null;
  onPickCover: () => void; onPickLogo: () => void;
}) {
  return (
    <View style={styles.stepContent}>
      <FadeField index={0}>
        <Text style={styles.stepHeading}>Add your venue photos</Text>
        <Text style={styles.stepSubheading}>A great cover photo attracts more clients</Text>
      </FadeField>

      <FadeField index={1}>
        <Text style={styles.fieldLabel}>Cover photo</Text>
        <AnimatedPressable onPress={onPickCover} style={styles.coverPicker}>
          {coverUri ? (
            <Image source={resolveImageSource(coverUri)} style={styles.coverPreview} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <View style={styles.photoIconCircle}>
                <ImageIcon size={24} color={F.textTer} />
              </View>
              <Text style={styles.photoPlaceholderTitle}>Add cover photo</Text>
              <Text style={styles.photoPlaceholderSub}>Recommended: 1600 × 900px</Text>
            </View>
          )}
          <View style={styles.coverEditBadge}>
            <Camera size={14} color="#fff" />
          </View>
        </AnimatedPressable>
      </FadeField>

      <FadeField index={2}>
        <Text style={styles.fieldLabel}>Logo</Text>
        <View style={styles.logoRow}>
          <AnimatedPressable onPress={onPickLogo} style={styles.logoPicker}>
            {logoUri ? (
              <Image source={resolveImageSource(logoUri)} style={styles.logoPreview} resizeMode="cover" />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Camera size={20} color={F.textTer} />
              </View>
            )}
            <View style={styles.logoEditBadge}>
              <Camera size={10} color="#fff" />
            </View>
          </AnimatedPressable>
          <View style={styles.logoHint}>
            <Text style={styles.logoHintTitle}>Shop logo</Text>
            <Text style={styles.logoHintSub}>Square image, at least 200 × 200px</Text>
          </View>
        </View>
      </FadeField>
    </View>
  );
}

// ─── Hours Step ───────────────────────────────────────────────────────────────
function HoursStep({
  hours, setHours,
}: {
  hours: { open: string; close: string; enabled: boolean }[];
  setHours: React.Dispatch<React.SetStateAction<{ open: string; close: string; enabled: boolean }[]>>;
}) {
  const toggleDay = (i: number, v: boolean) => {
    console.log('[Setup] Toggle day:', WEEKDAYS[i], 'enabled:', v);
    setHours((prev) => prev.map((h, ii) => (ii === i ? { ...h, enabled: v } : h)));
  };
  const setOpen = (i: number, v: string) => {
    setHours((prev) => prev.map((h, ii) => (ii === i ? { ...h, open: v } : h)));
  };
  const setClose = (i: number, v: string) => {
    setHours((prev) => prev.map((h, ii) => (ii === i ? { ...h, close: v } : h)));
  };

  return (
    <View style={styles.stepContent}>
      <FadeField index={0}>
        <Text style={styles.stepHeading}>Add your opening hours</Text>
        <Text style={styles.stepSubheading}>Set your weekly schedule</Text>
      </FadeField>

      <View style={styles.hoursCard}>
        {hours.map((h, i) => (
          <FadeField key={i} index={i + 1}>
            <View style={[styles.hourRow, i < hours.length - 1 && styles.hourRowBorder]}>
              <View style={styles.hourLeft}>
                <Switch
                  value={h.enabled}
                  onValueChange={(v) => toggleDay(i, v)}
                  trackColor={{ false: F.border, true: F.accent }}
                  thumbColor="#fff"
                  ios_backgroundColor={F.border}
                />
                <View>
                  <Text style={[styles.dayLabel, !h.enabled && styles.dayLabelDisabled]}>
                    {WEEKDAYS[i].slice(0, 3)}
                  </Text>
                  <Text style={[styles.dayStatus, !h.enabled && styles.dayStatusDisabled]}>
                    {h.enabled ? 'Open' : 'Closed'}
                  </Text>
                </View>
              </View>
              {h.enabled ? (
                <View style={styles.timeRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={h.open}
                    onChangeText={(v) => setOpen(i, v)}
                    placeholder="09:00"
                    placeholderTextColor={F.textTer}
                    keyboardType="numbers-and-punctuation"
                  />
                  <Text style={styles.timeDash}>–</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={h.close}
                    onChangeText={(v) => setClose(i, v)}
                    placeholder="21:00"
                    placeholderTextColor={F.textTer}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              ) : (
                <Text style={styles.closedLabel}>Closed</Text>
              )}
            </View>
          </FadeField>
        ))}
      </View>
    </View>
  );
}

// ─── Service Step ─────────────────────────────────────────────────────────────
function ServiceStep({
  serviceName, setServiceName, servicePrice, setServicePrice,
  serviceDuration, setServiceDuration, serviceCategory, setServiceCategory,
}: {
  serviceName: string; setServiceName: (v: string) => void;
  servicePrice: string; setServicePrice: (v: string) => void;
  serviceDuration: string; setServiceDuration: (v: string) => void;
  serviceCategory: string; setServiceCategory: (v: string) => void;
}) {
  return (
    <View style={styles.stepContent}>
      <FadeField index={0}>
        <Text style={styles.stepHeading}>Add your first service</Text>
        <Text style={styles.stepSubheading}>Optional — you can add more later</Text>
      </FadeField>

      <FadeField index={1}>
        <Text style={styles.fieldLabel}>Service name</Text>
        <TextInput
          style={styles.input}
          value={serviceName}
          onChangeText={setServiceName}
          placeholder="e.g. Classic Haircut"
          placeholderTextColor={F.textTer}
          returnKeyType="next"
        />
      </FadeField>

      <FadeField index={2}>
        <Text style={styles.fieldLabel}>Price (BHD)</Text>
        <TextInput
          style={styles.input}
          value={servicePrice}
          onChangeText={setServicePrice}
          placeholder="0.000"
          placeholderTextColor={F.textTer}
          keyboardType="decimal-pad"
          returnKeyType="next"
        />
      </FadeField>

      <FadeField index={3}>
        <Text style={styles.fieldLabel}>Duration</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {DURATION_OPTIONS.map((d) => {
            const active = serviceDuration === d;
            return (
              <AnimatedPressable
                key={d}
                onPress={() => { console.log('[Setup] Duration selected:', d, 'min'); setServiceDuration(d); }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{d} min</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </FadeField>

      <FadeField index={4}>
        <Text style={styles.fieldLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {SERVICE_CATEGORIES.map((c) => {
            const active = serviceCategory === c;
            return (
              <AnimatedPressable
                key={c}
                onPress={() => { console.log('[Setup] Service category selected:', c); setServiceCategory(c); }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </FadeField>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: F.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: F.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: F.border,
  },

  // 3-segment progress bar
  segmentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 4,
    marginTop: 4,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  segmentBar: {
    height: 4,
    width: '100%',
    borderRadius: 999,
    backgroundColor: F.border,
  },
  segmentBarActive: {
    backgroundColor: F.accent,
  },
  segmentBarDone: {
    backgroundColor: F.accent,
    opacity: 0.6,
  },
  segmentLabel: {
    color: F.textTer,
    fontSize: 10,
    fontWeight: '500',
  },
  segmentLabelActive: {
    color: F.textSec,
  },

  // Slide container
  slideContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Step content
  stepContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 4,
  },
  stepHeading: {
    color: F.text,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  stepSubheading: {
    color: F.textSec,
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
  },

  // Fields
  fieldLabel: {
    color: F.textSec,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: 0.2,
  },
  required: {
    color: F.danger,
  },
  input: {
    backgroundColor: F.surface,
    borderRadius: 12,
    padding: 16,
    color: F.text,
    borderWidth: 1,
    borderColor: F.border,
    fontSize: 16,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: F.surface,
    borderWidth: 1,
    borderColor: F.border,
  },
  chipActive: {
    backgroundColor: F.accent,
    borderColor: F.accent,
  },
  chipText: {
    color: F.textSec,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Location
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: F.accentLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    marginTop: 8,
  },
  locationBtnText: {
    color: F.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  coordsText: {
    color: F.success,
    fontSize: 12,
    fontWeight: '500',
  },

  // Photos
  coverPicker: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: F.border,
    backgroundColor: F.surface,
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: F.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: F.border,
  },
  photoPlaceholderTitle: {
    color: F.textSec,
    fontSize: 14,
    fontWeight: '600',
  },
  photoPlaceholderSub: {
    color: F.textTer,
    fontSize: 12,
  },
  coverEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: F.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  logoPicker: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: F.border,
    backgroundColor: F.surface,
  },
  logoPreview: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: F.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHint: {
    flex: 1,
    gap: 4,
  },
  logoHintTitle: {
    color: F.text,
    fontSize: 15,
    fontWeight: '600',
  },
  logoHintSub: {
    color: F.textTer,
    fontSize: 13,
    lineHeight: 18,
  },

  // Hours
  hoursCard: {
    backgroundColor: F.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: F.border,
    marginTop: 8,
    overflow: 'hidden',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  hourRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: F.divider,
  },
  hourLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 110,
  },
  dayLabel: {
    color: F.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dayLabelDisabled: {
    opacity: 0.4,
  },
  dayStatus: {
    color: F.success,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  dayStatusDisabled: {
    color: F.textTer,
  },
  timeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  timeInput: {
    backgroundColor: F.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: F.text,
    fontSize: 13,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: F.border,
    minWidth: 60,
  },
  timeDash: {
    color: F.textTer,
    fontSize: 14,
  },
  closedLabel: {
    color: F.textTer,
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: F.bg,
    borderTopWidth: 1,
    borderTopColor: F.border,
  },
  primaryBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: F.accent,
    paddingVertical: 16,
    borderRadius: 999,
    minHeight: 52,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  finishColumn: {
    gap: 8,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  skipLinkText: {
    color: F.textSec,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  errorBanner: {
    backgroundColor: 'rgba(232,84,84,0.12)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,84,84,0.3)',
  },
  errorBannerText: {
    color: F.danger,
    fontSize: 13,
    lineHeight: 18,
  },

  // Welcome
  welcomeContainer: {
    flex: 1,
    backgroundColor: F.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  orbWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  orbOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  orbInner: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(124,58,237,0.14)',
  },
  orbIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  welcomeTextBlock: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  welcomeHeadline: {
    color: F.text,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 42,
  },
  welcomeSub: {
    color: F.textSec,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  welcomeFeatures: {
    width: '100%',
    gap: 10,
    marginTop: 8,
    backgroundColor: F.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: F.border,
  },
  welcomeFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  welcomeFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: F.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeFeatureText: {
    color: F.text,
    fontSize: 14,
    fontWeight: '500',
  },
  welcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: F.accent,
    borderRadius: 999,
    paddingVertical: 16,
    width: '100%',
  },
  welcomeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
