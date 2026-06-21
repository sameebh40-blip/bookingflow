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
  Modal,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Save, Plus, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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

interface WorkingHour {
  id?: string;
  barber_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  enabled: boolean;
}

interface TimeOff {
  id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  reason?: string;
}

interface BarberData {
  id: string;
  display_name: string;
  specialty?: string;
  avatar_url?: string;
  bio?: string;
  experience_years?: number;
  rating_avg?: number;
  reviews_count?: number;
}

export default function BarberSchedule() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { barberId } = useLocalSearchParams<{ barberId: string }>();
  const { profile } = useAuth();

  const [barber, setBarber] = useState<BarberData | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [timeOffStart, setTimeOffStart] = useState(new Date());
  const [timeOffEnd, setTimeOffEnd] = useState(new Date());
  const [timeOffReason, setTimeOffReason] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const fetchData = useCallback(async () => {
    if (!barberId) return;
    console.log('[BarberSchedule] Fetching data for barber:', barberId);
    try {
      const [barberRes, hoursRes, timeOffRes] = await Promise.all([
        supabase.from('barbers').select('*').eq('id', barberId).single(),
        supabase.from('barber_working_hours').select('*').eq('barber_id', barberId).order('weekday'),
        supabase.from('barber_time_off').select('*').eq('barber_id', barberId).gte('ends_at', new Date().toISOString()),
      ]);
      setBarber(barberRes.data as BarberData);

      // Build full 7-day schedule
      const existingHours = (hoursRes.data as WorkingHour[]) ?? [];
      const fullSchedule: WorkingHour[] = Array.from({ length: 7 }, (_, i) => {
        const existing = existingHours.find(h => h.weekday === i);
        return existing ?? { barber_id: barberId, weekday: i, start_time: '09:00', end_time: '18:00', enabled: i >= 1 && i <= 5 };
      });
      setWorkingHours(fullSchedule);
      setTimeOffs((timeOffRes.data as TimeOff[]) ?? []);
    } catch (err) {
      console.log('[BarberSchedule] fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveProfile = async () => {
    if (!barber) return;
    console.log('[BarberSchedule] Save profile pressed');
    setSaving(true);
    try {
      await supabase.from('barbers').update({
        display_name: barber.display_name,
        specialty: barber.specialty,
        bio: barber.bio,
        experience_years: barber.experience_years,
      }).eq('id', barber.id);
      console.log('[BarberSchedule] Profile saved');
    } catch (err) {
      console.log('[BarberSchedule] saveProfile error:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveWorkingHours = async () => {
    if (!barberId) return;
    console.log('[BarberSchedule] Save working hours pressed');
    setSaving(true);
    try {
      for (const h of workingHours) {
        await supabase.from('barber_working_hours').upsert({
          barber_id: barberId,
          weekday: h.weekday,
          start_time: h.start_time,
          end_time: h.end_time,
          enabled: h.enabled,
        }, { onConflict: 'barber_id,weekday' });
      }
      console.log('[BarberSchedule] Working hours saved');
    } catch (err) {
      console.log('[BarberSchedule] saveWorkingHours error:', err);
    } finally {
      setSaving(false);
    }
  };

  const addTimeOff = async () => {
    if (!barberId) return;
    console.log('[BarberSchedule] Add time off pressed');
    try {
      await supabase.from('barber_time_off').insert({
        barber_id: barberId,
        starts_at: timeOffStart.toISOString(),
        ends_at: timeOffEnd.toISOString(),
        reason: timeOffReason,
      });
      setShowTimeOffModal(false);
      setTimeOffReason('');
      await fetchData();
    } catch (err) {
      console.log('[BarberSchedule] addTimeOff error:', err);
    }
  };

  const updateHour = (weekday: number, field: keyof WorkingHour, value: string | boolean) => {
    setWorkingHours(prev => prev.map(h => h.weekday === weekday ? { ...h, [field]: value } : h));
  };

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
        <TouchableOpacity onPress={() => { console.log('[BarberSchedule] Back pressed'); router.back(); }} style={styles.backBtn}>
          <ChevronLeft size={22} color={P.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{barber?.display_name ?? 'Barber'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Profile section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileRow}>
            {barber?.avatar_url ? (
              <Image source={resolveImageSource(barber.avatar_url)} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{barber?.display_name?.charAt(0) ?? '?'}</Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 8 }}>
              <TextInput
                style={styles.input}
                value={barber?.display_name ?? ''}
                onChangeText={v => setBarber(b => b ? { ...b, display_name: v } : b)}
                placeholder="Display name"
                placeholderTextColor={P.textTertiary}
              />
              <TextInput
                style={styles.input}
                value={barber?.specialty ?? ''}
                onChangeText={v => setBarber(b => b ? { ...b, specialty: v } : b)}
                placeholder="Specialty"
                placeholderTextColor={P.textTertiary}
              />
            </View>
          </View>
          <TextInput
            style={[styles.input, { marginTop: 8, minHeight: 80, textAlignVertical: 'top' }]}
            value={barber?.bio ?? ''}
            onChangeText={v => setBarber(b => b ? { ...b, bio: v } : b)}
            placeholder="Bio..."
            placeholderTextColor={P.textTertiary}
            multiline
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Save size={14} color="#fff" />
                <Text style={styles.saveBtnText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Working hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Working Hours</Text>
          {workingHours.map(h => (
            <View key={h.weekday} style={styles.hourRow}>
              <Switch
                value={h.enabled}
                onValueChange={v => updateHour(h.weekday, 'enabled', v)}
                trackColor={{ false: P.border, true: P.accent }}
                thumbColor="#fff"
              />
              <Text style={[styles.dayLabel, !h.enabled && { opacity: 0.4 }]}>{WEEKDAYS[h.weekday].slice(0, 3)}</Text>
              {h.enabled ? (
                <View style={styles.timeInputs}>
                  <TextInput
                    style={styles.timeInput}
                    value={h.start_time}
                    onChangeText={v => updateHour(h.weekday, 'start_time', v)}
                    placeholder="09:00"
                    placeholderTextColor={P.textTertiary}
                  />
                  <Text style={styles.timeSep}>–</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={h.end_time}
                    onChangeText={v => updateHour(h.weekday, 'end_time', v)}
                    placeholder="18:00"
                    placeholderTextColor={P.textTertiary}
                  />
                </View>
              ) : (
                <Text style={styles.closedText}>Closed</Text>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.saveBtn} onPress={saveWorkingHours} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Save size={14} color="#fff" />
                <Text style={styles.saveBtnText}>Save Hours</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Time off */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Time Off</Text>
            <TouchableOpacity style={styles.addSmallBtn} onPress={() => { console.log('[BarberSchedule] Add time off pressed'); setShowTimeOffModal(true); }}>
              <Plus size={14} color="#fff" />
              <Text style={styles.addSmallText}>Add</Text>
            </TouchableOpacity>
          </View>
          {timeOffs.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming time off</Text>
          ) : (
            timeOffs.map(t => {
              const startText = new Date(t.starts_at).toLocaleDateString();
              const endText = new Date(t.ends_at).toLocaleDateString();
              return (
                <View key={t.id} style={styles.timeOffRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timeOffDates}>{startText} – {endText}</Text>
                    {t.reason && <Text style={styles.timeOffReason}>{t.reason}</Text>}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{barber?.rating_avg?.toFixed(1) ?? '—'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{barber?.reviews_count ?? 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{barber?.experience_years ?? 0}y</Text>
              <Text style={styles.statLabel}>Experience</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Time off modal */}
      <Modal visible={showTimeOffModal} transparent animationType="slide" onRequestClose={() => setShowTimeOffModal(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Time Off</Text>
              <TouchableOpacity onPress={() => setShowTimeOffModal(false)}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Start Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.dateBtnText}>{timeOffStart.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker value={timeOffStart} mode="date" onChange={(_, d) => { setShowStartPicker(false); if (d) setTimeOffStart(d); }} />
            )}
            <Text style={styles.fieldLabel}>End Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
              <Text style={styles.dateBtnText}>{timeOffEnd.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker value={timeOffEnd} mode="date" onChange={(_, d) => { setShowEndPicker(false); if (d) setTimeOffEnd(d); }} />
            )}
            <Text style={styles.fieldLabel}>Reason (optional)</Text>
            <TextInput style={styles.input} value={timeOffReason} onChangeText={setTimeOffReason} placeholder="e.g. Vacation" placeholderTextColor={P.textTertiary} />
            <TouchableOpacity style={[styles.saveBtn, { marginTop: 16 }]} onPress={addTimeOff}>
              <Text style={styles.saveBtnText}>Add Time Off</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { color: P.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  profileRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: P.accent, fontSize: 24, fontWeight: '700' },
  input: { backgroundColor: P.surface, borderRadius: 10, padding: 12, color: P.text, borderWidth: 1, borderColor: P.border, fontSize: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: P.accent, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  hourRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.divider },
  dayLabel: { color: P.text, fontSize: 14, fontWeight: '600', width: 36 },
  timeInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: { flex: 1, backgroundColor: P.surfaceElevated, borderRadius: 8, padding: 8, color: P.text, fontSize: 13, textAlign: 'center', borderWidth: 1, borderColor: P.border },
  timeSep: { color: P.textSecondary, fontSize: 14 },
  closedText: { color: P.textTertiary, fontSize: 13, flex: 1 },
  addSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: P.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addSmallText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyText: { color: P.textTertiary, fontSize: 13, paddingVertical: 12 },
  timeOffRow: { backgroundColor: P.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: P.border },
  timeOffDates: { color: P.text, fontSize: 14, fontWeight: '600' },
  timeOffReason: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: P.surface, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: P.border },
  statValue: { color: P.text, fontSize: 18, fontWeight: '700' },
  statLabel: { color: P.textSecondary, fontSize: 11 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: P.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: P.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  fieldLabel: { color: P.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  dateBtn: { backgroundColor: P.surfaceElevated, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: P.border },
  dateBtnText: { color: P.text, fontSize: 14 },
});
