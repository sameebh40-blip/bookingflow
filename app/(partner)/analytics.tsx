import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ArrowLeft, TrendingUp, Users, Briefcase, Zap, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 64;
const CHART_H = 140;

const P = {
  bg: '#0B0C10', card: '#1A1B20', border: '#2A2B30',
  accent: '#7C3AED', accentLight: '#9F67FF',
  text: '#F0F0FF', textSec: '#9090B0', textTer: '#5A5A7A',
  green: '#10B981', amber: '#F59E0B', amberBg: '#451A03',
  danger: '#E85454', dangerBg: '#3B0A0A',
};

type Snapshot = {
  month_label: string;
  revenue: number;
  new_clients: number;
  appointments: number;
};

const DEMO_SNAPSHOTS: Snapshot[] = [
  { month_label: 'Jan', revenue: 1200,   new_clients: 45,  appointments: 60  },
  { month_label: 'Feb', revenue: 1850,   new_clients: 78,  appointments: 95  },
  { month_label: 'Mar', revenue: 2400,   new_clients: 120, appointments: 140 },
  { month_label: 'Apr', revenue: 1950,   new_clients: 95,  appointments: 110 },
  { month_label: 'May', revenue: 3079.92, new_clients: 276, appointments: 180 },
];

function AreaChart({ data }: { data: Snapshot[] }) {
  if (!data.length) return null;

  const maxVal = Math.max(...data.map(d => d.revenue), 1);
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * CHART_W,
    y: CHART_H - (d.revenue / maxVal) * (CHART_H - 20),
  }));

  let pathD = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 3;
    const cp1y = pts[i - 1].y;
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) / 3;
    const cp2y = pts[i].y;
    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i].x} ${pts[i].y}`;
  }

  const fillD = pathD + ` L ${pts[pts.length - 1].x} ${CHART_H} L ${pts[0].x} ${CHART_H} Z`;

  const monthLabels = data.map(d => d.month_label);

  return (
    <View>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#7C3AED" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Path d={fillD} fill="url(#chartGrad)" />
        <Path d={pathD} stroke="#9F67FF" strokeWidth={2.5} fill="none" />
        {pts.map((pt, i) => (
          <Path
            key={i}
            d={`M ${pt.x} ${pt.y} L ${pt.x} ${CHART_H}`}
            stroke="#2A2B30"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        {monthLabels.map(label => (
          <Text key={label} style={{ color: '#5A5A7A', fontSize: 11 }}>{label}</Text>
        ))}
      </View>
    </View>
  );
}

function PartnerAnalyticsInner() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const shopId = (profile as any)?.shop_id;

  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<Snapshot[]>(DEMO_SNAPSHOTS);
  const [pendingAmount, setPendingAmount] = useState(3800.00);
  const [activeBookings, setActiveBookings] = useState(13);

  const fetchData = useCallback(async () => {
    console.log('[Analytics] Fetching data for shop_id:', shopId);
    setLoading(true);
    try {
      if (shopId) {
        const { data: snaps, error: snapsError } = await supabase
          .from('analytics_snapshots')
          .select('month_label, revenue, new_clients, appointments')
          .eq('shop_id', shopId)
          .order('month_year', { ascending: true })
          .limit(6);

        if (snapsError) {
          console.log('[Analytics] analytics_snapshots fetch error (using demo):', snapsError.message);
        } else if (snaps && snaps.length > 0) {
          console.log('[Analytics] Loaded', snaps.length, 'snapshots from Supabase');
          setSnapshots(snaps as Snapshot[]);
        } else {
          console.log('[Analytics] No snapshots found, using demo data');
        }

        const { data: invoices, error: invoicesError } = await supabase
          .from('pending_invoices')
          .select('amount')
          .eq('shop_id', shopId)
          .eq('status', 'pending');

        if (invoicesError) {
          console.log('[Analytics] pending_invoices fetch error (using demo):', invoicesError.message);
        } else if (invoices) {
          const total = invoices.reduce((s: number, i: any) => s + Number(i.amount), 0);
          console.log('[Analytics] Pending invoices total:', total);
          if (total > 0) setPendingAmount(total);
        }

        const { count, error: bookingsError } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('shop_id', shopId)
          .eq('status', 'confirmed');

        if (bookingsError) {
          console.log('[Analytics] bookings count error (using demo):', bookingsError.message);
        } else if (count !== null) {
          console.log('[Analytics] Active bookings count:', count);
          setActiveBookings(count);
        }
      } else {
        console.log('[Analytics] No shop_id, using demo data');
      }
    } catch (e) {
      console.log('[Analytics] Unexpected fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBackPress = useCallback(() => {
    console.log('[Analytics] Back button pressed');
    router.back();
  }, []);

  const latest = snapshots[snapshots.length - 1] ?? DEMO_SNAPSHOTS[4];
  const totalRevenue = snapshots.reduce((s, d) => s + d.revenue, 0);

  const latestRevenue = latest.revenue.toFixed(2);
  const latestClients = String(latest.new_clients);
  const latestActiveBookings = String(activeBookings);
  const avgPerBooking = latest.appointments > 0
    ? (latest.revenue / latest.appointments).toFixed(1)
    : '0';
  const pendingAmountDisplay = pendingAmount.toFixed(2);
  const totalRevenueDisplay = totalRevenue.toFixed(0);
  const maxRevenue = Math.max(...snapshots.map(s => s.revenue), 1);

  const metricCards = [
    { label: 'Monthly Revenue', value: `BHD ${latestRevenue}`,      icon: TrendingUp, color: P.green,   sub: '+12% vs last month' },
    { label: 'New Clients',     value: latestClients,                icon: Users,      color: P.accent,  sub: 'This month' },
    { label: 'Active Bookings', value: latestActiveBookings,         icon: Briefcase,  color: P.amber,   sub: 'Confirmed' },
    { label: 'Avg per Booking', value: `BHD ${avgPerBooking}`,       icon: Zap,        color: '#06B6D4', sub: 'Revenue / appt' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
            <ArrowLeft size={22} color={P.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator color={P.accent} size="large" />
          </View>
        ) : (
          <>
            {/* 2-col metrics grid */}
            <View style={styles.metricsGrid}>
              {metricCards.map((card) => {
                const Icon = card.icon;
                const cardColor = card.color;
                const iconBg = cardColor + '22';
                return (
                  <View key={card.label} style={styles.metricCard}>
                    <View style={[styles.metricIconWrap, { backgroundColor: iconBg }]}>
                      <Icon size={18} color={cardColor} />
                    </View>
                    <Text style={styles.metricValue}>{card.value}</Text>
                    <Text style={styles.metricLabel}>{card.label}</Text>
                    <Text style={[styles.metricSub, { color: cardColor }]}>{card.sub}</Text>
                  </View>
                );
              })}
            </View>

            {/* Payments card with chart */}
            <View style={styles.paymentsCard}>
              <View style={styles.paymentsHeader}>
                <View>
                  <Text style={styles.paymentsTitle}>Payments</Text>
                  <Text style={styles.paymentsAmount}>BHD {pendingAmountDisplay}</Text>
                  <View style={styles.pendingBadge}>
                    <AlertCircle size={12} color={P.amber} />
                    <Text style={styles.pendingBadgeText}>Pending Invoices</Text>
                  </View>
                </View>
                <View style={styles.totalRevWrap}>
                  <Text style={styles.totalRevLabel}>Total (5mo)</Text>
                  <Text style={styles.totalRevValue}>BHD {totalRevenueDisplay}</Text>
                </View>
              </View>
              <View style={styles.chartWrap}>
                <AreaChart data={snapshots} />
              </View>
            </View>

            {/* Monthly breakdown */}
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Monthly Breakdown</Text>
              {[...snapshots].reverse().map((snap, i) => {
                const barWidth = `${(snap.revenue / maxRevenue) * 100}%` as `${number}%`;
                const revenueDisplay = snap.revenue.toFixed(0);
                const isLast = i === snapshots.length - 1;
                return (
                  <View
                    key={snap.month_label}
                    style={[styles.breakdownRow, !isLast && styles.breakdownDivider]}
                  >
                    <Text style={styles.breakdownMonth}>{snap.month_label}</Text>
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <View style={styles.breakdownBar}>
                        <View style={[styles.breakdownBarFill, { width: barWidth }]} />
                      </View>
                    </View>
                    <Text style={styles.breakdownAmount}>BHD {revenueDisplay}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: P.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.border,
  },
  headerTitle: { color: P.text, fontSize: 22, fontWeight: '800' },
  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    paddingHorizontal: 16, marginBottom: 16,
  },
  metricCard: {
    width: '47%', backgroundColor: P.card, borderRadius: 18,
    padding: 18, borderWidth: 1, borderColor: P.border,
  },
  metricIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  metricValue: { color: P.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  metricLabel: { color: P.textSec, fontSize: 12, marginTop: 2 },
  metricSub: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  paymentsCard: {
    marginHorizontal: 16, backgroundColor: P.card, borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: P.border, marginBottom: 16,
  },
  paymentsHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  paymentsTitle: { color: P.textSec, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  paymentsAmount: { color: P.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
    backgroundColor: P.amberBg, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  pendingBadgeText: { color: P.amber, fontSize: 11, fontWeight: '600' },
  totalRevWrap: { alignItems: 'flex-end' },
  totalRevLabel: { color: P.textTer, fontSize: 11 },
  totalRevValue: { color: P.green, fontSize: 18, fontWeight: '800' },
  chartWrap: { marginTop: 4 },
  breakdownCard: {
    marginHorizontal: 16, backgroundColor: P.card, borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: P.border,
  },
  breakdownTitle: { color: P.text, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  breakdownDivider: { borderBottomWidth: 1, borderBottomColor: P.border },
  breakdownMonth: { color: P.textSec, fontSize: 13, width: 32 },
  breakdownBar: { height: 6, backgroundColor: '#2A2B30', borderRadius: 3, overflow: 'hidden' },
  breakdownBarFill: { height: 6, borderRadius: 3, backgroundColor: P.accent },
  breakdownAmount: { color: P.text, fontSize: 13, fontWeight: '700', width: 70, textAlign: 'right' },
});

export default function PartnerAnalytics() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => { setReady(true); }, []);
  if (!ready) return (
    <View style={{ flex: 1, backgroundColor: '#0B0C10', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#7C3AED" size="large" />
    </View>
  );
  return <PartnerAnalyticsInner />;
}
