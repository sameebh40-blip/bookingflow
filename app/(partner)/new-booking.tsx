import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  X,
  ChevronRight,
  Check,
  Users,
  Calendar,
  Clock,
  RefreshCw,
  Plus,
  AlertTriangle,
  MoreVertical,
  UserPlus,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react-native';
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

const SCREEN_W = Dimensions.get('window').width;

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface Client { id: string; full_name: string; avatar_url?: string; email?: string; phone?: string; }
interface Service { id: string; name: string; price_bhd: number; duration_minutes: number; category?: string; }
interface Barber { id: string; display_name: string; avatar_url?: string; specialty?: string; }

const DEMO_SERVICES: Service[] = [
  { id: 's1', name: 'Haircut', price_bhd: 40, duration_minutes: 45 },
  { id: 's2', name: 'Beard Trim', price_bhd: 20, duration_minutes: 20 },
  { id: 's3', name: 'Blow Dry', price_bhd: 25, duration_minutes: 30 },
  { id: 's4', name: 'Color & Highlights', price_bhd: 80, duration_minutes: 90 },
];

const DEMO_BARBERS: Barber[] = [
  { id: 'b1', display_name: 'S2 Khaled', specialty: 'Senior Barber' },
  { id: 'b2', display_name: 'Wendy Smith (Demo)', specialty: 'Stylist' },
];

const DEMO_CLIENTS: Client[] = [
  { id: 'c1', full_name: 'Jack Doe', email: 'jack@example.com' },
  { id: 'c2', full_name: 'Jane Doe', email: 'jane@example.com' },
  { id: 'c3', full_name: 'John Doe', email: 'john@example.com' },
];

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimeLabel(h: number, m: number): string {
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')}${ampm}`;
}

// Generate 15-min slots from 6am to 11pm
const TIME_SLOTS: { label: string; h: number; m: number }[] = Array.from(
  { length: (23 - 6) * 4 },
  (_, i) => {
    const totalMins = 6 * 60 + i * 15;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return { label: formatTimeLabel(h, m), h, m };
  }
);

export default function NewBooking() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; time?: string; barberId?: string }>();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  // Parse initial date/time from params
  const initDate = params.date ? new Date(params.date) : new Date();
  const initTime = params.time
    ? (() => {
        const [h, m] = params.time.split(':').map(Number);
        return { h, m };
      })()
    : { h: 9, m: 0 };

  const [selectedDate, setSelectedDate] = useState(initDate);
  const [selectedTime, setSelectedTime] = useState(initTime);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(
    params.barberId ? DEMO_BARBERS.find(b => b.id === params.barberId) ?? null : null
  );

  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sheet visibility
  const [showClientSheet, setShowClientSheet] = useState(false);
  const [showServiceSheet, setShowServiceSheet] = useState(false);
  const [showBarberSheet, setShowBarberSheet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const fetchData = useCallback(async () => {
    if (!shopId) {
      setServices(DEMO_SERVICES);
      setBarbers(DEMO_BARBERS);
      return;
    }
    setLoading(true);
    console.log('[NewBooking] Loading services and barbers');
    try {
      const [svcRes, barberRes] = await Promise.all([
        supabase.from('services').select('*').eq('shop_id', shopId).eq('is_active', true),
        supabase.from('barbers').select('id, display_name, avatar_url, specialty').eq('shop_id', shopId),
      ]);
      const svcData = (svcRes.data as Service[]) ?? [];
      const barberData = (barberRes.data as Barber[]) ?? [];
      setServices(svcData.length > 0 ? svcData : DEMO_SERVICES);
      setBarbers(barberData.length > 0 ? barberData : DEMO_BARBERS);
    } catch (err) {
      console.log('[NewBooking] loadData error:', err);
      setServices(DEMO_SERVICES);
      setBarbers(DEMO_BARBERS);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  const fetchClients = useCallback(async (search: string) => {
    if (!shopId) {
      const filtered = DEMO_CLIENTS.filter(c =>
        c.full_name.toLowerCase().includes(search.toLowerCase())
      );
      setClients(filtered);
      return;
    }
    if (search.length < 1) { setClients([]); return; }
    console.log('[NewBooking] Searching clients:', search);
    try {
      const { data } = await supabase
        .from('bookings')
        .select('profiles!customer_profile_id(id, full_name, avatar_url, email, phone)')
        .eq('shop_id', shopId)
        .not('customer_profile_id', 'is', null)
        .limit(30);
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

  useEffect(() => { fetchData(); }, [fetchData]);

  // When barbers load and a barberId param was passed, select the matching barber
  useEffect(() => {
    if (params.barberId && barbers.length > 0) {
      const match = barbers.find(b => b.id === params.barberId);
      if (match) setSelectedBarber(match);
    }
  }, [barbers, params.barberId]);

  useEffect(() => {
    if (showClientSheet) {
      if (clientSearch.length >= 1) fetchClients(clientSearch);
      else if (!shopId) setClients(DEMO_CLIENTS);
      else setClients([]);
    }
  }, [clientSearch, showClientSheet, fetchClients, shopId]);

  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price_bhd), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPriceStr = totalPrice.toFixed(3);

  const buildScheduledAt = () => {
    const d = new Date(selectedDate);
    d.setHours(selectedTime.h, selectedTime.m, 0, 0);
    return d;
  };

  const handleSave = async () => {
    if (!shopId) {
      console.log('[NewBooking] Save pressed (demo mode)');
      router.back();
      return;
    }
    console.log('[NewBooking] Save booking pressed');
    setSaving(true);
    try {
      const scheduledAt = buildScheduledAt();
      const endAt = new Date(scheduledAt.getTime() + (totalDuration || 45) * 60000);
      const { error } = await supabase.from('bookings').insert({
        customer_profile_id: selectedClient?.id ?? null,
        customer_name: isWalkIn ? 'Walk-In' : (selectedClient?.full_name ?? 'Walk-In'),
        customer_phone: selectedClient?.phone ?? null,
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
        console.log('[NewBooking] Booking saved successfully');
        router.back();
      }
    } catch (err) {
      console.log('[NewBooking] save exception:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async () => {
    console.log('[NewBooking] Checkout pressed');
    await handleSave();
  };

  const canCheckout = selectedServices.length > 0;
  const dateLabel = formatDateLabel(selectedDate);
  const timeLabel = formatTimeLabel(selectedTime.h, selectedTime.m);

  // Calendar grid for date picker
  const calendarDays = (() => {
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i - 7);
      days.push(d);
    }
    return days;
  })();

  const clientDisplayName = isWalkIn ? 'Walk-In' : (selectedClient?.full_name ?? null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerDateBtn} onPress={() => { console.log('[NewBooking] Header date pressed'); setShowDatePicker(true); }}>
          <Text style={styles.headerDateText}>{dateLabel}</Text>
          <ChevronDown size={16} color={P.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.statusBtn} onPress={() => console.log('[NewBooking] Status dropdown pressed')}>
          <Text style={styles.statusBtnText}>Booked</Text>
          <ChevronDown size={14} color={P.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { console.log('[NewBooking] Close pressed'); router.back(); }} style={styles.closeBtn}>
          <X size={22} color={P.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Client section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.addClientRow}
            onPress={() => {
              console.log('[NewBooking] Add client row pressed');
              setShowClientSheet(true);
            }}
          >
            <View style={styles.addClientLeft}>
              <UserPlus size={18} color={P.textSecondary} />
              <View>
                {clientDisplayName ? (
                  <Text style={styles.addClientName}>{clientDisplayName}</Text>
                ) : (
                  <>
                    <Text style={styles.addClientTitle}>Add client</Text>
                    <Text style={styles.addClientSub}>Leave empty for walk-ins</Text>
                  </>
                )}
              </View>
            </View>
            <View style={styles.addClientRight}>
              {clientDisplayName && (
                <TouchableOpacity
                  onPress={() => {
                    console.log('[NewBooking] Remove client pressed');
                    setSelectedClient(null);
                    setIsWalkIn(false);
                  }}
                  style={{ padding: 4 }}
                >
                  <X size={16} color={P.textSecondary} />
                </TouchableOpacity>
              )}
              <ChevronRight size={18} color={P.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Date & Time section */}
        <View style={styles.section}>
          <View style={styles.dateTimeCard}>
            <TouchableOpacity
              style={styles.dateTimeRow}
              onPress={() => { console.log('[NewBooking] Date row pressed'); setShowDatePicker(true); }}
            >
              <Calendar size={16} color={P.textSecondary} />
              <Text style={styles.dateTimeText}>{dateLabel}</Text>
            </TouchableOpacity>
            <View style={styles.dateTimeDivider} />
            <TouchableOpacity
              style={styles.dateTimeRow}
              onPress={() => { console.log('[NewBooking] Time row pressed'); setShowTimePicker(true); }}
            >
              <Clock size={16} color={P.textSecondary} />
              <Text style={styles.dateTimeText}>{timeLabel}</Text>
            </TouchableOpacity>
            <View style={styles.dateTimeDivider} />
            <TouchableOpacity style={styles.dateTimeRow} onPress={() => console.log('[NewBooking] Repeat row pressed')}>
              <RefreshCw size={16} color={P.textSecondary} />
              <Text style={styles.dateTimeText}>Doesn't repeat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Services section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionHeader}>Services</Text>

          {selectedServices.length === 0 ? (
            <View style={styles.emptyServicesCard}>
              <View style={styles.emptyServicesIcon}>
                <Text style={{ fontSize: 32 }}>✂️</Text>
              </View>
              <Text style={styles.emptyServicesText}>Add a service to save the appointment</Text>
            </View>
          ) : (
            selectedServices.map(svc => {
              const priceStr = Number(svc.price_bhd).toFixed(0);
              const barberName = selectedBarber?.display_name ?? 'Any';
              const svcTimeLabel = formatTimeLabel(selectedTime.h, selectedTime.m);
              return (
                <View key={svc.id} style={styles.serviceCard}>
                  <View style={styles.serviceCardBar} />
                  <View style={styles.serviceCardContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceCardName}>{svc.name}</Text>
                      <Text style={styles.serviceCardMeta}>
                        {svcTimeLabel} · {svc.duration_minutes}min · {barberName}
                      </Text>
                      <TouchableOpacity
                        style={styles.teamWarning}
                        onPress={() => { console.log('[NewBooking] Team member warning pressed'); setShowBarberSheet(true); }}
                      >
                        <AlertTriangle size={12} color={P.warning} />
                        <Text style={styles.teamWarningText}>Team member not available</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.serviceCardPrice}>BHD {priceStr}</Text>
                  </View>
                </View>
              );
            })
          )}

          <TouchableOpacity
            style={styles.addServiceBtn}
            onPress={() => { console.log('[NewBooking] Add service pressed'); setShowServiceSheet(true); }}
          >
            <Plus size={16} color={P.textSecondary} />
            <Text style={styles.addServiceBtnText}>Add service</Text>
          </TouchableOpacity>
        </View>

        {/* Total row */}
        {selectedServices.length > 0 && (
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ChevronRight size={14} color={P.textSecondary} />
                <Text style={styles.totalValue}>BHD {totalPriceStr}</Text>
              </View>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>To pay</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ChevronRight size={14} color={P.textSecondary} />
                <Text style={[styles.totalValue, { fontWeight: '700', color: P.text }]}>BHD {totalPriceStr}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Add to cart section */}
        {selectedServices.length > 0 && (
          <View style={styles.cartSection}>
            <Text style={styles.sectionHeader}>Add to cart</Text>
            <View style={styles.cartCard}>
              <TouchableOpacity style={styles.cartAddClientRow} onPress={() => {
                console.log('[NewBooking] Cart add client pressed');
                setShowClientSheet(true);
              }}>
                <View style={styles.cartAddClientIcon}>
                  <UserPlus size={18} color={P.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartAddClientTitle}>Add client</Text>
                  <Text style={styles.cartAddClientSub}>Leave empty for walk-ins</Text>
                </View>
              </TouchableOpacity>
              {selectedServices.map(svc => {
                const svcPriceStr = Number(svc.price_bhd).toFixed(0);
                const barberName = selectedBarber?.display_name ?? 'Any';
                return (
                  <View key={svc.id} style={styles.cartServiceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartServiceName}>{svc.name}</Text>
                      <Text style={styles.cartServiceMeta}>{svc.duration_minutes}min · {barberName}</Text>
                    </View>
                    <Text style={styles.cartServicePrice}>BHD {svcPriceStr}</Text>
                  </View>
                );
              })}
              <TouchableOpacity style={styles.cartAddBtn} onPress={() => {
                console.log('[NewBooking] Cart add to cart pressed');
                setShowServiceSheet(true);
              }}>
                <Plus size={14} color={P.textSecondary} />
                <Text style={styles.cartAddBtnText}>Add to cart</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotalLabel}>Total</Text>
              <Text style={styles.cartTotalValue}>BHD {totalPriceStr}</Text>
            </View>
            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotalLabel}>To pay</Text>
              <Text style={[styles.cartTotalValue, { color: P.text, fontWeight: '700' }]}>BHD {totalPriceStr}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB for Add sheet */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => {
          console.log('[NewBooking] FAB pressed — opening Add sheet');
          setShowAddSheet(true);
        }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.footerMoreBtn} onPress={() => console.log('[NewBooking] Footer more pressed')}>
          <MoreVertical size={20} color={P.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.checkoutBtn, !canCheckout && styles.checkoutBtnDisabled]}
          disabled={!canCheckout}
          onPress={handleCheckout}
        >
          <Text style={[styles.checkoutBtnText, !canCheckout && styles.checkoutBtnTextDisabled]}>Checkout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Client Selector Sheet ── */}
      <Modal visible={showClientSheet} transparent animationType="slide" onRequestClose={() => setShowClientSheet(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '85%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select client</Text>
              <TouchableOpacity onPress={() => setShowClientSheet(false)}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search client or leave empty for walk-in"
                placeholderTextColor={P.textTertiary}
                value={clientSearch}
                onChangeText={setClientSearch}
                autoFocus
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Add new client */}
              <TouchableOpacity
                style={styles.clientOptionRow}
                onPress={() => {
                  console.log('[NewBooking] Add new client pressed');
                  setShowClientSheet(false);
                }}
              >
                <View style={styles.clientOptionIcon}>
                  <Plus size={18} color={P.text} />
                </View>
                <Text style={styles.clientOptionText}>Add new client</Text>
              </TouchableOpacity>

              {/* Walk-In */}
              <TouchableOpacity
                style={styles.clientOptionRow}
                onPress={() => {
                  console.log('[NewBooking] Walk-In selected');
                  setIsWalkIn(true);
                  setSelectedClient(null);
                  setShowClientSheet(false);
                }}
              >
                <View style={styles.clientOptionIcon}>
                  <Users size={18} color={P.text} />
                </View>
                <Text style={styles.clientOptionText}>Walk-In</Text>
              </TouchableOpacity>

              {/* Client list */}
              {(clientSearch.length > 0 ? clients : DEMO_CLIENTS).map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.clientRow}
                  onPress={() => {
                    console.log('[NewBooking] Client selected:', c.id, c.full_name);
                    setSelectedClient(c);
                    setIsWalkIn(false);
                    setShowClientSheet(false);
                  }}
                >
                  <View style={styles.clientAvatar}>
                    <Text style={styles.clientAvatarText}>{c.full_name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>{c.full_name}</Text>
                    <Text style={styles.clientSub}>{c.email ?? c.phone ?? ''}</Text>
                  </View>
                  {selectedClient?.id === c.id && <Check size={16} color={P.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Service Selector Sheet ── */}
      <Modal visible={showServiceSheet} transparent animationType="slide" onRequestClose={() => setShowServiceSheet(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '85%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select service</Text>
              <TouchableOpacity onPress={() => setShowServiceSheet(false)}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search services"
                placeholderTextColor={P.textTertiary}
                autoFocus
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loading ? (
                <ActivityIndicator color={P.accent} style={{ marginTop: 20 }} />
              ) : (
                services.map(s => {
                  const isSelected = selectedServices.some(ss => ss.id === s.id);
                  const priceStr = Number(s.price_bhd).toFixed(0);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.serviceSheetRow, isSelected && styles.serviceSheetRowSelected]}
                      onPress={() => {
                        console.log('[NewBooking] Service toggled:', s.id, s.name);
                        setSelectedServices(prev =>
                          isSelected ? prev.filter(ss => ss.id !== s.id) : [...prev, s]
                        );
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.serviceSheetName, isSelected && { color: P.accent }]}>{s.name}</Text>
                        <Text style={styles.serviceSheetMeta}>{s.duration_minutes} min</Text>
                      </View>
                      <Text style={styles.serviceSheetPrice}>BHD {priceStr}</Text>
                      {isSelected && <Check size={16} color={P.accent} style={{ marginLeft: 8 }} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.sheetFooterBtn}>
              <TouchableOpacity
                style={styles.sheetDoneBtn}
                onPress={() => {
                  console.log('[NewBooking] Service selection done, count:', selectedServices.length);
                  setShowServiceSheet(false);
                }}
              >
                <Text style={styles.sheetDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Barber Selector Sheet ── */}
      <Modal visible={showBarberSheet} transparent animationType="slide" onRequestClose={() => setShowBarberSheet(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '75%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select team member</Text>
              <TouchableOpacity onPress={() => setShowBarberSheet(false)}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Any available */}
              <TouchableOpacity
                style={[styles.barberSheetRow, !selectedBarber && styles.barberSheetRowSelected]}
                onPress={() => {
                  console.log('[NewBooking] Any barber selected');
                  setSelectedBarber(null);
                  setShowBarberSheet(false);
                }}
              >
                <View style={styles.barberSheetAvatar}>
                  <Users size={18} color={P.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.barberSheetName}>Any available</Text>
                </View>
                {!selectedBarber && <Check size={16} color={P.accent} />}
              </TouchableOpacity>

              {barbers.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.barberSheetRow, selectedBarber?.id === b.id && styles.barberSheetRowSelected]}
                  onPress={() => {
                    console.log('[NewBooking] Barber selected:', b.id, b.display_name);
                    setSelectedBarber(b);
                    setShowBarberSheet(false);
                  }}
                >
                  {b.avatar_url ? (
                    <Image source={resolveImageSource(b.avatar_url)} style={styles.barberSheetAvatarImg} />
                  ) : (
                    <View style={styles.barberSheetAvatar}>
                      <Text style={styles.barberSheetAvatarText}>{b.display_name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.barberSheetName}>{b.display_name}</Text>
                    {b.specialty && <Text style={styles.barberSheetSub}>{b.specialty}</Text>}
                  </View>
                  {selectedBarber?.id === b.id && <Check size={16} color={P.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Date Picker Sheet ── */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Month label */}
            <Text style={styles.calMonthLabel}>
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>

            {/* Day headers */}
            <View style={styles.calDayHeaders}>
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <Text key={i} style={styles.calDayHeader}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calGrid}>
              {calendarDays.map((d, i) => {
                const isSelected = d.toDateString() === selectedDate.toDateString();
                const isToday = d.toDateString() === new Date().toDateString();
                const isPast = d < new Date(new Date().setHours(0,0,0,0));
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.calCell, isSelected && styles.calCellSelected]}
                    onPress={() => {
                      if (!isPast) {
                        console.log('[NewBooking] Date picker date selected:', d.toDateString());
                        setSelectedDate(d);
                        setShowDatePicker(false);
                      }
                    }}
                    disabled={isPast}
                  >
                    <Text style={[
                      styles.calCellText,
                      isSelected && styles.calCellTextSelected,
                      isToday && !isSelected && styles.calCellTextToday,
                      isPast && styles.calCellTextPast,
                    ]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Time Picker Sheet ── */}
      <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '70%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select time</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map((slot, i) => {
                  const isSelected = selectedTime.h === slot.h && selectedTime.m === slot.m;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.timeSlot, isSelected && styles.timeSlotActive]}
                      onPress={() => {
                        console.log('[NewBooking] Time selected:', slot.label);
                        setSelectedTime({ h: slot.h, m: slot.m });
                        setShowTimePicker(false);
                      }}
                    >
                      <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextActive]}>{slot.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add Sheet ── */}
      <Modal visible={showAddSheet} transparent animationType="slide" onRequestClose={() => setShowAddSheet(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add</Text>
              <TouchableOpacity onPress={() => {
                console.log('[NewBooking] Add sheet closed');
                setShowAddSheet(false);
              }}>
                <X size={20} color={P.textSecondary} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'Appointment', icon: '📅' },
              { label: 'Group appointment', icon: '👥' },
              { label: 'Blocked time', icon: '🚫' },
              { label: 'Sale', icon: '🏷️' },
              { label: 'Quick payment', icon: '💳' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.addSheetRow} onPress={() => {
                console.log('[NewBooking] Add sheet item pressed:', item.label);
                setShowAddSheet(false);
              }}>
                <View style={styles.addSheetIcon}>
                  <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                </View>
                <Text style={styles.addSheetLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  headerDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerDateText: { color: P.text, fontSize: 17, fontWeight: '700' },
  statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: P.border, backgroundColor: P.surface },
  statusBtnText: { color: P.text, fontSize: 13, fontWeight: '600' },
  closeBtn: { marginLeft: 'auto' as any, padding: 4 },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 10 },
  servicesSection: { paddingHorizontal: 16, marginBottom: 10 },
  sectionHeader: { color: P.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // Add client row
  addClientRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: P.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: P.border },
  addClientLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addClientTitle: { color: P.text, fontSize: 15, fontWeight: '600' },
  addClientSub: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  addClientName: { color: P.text, fontSize: 15, fontWeight: '600' },
  addClientRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Date & time card
  dateTimeCard: { backgroundColor: P.surface, borderRadius: 14, borderWidth: 1, borderColor: P.border, overflow: 'hidden' },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  dateTimeText: { color: P.text, fontSize: 14, fontWeight: '500' },
  dateTimeDivider: { height: 1, backgroundColor: P.divider, marginHorizontal: 16 },

  // Service card
  serviceCard: { flexDirection: 'row', backgroundColor: P.surface, borderRadius: 12, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: P.border },
  serviceCardBar: { width: 4, backgroundColor: P.accent },
  serviceCardContent: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 8 },
  serviceCardName: { color: P.text, fontSize: 14, fontWeight: '700' },
  serviceCardMeta: { color: P.textSecondary, fontSize: 12, marginTop: 3 },
  serviceCardPrice: { color: P.text, fontSize: 14, fontWeight: '700' },
  teamWarning: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  teamWarningText: { color: P.warning, fontSize: 11 },

  // Empty services
  emptyServicesCard: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyServicesIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  emptyServicesText: { color: P.textSecondary, fontSize: 14, textAlign: 'center' },

  // Add service button
  addServiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 4 },
  addServiceBtnText: { color: P.textSecondary, fontSize: 14, fontWeight: '600' },

  // Total
  totalSection: { paddingHorizontal: 16, marginBottom: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  totalLabel: { color: P.textSecondary, fontSize: 14 },
  totalValue: { color: P.textSecondary, fontSize: 14, fontWeight: '600' },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: P.surface, borderTopWidth: 1, borderTopColor: P.border },
  footerMoreBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: P.border, alignItems: 'center', justifyContent: 'center' },
  checkoutBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: P.text, alignItems: 'center' },
  checkoutBtnDisabled: { borderColor: P.border },
  checkoutBtnText: { color: P.text, fontSize: 15, fontWeight: '700' },
  checkoutBtnTextDisabled: { color: P.textTertiary },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: P.text, alignItems: 'center' },
  saveBtnText: { color: P.bg, fontSize: 15, fontWeight: '700' },

  // Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: P.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: P.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  sheetTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  sheetFooterBtn: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.divider },
  sheetDoneBtn: { backgroundColor: P.text, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sheetDoneBtnText: { color: P.bg, fontSize: 15, fontWeight: '700' },

  // Search
  searchRow: { paddingHorizontal: 16, paddingBottom: 12 },
  searchInput: { backgroundColor: P.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: P.text, fontSize: 14, borderWidth: 1, borderColor: P.border },

  // Client sheet
  clientOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: P.divider },
  clientOptionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: P.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  clientOptionText: { color: P.text, fontSize: 15, fontWeight: '600' },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: P.divider },
  clientAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  clientAvatarText: { color: P.accent, fontSize: 15, fontWeight: '700' },
  clientName: { color: P.text, fontSize: 14, fontWeight: '600' },
  clientSub: { color: P.textSecondary, fontSize: 12, marginTop: 2 },

  // Service sheet
  serviceSheetRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: P.divider },
  serviceSheetRowSelected: { backgroundColor: P.accentLight },
  serviceSheetName: { color: P.text, fontSize: 14, fontWeight: '600' },
  serviceSheetMeta: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  serviceSheetPrice: { color: P.gold, fontSize: 14, fontWeight: '600' },

  // Barber sheet
  barberSheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: P.divider },
  barberSheetRowSelected: { backgroundColor: P.accentLight },
  barberSheetAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  barberSheetAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  barberSheetAvatarText: { color: P.accent, fontSize: 16, fontWeight: '700' },
  barberSheetName: { color: P.text, fontSize: 14, fontWeight: '600' },
  barberSheetSub: { color: P.textSecondary, fontSize: 12, marginTop: 2 },

  // Date picker
  calMonthLabel: { color: P.text, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  calDayHeaders: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 },
  calDayHeader: { flex: 1, textAlign: 'center', color: P.textSecondary, fontSize: 12, fontWeight: '600' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 16 },
  calCell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  calCellSelected: { backgroundColor: P.accent },
  calCellText: { color: P.text, fontSize: 14, fontWeight: '500' },
  calCellTextSelected: { color: '#fff', fontWeight: '700' },
  calCellTextToday: { color: P.accent, fontWeight: '700' },
  calCellTextPast: { color: P.textTertiary },

  // Time picker
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  timeSlot: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: P.surfaceElevated, borderWidth: 1, borderColor: P.border },
  timeSlotActive: { backgroundColor: P.accent, borderColor: P.accent },
  timeSlotText: { color: P.textSecondary, fontSize: 13 },
  timeSlotTextActive: { color: '#fff', fontWeight: '600' },

  // FAB
  fab: { position: 'absolute', right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: P.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8 },

  // Add sheet
  addSheetRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: P.divider },
  addSheetIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: P.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  addSheetLabel: { color: P.text, fontSize: 16, fontWeight: '500' },

  // Cart section
  cartSection: { paddingHorizontal: 16, marginBottom: 10 },
  cartCard: { backgroundColor: P.surface, borderRadius: 14, borderWidth: 1, borderColor: P.border, overflow: 'hidden', marginBottom: 10 },
  cartAddClientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: P.divider },
  cartAddClientIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  cartAddClientTitle: { color: P.text, fontSize: 14, fontWeight: '600' },
  cartAddClientSub: { color: P.textSecondary, fontSize: 12, marginTop: 1 },
  cartServiceRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: P.divider },
  cartServiceName: { color: P.text, fontSize: 14, fontWeight: '600' },
  cartServiceMeta: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  cartServicePrice: { color: P.gold, fontSize: 14, fontWeight: '700' },
  cartAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  cartAddBtnText: { color: P.textSecondary, fontSize: 13 },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  cartTotalLabel: { color: P.textSecondary, fontSize: 14 },
  cartTotalValue: { color: P.textSecondary, fontSize: 14 },
});
