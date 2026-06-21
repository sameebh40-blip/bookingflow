import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react-native';
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

type Period = '7days' | '30days' | 'month';

interface BookingRow {
  start_at: string;
  price_bhd: number;
  status: string;
  payment_method: string;
}

interface DayData {
  label: string;
  revenue: number;
}

function BarChart({ data }: { data: DayData[] }) {
  const maxRev = Math.max(...data.map(d => d.revenue), 1);
  const anims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(60, anims.map(a =>
      Animated.timing(a, { toValue: 1, duration: 600, useNativeDriver: false })
    )).start();
  }, [data.length]);

  return (
    <View style={chartStyles.container}>
      {data.map((d, i) => {
        const heightPct = d.revenue / maxRev;
        const barHeight = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, heightPct * 120] });
        const revText = d.revenue > 0 ? d.revenue.toFixed(2) : '';
        return (
          <View key={i} style={chartStyles.barWrap}>
            <Text style={chartStyles.barValue}>{revText}</Text>
            <View style={chartStyles.barTrack}>
              <Animated.View style={[chartStyles.bar, { height: barHeight }]} />
            </View>
            <Text style={chartStyles.barLabel}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 6, paddingHorizontal: 4 },
  barWrap: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { color: P.textSecondary, fontSize: 8 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: P.surfaceElevated, borderRadius: 4 },
  bar: { backgroundColor: P.accent, borderRadius: 4, width: '100%' },
  barLabel: { color: P.textTertiary, fontSize: 9 },
});

export default function PartnerSales() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [period, setPeriod] = useState<Period>('7days');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const now = new Date();
    let since: Date;
    if (period === '7days') {
      since = new Date(now.getTime() - 7 * 24 * 3600000);
    } else if (period === '30days') {
      since = new Date(now.getTime() - 30 * 24 * 3600000);
    } else {
      since = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    console.log('[Sales] Fetching data, period:', period, 'since:', since.toISOString());
    try {
      const { data } = await supabase
        .from('bookings')
        .select('start_at, price_bhd, status, payment_method')
        .eq('shop_id', shopId)
        .gte('start_at', since.toISOString())
        .order('start_at');
      setBookings((data as BookingRow[]) ?? []);
      console.log('[Sales] Loaded', data?.length ?? 0, 'bookings');
    } catch (err) {
      console.log('[Sales] fetchData error:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [shopId, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const completed = bookings.filter(b => b.status === 'completed');
  const totalRevenue = completed.reduce((sum, b) => sum + Number(b.price_bhd), 0);
  const totalAppointments = bookings.length;
  const avgPerBooking = completed.length > 0 ? totalRevenue / completed.length : 0;

  // Build bar chart data
  const days = period === '7days' ? 7 : period === '30days' ? 30 : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const barData: DayData[] = Array.from({ length: Math.min(days, 14) }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (Math.min(days, 14) - 1 - i));
    const dayStr = d.toDateString();
    const rev = completed.filter(b => new Date(b.start_at).toDateString() === dayStr).reduce((sum, b) => sum + Number(b.price_bhd), 0);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
    return { label, revenue: rev };
  });

  // Top services
  const serviceMap = new Map<string, { count: number; revenue: number }>();
  for (const b of completed) {
    const key = 'Service';
    const existing = serviceMap.get(key) ?? { count: 0, revenue: 0 };
    serviceMap.set(key, { count: existing.count + 1, revenue: existing.revenue + Number(b.price_bhd) });
  }

  // Payment methods
  const paymentMap = new Map<string, number>();
  for (const b of bookings) {
    const method = b.payment_method ?? 'cash';
    paymentMap.set(method, (paymentMap.get(method) ?? 0) + 1);
  }
  const totalPayments = bookings.length || 1;

  const totalRevenueText = totalRevenue.toFixed(3);
  const avgText = avgPerBooking.toFixed(3);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sales</Text>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {(['7days', '30days', 'month'] as Period[]).map(p => {
          const labels: Record<Period, string> = { '7days': '7 Days', '30days': '30 Days', month: 'This Month' };
          const isActive = period === p;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, isActive && styles.periodBtnActive]}
              onPress={() => { console.log('[Sales] Period changed:', p); setPeriod(p); }}
            >
              <Text style={[styles.periodText, isActive && styles.periodTextActive]}>{labels[p]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={P.accent} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Summary cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <TrendingUp size={18} color={P.gold} />
              <Text style={styles.statValue}>BHD {totalRevenueText}</Text>
              <Text style={styles.statLabel}>Total Revenue</Text>
            </View>
            <View style={styles.statCard}>
              <Calendar size={18} color={P.accent} />
              <Text style={styles.statValue}>{totalAppointments}</Text>
              <Text style={styles.statLabel}>Appointments</Text>
            </View>
            <View style={styles.statCard}>
              <DollarSign size={18} color={P.success} />
              <Text style={styles.statValue}>BHD {avgText}</Text>
              <Text style={styles.statLabel}>Avg / Booking</Text>
            </View>
          </View>

          {/* Bar chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Revenue Trend</Text>
            <BarChart data={barData} />
          </View>

          {/* Payment methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            {Array.from(paymentMap.entries()).map(([method, count]) => {
              const pct = Math.round((count / totalPayments) * 100);
              return (
                <View key={method} style={styles.paymentRow}>
                  <Text style={styles.paymentMethod}>{method.charAt(0).toUpperCase() + method.slice(1)}</Text>
                  <View style={styles.paymentBarTrack}>
                    <View style={[styles.paymentBar, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.paymentPct}>{pct}%</Text>
                </View>
              );
            })}
            {paymentMap.size === 0 && <Text style={styles.emptyText}>No payment data</Text>}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  periodRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: P.surface, borderWidth: 1, borderColor: P.border },
  periodBtnActive: { backgroundColor: P.accent, borderColor: P.accent },
  periodText: { color: P.textSecondary, fontSize: 13, fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: P.surface, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: P.border },
  statValue: { color: P.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  statLabel: { color: P.textSecondary, fontSize: 10 },
  chartCard: { backgroundColor: P.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: P.border },
  chartTitle: { color: P.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  section: { marginBottom: 16 },
  sectionTitle: { color: P.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  paymentMethod: { color: P.textSecondary, fontSize: 13, width: 70 },
  paymentBarTrack: { flex: 1, height: 8, backgroundColor: P.surfaceElevated, borderRadius: 4, overflow: 'hidden' },
  paymentBar: { height: '100%', backgroundColor: P.accent, borderRadius: 4 },
  paymentPct: { color: P.textSecondary, fontSize: 12, width: 36, textAlign: 'right' },
  emptyText: { color: P.textTertiary, fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});
