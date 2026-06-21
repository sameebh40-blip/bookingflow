import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Trash2, Edit2 } from 'lucide-react-native';
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

const CATEGORIES = ['Haircut', 'Beard', 'Color', 'Facial', 'Other'];

interface Service {
  id: string;
  name: string;
  price_bhd: number;
  duration_minutes: number;
  category: string;
  is_active: boolean;
  shop_id: string;
}

interface ServiceForm {
  name: string;
  price_bhd: string;
  duration_minutes: string;
  category: string;
  is_active: boolean;
}

const emptyForm: ServiceForm = { name: '', price_bhd: '', duration_minutes: '', category: 'Haircut', is_active: true };

function SwipeableRow({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -80));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          Animated.timing(translateX, { toValue: -80, duration: 200, useNativeDriver: true }).start();
        } else {
          Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <View style={{ overflow: 'hidden', borderRadius: 12, marginBottom: 8 }}>
      <View style={swipeStyles.deleteBtn}>
        <TouchableOpacity onPress={onDelete} style={swipeStyles.deleteTouch}>
          <Trash2 size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  deleteBtn: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, backgroundColor: P.danger, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  deleteTouch: { width: 80, height: '100%', alignItems: 'center', justifyContent: 'center' },
});

export default function PartnerCatalog() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    if (!shopId) return;
    console.log('[Catalog] Fetching services for shop:', shopId);
    try {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('shop_id', shopId)
        .order('category')
        .order('name');
      setServices((data as Service[]) ?? []);
    } catch (err) {
      console.log('[Catalog] fetchServices error:', err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const openAdd = () => {
    console.log('[Catalog] Add service pressed');
    setEditingService(null);
    setForm(emptyForm);
    setShowSheet(true);
  };

  const openEdit = (s: Service) => {
    console.log('[Catalog] Edit service pressed:', s.id);
    setEditingService(s);
    setForm({ name: s.name, price_bhd: String(s.price_bhd), duration_minutes: String(s.duration_minutes), category: s.category, is_active: s.is_active });
    setShowSheet(true);
  };

  const saveService = async () => {
    if (!shopId || !form.name) return;
    console.log('[Catalog] Save service pressed:', form.name);
    setSaving(true);
    try {
      const payload = {
        shop_id: shopId,
        name: form.name,
        price_bhd: parseFloat(form.price_bhd) || 0,
        duration_minutes: parseInt(form.duration_minutes) || 30,
        category: form.category,
        is_active: form.is_active,
      };
      if (editingService) {
        await supabase.from('services').update(payload).eq('id', editingService.id);
      } else {
        await supabase.from('services').insert(payload);
      }
      await fetchServices();
      setShowSheet(false);
    } catch (err) {
      console.log('[Catalog] saveService error:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id: string) => {
    console.log('[Catalog] Delete service:', id);
    try {
      await supabase.from('services').update({ is_active: false }).eq('id', id);
      await fetchServices();
    } catch (err) {
      console.log('[Catalog] deleteService error:', err);
    }
  };

  const toggleActive = async (s: Service) => {
    console.log('[Catalog] Toggle active:', s.id, !s.is_active);
    try {
      await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id);
      setServices(prev => prev.map(sv => sv.id === s.id ? { ...sv, is_active: !sv.is_active } : sv));
    } catch (err) {
      console.log('[Catalog] toggleActive error:', err);
    }
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = services.filter(s => s.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Catalog</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={P.accent} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {Object.keys(grouped).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No services yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first service</Text>
            </View>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <View key={cat} style={{ marginBottom: 20 }}>
                <Text style={styles.catLabel}>{cat}</Text>
                {items.map(s => {
                  const priceText = `BHD ${Number(s.price_bhd).toFixed(3)}`;
                  const durationText = `${s.duration_minutes} min`;
                  return (
                    <SwipeableRow key={s.id} onDelete={() => deleteService(s.id)}>
                      <View style={styles.serviceRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.serviceName, !s.is_active && { opacity: 0.5 }]}>{s.name}</Text>
                          <Text style={styles.serviceMeta}>{durationText} · {priceText}</Text>
                        </View>
                        <Switch
                          value={s.is_active}
                          onValueChange={() => toggleActive(s)}
                          trackColor={{ false: P.border, true: P.accent }}
                          thumbColor="#fff"
                        />
                        <TouchableOpacity onPress={() => openEdit(s)} style={styles.editBtn}>
                          <Edit2 size={14} color={P.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </SwipeableRow>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 80 }]} onPress={openAdd}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit sheet */}
      <Modal visible={showSheet} transparent animationType="slide" onRequestClose={() => setShowSheet(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editingService ? 'Edit Service' : 'Add Service'}</Text>
              <TouchableOpacity onPress={() => setShowSheet(false)}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput style={styles.input} placeholder="e.g. Classic Haircut" placeholderTextColor={P.textTertiary} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />

              <Text style={styles.fieldLabel}>Price (BHD)</Text>
              <TextInput style={styles.input} placeholder="0.000" placeholderTextColor={P.textTertiary} value={form.price_bhd} onChangeText={v => setForm(f => ({ ...f, price_bhd: v }))} keyboardType="decimal-pad" />

              <Text style={styles.fieldLabel}>Duration (minutes)</Text>
              <TextInput style={styles.input} placeholder="30" placeholderTextColor={P.textTertiary} value={form.duration_minutes} onChangeText={v => setForm(f => ({ ...f, duration_minutes: v }))} keyboardType="number-pad" />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.catRow}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[styles.catChip, form.category === c && styles.catChipActive]} onPress={() => setForm(f => ({ ...f, category: c }))}>
                    <Text style={[styles.catChipText, form.category === c && styles.catChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.fieldLabel}>Active</Text>
                <Switch value={form.is_active} onValueChange={v => setForm(f => ({ ...f, is_active: v }))} trackColor={{ false: P.border, true: P.accent }} thumbColor="#fff" />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveService} disabled={saving || !form.name}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Service</Text>}
              </TouchableOpacity>
            </ScrollView>
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
  catLabel: { color: P.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: P.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: P.border },
  serviceName: { color: P.text, fontSize: 15, fontWeight: '600' },
  serviceMeta: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  editBtn: { padding: 6 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: P.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: P.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  fieldLabel: { color: P.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: P.surfaceElevated, borderRadius: 10, padding: 14, color: P.text, borderWidth: 1, borderColor: P.border, fontSize: 15 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: P.surfaceElevated, borderWidth: 1, borderColor: P.border },
  catChipActive: { backgroundColor: P.accent, borderColor: P.accent },
  catChipText: { color: P.textSecondary, fontSize: 13 },
  catChipTextActive: { color: '#fff', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  saveBtn: { backgroundColor: P.accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
