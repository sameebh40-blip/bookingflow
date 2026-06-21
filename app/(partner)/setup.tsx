import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Image,
  Alert,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Check, MapPin, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
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

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const CATEGORIES = ['Barbershop', 'Salon', 'Spa', 'Nails', 'Other'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STEPS = ['Basic Info', 'Location', 'Photos', 'Hours', 'First Service'];

const defaultHours = Array.from({ length: 7 }, (_, i) => ({
  open: '09:00',
  close: '21:00',
  enabled: i >= 1 && i <= 6,
}));

async function uploadImage(bucket: string, localUri: string): Promise<string | null> {
  try {
    console.log('[Setup] Uploading image to bucket:', bucket);
    const response = await fetch(localUri);
    const blob = await response.blob();
    const fileName = `${Date.now()}.jpg`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) { console.log('[Setup] Upload error:', error.message); return null; }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.log('[Setup] uploadImage exception:', err);
    return null;
  }
}

export default function ShopSetup() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshProfile } = useAuth();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('Barbershop');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');

  // Step 2
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  // Step 3
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);

  // Step 4
  const [hours, setHours] = useState(defaultHours);

  // Step 5
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('30');
  const [serviceCategory, setServiceCategory] = useState('Haircut');

  const detectLocation = async () => {
    console.log('[Setup] Detect location pressed');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission required', 'Please allow location access.'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geocode[0]) {
        const addr = [geocode[0].street, geocode[0].city, geocode[0].country].filter(Boolean).join(', ');
        setAddress(addr);
        setLat(loc.coords.latitude);
        setLng(loc.coords.longitude);
      }
    } catch (err) {
      console.log('[Setup] detectLocation error:', err);
    }
  };

  const pickImage = async (type: 'cover' | 'logo') => {
    console.log('[Setup] Pick image:', type);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission required', 'Please allow photo access.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;
      if (type === 'cover') setCoverUri(result.assets[0].uri);
      else setLogoUri(result.assets[0].uri);
    } catch (err) {
      console.log('[Setup] pickImage error:', err);
    }
  };

  const finish = async () => {
    if (!user) return;
    console.log('[Setup] Finish setup pressed');
    setSaving(true);
    try {
      // Upload images
      let coverUrl: string | null = null;
      let logoUrl: string | null = null;
      if (coverUri) coverUrl = await uploadImage('shop-covers', coverUri);
      if (logoUri) logoUrl = await uploadImage('shop-logos', logoUri);

      // Build opening hours jsonb
      const openingHoursObj: Record<string, { open: string; close: string; enabled: boolean }> = {};
      hours.forEach((h, i) => { openingHoursObj[i] = h; });

      // Insert shop
      const { data: shopData, error: shopError } = await supabase.from('barbershops').insert({
        name: shopName,
        category,
        phone,
        description,
        address,
        lat,
        lng,
        cover_url: coverUrl,
        logo_url: logoUrl,
        opening_hours: openingHoursObj,
        owner_profile_id: user.id,
        is_active: true,
        status: 'active',
      }).select('id').single();

      if (shopError) {
        console.log('[Setup] Insert shop error:', shopError.message);
        setSaving(false);
        return;
      }

      const shopId = shopData.id;
      console.log('[Setup] Shop created:', shopId);

      // Update profile role
      await supabase.from('profiles').update({ role: 'shop_owner' }).eq('id', user.id);

      // Add first service if provided
      if (serviceName) {
        await supabase.from('services').insert({
          shop_id: shopId,
          name: serviceName,
          price_bhd: parseFloat(servicePrice) || 0,
          duration_minutes: parseInt(serviceDuration) || 30,
          category: serviceCategory,
          is_active: true,
        });
      }

      // Refresh profile to get new role + shop_id
      await refreshProfile();
      console.log('[Setup] Setup complete, navigating to partner dashboard');
      router.replace('/(partner)');
    } catch (err) {
      console.log('[Setup] finish exception:', err);
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return shopName.length > 0;
    if (step === 1) return address.length > 0;
    return true;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Set Up Your Shop</Text>
        <Text style={styles.headerSub}>Step {step + 1} of {STEPS.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      <Text style={styles.stepTitle}>{STEPS[step]}</Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* Step 0: Basic info */}
        {step === 0 && (
          <View style={{ gap: 4 }}>
            <Text style={styles.fieldLabel}>Shop Name *</Text>
            <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="e.g. The Barber Shop" placeholderTextColor={P.textTertiary} />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.catChip, category === c && styles.catChipActive]} onPress={() => { console.log('[Setup] Category selected:', c); setCategory(c); }}>
                  <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+973 XXXX XXXX" placeholderTextColor={P.textTertiary} keyboardType="phone-pad" />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Tell clients about your shop..." placeholderTextColor={P.textTertiary} multiline />
          </View>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <View style={{ gap: 4 }}>
            <TouchableOpacity style={styles.locationBtn} onPress={detectLocation}>
              <MapPin size={16} color={P.accent} />
              <Text style={styles.locationBtnText}>Use My Current Location</Text>
            </TouchableOpacity>
            <Text style={styles.fieldLabel}>Address *</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Enter your shop address" placeholderTextColor={P.textTertiary} />
            {lat && lng && (
              <View style={styles.coordsRow}>
                <Text style={styles.coordsText}>📍 {lat.toFixed(4)}, {lng.toFixed(4)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Step 2: Photos */}
        {step === 2 && (
          <View style={{ gap: 16 }}>
            <Text style={styles.fieldLabel}>Cover Photo</Text>
            <TouchableOpacity style={styles.photoPicker} onPress={() => pickImage('cover')}>
              {coverUri ? (
                <Image source={resolveImageSource(coverUri)} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={28} color={P.textTertiary} />
                  <Text style={styles.photoPlaceholderText}>Tap to add cover photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Logo</Text>
            <TouchableOpacity style={styles.logoPicker} onPress={() => pickImage('logo')}>
              {logoUri ? (
                <Image source={resolveImageSource(logoUri)} style={styles.logoPreview} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Camera size={20} color={P.textTertiary} />
                  <Text style={styles.photoPlaceholderText}>Logo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Hours */}
        {step === 3 && (
          <View>
            {hours.map((h, i) => (
              <View key={i} style={styles.hourRow}>
                <Switch
                  value={h.enabled}
                  onValueChange={v => setHours(prev => prev.map((hh, ii) => ii === i ? { ...hh, enabled: v } : hh))}
                  trackColor={{ false: P.border, true: P.accent }}
                  thumbColor="#fff"
                />
                <Text style={[styles.dayLabel, !h.enabled && { opacity: 0.4 }]}>{WEEKDAYS[i].slice(0, 3)}</Text>
                {h.enabled ? (
                  <View style={styles.timeInputs}>
                    <TextInput style={styles.timeInput} value={h.open} onChangeText={v => setHours(prev => prev.map((hh, ii) => ii === i ? { ...hh, open: v } : hh))} placeholder="09:00" placeholderTextColor={P.textTertiary} />
                    <Text style={styles.timeSep}>–</Text>
                    <TextInput style={styles.timeInput} value={h.close} onChangeText={v => setHours(prev => prev.map((hh, ii) => ii === i ? { ...hh, close: v } : hh))} placeholder="21:00" placeholderTextColor={P.textTertiary} />
                  </View>
                ) : (
                  <Text style={styles.closedText}>Closed</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Step 4: First service */}
        {step === 4 && (
          <View style={{ gap: 4 }}>
            <Text style={styles.skipText}>Add your first service or skip for now</Text>
            <Text style={styles.fieldLabel}>Service Name</Text>
            <TextInput style={styles.input} value={serviceName} onChangeText={setServiceName} placeholder="e.g. Classic Haircut" placeholderTextColor={P.textTertiary} />

            <Text style={styles.fieldLabel}>Price (BHD)</Text>
            <TextInput style={styles.input} value={servicePrice} onChangeText={setServicePrice} placeholder="0.000" placeholderTextColor={P.textTertiary} keyboardType="decimal-pad" />

            <Text style={styles.fieldLabel}>Duration (minutes)</Text>
            <TextInput style={styles.input} value={serviceDuration} onChangeText={setServiceDuration} placeholder="30" placeholderTextColor={P.textTertiary} keyboardType="number-pad" />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.catRow}>
              {['Haircut', 'Beard', 'Color', 'Facial', 'Other'].map(c => (
                <TouchableOpacity key={c} style={[styles.catChip, serviceCategory === c && styles.catChipActive]} onPress={() => setServiceCategory(c)}>
                  <Text style={[styles.catChipText, serviceCategory === c && styles.catChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => { console.log('[Setup] Back pressed'); setStep(s => s - 1); }}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
            disabled={!canProceed()}
            onPress={() => { console.log('[Setup] Next pressed, step:', step); setStep(s => s + 1); }}
          >
            <Text style={styles.nextBtnText}>Next</Text>
            <ChevronRight size={16} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1, gap: 8 }}>
            {step === 4 && (
              <TouchableOpacity style={styles.skipBtn} onPress={() => { console.log('[Setup] Skip service pressed'); setServiceName(''); finish(); }}>
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.nextBtn} onPress={finish} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Check size={16} color="#fff" />
                  <Text style={styles.nextBtnText}>Finish Setup</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  headerSub: { color: P.textSecondary, fontSize: 13 },
  progressTrack: { height: 3, backgroundColor: P.surface, marginHorizontal: 20, borderRadius: 2, marginBottom: 16 },
  progressBar: { height: '100%', backgroundColor: P.accent, borderRadius: 2 },
  stepTitle: { color: P.textSecondary, fontSize: 14, fontWeight: '600', paddingHorizontal: 20, marginBottom: 8 },
  fieldLabel: { color: P.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: P.surface, borderRadius: 10, padding: 14, color: P.text, borderWidth: 1, borderColor: P.border, fontSize: 15 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: P.surface, borderWidth: 1, borderColor: P.border },
  catChipActive: { backgroundColor: P.accent, borderColor: P.accent },
  catChipText: { color: P.textSecondary, fontSize: 13 },
  catChipTextActive: { color: '#fff', fontWeight: '600' },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: P.accentLight, borderRadius: 12, padding: 14, marginBottom: 8 },
  locationBtnText: { color: P.accent, fontSize: 14, fontWeight: '600' },
  coordsRow: { backgroundColor: P.surface, borderRadius: 8, padding: 10 },
  coordsText: { color: P.textSecondary, fontSize: 12 },
  photoPicker: { height: 160, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: P.border },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoPlaceholderText: { color: P.textTertiary, fontSize: 13 },
  logoPicker: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', borderWidth: 1, borderColor: P.border, alignSelf: 'center' },
  logoPreview: { width: '100%', height: '100%' },
  logoPlaceholder: { flex: 1, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center', gap: 4 },
  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: P.divider },
  dayLabel: { color: P.text, fontSize: 14, fontWeight: '600', width: 36 },
  timeInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: { flex: 1, backgroundColor: P.surfaceElevated, borderRadius: 8, padding: 8, color: P.text, fontSize: 13, textAlign: 'center', borderWidth: 1, borderColor: P.border },
  timeSep: { color: P.textSecondary, fontSize: 14 },
  closedText: { color: P.textTertiary, fontSize: 13, flex: 1 },
  skipText: { color: P.textSecondary, fontSize: 13, marginBottom: 8 },
  bottomBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, backgroundColor: P.surface, borderTopWidth: 1, borderTopColor: P.border },
  backBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: P.border },
  backBtnText: { color: P.textSecondary, fontSize: 15, fontWeight: '600' },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: P.accent, paddingVertical: 14, borderRadius: 12 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipBtnText: { color: P.textSecondary, fontSize: 14 },
});
