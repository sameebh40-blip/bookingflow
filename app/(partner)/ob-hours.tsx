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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, X, Plus } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const F = {
  bg: '#0D0D0D',
  surface: '#1A1A1A',
  border: '#2A2A2A',
  accent: '#7C3AED',
  text: '#F5F0E8',
  textSec: '#8A8A8A',
  textTer: '#555555',
  green: '#22C55E',
  greenBg: '#052e16',
  divider: '#1E1E1E',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

type OpeningHours = Record<string, DayHours>;

const DEFAULT_HOURS: OpeningHours = {
  Monday: { open: true, from: '10:00 AM', to: '7:00 PM' },
  Tuesday: { open: true, from: '10:00 AM', to: '7:00 PM' },
  Wednesday: { open: true, from: '10:00 AM', to: '7:00 PM' },
  Thursday: { open: true, from: '10:00 AM', to: '7:00 PM' },
  Friday: { open: true, from: '10:00 AM', to: '7:00 PM' },
  Saturday: { open: true, from: '10:00 AM', to: '5:00 PM' },
  Sunday: { open: false, from: '10:00 AM', to: '7:00 PM' },
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

  const toggleDay = (day: string) => {
    console.log('[ObHours] Toggle day:', day);
    setEditHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], open: !prev[day].open },
    }));
  };

  const saveHours = async () => {
    if (!profile?.shop_id) return;
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
          <ChevronLeft size={22} color={F.text} />
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
          {DAYS.map((day, i) => {
            const dayData = hours[day] ?? DEFAULT_HOURS[day];
            const isOpen = dayData.open;
            const timeRange = isOpen ? `${dayData.from} to ${dayData.to}` : 'Closed';
            return (
              <View key={day}>
                {i > 0 && <View style={styles.rowDivider} />}
                <View style={styles.hoursRow}>
                  <View style={[styles.dot, { backgroundColor: isOpen ? F.green : F.textTer }]} />
                  <Text style={styles.dayName}>{day}</Text>
                  <Text style={[styles.timeRange, !isOpen && { color: F.textTer }]}>{timeRange}</Text>
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
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  console.log('[ObHours] Close hours modal');
                  setModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <X size={20} color="#0D0D0D" />
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
                {DAYS.map((day, i) => {
                  const dayData = editHours[day] ?? DEFAULT_HOURS[day];
                  const isOpen = dayData.open;
                  const timeRange = `${dayData.from} – ${dayData.to}`;
                  return (
                    <View key={day}>
                      {i > 0 && <View style={styles.modalRowDivider} />}
                      <View style={styles.modalHoursRow}>
                        <TouchableOpacity
                          style={[styles.checkbox, isOpen && styles.checkboxChecked]}
                          onPress={() => toggleDay(day)}
                          activeOpacity={0.8}
                        >
                          {isOpen && <Text style={styles.checkmark}>✓</Text>}
                        </TouchableOpacity>
                        <View style={styles.dayInfo}>
                          <Text style={styles.modalDayName}>{day}</Text>
                          <Text style={[styles.modalDayStatus, isOpen && { color: '#22C55E' }]}>
                            {isOpen ? 'Open' : 'Closed'}
                          </Text>
                        </View>
                        {isOpen && (
                          <Text style={styles.modalTimeRange}>{timeRange}</Text>
                        )}
                        <TouchableOpacity
                          style={styles.addShiftBtn}
                          onPress={() => console.log('[ObHours] Add split shift pressed for:', day)}
                          activeOpacity={0.7}
                        >
                          <Plus size={16} color="#888" />
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
    backgroundColor: F.bg,
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
    borderColor: F.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editPillText: {
    color: F.text,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 16,
  },
  pageTitle: {
    color: F.text,
    fontSize: 26,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: F.textSec,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -8,
  },
  hoursCard: {
    backgroundColor: F.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: F.border,
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
    color: F.text,
    fontSize: 14,
    fontWeight: '600',
  },
  timeRange: {
    color: F.textSec,
    fontSize: 13,
  },
  rowDivider: {
    height: 1,
    backgroundColor: F.border,
    marginHorizontal: 16,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 20,
  },
  modalTitle: {
    color: '#0D0D0D',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  modalSubtitle: {
    color: '#555555',
    fontSize: 13,
    lineHeight: 18,
  },
  modalHoursList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
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
    borderColor: '#CCCCCC',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
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
    color: '#0D0D0D',
    fontSize: 14,
    fontWeight: '700',
  },
  modalDayStatus: {
    color: '#888888',
    fontSize: 12,
  },
  modalTimeRange: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '600',
  },
  addShiftBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRowDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginHorizontal: 16,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
