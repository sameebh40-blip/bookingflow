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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Save, User, Calendar, DollarSign, Clock } from 'lucide-react-native';
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

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

interface Booking {
  id: string;
  start_at: string;
  status: string;
  price_bhd: number;
  booking_services?: { service_name_en: string }[];
}

function statusColor(status: string) {
  if (status === 'confirmed') return P.success;
  if (status === 'pending') return P.warning;
  if (status === 'cancelled') return P.danger;
  return P.accent;
}

export default function ClientDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: clientId } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [clientProfile, setClientProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clientId || !shopId) return;
    console.log('[ClientDetail] Fetching data for client:', clientId);
    try {
      const [profileRes, bookingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', clientId).single(),
        supabase
          .from('bookings')
          .select('id, start_at, status, price_bhd, booking_services(service_name_en)')
          .eq('shop_id', shopId)
          .eq('customer_profile_id', clientId)
          .order('start_at', { ascending: false }),
      ]);
      setClientProfile(profileRes.data as Profile);
      setBookings((bookingsRes.data as Booking[]) ?? []);

      // Try to load existing note
      try {
        const { data: noteData } = await supabase
          .from('customer_notes')
          .select('note')
          .eq('customer_profile_id', clientId)
          .eq('shop_id', shopId)
          .single();
        if (noteData) setNote(noteData.note ?? '');
      } catch {
        // table may not exist
      }
    } catch (err) {
      console.log('[ClientDetail] fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, shopId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveNote = async () => {
    if (!clientId || !shopId) return;
    console.log('[ClientDetail] Save note pressed');
    setSavingNote(true);
    try {
      await supabase.from('customer_notes').upsert({
        customer_profile_id: clientId,
        shop_id: shopId,
        note,
        created_at: new Date().toISOString(),
      }, { onConflict: 'customer_profile_id,shop_id' });
      console.log('[ClientDetail] Note saved');
    } catch (err) {
      console.log('[ClientDetail] saveNote error (non-fatal):', err);
    } finally {
      setSavingNote(false);
    }
  };

  const totalVisits = bookings.filter(b => b.status !== 'cancelled').length;
  const totalSpend = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + Number(b.price_bhd), 0);
  const lastVisit = bookings.find(b => b.status === 'completed');
  const lastVisitText = lastVisit ? new Date(lastVisit.start_at).toLocaleDateString() : 'Never';
  const memberSince = clientProfile?.created_at ? new Date(clientProfile.created_at).toLocaleDateString() : '—';
  const totalSpendText = totalSpend.toFixed(3);

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
        <TouchableOpacity onPress={() => { console.log('[ClientDetail] Back pressed'); router.back(); }} style={styles.backBtn}>
          <ChevronLeft size={22} color={P.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          {clientProfile?.avatar_url ? (
            <Image source={resolveImageSource(clientProfile.avatar_url)} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{clientProfile?.full_name?.charAt(0) ?? '?'}</Text>
            </View>
          )}
          <Text style={styles.clientName}>{clientProfile?.full_name ?? 'Unknown'}</Text>
          {clientProfile?.email && <Text style={styles.clientContact}>{clientProfile.email}</Text>}
          {clientProfile?.phone && <Text style={styles.clientContact}>{clientProfile.phone}</Text>}
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Calendar size={18} color={P.accent} />
            <Text style={styles.statValue}>{totalVisits}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSign size={18} color={P.gold} />
            <Text style={styles.statValue}>BHD {totalSpendText}</Text>
            <Text style={styles.statLabel}>Total Spend</Text>
          </View>
          <View style={styles.statCard}>
            <Clock size={18} color={P.success} />
            <Text style={styles.statValue}>{lastVisitText}</Text>
            <Text style={styles.statLabel}>Last Visit</Text>
          </View>
        </View>

        {/* Booking history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking History</Text>
          {bookings.length === 0 ? (
            <Text style={styles.emptyText}>No bookings yet</Text>
          ) : (
            bookings.map(b => {
              const dateText = new Date(b.start_at).toLocaleDateString();
              const serviceName = b.booking_services?.[0]?.service_name_en ?? 'Service';
              const priceText = `BHD ${Number(b.price_bhd).toFixed(3)}`;
              return (
                <View key={b.id} style={styles.bookingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingDate}>{dateText}</Text>
                    <Text style={styles.bookingService}>{serviceName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.badge, { backgroundColor: statusColor(b.status) + '22' }]}>
                      <Text style={[styles.badgeText, { color: statusColor(b.status) }]}>{b.status}</Text>
                    </View>
                    <Text style={styles.priceText}>{priceText}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note about this client..."
            placeholderTextColor={P.textTertiary}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity style={styles.saveNoteBtn} onPress={saveNote} disabled={savingNote}>
            {savingNote ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Save size={16} color="#fff" />
                <Text style={styles.saveNoteBtnText}>Save Note</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.surface, alignItems: 'center', justifyContent: 'center' },
  profileHeader: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarInitial: { color: P.accent, fontSize: 32, fontWeight: '700' },
  clientName: { color: P.text, fontSize: 20, fontWeight: '700' },
  clientContact: { color: P.textSecondary, fontSize: 14 },
  memberSince: { color: P.textTertiary, fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: P.surface, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: P.border },
  statValue: { color: P.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  statLabel: { color: P.textSecondary, fontSize: 10 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { color: P.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: P.textTertiary, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: P.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: P.border },
  bookingDate: { color: P.text, fontSize: 14, fontWeight: '600' },
  bookingService: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  priceText: { color: P.gold, fontSize: 12, fontWeight: '600' },
  noteInput: { backgroundColor: P.surface, borderRadius: 10, padding: 14, color: P.text, borderWidth: 1, borderColor: P.border, minHeight: 100, textAlignVertical: 'top', fontSize: 14 },
  saveNoteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: P.accent, paddingVertical: 12, borderRadius: 10, marginTop: 10 },
  saveNoteBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
