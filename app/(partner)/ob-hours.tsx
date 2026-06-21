import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, X, Plus } from 'lucide-react-native';
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

const DAYS_ORDERED = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DayHours {
  open: string;
  close: string;
  enabled: boolean;
}

type OpeningHours = Record<string, DayHours>;

const DEFAULT_HOURS: OpeningHours = {
  '0': { open: '09:00', close: '21:00', enabled: false },
  '1': { open: '09:00', close: '21:00', enabled: true },
  '2': { open: '09:00', close: '21:00', enabled: true },
  '3': { open: '09:00', close: '21:00', enabled: true },
  '4': { open: '09:00', close: '21:00', enabled: true },
  '5': { open: '09:00', close: '21:00', enabled: true },
  '6': { open: '09:00', close: '21:00', enabled: true },
};

export default function ObHours() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();

  const [hours, setHours] = useState<OpeningHours>(DEFAULT_HOURS);
  const [editHours, setEditHours] = useState<OpeningHours>(DEFAULT_HOURS);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.shop_id) return;
    console.log('[ObHours] Fetching opening hours for shop_id:', profile.shop_id);
    supabase
      .from('barbershops')
      .select('opening_hours')
      .eq('id', profile.shop_id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.log('[ObHours] Error fetching hours:', error.message);
          return;
        }
        if (data?.opening_hours) {
          console.log('[ObHours] Opening hours loaded');
          setHours(data.opening_hours as OpeningHours);
        }
      });
  }, [profile?.shop_id]);

  const openModal = () => {
    console.log('[ObHours] Open hours edit modal');
    setEditHours({ ...hours });
    setModalVisible(true);
  };

  const toggleDay = (i: number) => {
    const key = String(i);
    console.log('[ObHours] Toggle day index:', i, DAYS_ORDERED[i]);
    setEditHours((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const updateTime = (i: number, field: 'open' | 'close', value: string) => {
    const key = String(i);
    setEditHours((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const saveHours = async () => {
    if (!profile?.shop_id) {
      Alert.alert('Setup required', 'Please complete Venue Essentials first to create your shop.');
      return;
    }
    console.log('[ObHours] Save hours pressed');
    setSaving(true);
    const { error } = await supabase
      .from('barbershops')
      .update({ opening_hours: editHours })
      .eq('id', profile.shop_id);
    setSaving(false);
    if (error) {
      console.log('[ObHours] Error saving hours:', error.message);
    } else {
      console.log('[ObHours] Hours saved successfully');
      setHours(editHours);
      setModalVisible(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            console.log('[ObHours] Back pressed');
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
        <Text style={styles.pageTitle}>Your opening hours</Text>
        <Text style={styles.pageSubtitle}>
          Opening hours are displayed on your profile and are the default working hours for your team. You can amend business closed periods for events like Bank Holidays in Settings.
        </Text>

        <View style={styles.hoursCard}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const key = String(i);
            const h = hours[key] ?? DEFAULT_HOURS[key];
            const isEnabled = h.enabled;
            const timeRange = isEnabled ? `${h.open} – ${h.close}` : 'Closed';
            return (
              <View key={i}>
                {i > 0 && <View style={styles.rowDivider} />}
                <View style={styles.hoursRow}>
                  <View style={[styles.dot, { backgroundColor: isEnabled ? P.success : P.textTertiary }]} />
                  <Text style={styles.dayName}>{DAYS_ORDERED[i]}</Text>
                  <Text style={[styles.timeRange, !isEnabled && { color: P.textTertiary }]}>{timeRange}</Text>
                </View>
              </View>
            );
          })}
        </View>
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
              <Text style={styles.modalHeaderTitle}>Opening hours</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  console.log('[ObHours] Close hours modal');
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
              <Text style={styles.modalTitle}>Add your opening hours</Text>
              <Text style={styles.modalSubtitle}>
                Let clients know your standard opening hours. These will be displayed on your profile but do not affect your scheduled shifts.
              </Text>

              <View style={styles.modalHoursList}>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                  const key = String(i);
                  const h = editHours[key] ?? DEFAULT_HOURS[key];
                  const isEnabled = h.enabled;
                  const timeRange = `${h.open} – ${h.close}`;
                  return (
                    <View key={i}>
                      {i > 0 && <View style={styles.modalRowDivider} />}
                      <View style={styles.modalHoursRow}>
                        <TouchableOpacity
                          style={[styles.checkbox, isEnabled && styles.checkboxChecked]}
                          onPress={() => toggleDay(i)}
                          activeOpacity={0.8}
                        >
                          {isEnabled && <Text style={styles.checkmark}>✓</Text>}
                        </TouchableOpacity>
                        <View style={styles.dayInfo}>
                          <Text style={styles.modalDayName}>{DAYS_ORDERED[i]}</Text>
                          <Text style={[styles.modalDayStatus, isEnabled && { color: P.success }]}>
                            {isEnabled ? 'Open' : 'Closed'}
                          </Text>
                        </View>
                        {isEnabled ? (
                          <View style={styles.timeInputRow}>
                            <TextInput
                              style={styles.timeInput}
                              value={h.open}
                              onChangeText={(v) => {
                                console.log('[ObHours] Open time changed for day', i, ':', v);
                                updateTime(i, 'open', v);
                              }}
                              placeholder="09:00"
                              placeholderTextColor={P.textTertiary}
                              maxLength={5}
                            />
                            <Text style={styles.timeSep}>–</Text>
                            <TextInput
                              style={styles.timeInput}
                              value={h.close}
                              onChangeText={(v) => {
                                console.log('[ObHours] Close time changed for day', i, ':', v);
                                updateTime(i, 'close', v);
                              }}
                              placeholder="21:00"
                              placeholderTextColor={P.textTertiary}
                              maxLength={5}
                            />
                          </View>
                        ) : (
                          <Text style={styles.closedLabel}>Closed</Text>
                        )}
                        <TouchableOpacity
                          style={styles.addShiftBtn}
                          onPress={() => console.log('[ObHours] Add split shift pressed for day:', i)}
                          activeOpacity={0.7}
                        >
                          <Plus size={16} color={P.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveHours}
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
  pageSubtitle: {
    color: P.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -8,
  },
  hoursCard: {
    backgroundColor: P.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayName: {
    flex: 1,
    color: P.text,
    fontSize: 14,
    fontWeight: '600',
  },
  timeRange: {
    color: P.textSecondary,
    fontSize: 13,
  },
  rowDivider: {
    height: 1,
    backgroundColor: P.divider,
    marginHorizontal: 16,
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
  modalHeaderTitle: {
    color: P.text,
    fontSize: 16,
    fontWeight: '700',
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
    gap: 20,
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
  modalHoursList: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
    backgroundColor: P.surface,
  },
  modalHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: P.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: P.accent,
    borderColor: P.accent,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  dayInfo: {
    flex: 1,
    gap: 1,
  },
  modalDayName: {
    color: P.text,
    fontSize: 14,
    fontWeight: '700',
  },
  modalDayStatus: {
    color: P.textTertiary,
    fontSize: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeInput: {
    backgroundColor: P.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: P.accent,
    fontSize: 13,
    fontWeight: '600',
    width: 52,
    textAlign: 'center',
  },
  timeSep: {
    color: P.textTertiary,
    fontSize: 13,
  },
  closedLabel: {
    color: P.textTertiary,
    fontSize: 13,
  },
  addShiftBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRowDivider: {
    height: 1,
    backgroundColor: P.divider,
    marginHorizontal: 16,
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
