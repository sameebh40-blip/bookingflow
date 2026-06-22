import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  ImageSourcePropType,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Star, ChevronRight, X, Trash2 } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';

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

interface Barber {
  id: string;
  display_name: string;
  specialty?: string;
  avatar_url?: string;
  rating_avg?: number;
  reviews_count?: number;
  status?: string;
  is_active?: boolean;
}

function StarRating({ rating }: { rating: number }) {
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {stars.map((filled, i) => (
        <Star key={i} size={12} color={filled ? P.gold : P.textTertiary} fill={filled ? P.gold : 'transparent'} />
      ))}
    </View>
  );
}

export default function PartnerTeam() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [addName, setAddName] = useState('');
  const [addSpecialty, setAddSpecialty] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // Manage (edit / pause / delete) an existing barber
  const [managing, setManaging] = useState<Barber | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const openManage = useCallback((b: Barber) => {
    console.log('[Team] Manage barber:', b.id);
    setManaging(b);
    setEditName(b.display_name ?? '');
    setEditSpecialty(b.specialty ?? '');
    setEditActive(b.is_active !== false);
  }, []);

  const fetchBarbers = useCallback(async () => {
    if (!shopId) return;
    console.log('[Team] Fetching barbers for shop:', shopId);
    try {
      const { data } = await supabase
        .from('barbers')
        .select('id, display_name, specialty, avatar_url, rating_avg, reviews_count, status, is_active')
        .eq('shop_id', shopId);
      setBarbers((data as Barber[]) ?? []);
      console.log('[Team] Loaded', data?.length ?? 0, 'barbers');
    } catch (err) {
      console.log('[Team] fetchBarbers error:', err);
      setBarbers([]);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  const saveBarber = useCallback(async () => {
    if (!managing || !editName.trim()) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('barbers')
        .update({ display_name: editName.trim(), specialty: editSpecialty.trim() || null, is_active: editActive })
        .eq('id', managing.id);
      if (error) { Alert.alert('Error', error.message); return; }
      setManaging(null);
      fetchBarbers();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save.');
    } finally {
      setSavingEdit(false);
    }
  }, [managing, editName, editSpecialty, editActive, fetchBarbers]);

  const deleteBarber = useCallback(() => {
    if (!managing) return;
    Alert.alert('Remove barber', `Remove ${managing.display_name} from your team?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('barbers').delete().eq('id', managing.id);
        if (error) { Alert.alert('Error', error.message); return; }
        setManaging(null);
        fetchBarbers();
      }},
    ]);
  }, [managing, fetchBarbers]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Team</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { console.log('[Team] Invite barber pressed'); setShowInvite(true); }}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={P.accent} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {barbers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No team members yet</Text>
              <Text style={styles.emptySub}>Invite barbers to join your shop</Text>
            </View>
          ) : (
            barbers.map(barber => {
              const initials = barber.display_name.charAt(0).toUpperCase();
              const rating = Number(barber.rating_avg) || 0;
              const reviews = barber.reviews_count ?? 0;
              const active = barber.is_active !== false;
              const statusColor = active ? P.success : P.textTertiary;
              const statusLabel = active ? 'Active' : 'Paused';
              return (
                <AnimatedPressable
                  key={barber.id}
                  onPress={() => openManage(barber)}
                >
                  <View style={styles.barberCard}>
                    {barber.avatar_url ? (
                      <Image source={resolveImageSource(barber.avatar_url)} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>{initials}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.barberName}>{barber.display_name}</Text>
                      {barber.specialty && <Text style={styles.barberSpecialty}>{barber.specialty}</Text>}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <StarRating rating={rating} />
                        <Text style={styles.reviewCount}>({reviews})</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                      <ChevronRight size={14} color={P.textTertiary} />
                    </View>
                  </View>
                </AnimatedPressable>
              );
            })
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 80 }]} onPress={() => { console.log('[Team] FAB pressed'); setShowInvite(true); }}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Barber modal */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Barber</Text>
              <TouchableOpacity onPress={() => {
                setShowInvite(false);
                setAddName('');
                setAddSpecialty('');
              }}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.addForm}>
              <Text style={styles.addLabel}>Display name *</Text>
              <TextInput
                style={styles.addInput}
                placeholder="e.g. Ahmed Al-Rashid"
                placeholderTextColor={P.textTertiary}
                value={addName}
                onChangeText={v => { console.log('[Team] Add barber name changed'); setAddName(v); }}
              />
              <Text style={[styles.addLabel, { marginTop: 12 }]}>Specialty</Text>
              <TextInput
                style={styles.addInput}
                placeholder="e.g. Fades, Beard Styling"
                placeholderTextColor={P.textTertiary}
                value={addSpecialty}
                onChangeText={v => { console.log('[Team] Add barber specialty changed'); setAddSpecialty(v); }}
              />
              <TouchableOpacity
                style={[styles.addSaveBtn, (!addName.trim() || addSaving) && { opacity: 0.5 }]}
                disabled={!addName.trim() || addSaving}
                onPress={async () => {
                  if (!shopId || !addName.trim()) return;
                  console.log('[Team] Add barber pressed, name:', addName, 'specialty:', addSpecialty, 'shopId:', shopId);
                  setAddSaving(true);
                  try {
                    const { error } = await supabase.from('barbers').insert({
                      shop_id: shopId,
                      display_name: addName.trim(),
                      specialty: addSpecialty.trim() || null,
                      status: 'approved',
                      is_active: true,
                    });
                    if (error) {
                      console.log('[Team] Insert barber error:', error.message);
                      Alert.alert('Error', error.message);
                    } else {
                      console.log('[Team] Barber added successfully');
                      setAddName('');
                      setAddSpecialty('');
                      setShowInvite(false);
                      fetchBarbers();
                    }
                  } catch (err) {
                    console.log('[Team] Exception adding barber:', err);
                  } finally {
                    setAddSaving(false);
                  }
                }}
              >
                {addSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.addSaveBtnText}>Add to Team</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Barber modal — full control */}
      <Modal visible={!!managing} transparent animationType="slide" onRequestClose={() => setManaging(null)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Manage barber</Text>
              <TouchableOpacity onPress={() => setManaging(null)}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.addForm}>
              <Text style={styles.addLabel}>Display name *</Text>
              <TextInput style={styles.addInput} placeholder="Name" placeholderTextColor={P.textTertiary} value={editName} onChangeText={setEditName} />
              <Text style={[styles.addLabel, { marginTop: 12 }]}>Specialty</Text>
              <TextInput style={styles.addInput} placeholder="e.g. Fades, Beard" placeholderTextColor={P.textTertiary} value={editSpecialty} onChangeText={setEditSpecialty} />

              <Text style={[styles.addLabel, { marginTop: 12 }]}>Availability</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.toggleBtn, editActive && styles.toggleBtnActive]}
                  onPress={() => setEditActive(true)}
                >
                  <Text style={[styles.toggleText, editActive && { color: P.success }]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, !editActive && styles.toggleBtnPaused]}
                  onPress={() => setEditActive(false)}
                >
                  <Text style={[styles.toggleText, !editActive && { color: P.textSecondary }]}>Paused</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.addSaveBtn, (!editName.trim() || savingEdit) && { opacity: 0.5 }]}
                disabled={!editName.trim() || savingEdit}
                onPress={saveBarber}
              >
                {savingEdit ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addSaveBtnText}>Save changes</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteBtn} onPress={deleteBarber}>
                <Trash2 size={16} color={P.danger} />
                <Text style={styles.deleteBtnText}>Remove from team</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { color: P.textSecondary, fontSize: 16, fontWeight: '600' },
  emptySub: { color: P.textTertiary, fontSize: 13 },
  barberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: P.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: P.border },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: P.accent, fontSize: 22, fontWeight: '700' },
  barberName: { color: P.text, fontSize: 15, fontWeight: '700' },
  barberSpecialty: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  reviewCount: { color: P.textTertiary, fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: P.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: P.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  addForm: { paddingTop: 4, gap: 4 },
  addLabel: { color: P.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  addInput: {
    backgroundColor: P.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: P.text,
    fontSize: 15,
  },
  addSaveBtn: {
    backgroundColor: P.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  addSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: P.border, alignItems: 'center', backgroundColor: P.surfaceElevated },
  toggleBtnActive: { borderColor: P.success, backgroundColor: P.success + '22' },
  toggleBtnPaused: { borderColor: P.textTertiary, backgroundColor: P.textTertiary + '22' },
  toggleText: { color: P.textSecondary, fontSize: 14, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: P.danger + '55' },
  deleteBtnText: { color: P.danger, fontSize: 14, fontWeight: '700' },
});
