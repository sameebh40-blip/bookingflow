import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Image, FlatList,
  Dimensions, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Video as VideoIcon, Plus, X, Play, Eye, Heart, ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const P = {
  bg: '#0F0F1A', surface: '#1A1A2E', surfaceElevated: '#242438',
  border: '#2A2A45', accent: '#7C3AED', accentLight: 'rgba(124,58,237,0.15)',
  gold: '#C9A84C', text: '#F0F0FF', textSecondary: '#9090B0',
  textTertiary: '#5A5A7A', success: '#4CAF7D', danger: '#E85454',
};

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_COL = 3;
const CELL_SIZE = Math.floor(SCREEN_W / GRID_COL);

interface Post {
  id: string;
  caption: string | null;
  media_url: string;
  thumbnail_url: string | null;
  media_type: string;
  likes_count: number;
  views_count: number;
  created_at: string;
}

export default function PartnerPosts() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, user } = useAuth();
  const shopId = profile?.shop_id;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!shopId) { setLoading(false); return; }
    const { data } = await supabase
      .from('posts')
      .select('id, caption, media_url, thumbnail_url, media_type, likes_count, views_count, created_at')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setPosts((data ?? []) as Post[]);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 5],
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const handlePost = async () => {
    if (!imageUri || !shopId || !user) { Alert.alert('Missing info', 'Please select a photo.'); return; }
    setSaving(true);
    try {
      const ext = (imageUri.split('.').pop() ?? 'jpg').toLowerCase().split('?')[0];
      const fileName = `posts/${shopId}/${Date.now()}.${ext}`;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const { error: uploadErr } = await supabase.storage
        .from('shop-covers')
        .upload(fileName, blob, { contentType: `image/${ext}`, upsert: false });
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: urlData } = supabase.storage.from('shop-covers').getPublicUrl(fileName);
      const { error: insertErr } = await supabase.from('posts').insert({
        shop_id: shopId,
        caption: caption.trim() || null,
        media_url: urlData.publicUrl,
        thumbnail_url: urlData.publicUrl,
        media_type: 'image',
        is_active: true,
      });
      if (insertErr) throw new Error(insertErr.message);
      setShowUpload(false);
      setCaption('');
      setImageUri(null);
      fetchPosts();
      Alert.alert('Posted!', 'Your photo is now live on the discover feed.');
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderGrid = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.gridCell}
      onPress={() => setPreviewPost(item)}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.thumbnail_url ?? item.media_url }} style={styles.gridImage} resizeMode="cover" />
      <View style={styles.gridOverlay}>
        <Eye size={10} color="rgba(255,255,255,0.8)" />
        <Text style={styles.gridStat}>{item.views_count}</Text>
        <Heart size={10} color="rgba(255,255,255,0.8)" style={{ marginLeft: 6 }} />
        <Text style={styles.gridStat}>{item.likes_count}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!shopId) return (
    <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: P.textSecondary, fontSize: 15 }}>Complete shop setup first</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={P.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reels & Posts</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => setShowUpload(true)}>
          <Plus size={18} color="#fff" />
          <Text style={styles.uploadBtnText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{posts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{posts.reduce((a, p) => a + p.views_count, 0)}</Text>
          <Text style={styles.statLabel}>Views</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{posts.reduce((a, p) => a + p.likes_count, 0)}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
      </View>

      {/* Grid */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={P.accent} size="large" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyState}>
          <VideoIcon size={52} color={P.textTertiary} />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySub}>Share your work — it appears on the customer discover feed</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowUpload(true)}>
            <Plus size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Upload your first post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderGrid}
          keyExtractor={p => p.id}
          numColumns={GRID_COL}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      {/* Upload Modal */}
      <Modal visible={showUpload} animationType="slide" onRequestClose={() => setShowUpload(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowUpload(false); setImageUri(null); setCaption(''); }}>
              <X size={24} color={P.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Post</Text>
            <TouchableOpacity
              onPress={handlePost}
              disabled={!imageUri || saving}
              style={[styles.shareBtn, (!imageUri || saving) && { opacity: 0.4 }]}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.shareBtnText}>Share</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            {/* Image picker */}
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Plus size={40} color={P.textTertiary} />
                  <Text style={styles.imagePickerText}>Tap to select photo</Text>
                  <Text style={styles.imagePickerSub}>Appears on customer discover feed</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Caption */}
            <View style={styles.captionBox}>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                placeholderTextColor={P.textTertiary}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={300}
              />
              <Text style={styles.captionCount}>{caption.length}/300</Text>
            </View>

            <View style={styles.tipBox}>
              <Text style={styles.tipText}>Posts appear instantly on the customer Discover feed. Show off your best work!</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={!!previewPost} animationType="fade" onRequestClose={() => setPreviewPost(null)}>
        <View style={[styles.previewContainer, { paddingTop: insets.top }]}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreviewPost(null)}>
              <X size={24} color={P.text} />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={{ width: 24 }} />
          </View>
          {previewPost && (
            <>
              <Image
                source={{ uri: previewPost.thumbnail_url ?? previewPost.media_url }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <View style={styles.previewMeta}>
                {previewPost.caption ? <Text style={styles.previewCaption}>{previewPost.caption}</Text> : null}
                <View style={styles.previewStats}>
                  <Eye size={14} color={P.textSecondary} />
                  <Text style={styles.previewStatText}>{previewPost.views_count} views</Text>
                  <Heart size={14} color={P.textSecondary} style={{ marginLeft: 16 }} />
                  <Text style={styles.previewStatText}>{previewPost.likes_count} likes</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: P.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: P.text, fontSize: 17, fontWeight: '700' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  uploadBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  statsBar: { flexDirection: 'row', backgroundColor: P.surface, borderBottomWidth: 1, borderBottomColor: P.border },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: P.border },
  statNum: { color: P.text, fontSize: 20, fontWeight: '700' },
  statLabel: { color: P.textSecondary, fontSize: 11, marginTop: 2 },
  gridCell: { width: CELL_SIZE, height: CELL_SIZE, position: 'relative' },
  gridImage: { width: '100%', height: '100%' },
  gridOverlay: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center' },
  gridStat: { color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: '600', marginLeft: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  emptySub: { color: P.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: P.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: P.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: P.border },
  modalTitle: { color: P.text, fontSize: 17, fontWeight: '700' },
  shareBtn: { backgroundColor: P.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  imagePicker: { width: '100%', aspectRatio: 4/5, borderRadius: 16, overflow: 'hidden', backgroundColor: P.surface, borderWidth: 1, borderColor: P.border },
  imagePickerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imagePickerText: { color: P.textSecondary, fontSize: 16, fontWeight: '600' },
  imagePickerSub: { color: P.textTertiary, fontSize: 12 },
  imagePreview: { width: '100%', height: '100%' },
  captionBox: { backgroundColor: P.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: P.border },
  captionInput: { color: P.text, fontSize: 15, minHeight: 80 },
  captionCount: { color: P.textTertiary, fontSize: 11, textAlign: 'right', marginTop: 4 },
  tipBox: { backgroundColor: P.accentLight, borderRadius: 10, padding: 12 },
  tipText: { color: P.text, fontSize: 13, lineHeight: 18 },
  previewContainer: { flex: 1, backgroundColor: '#000' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  previewTitle: { color: P.text, fontSize: 17, fontWeight: '700' },
  previewImage: { flex: 1, width: '100%' },
  previewMeta: { padding: 16, gap: 8 },
  previewCaption: { color: P.text, fontSize: 15, lineHeight: 22 },
  previewStats: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  previewStatText: { color: P.textSecondary, fontSize: 13, marginLeft: 6 },
});
