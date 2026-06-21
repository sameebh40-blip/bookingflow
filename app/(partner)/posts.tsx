import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const P = {
  bg: '#0F0F1A',
  surface: '#1A1A2E',
  border: '#2A2A45',
  accent: '#7C3AED',
  text: '#F0F0FF',
  textSecondary: '#9090B0',
  textTertiary: '#5A5A7A',
  gold: '#C9A84C',
};

export default function PartnerPosts() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, user } = useAuth();
  const shopId = profile?.shop_id;

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPosts = async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handlePost = async () => {
    if (!imageUri || !shopId || !user) return;
    setSaving(true);
    try {
      const ext = imageUri.split('.').pop() ?? 'jpg';
      const fileName = `${shopId}/${Date.now()}.${ext}`;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('shop-covers')
        .upload(fileName, blob, { contentType: `image/${ext}` });
      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('shop-covers').getPublicUrl(fileName);
      const { error } = await supabase.from('posts').insert({
        shop_id: shopId,
        caption,
        media_url: urlData.publicUrl,
        media_type: 'image',
        is_active: true,
      });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setShowForm(false);
        setCaption('');
        setImageUri(null);
        fetchPosts();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Posts & Reels</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ New Post</Text>
        </TouchableOpacity>
      </View>

      {!shopId && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: P.textSecondary, textAlign: 'center', fontSize: 15 }}>
            Your shop isn't set up yet. Complete onboarding to start posting.
          </Text>
        </View>
      )}

      {shopId && showForm && (
        <View style={styles.form}>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.preview} />
            ) : (
              <Text style={styles.imagePickerText}>📷  Tap to select photo</Text>
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Caption..."
            placeholderTextColor={P.textTertiary}
            value={caption}
            onChangeText={setCaption}
            multiline
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.btn, { flex: 1, backgroundColor: P.surface }]}
              onPress={() => { setShowForm(false); setImageUri(null); setCaption(''); }}
            >
              <Text style={[styles.btnText, { color: P.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { flex: 1, backgroundColor: P.accent, opacity: (!imageUri || saving) ? 0.5 : 1 }]}
              onPress={handlePost}
              disabled={!imageUri || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {shopId && loading ? (
        <ActivityIndicator color={P.accent} style={{ marginTop: 40 }} />
      ) : shopId ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
          {posts.length === 0 && (
            <Text style={{ color: P.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 14 }}>
              No posts yet. Share your work with the discover feed!
            </Text>
          )}
          {posts.map((p) => (
            <View key={p.id} style={styles.postCard}>
              <Image source={{ uri: p.media_url }} style={styles.postImage} resizeMode="cover" />
              {p.caption ? <Text style={styles.postCaption}>{p.caption}</Text> : null}
              <Text style={styles.postMeta}>👁 {p.views_count ?? 0}  ❤️ {p.likes_count ?? 0}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: P.border,
  },
  title: { color: P.text, fontSize: 20, fontWeight: '700' },
  addBtn: { backgroundColor: P.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  form: {
    margin: 16,
    backgroundColor: P.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: P.border,
  },
  imagePicker: {
    height: 160,
    backgroundColor: '#0F0F1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePickerText: { color: P.textTertiary, fontSize: 15 },
  preview: { width: '100%', height: '100%' },
  input: {
    backgroundColor: '#0F0F1A',
    borderRadius: 10,
    padding: 12,
    color: P.text,
    fontSize: 14,
    minHeight: 60,
    borderWidth: 1,
    borderColor: P.border,
  },
  btn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  postCard: {
    backgroundColor: P.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P.border,
  },
  postImage: { width: '100%', height: 200 },
  postCaption: { color: P.text, fontSize: 14, padding: 12, paddingBottom: 4 },
  postMeta: { color: P.textTertiary, fontSize: 12, padding: 12, paddingTop: 4 },
});
