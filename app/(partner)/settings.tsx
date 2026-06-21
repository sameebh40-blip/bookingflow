import React, { useEffect, useState, useCallback } from 'react';
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
  Modal,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, MapPin, Image as ImageIcon, Plus, Trash2, Building2, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
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

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ShopData {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
  phone?: string;
  address?: string;
  instagram?: string;
  tiktok?: string;
  cover_url?: string;
  logo_url?: string;
  lat?: number;
  lng?: number;
  opening_hours?: Record<string, { open: string; close: string; enabled: boolean }>;
}

interface Post {
  id: string;
  image_url?: string;
  media_url?: string;
  caption?: string;
}

async function uploadImage(bucket: string, localUri: string): Promise<string | null> {
  try {
    console.log('[Settings] Uploading to bucket:', bucket, 'uri:', localUri.slice(0, 80));
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

    if (Platform.OS === 'web') {
      // Web: fetch the blob URI directly
      const response = await fetch(localUri);
      if (!response.ok) throw new Error('fetch failed: ' + response.status);
      const blob = await response.blob();
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) { console.log('[Settings] Web upload error:', error.message); return null; }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      console.log('[Settings] Web upload success:', urlData.publicUrl);
      return urlData.publicUrl;
    } else {
      // Native: use FileSystem base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, bytes.buffer, { contentType: 'image/jpeg', upsert: true });
      if (error) {
        // Fallback: try fetch blob on native too
        console.log('[Settings] Native binary error:', error.message, '— trying fetch fallback');
        const response = await fetch(localUri);
        const blob = await response.blob();
        const fallbackName = fileName + '_fb';
        const { data: d2, error: e2 } = await supabase.storage
          .from(bucket)
          .upload(fallbackName, blob, { contentType: 'image/jpeg', upsert: true });
        if (e2) { console.log('[Settings] Native fallback error:', e2.message); return null; }
        const { data: u2 } = supabase.storage.from(bucket).getPublicUrl(d2.path);
        return u2.publicUrl;
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      console.log('[Settings] Native upload success:', urlData.publicUrl);
      return urlData.publicUrl;
    }
  } catch (err) {
    console.log('[Settings] uploadImage exception:', String(err));
    return null;
  }
}

export default function PartnerSettings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [openingHours, setOpeningHours] = useState<Record<string, { open: string; close: string; enabled: boolean }>>({});
  const [newPostCaption, setNewPostCaption] = useState('');

  // Multi-shop state
  const [myShops, setMyShops] = useState<ShopData[]>([]);
  const [showShopPicker, setShowShopPicker] = useState(false);

  // Image preview state
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewBucket, setPreviewBucket] = useState<string>('shop-covers');
  const [previewOnConfirm, setPreviewOnConfirm] = useState<((url: string) => void) | null>(null);

  const fetchData = useCallback(async () => {
    if (!shopId) return;
    console.log('[Settings] Fetching shop data:', shopId);
    try {
      const [shopRes, postsRes] = await Promise.all([
        supabase.from('barbershops').select('*').eq('id', shopId).single(),
        supabase.from('posts').select('id, image_url, media_url, caption').eq('shop_id', shopId).eq('is_active', true),
      ]);
      const shopData = shopRes.data as ShopData;
      setShop(shopData);
      setPosts((postsRes.data as Post[]) ?? []);

      // Fetch all shops owned by this partner
      const { data: allShops } = await supabase
        .from('barbershops')
        .select('id, name_en, logo_url, cover_url')
        .eq('owner_profile_id', profile?.shop_id ?? '');
      if (allShops) setMyShops(allShops as ShopData[]);

      // Build opening hours
      const defaultHours: Record<string, { open: string; close: string; enabled: boolean }> = {};
      for (let i = 0; i < 7; i++) {
        defaultHours[i] = shopData?.opening_hours?.[i] ?? { open: '09:00', close: '21:00', enabled: i >= 1 && i <= 6 };
      }
      setOpeningHours(defaultHours);
    } catch (err) {
      console.log('[Settings] fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }, [shopId, profile?.shop_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pickImage = async (bucket: string, onSuccess: (url: string) => void) => {
    console.log('[Settings] Pick image for bucket:', bucket);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access');
        return;
      }
      const aspectRatio: [number, number] = bucket === 'shop-covers' ? [16, 9] : [1, 1];
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: true,
        aspect: aspectRatio,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('[Settings] Image picked, showing preview');
        setPreviewUri(result.assets[0].uri);
        setPreviewBucket(bucket);
        setPreviewOnConfirm(() => onSuccess);
      }
    } catch (err) {
      console.log('[Settings] pickImage error:', err);
    }
  };

  const detectLocation = async () => {
    console.log('[Settings] Detect location pressed');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission required', 'Please allow location access.'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geocode[0]) {
        const addr = [geocode[0].street, geocode[0].city, geocode[0].country].filter(Boolean).join(', ');
        setShop(s => s ? { ...s, address: addr, lat: loc.coords.latitude, lng: loc.coords.longitude } : s);
      }
    } catch (err) {
      console.log('[Settings] detectLocation error:', err);
    }
  };

  const saveShop = async () => {
    if (!shopId || !shop) return;
    console.log('[Settings] Save shop pressed');
    setSaving(true);
    try {
      await supabase.from('barbershops').update({
        name: shop.name,
        description: shop.description,
        phone: shop.phone,
        address: shop.address,
        instagram: shop.instagram,
        tiktok: shop.tiktok,
        cover_url: shop.cover_url,
        logo_url: shop.logo_url,
        lat: shop.lat,
        lng: shop.lng,
        opening_hours: openingHours,
      }).eq('id', shopId);
      console.log('[Settings] Shop saved');
    } catch (err) {
      console.log('[Settings] saveShop error:', err);
    } finally {
      setSaving(false);
    }
  };

  const addPost = async () => {
    if (!shopId) return;
    console.log('[Settings] Add post pressed');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission required', 'Please allow photo access.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;
      const url = await uploadImage('posts', result.assets[0].uri);
      if (!url) return;
      await supabase.from('posts').insert({
        shop_id: shopId,
        image_url: url,
        media_url: url,
        caption: newPostCaption,
        is_active: true,
        status: 'published',
        created_by: profile?.shop_id,
      });
      setNewPostCaption('');
      await fetchData();
    } catch (err) {
      console.log('[Settings] addPost error:', err);
    }
  };

  const deletePost = async (postId: string) => {
    console.log('[Settings] Delete post:', postId);
    try {
      await supabase.from('posts').update({ is_active: false }).eq('id', postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.log('[Settings] deletePost error:', err);
    }
  };

  const shopDisplayName = shop?.name_en ?? shop?.name ?? 'My Shop';

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={P.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* Shop switcher — only shown when partner has multiple shops */}
        {myShops.length > 1 && (
          <TouchableOpacity
            style={styles.shopSwitcherRow}
            onPress={() => {
              console.log('[Settings] Shop switcher pressed');
              setShowShopPicker(true);
            }}
          >
            <Building2 size={18} color={P.accent} />
            <Text style={styles.shopSwitcherLabel}>{shopDisplayName}</Text>
            <ChevronDown size={16} color={P.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Shop profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop Profile</Text>

          {/* Cover photo */}
          <TouchableOpacity
            style={styles.coverWrap}
            onPress={() => pickImage('shop-covers', (url) => setShop(s => s ? { ...s, cover_url: url } : s))}
          >
            {shop?.cover_url ? (
              <Image source={resolveImageSource(shop.cover_url)} style={styles.coverImg} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Camera size={24} color={P.textTertiary} />
                <Text style={styles.coverPlaceholderText}>Add Cover Photo</Text>
              </View>
            )}
            <View style={styles.coverEditBadge}>
              <Camera size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Logo */}
          <TouchableOpacity
            style={styles.logoWrap}
            onPress={() => pickImage('shop-logos', (url) => setShop(s => s ? { ...s, logo_url: url } : s))}
          >
            {shop?.logo_url ? (
              <Image source={resolveImageSource(shop.logo_url)} style={styles.logoImg} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <ImageIcon size={20} color={P.textTertiary} />
              </View>
            )}
            <View style={styles.logoEditBadge}>
              <Camera size={10} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Shop Name</Text>
          <TextInput style={styles.input} value={shop?.name ?? ''} onChangeText={v => setShop(s => s ? { ...s, name: v } : s)} placeholder="Shop name" placeholderTextColor={P.textTertiary} />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} value={shop?.description ?? ''} onChangeText={v => setShop(s => s ? { ...s, description: v } : s)} placeholder="Describe your shop..." placeholderTextColor={P.textTertiary} multiline />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput style={styles.input} value={shop?.phone ?? ''} onChangeText={v => setShop(s => s ? { ...s, phone: v } : s)} placeholder="+973 XXXX XXXX" placeholderTextColor={P.textTertiary} keyboardType="phone-pad" />

          <Text style={styles.fieldLabel}>Instagram</Text>
          <TextInput style={styles.input} value={shop?.instagram ?? ''} onChangeText={v => setShop(s => s ? { ...s, instagram: v } : s)} placeholder="@username" placeholderTextColor={P.textTertiary} />

          <Text style={styles.fieldLabel}>TikTok</Text>
          <TextInput style={styles.input} value={shop?.tiktok ?? ''} onChangeText={v => setShop(s => s ? { ...s, tiktok: v } : s)} placeholder="@username" placeholderTextColor={P.textTertiary} />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.fieldLabel}>Address</Text>
          <TextInput style={styles.input} value={shop?.address ?? ''} onChangeText={v => setShop(s => s ? { ...s, address: v } : s)} placeholder="Shop address" placeholderTextColor={P.textTertiary} />
          <TouchableOpacity style={styles.locationBtn} onPress={detectLocation}>
            <MapPin size={16} color={P.accent} />
            <Text style={styles.locationBtnText}>Detect My Location</Text>
          </TouchableOpacity>
        </View>

        {/* Opening hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opening Hours</Text>
          {Array.from({ length: 7 }, (_, i) => {
            const h = openingHours[i] ?? { open: '09:00', close: '21:00', enabled: false };
            return (
              <View key={i} style={styles.hourRow}>
                <Switch
                  value={h.enabled}
                  onValueChange={v => {
                    console.log('[Settings] Toggle day', WEEKDAYS[i], v);
                    setOpeningHours(prev => ({ ...prev, [i]: { ...h, enabled: v } }));
                  }}
                  trackColor={{ false: P.border, true: P.accent }}
                  thumbColor="#fff"
                />
                <Text style={[styles.dayLabel, !h.enabled && { opacity: 0.4 }]}>{WEEKDAYS[i].slice(0, 3)}</Text>
                {h.enabled ? (
                  <View style={styles.timeInputs}>
                    <TextInput style={styles.timeInput} value={h.open} onChangeText={v => setOpeningHours(prev => ({ ...prev, [i]: { ...h, open: v } }))} placeholder="09:00" placeholderTextColor={P.textTertiary} />
                    <Text style={styles.timeSep}>–</Text>
                    <TextInput style={styles.timeInput} value={h.close} onChangeText={v => setOpeningHours(prev => ({ ...prev, [i]: { ...h, close: v } }))} placeholder="21:00" placeholderTextColor={P.textTertiary} />
                  </View>
                ) : (
                  <Text style={styles.closedText}>Closed</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Portfolio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio</Text>
          <View style={styles.postGrid}>
            {posts.map(post => {
              const imgUrl = post.image_url ?? post.media_url;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postThumb}
                  onLongPress={() => {
                    console.log('[Settings] Long press post:', post.id);
                    Alert.alert('Delete Post', 'Remove this post from your portfolio?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deletePost(post.id) },
                    ]);
                  }}
                >
                  {imgUrl ? (
                    <Image source={resolveImageSource(imgUrl)} style={styles.postImg} />
                  ) : (
                    <View style={[styles.postImg, { backgroundColor: P.surfaceElevated, alignItems: 'center', justifyContent: 'center' }]}>
                      <ImageIcon size={20} color={P.textTertiary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.addPostBtn} onPress={addPost}>
              <Plus size={24} color={P.accent} />
              <Text style={styles.addPostText}>Add Post</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={saveShop} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save All Changes</Text>}
        </TouchableOpacity>

        {/* Add new branch */}
        <TouchableOpacity
          style={styles.addBranchBtn}
          onPress={() => {
            console.log('[Settings] Add new branch pressed');
            router.push('/(partner)/setup' as never);
          }}
        >
          <Plus size={18} color={P.accent} />
          <Text style={styles.addBranchBtnText}>Add new branch / shop</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Image preview modal */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Preview Photo</Text>
            <Text style={styles.previewSub}>This is how your photo will appear</Text>
            {previewUri && (
              <View style={[styles.previewImgWrap, previewBucket === 'shop-covers' ? styles.previewCover : styles.previewSquare]}>
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: '100%', height: '100%', borderRadius: 12 }}
                  resizeMode="cover"
                />
              </View>
            )}
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.previewCancelBtn} onPress={() => {
                console.log('[Settings] Preview cancelled');
                setPreviewUri(null);
              }}>
                <Text style={styles.previewCancelText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewConfirmBtn, saving && { opacity: 0.6 }]}
                disabled={saving}
                onPress={async () => {
                  if (!previewUri || !previewOnConfirm) return;
                  console.log('[Settings] Preview confirmed, uploading to:', previewBucket);
                  setPreviewUri(null);
                  setSaving(true);
                  const url = await uploadImage(previewBucket, previewUri);
                  setSaving(false);
                  if (url) {
                    // Update local state
                    previewOnConfirm(url);
                    // Auto-save to Supabase immediately
                    if (shopId) {
                      const updateField = previewBucket === 'shop-covers' ? 'cover_url' : 'logo_url';
                      const { error } = await supabase
                        .from('barbershops')
                        .update({ [updateField]: url })
                        .eq('id', shopId);
                      if (error) {
                        console.log('[Settings] Auto-save error:', error.message);
                      } else {
                        console.log('[Settings] Auto-saved', updateField, 'to Supabase');
                      }
                    }
                  } else {
                    Alert.alert('Upload failed', 'Could not upload image. Check your connection and try again.');
                  }
                }}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.previewConfirmText}>Use Photo</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shop picker modal */}
      <Modal
        visible={showShopPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShopPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Switch Shop</Text>
            {myShops.map(s => {
              const name = s.name_en ?? s.name ?? 'Shop';
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.pickerRow}
                  onPress={() => {
                    console.log('[Settings] Shop selected:', s.id, name);
                    setShowShopPicker(false);
                  }}
                >
                  {s.logo_url ? (
                    <Image source={resolveImageSource(s.logo_url)} style={styles.pickerLogo} />
                  ) : (
                    <View style={[styles.pickerLogo, { backgroundColor: P.surfaceElevated, alignItems: 'center', justifyContent: 'center' }]}>
                      <Building2 size={16} color={P.textTertiary} />
                    </View>
                  )}
                  <Text style={styles.pickerRowText}>{name}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setShowShopPicker(false)}
            >
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  section: { marginBottom: 28 },
  sectionTitle: { color: P.text, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  shopSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  shopSwitcherLabel: { flex: 1, color: P.text, fontSize: 15, fontWeight: '600' },
  coverWrap: { height: 140, borderRadius: 14, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: P.border, borderRadius: 14 },
  coverPlaceholderText: { color: P.textTertiary, fontSize: 13 },
  coverEditBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: P.accent, borderRadius: 12, padding: 6 },
  logoWrap: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', marginBottom: 12, position: 'relative', alignSelf: 'center' },
  logoImg: { width: '100%', height: '100%' },
  logoPlaceholder: { flex: 1, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.border, borderRadius: 32 },
  logoEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: P.accent, borderRadius: 10, padding: 4 },
  fieldLabel: { color: P.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: P.surface, borderRadius: 10, padding: 12, color: P.text, borderWidth: 1, borderColor: P.border, fontSize: 14 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: P.accentLight, borderRadius: 10, padding: 12, marginTop: 10 },
  locationBtnText: { color: P.accent, fontSize: 14, fontWeight: '600' },
  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.divider },
  dayLabel: { color: P.text, fontSize: 14, fontWeight: '600', width: 36 },
  timeInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: { flex: 1, backgroundColor: P.surfaceElevated, borderRadius: 8, padding: 8, color: P.text, fontSize: 13, textAlign: 'center', borderWidth: 1, borderColor: P.border },
  timeSep: { color: P.textSecondary, fontSize: 14 },
  closedText: { color: P.textTertiary, fontSize: 13, flex: 1 },
  postGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  postThumb: { width: '47%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden' },
  postImg: { width: '100%', height: '100%' },
  addPostBtn: { width: '47%', aspectRatio: 1, borderRadius: 10, backgroundColor: P.surface, borderWidth: 1, borderColor: P.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addPostText: { color: P.accent, fontSize: 12, fontWeight: '600' },
  saveBtn: { backgroundColor: P.accent, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  addBranchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: P.accent + '44',
  },
  addBranchBtnText: { color: P.accent, fontSize: 15, fontWeight: '600' },
  // Preview modal
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  previewCard: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, borderWidth: 1, borderColor: '#2A2A45' },
  previewTitle: { color: '#F0F0FF', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  previewSub: { color: '#9090B0', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  previewImgWrap: { width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  previewCover: { height: 200 },
  previewSquare: { height: 300 },
  previewActions: { flexDirection: 'row', gap: 12 },
  previewCancelBtn: { flex: 1, backgroundColor: '#242438', borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A45' },
  previewCancelText: { color: '#F0F0FF', fontSize: 15, fontWeight: '600' },
  previewConfirmBtn: { flex: 1, backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  previewConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Shop picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: P.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 4,
  },
  pickerTitle: { color: P.text, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: P.divider,
  },
  pickerLogo: { width: 40, height: 40, borderRadius: 20 },
  pickerRowText: { color: P.text, fontSize: 15, fontWeight: '500', flex: 1 },
  pickerCancelBtn: {
    marginTop: 12,
    backgroundColor: P.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pickerCancelText: { color: P.textSecondary, fontSize: 15, fontWeight: '600' },
});
