import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, ChevronRight, Check, User, Scissors, Users, CalendarDays, CheckCircle } from 'lucide-react-native';
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

interface Client { id: string; full_name: string; avatar_url?: string; email?: string; phone?: string; }
interface Service { id: string; name: string; price_bhd: number; duration_minutes: number; category: string; }
interface Barber { id: string; display_name: string; avatar_url?: string; specialty?: string; }

const STEPS = ['Client', 'Service', 'Team', 'Date & Time', 'Confirm'];

export default function NewBooking() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [step, setStep] = useState(0);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchClients = useCallback(async (search: string) => {
    if (!shopId || search.length < 2) return;
    console.log('[NewBooking] Searching clients:', search);
    try {
      const { data } = await supabase
        .from('bookings')
        .select('profiles!customer_profile_id(id, full_name, avatar_url, email, phone)')
        .eq('shop_id', shopId)
        .not('customer_profile_id', 'is', null)
        .limit(20);
      const seen = new Set<string>();
      const unique: Client[] = [];
      for (const b of (data ?? []) as { profiles: Client | null }[]) {
        if (b.profiles && !seen.has(b.profiles.id)) {
          seen.add(b.profiles.id);
          if (b.profiles.full_name?.toLowerCase().includes(search.toLowerCase())) {
            unique.push(b.profiles);
          }
        }
      }
      setClients(unique);
    } catch (err) {
      console.log('[NewBooking] fetchClients error:', err);
    }
  }, [shopId]);

  useEffect(() => {
    if (clientSearch.length >= 2) fetchClients(clientSearch);
    else setClients([]);
  }, [clientSearch, fetchClients]);

  useEffect(() => {
    if (!shopId) return;
    const loadData = async () => {
      setLoading(true);
      console.log('[NewBooking] Loading services and barbers');
      try {
        const [svcRes, barberRes] = await Promise.all([
          supabase.from('services').select('*').eq('shop_id', shopId).eq('is_active', true),
          supabase.from('barbers').select('id, display_name, avatar_url, specialty').eq('shop_id', shopId),
        ]);
        setServices((svcRes.data as Service[]) ?? []);
        setBarbers((barberRes.data as Barber[]) ?? []);
      } catch (err) {
        console.log('[NewBooking] loadData error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [shopId]);

  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price_bhd), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  const buildScheduledAt = () => {
    if (!selectedTime) return new Date();
    const [h, m] = selectedTime.split(':').map(Number);
    const d = new Date(selectedDate);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const confirmBooking = async () => {
    if (!shopId) return;
    console.log('[NewBooking] Confirm booking pressed');
    setSaving(true);
    try {
      const scheduledAt = buildScheduledAt();
      const endAt = new Date(scheduledAt.getTime() + totalDuration * 60000);
      const { error } = await supabase.from('bookings').insert({
        customer_profile_id: selectedClient?.id ?? null,
        customer_name: isWalkIn ? walkInName : (selectedClient?.full_name ?? null),
        customer_phone: isWalkIn ? walkInPhone : (selectedClient?.phone ?? null),
        shop_id: shopId,
        barber_id: selectedBarber?.id ?? null,
        service_id: selectedServices[0]?.id ?? null,
        start_at: scheduledAt.toISOString(),
        end_at: endAt.toISOString(),
        status: 'confirmed',
        payment_status: 'unpaid',
        payment_method: 'cash',
        price_bhd: totalPrice,
        total_price: totalPrice,
        currency: 'BHD',
        source: isWalkIn ? 'walk_in' : 'partner_app',
      });
      if (error) {
        console.log('[NewBooking] insert error:', error.message);
      } else {
        console.log('[NewBooking] Booking created successfully');
        router.back();
      }
    } catch (err) {
      console.log('[NewBooking] confirmBooking exception:', err);
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return isWalkIn ? walkInName.length > 0 : !!selectedClient;
    if (step === 1) return selectedServices.length > 0;
    if (step === 2) return true;
    if (step === 3) return !!selectedTime;
    return true;
  };

  const timeSlots = Array.from({ length: (22 - 8) * 2 }, (_, i) => {
    const totalMins = 8 * 60 + i * 30;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { console.log('[NewBooking] Close pressed'); router.back(); }}>
          <X size={22} color={P.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Booking</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepDot, i === step && styles.stepDotActive, i < step && styles.stepDotDone]}>
              {i < step ? <Check size={10} color="#fff" /> : <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>}
            </View>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineDone]} />}
          </View>
        ))}
      </View>
      <Text style={styles.stepLabel}>{STEPS[step]}</Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Step 0: Client */}
        {step === 0 && (
          <View style={{ gap: 12 }}>
            <View style={styles.toggleRow}>
              <TouchableOpacity style={[styles.toggleBtn, !isWalkIn && styles.toggleBtnActive]} onPress={() => { console.log('[NewBooking] Existing client selected'); setIsWalkIn(false); }}>
                <Text style={[styles.toggleText, !isWalkIn && styles.toggleTextActive]}>Existing Client</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, isWalkIn && styles.toggleBtnActive]} onPress={() => { console.log('[NewBooking] Walk-in selected'); setIsWalkIn(true); }}>
                <Text style={[styles.toggleText, isWalkIn && styles.toggleTextActive]}>Walk-in</Text>
              </TouchableOpacity>
            </View>
            {!isWalkIn ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Search client by name..."
                  placeholderTextColor={P.textTertiary}
                  value={clientSearch}
                  onChangeText={setClientSearch}
                />
                {clients.map(c => (
                  <TouchableOpacity key={c.id} style={[styles.clientRow, selectedClient?.id === c.id && styles.clientRowSelected]} onPress={() => { console.log('[NewBooking] Client selected:', c.id); setSelectedClient(c); }}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>{c.full_name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>{c.full_name}</Text>
                      <Text style={styles.clientSub}>{c.phone ?? c.email ?? ''}</Text>
                    </View>
                    {selectedClient?.id === c.id && <Check size={16} color={P.accent} />}
                  </TouchableOpacity>
                ))}
                {selectedClient && (
                  <View style={styles.selectedCard}>
                    <User size={16} color={P.accent} />
                    <Text style={styles.selectedCardText}>{selectedClient.full_name}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <TextInput style={styles.input} placeholder="Client name *" placeholderTextColor={P.textTertiary} value={walkInName} onChangeText={setWalkInName} />
                <TextInput style={styles.input} placeholder="Phone number" placeholderTextColor={P.textTertiary} value={walkInPhone} onChangeText={setWalkInPhone} keyboardType="phone-pad" />
              </>
            )}
          </View>
        )}

        {/* Step 1: Services */}
        {step === 1 && (
          <View style={{ gap: 8 }}>
            {loading ? <ActivityIndicator color={P.accent} /> : services.map(s => {
              const isSelected = selectedServices.some(ss => ss.id === s.id);
              const priceText = `BHD ${Number(s.price_bhd).toFixed(3)}`;
              const durationText = `${s.duration_minutes} min`;
              return (
                <TouchableOpacity key={s.id} style={[styles.serviceRow, isSelected && styles.serviceRowSelected]} onPress={() => {
                  console.log('[NewBooking] Service toggled:', s.id, s.name);
                  setSelectedServices(prev => isSelected ? prev.filter(ss => ss.id !== s.id) : [...prev, s]);
                }}>
                  <Scissors size={16} color={isSelected ? P.accent : P.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.serviceName, isSelected && { color: P.accent }]}>{s.name}</Text>
                    <Text style={styles.serviceSub}>{durationText}</Text>
                  </View>
                  <Text style={styles.servicePrice}>{priceText}</Text>
                  {isSelected && <Check size={16} color={P.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Step 2: Team */}
        {step === 2 && (
          <View style={{ gap: 8 }}>
            <TouchableOpacity style={[styles.barberRow, !selectedBarber && styles.barberRowSelected]} onPress={() => { console.log('[NewBooking] Any barber selected'); setSelectedBarber(null); }}>
              <View style={styles.barberAvatar}><Users size={16} color={P.textSecondary} /></View>
              <Text style={styles.barberName}>Any Available</Text>
              {!selectedBarber && <Check size={16} color={P.accent} />}
            </TouchableOpacity>
            {barbers.map(b => (
              <TouchableOpacity key={b.id} style={[styles.barberRow, selectedBarber?.id === b.id && styles.barberRowSelected]} onPress={() => { console.log('[NewBooking] Barber selected:', b.id); setSelectedBarber(b); }}>
                {b.avatar_url ? (
                  <Image source={resolveImageSource(b.avatar_url)} style={styles.barberAvatarImg} />
                ) : (
                  <View style={styles.barberAvatar}><Text style={styles.barberAvatarText}>{b.display_name.charAt(0)}</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.barberName}>{b.display_name}</Text>
                  {b.specialty && <Text style={styles.barberSub}>{b.specialty}</Text>}
                </View>
                {selectedBarber?.id === b.id && <Check size={16} color={P.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <View style={{ gap: 16 }}>
            <Text style={styles.subLabel}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {calendarDays.map((d, i) => {
                  const isSelected = d.toDateString() === selectedDate.toDateString();
                  const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dateNum = d.getDate();
                  return (
                    <TouchableOpacity key={i} style={[styles.calDay, isSelected && styles.calDayActive]} onPress={() => { console.log('[NewBooking] Date selected:', d.toDateString()); setSelectedDate(d); setSelectedTime(null); }}>
                      <Text style={[styles.calDayLabel, isSelected && styles.calDayLabelActive]}>{dayLabel}</Text>
                      <Text style={[styles.calDayNum, isSelected && styles.calDayNumActive]}>{dateNum}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <Text style={styles.subLabel}>Select Time</Text>
            <View style={styles.timeGrid}>
              {timeSlots.map(slot => {
                const isSelected = selectedTime === slot;
                const [h, m] = slot.split(':').map(Number);
                const label = `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                return (
                  <TouchableOpacity key={slot} style={[styles.timeSlot, isSelected && styles.timeSlotActive]} onPress={() => { console.log('[NewBooking] Time selected:', slot); setSelectedTime(slot); }}>
                    <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <View style={{ gap: 12 }}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Booking Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Client</Text>
                <Text style={styles.summaryValue}>{isWalkIn ? walkInName : (selectedClient?.full_name ?? '—')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Services</Text>
                <Text style={styles.summaryValue}>{selectedServices.map(s => s.name).join(', ') || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Team member</Text>
                <Text style={styles.summaryValue}>{selectedBarber?.display_name ?? 'Any available'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date & Time</Text>
                <Text style={styles.summaryValue}>{selectedDate.toLocaleDateString()} {selectedTime ?? '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>{totalDuration} min</Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.summaryLabel, { fontWeight: '700', color: P.text }]}>Total</Text>
                <Text style={[styles.summaryValue, { color: P.gold, fontWeight: '700' }]}>BHD {totalPrice.toFixed(3)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => { console.log('[NewBooking] Back pressed'); setStep(s => s - 1); }}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        {step < 4 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
            disabled={!canProceed()}
            onPress={() => { console.log('[NewBooking] Next pressed, step:', step); setStep(s => s + 1); }}
          >
            <Text style={styles.nextBtnText}>Next</Text>
            <ChevronRight size={16} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={confirmBooking} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <CheckCircle size={16} color="#fff" />
                <Text style={styles.nextBtnText}>Confirm Booking</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: P.surface, borderWidth: 1, borderColor: P.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: P.accent, borderColor: P.accent },
  stepDotDone: { backgroundColor: P.success, borderColor: P.success },
  stepNum: { color: P.textSecondary, fontSize: 10, fontWeight: '700' },
  stepNumActive: { color: '#fff' },
  stepLine: { flex: 1, height: 1, backgroundColor: P.border, marginHorizontal: 2 },
  stepLineDone: { backgroundColor: P.success },
  stepLabel: { color: P.textSecondary, fontSize: 13, paddingHorizontal: 20, marginBottom: 16 },
  toggleRow: { flexDirection: 'row', backgroundColor: P.surface, borderRadius: 10, padding: 3, gap: 3 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: P.accent },
  toggleText: { color: P.textSecondary, fontSize: 14, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  input: { backgroundColor: P.surface, borderRadius: 10, padding: 14, color: P.text, borderWidth: 1, borderColor: P.border, fontSize: 15 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: P.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: P.border },
  clientRowSelected: { borderColor: P.accent, backgroundColor: P.accentLight },
  clientAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  clientAvatarText: { color: P.accent, fontSize: 14, fontWeight: '700' },
  clientName: { color: P.text, fontSize: 14, fontWeight: '600' },
  clientSub: { color: P.textSecondary, fontSize: 12 },
  selectedCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: P.accentLight, borderRadius: 10, padding: 12 },
  selectedCardText: { color: P.accent, fontSize: 14, fontWeight: '600' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: P.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: P.border },
  serviceRowSelected: { borderColor: P.accent, backgroundColor: P.accentLight },
  serviceName: { color: P.text, fontSize: 14, fontWeight: '600' },
  serviceSub: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  servicePrice: { color: P.gold, fontSize: 13, fontWeight: '600' },
  barberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: P.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: P.border },
  barberRowSelected: { borderColor: P.accent, backgroundColor: P.accentLight },
  barberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  barberAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  barberAvatarText: { color: P.accent, fontSize: 16, fontWeight: '700' },
  barberName: { color: P.text, fontSize: 14, fontWeight: '600', flex: 1 },
  barberSub: { color: P.textSecondary, fontSize: 12 },
  subLabel: { color: P.textSecondary, fontSize: 13, fontWeight: '600' },
  calDay: { width: 56, height: 64, borderRadius: 12, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: P.border },
  calDayActive: { backgroundColor: P.accent, borderColor: P.accent },
  calDayLabel: { color: P.textSecondary, fontSize: 11 },
  calDayLabelActive: { color: '#fff' },
  calDayNum: { color: P.text, fontSize: 18, fontWeight: '700' },
  calDayNumActive: { color: '#fff' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: P.surface, borderWidth: 1, borderColor: P.border },
  timeSlotActive: { backgroundColor: P.accent, borderColor: P.accent },
  timeSlotText: { color: P.textSecondary, fontSize: 13 },
  timeSlotTextActive: { color: '#fff', fontWeight: '600' },
  summaryCard: { backgroundColor: P.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: P.border },
  summaryTitle: { color: P.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: P.divider },
  summaryLabel: { color: P.textSecondary, fontSize: 14 },
  summaryValue: { color: P.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  bottomBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, backgroundColor: P.surface, borderTopWidth: 1, borderTopColor: P.border },
  backBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: P.border },
  backBtnText: { color: P.textSecondary, fontSize: 15, fontWeight: '600' },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: P.accent, paddingVertical: 14, borderRadius: 12 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
