import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, X, MapPin, Plus, Minus } from 'lucide-react-native';
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

function MapPlaceholder({ height }: { height: number }) {
  return (
    <View style={[styles.mapPlaceholder, { height }]}>
      <View style={styles.mapGrid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={`h${i}`} style={[styles.mapGridLineH, { top: `${25 * (i + 1)}%` as unknown as number }]} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <View key={`v${i}`} style={[styles.mapGridLineV, { left: `${25 * (i + 1)}%` as unknown as number }]} />
        ))}
      </View>
      <View style={styles.mapPinContainer}>
        <MapPin size={32} color={P.accent} fill={P.accent} />
      </View>
      <View style={styles.mapGoogleLabel}>
        <Text style={styles.mapGoogleText}>Google</Text>
      </View>
      <View style={styles.mapZoomBtns}>
        <TouchableOpacity style={styles.mapZoomBtn} activeOpacity={0.7}>
          <Plus size={14} color="#333" />
        </TouchableOpacity>
        <View style={styles.mapZoomDivider} />
        <TouchableOpacity style={styles.mapZoomBtn} activeOpacity={0.7}>
          <Minus size={14} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ObLocation() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const searchInputRef = useRef<TextInput>(null);

  const [address, setAddress] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.shop_id) return;
    console.log('[ObLocation] Fetching location for shop_id:', profile.shop_id);
    supabase
      .from('barbershops')
      .select('address')
      .eq('id', profile.shop_id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.log('[ObLocation] Error fetching address:', error.message);
          return;
        }
        if (data?.address) {
          console.log('[ObLocation] Address loaded:', data.address);
          setAddress(data.address);
        }
      });
  }, [profile?.shop_id]);

  const openModal = () => {
    console.log('[ObLocation] Open location edit modal');
    setEditAddress(address);
    setModalVisible(true);
  };

  const saveLocation = async () => {
    if (!profile?.shop_id) return;
    console.log('[ObLocation] Save location pressed — address:', editAddress);
    setSaving(true);
    const { error } = await supabase
      .from('barbershops')
      .update({ address: editAddress })
      .eq('id', profile.shop_id);
    setSaving(false);
    if (error) {
      console.log('[ObLocation] Error saving address:', error.message);
    } else {
      console.log('[ObLocation] Address saved successfully');
      setAddress(editAddress);
      setModalVisible(false);
    }
  };

  const addressParts = address.split(', ');
  const line1 = addressParts[0] ?? '';
  const line2 = addressParts.slice(1).join(', ');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            console.log('[ObLocation] Back pressed');
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
        <Text style={styles.pageTitle}>Business location</Text>
        {address ? (
          <Text style={styles.addressSubtitle}>{address}</Text>
        ) : null}

        <MapPlaceholder height={180} />

        {address ? (
          <View style={styles.addressCard}>
            <View style={styles.addressCardContent}>
              <MapPin size={16} color={P.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLine1}>{line1}</Text>
                {line2 ? <Text style={styles.addressLine2}>{line2}</Text> : null}
              </View>
            </View>
          </View>
        ) : null}
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
                  console.log('[ObLocation] Close location modal');
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
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>Where is your business located</Text>
              <Text style={styles.modalSubtitle}>
                Where can clients find you? Make sure you adjust the pin to the correct location
              </Text>

              <View style={styles.modalFieldBlock}>
                <Text style={styles.modalLabel}>Location address</Text>
                <View style={styles.searchInputRow}>
                  <MapPin size={16} color={P.textSecondary} />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    value={editAddress}
                    onChangeText={(v) => {
                      console.log('[ObLocation] Address input changed');
                      setEditAddress(v);
                    }}
                    placeholder="Search address"
                    placeholderTextColor={P.textTertiary}
                  />
                </View>
              </View>

              <MapPlaceholder height={220} />

              <View style={styles.addressEditRow}>
                <View style={{ flex: 1 }}>
                  {editAddress.split(', ').map((part, i) => (
                    <Text key={i} style={styles.modalAddressLine}>{part}</Text>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    console.log('[ObLocation] Edit address link pressed');
                    searchInputRef.current?.focus();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.dragHelper}>Drag the map to adjust the pin position</Text>
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveLocation}
                disabled={saving}
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
  addressSubtitle: {
    color: P.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  mapPlaceholder: {
    backgroundColor: '#1A2E1A',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  mapGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  mapGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  mapPinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGoogleLabel: {
    position: 'absolute',
    bottom: 8,
    left: 10,
  },
  mapGoogleText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  mapZoomBtns: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  mapZoomBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapZoomDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  addressCard: {
    backgroundColor: P.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    padding: 14,
  },
  addressCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  addressLine1: {
    color: P.text,
    fontSize: 14,
    fontWeight: '600',
  },
  addressLine2: {
    color: P.textSecondary,
    fontSize: 13,
    marginTop: 2,
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
  modalFieldBlock: {
    gap: 6,
  },
  modalLabel: {
    color: P.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: P.text,
    fontSize: 15,
  },
  addressEditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalAddressLine: {
    color: P.text,
    fontSize: 14,
    lineHeight: 20,
  },
  editLink: {
    color: P.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  dragHelper: {
    color: P.textTertiary,
    fontSize: 12,
    textAlign: 'center',
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
