import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, X, Plus, Image as ImageIcon, ChevronRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const P = {
  bg: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#242438',
  border: '#2A2A45',
  accent: '#7C3AED',
  accentLight: 'rgba(124,58,237,0.15)',
  text: '#F0F0FF',
  textSecondary: '#9090B0',
  textTertiary: '#5A5A7A',
  success: '#4CAF7D',
  danger: '#E85454',
  divider: '#1E1E35',
};

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const PREVIEW_TABS = ['Profile', 'Portfolio', 'Reviews', 'Workspaces'];

function VenuePreviewCard({ images }: { images: string[] }) {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewTabBar}>
        {PREVIEW_TABS.map((tab, i) => (
          <View key={tab} style={styles.previewTabItem}>
            <ImageIcon size={12} color={P.textSecondary} />
            <Text style={styles.previewTabText}>{tab}</Text>
            {i < PREVIEW_TABS.length - 1 && <ChevronRight size={12} color={P.textTertiary} />}
          </View>
        ))}
      </View>

      <View style={styles.coverSlot}>
        {images[0] ? (
          <Image source={resolveImageSource(images[0])} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <ImageIcon size={24} color={P.textTertiary} />
          </View>
        )}
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>Cover image</Text>
        </View>
      </View>

      <View style={styles.thumbGrid}>
        {[0, 1].map((col) => (
          <View key={col} style={styles.thumbCol}>
            {[0, 1].map((row) => {
              const idx = col * 2 + row + 1;
              const img = images[idx];
              return (
                <View key={row} style={styles.thumbSlot}>
                  {img ? (
                    <Image source={resolveImageSource(img)} style={styles.thumbImage} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Text style={styles.thumbPlaceholderText}>Add</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ObImages() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();

  const [images, setImages] = useState<string[]>([]);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile?.shop_id) return;
    console.log('[ObImages] Fetching venue images for shop_id:', profile.shop_id);
    supabase
      .from('barbershops')
      .select('venue_images')
      .eq('id', profile.shop_id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.log('[ObImages] Error fetching images:', error.message);
          return;
        }
        if (data?.venue_images && Array.isArray(data.venue_images)) {
          console.log('[ObImages] Images loaded, count:', data.venue_images.length);
          setImages(data.venue_images as string[]);
        }
      });
  }, [profile?.shop_id]);

  const openModal = () => {
    console.log('[ObImages] Open images edit modal');
    setEditImages([...images]);
    setModalVisible(true);
  };

  const pickAndUploadImage = async () => {
    console.log('[ObImages] Pick image pressed');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.log('[ObImages] Media library permission denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (result.canceled) {
      console.log('[ObImages] Image picker cancelled');
      return;
    }
    console.log('[ObImages] Images selected, count:', result.assets.length);
    setUploading(true);
    for (const asset of result.assets) {
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        console.log('[ObImages] Uploading image:', fileName);
        const { data, error } = await supabase.storage
          .from('venue-images')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) {
          console.log('[ObImages] Upload error:', error.message);
        } else {
          const { data: urlData } = supabase.storage.from('venue-images').getPublicUrl(data.path);
          console.log('[ObImages] Image uploaded, url:', urlData.publicUrl);
          setEditImages((prev) => [...prev, urlData.publicUrl]);
        }
      } catch (err) {
        console.log('[ObImages] Unexpected upload error:', err);
      }
    }
    setUploading(false);
  };

  const removeImage = (idx: number) => {
    console.log('[ObImages] Remove image at index:', idx);
    setEditImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveImages = async () => {
    if (!profile?.shop_id) return;
    console.log('[ObImages] Save images pressed, count:', editImages.length);
    setSaving(true);
    const { error } = await supabase
      .from('barbershops')
      .update({ venue_images: editImages } as never)
      .eq('id', profile.shop_id);
    setSaving(false);
    if (error) {
      console.log('[ObImages] Error saving images (venue_images column may not exist):', error.message);
    } else {
      console.log('[ObImages] Images saved successfully');
      setImages(editImages);
      setModalVisible(false);
    }
  };

  const canSave = editImages.length >= 3;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            console.log('[ObImages] Back pressed');
            router.back();
          }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={P.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.editPill} onPress={openModal} activeOpacity={0.8}>
          <Text style={styles.editPillText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Venue images</Text>
        <Text style={styles.pageSubtitle}>
          {'Profiles with more than 5 images rank higher on marketplace searches and receive up to 50% more bookings. You can add up to 10 high quality images to your profile. '}
          <Text style={styles.learnMore}>Learn more</Text>
        </Text>

        <VenuePreviewCard images={images} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  console.log('[ObImages] Close images modal');
                  setModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <X size={20} color={P.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>Update venue images</Text>
              <Text style={styles.modalSubtitle}>
                Add at least 3 images of your location to your profile. You can upload up to 10 images. Drag and drop to change the order of the images. You can add more or make changes later.
              </Text>

              {/* Upload buttons */}
              <View style={styles.uploadBtnRow}>
                <TouchableOpacity
                  style={styles.uploadPill}
                  onPress={pickAndUploadImage}
                  disabled={uploading}
                  activeOpacity={0.8}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={P.text} />
                  ) : (
                    <Text style={styles.uploadPillText}>Add your images</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadPill}
                  onPress={pickAndUploadImage}
                  disabled={uploading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.uploadPillText}>Choose a file</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fileHelper}>
                File type .jpg, .png • minimum dimensions 916 x 500 pixels • max size 10 MB
              </Text>

              <VenuePreviewCard images={editImages} />

              <View style={styles.editThumbGrid}>
                {editImages.map((img, idx) => (
                  <View key={idx} style={styles.editThumbSlot}>
                    <Image source={resolveImageSource(img)} style={styles.editThumbImage} />
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => removeImage(idx)}
                      activeOpacity={0.8}
                    >
                      <X size={10} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {editImages.length < 10 && (
                  <TouchableOpacity
                    style={styles.addThumbSlot}
                    onPress={pickAndUploadImage}
                    disabled={uploading}
                    activeOpacity={0.8}
                  >
                    <Plus size={20} color={P.textSecondary} />
                    <Text style={styles.addThumbText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!canSave && (
                <Text style={styles.minError}>You must have at least 3 images</Text>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={[styles.saveBtn, (!canSave || saving) && { opacity: 0.4 }]}
                onPress={saveImages}
                disabled={!canSave || saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editPillText: {
    color: P.text,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 16,
  },
  pageTitle: {
    color: P.text,
    fontSize: 26,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: P.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -8,
  },
  learnMore: {
    color: P.accent,
    fontWeight: '600',
  },

  // Preview card
  previewCard: {
    backgroundColor: P.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
  },
  previewTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: P.border,
    gap: 4,
    flexWrap: 'wrap',
  },
  previewTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  previewTabText: {
    color: P.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  coverSlot: {
    height: 120,
    backgroundColor: P.bg,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.bg,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  coverBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  thumbGrid: {
    flexDirection: 'row',
    padding: 8,
    gap: 6,
  },
  thumbCol: {
    flex: 1,
    gap: 6,
  },
  thumbSlot: {
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: P.bg,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  thumbPlaceholderText: {
    color: P.textTertiary,
    fontSize: 11,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: P.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: P.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  modalTitle: {
    color: P.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  modalSubtitle: {
    color: P.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  uploadBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    backgroundColor: P.surface,
  },
  uploadPillText: {
    color: P.text,
    fontSize: 13,
    fontWeight: '600',
  },
  fileHelper: {
    color: P.textTertiary,
    fontSize: 11,
    lineHeight: 16,
  },
  editThumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editThumbSlot: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  editThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumbSlot: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: P.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addThumbText: {
    color: P.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  minError: {
    color: P.danger,
    fontSize: 12,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: P.divider,
    backgroundColor: P.bg,
  },
  saveBtn: {
    backgroundColor: P.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
