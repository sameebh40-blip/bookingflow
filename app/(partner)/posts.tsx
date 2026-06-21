import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Image, FlatList,
  Dimensions, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, X, Eye, Heart, ChevronLeft, Film, ImageIcon, Play } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

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
};

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_COL = 3;
const CELL = Math.floor(SCREEN_W / GRID_COL);

interface Post {
  id: string;
  caption: string | null;
  media_url: string;
  thumbnail_url: string | null;
  media_type: 'image' | 'video';
  likes_count: number;
  views_count: number;
  created_at: string;
}

interface PickedMedia {
  uri: string;
  type: 'image' | 'video';
  mimeType?: string;
  duration?: number;
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
  const [picked, setPicked] = useState<PickedMedia | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const pickMedia = async (type: 'image' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo & video library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: type === 'image' ? 0.9 : 0.8,
      allowsEditing: type === 'image',
      aspect: type === 'image' ? [4, 5] : undefined,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPicked({
        uri: asset.uri,
        type,
        mimeType: asset.mimeType ?? (type === 'video' ? 'video/mp4' : 'image/jpeg'),
        duration: asset.duration ?? undefined,
      });
    }
  };

  const resetUpload = () => {
    setShowUpload(false);
    setCaption('');
    setPicked(null);
    setUploadProgress(0);
  };

  const handlePost = async () => {
    if (!picked || !shopId || !user) {
      Alert.alert('Missing content', 'Please select a photo or video first.');
      return;
    }
    setSaving(true);
    setUploadProgress(10);
    try {
      const ext = (picked.uri.split('.').pop() ?? (picked.type === 'video' ? 'mp4' : 'jpg')).toLowerCase().split('?')[0];
      const folder = picked.type === 'video' ? 'reels' : 'posts';
      const fileName = `${folder}/${shopId}/${Date.now()}.${ext}`;
      const mimeType = picked.mimeType ?? (picked.type === 'video' ? 'video/mp4' : 'image/jpeg');

      setUploadProgress(30);
      const response = await fetch(picked.uri);
      const blob = await response.blob();
      setUploadProgress(55);

      const { error: uploadErr } = await supabase.storage
        .from('shop-covers')
        .upload(fileName, blob, { contentType: mimeType, upsert: false });
      if (uploadErr) throw new Error(uploadErr.message);

      setUploadProgress(80);
      const { data: urlData } = supabase.storage.from('shop-covers').getPublicUrl(fileName);

      const { error: insertErr } = await supabase.from('posts').insert({
        shop_id: shopId,
        caption: caption.trim() || null,
        media_url: urlData.publicUrl,
        thumbnail_url: urlData.publicUrl,
        media_type: picked.type,
        is_active: true,
      });
      if (insertErr) throw new Error(insertErr.message);

      setUploadProgress(100);
      setTimeout(() => {
        resetUpload();
        fetchPosts();
        Alert.alert('Posted!', `Your ${picked.type === 'video' ? 'reel' : 'photo'} is now live on the Discover feed.`);
      }, 400);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalViews = posts.reduce((a, p) => a + p.views_count, 0);
  const totalLikes = posts.reduce((a, p) => a + p.likes_count, 0);

  const renderCell = ({ item }: { item: Post }) => (
    <TouchableOpacity style={styles.cell} onPress={() => setPreviewPost(item)} activeOpacity={0.85}>
      <Image source={{ uri: item.thumbnail_url ?? item.media_url }} style={styles.cellImage} resizeMode="cover" />
      {item.media_type === 'video' && (
        <View style={styles.playBadge}>
          <Play size={10} color="#fff" fill="#fff" />
        </View>
      )}
      <View style={styles.cellOverlay}>
        <Eye size={9} color="rgba(255,255,255,0.85)" />
        <Text style={styles.cellStat}>{item.views_count}</Text>
        <Heart size={9} color="rgba(255,255,255,0.85)" style={{ marginLeft: 5 }} />
        <Text style={styles.cellStat}>{item.likes_count}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!shopId) return (
    <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
      <Film size={48} color={P.textTertiary} />
      <Text style={styles.noShopText}>Complete shop setup first</Text>
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
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowUpload(true)}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{posts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: P.border }]}>
          <Text style={styles.statNum}>{totalViews.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Views</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalLikes.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Likes</Text>
        </View>
      </View>

      {/* Grid */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={P.accent} size="large" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Film size={56} color={P.textTertiary} />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySub}>Upload photos & reels — they appear instantly on the customer Discover feed</Text>
          <TouchableOpacity style={styles.emptyUploadBtn} onPress={() => setShowUpload(true)}>
            <Plus size={16} color="#fff" />
            <Text style={styles.emptyUploadText}>Upload your first post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderCell}
          keyExtractor={p => p.id}
          numColumns={GRID_COL}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Upload Modal ── */}
      <Modal visible={showUpload} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetUpload}>
        <View style={[styles.modal, { paddingTop: Platform.OS === 'ios' ? 8 : insets.top + 8 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetUpload} style={styles.modalClose}>
              <X size={22} color={P.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Post</Text>
            <TouchableOpacity
              style={[styles.shareBtn, (!picked || saving) && { opacity: 0.35 }]}
              onPress={handlePost}
              disabled={!picked || saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.shareBtnText}>Share</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} showsVerticalScrollIndicator={false}>
            {picked ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: picked.uri }} style={styles.previewImg} resizeMode="cover" />
                {picked.type === 'video' && (
                  <View style={styles.videoBadgeOverlay}>
                    <Play size={36} color="#fff" fill="#fff" />
                    {picked.duration ? (
                      <Text style={styles.videoDuration}>{Math.round((picked.duration ?? 0) / 1000)}s reel</Text>
                    ) : null}
                  </View>
                )}
                <TouchableOpacity style={styles.changePick} onPress={() => setPicked(null)}>
                  <X size={14} color="#fff" />
                  <Text style={styles.changePickText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickersRow}>
                <TouchableOpacity style={styles.pickerCard} onPress={() => pickMedia('image')}>
                  <View style={styles.pickerIcon}>
                    <ImageIcon size={30} color={P.accent} />
                  </View>
                  <Text style={styles.pickerTitle}>Photo</Text>
                  <Text style={styles.pickerSub}>{'JPG / PNG\n4:5 ratio'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pickerCard, { borderColor: P.gold }]} onPress={() => pickMedia('video')}>
                  <View style={[styles.pickerIcon, { backgroundColor: 'rgba(201,168,76,0.12)' }]}>
                    <Film size={30} color={P.gold} />
                  </View>
                  <Text style={[styles.pickerTitle, { color: P.gold }]}>Reel</Text>
                  <Text style={styles.pickerSub}>{'MP4 / MOV\nUp to 60s'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.captionWrap}>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption... #haircut #fade"
                placeholderTextColor={P.textTertiary}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={300}
              />
              <Text style={styles.captionCount}>{caption.length}/300</Text>
            </View>

            {saving && (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${uploadProgress}%` as any }]} />
                </View>
                <Text style={styles.progressText}>Uploading… {uploadProgress}%</Text>
              </View>
            )}

            <View style={styles.tipCard}>
              <Text style={styles.tipEmoji}>💡</Text>
              <Text style={styles.tipText}>Posts go live instantly on the customer Discover feed. Show off your best work!</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Preview Modal ── */}
      <Modal visible={!!previewPost} animationType="fade" onRequestClose={() => setPreviewPost(null)}>
        <View style={[styles.previewModal, { paddingTop: insets.top }]}>
          <View style={styles.previewModalHeader}>
            <TouchableOpacity onPress={() => setPreviewPost(null)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.previewModalTitle}>{previewPost?.media_type === 'video' ? 'Reel' : 'Photo'}</Text>
            <View style={{ width: 24 }} />
          </View>
          {previewPost && (
            <>
              <Image
                source={{ uri: previewPost.thumbnail_url ?? previewPost.media_url }}
                style={styles.previewFull}
                resizeMode="contain"
              />
              {previewPost.media_type === 'video' && (
                <View style={styles.previewPlayOverlay}>
                  <View style={styles.previewPlayCircle}>
                    <Play size={32} color="#fff" fill="#fff" />
                  </View>
                </View>
              )}
              <View style={styles.previewInfo}>
                {previewPost.caption ? <Text style={styles.previewCaption}>{previewPost.caption}</Text> : null}
                <View style={styles.previewStats}>
                  <Eye size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.previewStatText}>{previewPost.views_count.toLocaleString()} views</Text>
                  <Heart size={14} color="rgba(255,255,255,0.6)" style={{ marginLeft: 16 }} />
                  <Text style={styles.previewStatText}>{previewPost.likes_count.toLocaleString()} likes</Text>
                </View>
                <Text style={styles.previewDate}>
                  {new Date(previewPost.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
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
  noShopText: { color: P.textSecondary, fontSize: 15, marginTop: 12 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: P.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: P.text, fontSize: 17, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  statsRow: { flexDirection: 'row', backgroundColor: P.surface, borderBottomWidth: 1, borderBottomColor: P.border },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { color: P.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: P.textSecondary, fontSize: 11, marginTop: 2 },

  cell: { width: CELL, height: CELL, position: 'relative' },
  cellImage: { width: '100%', height: '100%' },
  playBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 4 },
  cellOverlay: { position: 'absolute', bottom: 4, left: 5, flexDirection: 'row', alignItems: 'center' },
  cellStat: { color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: '600', marginLeft: 2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 36 },
  emptyTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  emptySub: { color: P.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  emptyUploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: P.accent, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 26, marginTop: 8 },
  emptyUploadText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modal: { flex: 1, backgroundColor: P.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: P.border },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: P.text, fontSize: 17, fontWeight: '700' },
  shareBtn: { backgroundColor: P.accent, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  pickersRow: { flexDirection: 'row', gap: 14 },
  pickerCard: { flex: 1, backgroundColor: P.surface, borderRadius: 18, borderWidth: 1.5, borderColor: P.border, padding: 20, alignItems: 'center', gap: 10 },
  pickerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { color: P.text, fontSize: 16, fontWeight: '700' },
  pickerSub: { color: P.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 17 },

  previewWrap: { width: '100%', aspectRatio: 4 / 5, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' },
  previewImg: { width: '100%', height: '100%' },
  videoBadgeOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', gap: 8 },
  videoDuration: { color: '#fff', fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  changePick: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  changePickText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  captionWrap: { backgroundColor: P.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: P.border },
  captionInput: { color: P.text, fontSize: 15, minHeight: 80, lineHeight: 22 },
  captionCount: { color: P.textTertiary, fontSize: 11, textAlign: 'right', marginTop: 4 },

  progressWrap: { gap: 8 },
  progressTrack: { height: 5, backgroundColor: P.surface, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: P.accent, borderRadius: 3 },
  progressText: { color: P.textSecondary, fontSize: 12, textAlign: 'center' },

  tipCard: { flexDirection: 'row', backgroundColor: P.accentLight, borderRadius: 14, padding: 14, gap: 10, alignItems: 'flex-start' },
  tipEmoji: { fontSize: 18 },
  tipText: { flex: 1, color: P.text, fontSize: 13, lineHeight: 19 },

  previewModal: { flex: 1, backgroundColor: '#000' },
  previewModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  previewModalTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  previewFull: { flex: 1, width: '100%' },
  previewPlayOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', top: 56 },
  previewPlayCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  previewInfo: { padding: 20, gap: 6, backgroundColor: 'rgba(0,0,0,0.8)' },
  previewCaption: { color: '#fff', fontSize: 15, lineHeight: 22 },
  previewStats: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  previewStatText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginLeft: 6 },
  previewDate: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
});
