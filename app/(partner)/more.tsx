import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Home,
  Users,
  Globe,
  BookOpen,
  Megaphone,
  UserCheck,
  BarChart2,
  Puzzle,
  Settings,
  TrendingUp,
  Gift,
  Newspaper,
  HelpCircle,
  BookMarked,
  MessageCircle,
  Bell,
  ArrowLeft,
  X,
  ChevronRight,
  ArrowUp,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

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

type InsightPeriod = 'yesterday' | 'today' | 'week' | 'month';

interface BookingRow {
  price_bhd: number | null;
  status: string;
  source?: string;
  start_at: string;
}

interface InsightData {
  totalSales: number;
  apptCount: number;
  avgSale: number;
  newClients: number;
  returningClients: number;
  offlineSales: number;
  onlineSales: number;
  barData: number[];
}

const EMPTY_INSIGHT: InsightData = {
  totalSales: 0,
  apptCount: 0,
  avgSale: 0,
  newClients: 0,
  returningClients: 0,
  offlineSales: 0,
  onlineSales: 0,
  barData: [0, 0, 0, 0, 0, 0, 0],
};

function showToast(msg: string) {
  Alert.alert('', msg);
}

export default function PartnerMore() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const shopId = profile?.shop_id ?? '';

  const [showInsights, setShowInsights] = useState(false);
  const [insightPeriod, setInsightPeriod] = useState<InsightPeriod>('today');
  const [insightData, setInsightData] = useState<InsightData>(EMPTY_INSIGHT);
  const [insightLoading, setInsightLoading] = useState(false);

  const barAnimations = useRef(Array.from({ length: 7 }, () => new Animated.Value(0))).current;

  const fetchInsights = useCallback(async (period: InsightPeriod) => {
    console.log('[More] fetchInsights called, period:', period, 'shopId:', shopId);
    setInsightLoading(true);
    try {
      const now = new Date();
      let start: Date;
      let end: Date = new Date(now);
      end.setHours(23, 59, 59, 999);

      if (period === 'today') {
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
      } else if (period === 'yesterday') {
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
      } else if (period === 'week') {
        start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(now);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      }

      if (!shopId) {
        setInsightData(EMPTY_INSIGHT);
        return;
      }

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('price_bhd, status, source, start_at')
        .eq('shop_id', shopId)
        .gte('start_at', start.toISOString())
        .lte('start_at', end.toISOString());

      console.log('[More] fetchInsights result:', bookings?.length, 'bookings, error:', error?.message);

      const rows = (bookings ?? []) as BookingRow[];
      const completed = rows.filter(b => b.status === 'completed');
      const totalSales = completed.reduce((s, b) => s + Number(b.price_bhd || 0), 0);
      const apptCount = rows.length;
      const avgSale = apptCount > 0 ? totalSales / apptCount : 0;
      const offlineSales = completed.filter(b => !b.source || b.source === 'offline').reduce((s, b) => s + Number(b.price_bhd || 0), 0);
      const onlineSales = completed.filter(b => b.source && b.source !== 'offline').reduce((s, b) => s + Number(b.price_bhd || 0), 0);

      // Build bar data for last 7 days
      const barData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toISOString().slice(0, 10);
        return rows.filter(b => b.start_at?.slice(0, 10) === dayStr && b.status === 'completed').reduce((s, b) => s + Number(b.price_bhd || 0), 0);
      });

      setInsightData({ totalSales, apptCount, avgSale, newClients: 0, returningClients: 0, offlineSales, onlineSales, barData });
    } catch (err) {
      console.log('[More] fetchInsights error:', err);
      setInsightData(EMPTY_INSIGHT);
    } finally {
      setInsightLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (showInsights) {
      fetchInsights(insightPeriod);
    }
  }, [showInsights, insightPeriod, fetchInsights]);

  useEffect(() => {
    if (!insightLoading && showInsights) {
      const maxBar = Math.max(...insightData.barData, 1);
      barAnimations.forEach((anim, i) => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: insightData.barData[i] / maxBar,
          duration: 600,
          delay: i * 60,
          useNativeDriver: false,
        }).start();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insightLoading, insightData, showInsights]);

  const navigate = (route: string) => {
    console.log('[More] Navigate pressed:', route);
    router.push(route as never);
  };

  const totalSalesText = `BHD ${Number(insightData.totalSales).toFixed(3)}`;
  const avgSaleText = `BHD ${Number(insightData.avgSale).toFixed(3)}`;
  const offlineSalesText = `BHD ${Number(insightData.offlineSales).toFixed(3)}`;
  const maxBar = Math.max(...insightData.barData, 1);

  const GRID_ITEMS = [
    { label: 'Home', icon: <Home size={18} color={P.accent} />, onPress: () => navigate('/(partner)') },
    { label: 'Clients', icon: <Users size={18} color={P.accent} />, onPress: () => navigate('/(partner)/clients') },
    { label: 'Online booking', icon: <Globe size={18} color={P.accent} />, onPress: () => navigate('/(partner)/online-booking') },
    { label: 'Catalog', icon: <BookOpen size={18} color={P.accent} />, onPress: () => navigate('/(partner)/catalog') },
    { label: 'Marketing', icon: <Megaphone size={18} color={P.accent} />, onPress: () => showToast('Coming soon') },
    { label: 'Team', icon: <UserCheck size={18} color={P.accent} />, onPress: () => navigate('/(partner)/team') },
    { label: 'Reports', icon: <BarChart2 size={18} color={P.accent} />, onPress: () => navigate('/(partner)/sales') },
    { label: 'Add-ons', icon: <Puzzle size={18} color={P.accent} />, onPress: () => showToast('Coming soon') },
    { label: 'Settings', icon: <Settings size={18} color={P.accent} />, onPress: () => navigate('/(partner)/settings') },
  ];

  const LIST_ITEMS = [
    { label: 'Performance insights', icon: <TrendingUp size={18} color={P.textSecondary} />, onPress: () => { console.log('[More] Performance insights pressed'); setShowInsights(true); } },
    { label: 'Refer a friend', icon: <Gift size={18} color={P.textSecondary} />, onPress: () => { console.log('[More] Refer a friend pressed'); showToast('Coming soon'); } },
    { label: 'English (US)', icon: <Text style={{ fontSize: 18 }}>🇺🇸</Text>, onPress: () => { console.log('[More] Language pressed'); showToast('Coming soon'); } },
    { label: 'News', icon: <Newspaper size={18} color={P.textSecondary} />, onPress: () => { console.log('[More] News pressed'); showToast('Coming soon'); } },
    { label: 'Help and support', icon: <HelpCircle size={18} color={P.textSecondary} />, onPress: () => { console.log('[More] Help pressed'); showToast('Coming soon'); } },
    { label: 'Guides', icon: <BookMarked size={18} color={P.textSecondary} />, onPress: () => { console.log('[More] Guides pressed'); showToast('Coming soon'); } },
  ];

  // Build grid rows (2 per row)
  const gridRows: (typeof GRID_ITEMS)[] = [];
  for (let i = 0; i < GRID_ITEMS.length; i += 2) {
    gridRows.push(GRID_ITEMS.slice(i, i + 2));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => console.log('[More] Search pressed')}>
          <Text style={{ fontSize: 18 }}>🔍</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>More</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => console.log('[More] Chat pressed')}>
            <MessageCircle size={20} color={P.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => console.log('[More] Bell pressed')}>
            <Bell size={20} color={P.textSecondary} />
          </TouchableOpacity>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{profile?.full_name?.charAt(0) ?? 'U'}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Grid */}
        {gridRows.map((row, ri) => (
          <View key={ri} style={styles.gridRow}>
            {row.map((item, ci) => (
              <TouchableOpacity key={ci} style={styles.gridCard} onPress={item.onPress} activeOpacity={0.7}>
                <View style={styles.gridIconCircle}>{item.icon}</View>
                <Text style={styles.gridLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            {row.length < 2 && <View style={[styles.gridCard, { backgroundColor: 'transparent', borderWidth: 0 }]} />}
          </View>
        ))}

        {/* Divider */}
        <View style={styles.divider} />

        {/* List rows */}
        <View style={styles.listSection}>
          {LIST_ITEMS.map((item, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.rowDivider} />}
              <TouchableOpacity style={styles.listRow} onPress={item.onPress} activeOpacity={0.7}>
                <View style={styles.listIcon}>{item.icon}</View>
                <Text style={styles.listLabel}>{item.label}</Text>
                <ChevronRight size={16} color={P.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Performance Insights Modal */}
      <Modal visible={showInsights} animationType="slide" onRequestClose={() => setShowInsights(false)}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { console.log('[More] Close insights'); setShowInsights(false); }} style={styles.backBtn}>
              <ArrowLeft size={20} color={P.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightsTitle}>Performance insights</Text>
              <Text style={styles.insightsSubtitle}>Updated just now</Text>
            </View>
            <TouchableOpacity onPress={() => setShowInsights(false)} style={styles.backBtn}>
              <X size={20} color={P.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Period tabs */}
          <View style={styles.periodTabs}>
            {(['yesterday', 'today', 'week', 'month'] as InsightPeriod[]).map(p => {
              const labels: Record<InsightPeriod, string> = { yesterday: 'Yesterday', today: 'Today', week: 'Week', month: 'Month' };
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodTab, insightPeriod === p && styles.periodTabActive]}
                  onPress={() => { console.log('[More] Insight period pressed:', p); setInsightPeriod(p); }}
                >
                  <Text style={[styles.periodTabText, insightPeriod === p && styles.periodTabTextActive]}>{labels[p]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            {/* Today's summary */}
            <Text style={styles.sectionTitle}>Today's summary</Text>
            <Text style={styles.sectionSubtitle}>Compared with this time last week</Text>

            {/* Total sales card */}
            <View style={styles.salesCard}>
              <View style={styles.salesCardHeader}>
                <Text style={styles.salesCardLabel}>Total sales</Text>
                <TouchableOpacity onPress={() => console.log('[More] View sales pressed')}>
                  <Text style={styles.viewLink}>View</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.salesRow}>
                <Text style={styles.salesAmount}>{totalSalesText}</Text>
                <View style={styles.changeBadge}>
                  <ArrowUp size={10} color={P.textSecondary} />
                  <Text style={styles.changeText}>0%</Text>
                </View>
              </View>

              {/* Bar chart */}
              <View style={styles.barChart}>
                <View style={styles.barYAxis}>
                  {['BHD 40', 'BHD 30', 'BHD 20', 'BHD 10', 'BHD 0'].map(l => (
                    <Text key={l} style={styles.barYLabel}>{l}</Text>
                  ))}
                </View>
                <View style={styles.barArea}>
                  {barAnimations.map((anim, i) => (
                    <View key={i} style={styles.barWrapper}>
                      <Animated.View
                        style={[
                          styles.bar,
                          {
                            height: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Sales by channel */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Sales by channel</Text>
            <View style={styles.channelSection}>
              {[
                { label: 'Offline', value: offlineSalesText },
                { label: 'Book now link', value: 'BHD 0' },
                { label: 'Fresha Marketplace', value: 'BHD 0' },
              ].map((ch, i) => (
                <View key={i} style={styles.channelRow}>
                  <Text style={styles.channelLabel}>{ch.label}</Text>
                  <View style={styles.changeBadge}>
                    <ArrowUp size={10} color={P.textSecondary} />
                    <Text style={styles.changeText}>0%</Text>
                  </View>
                  <Text style={styles.channelValue}>{ch.value}</Text>
                </View>
              ))}
            </View>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Appointments</Text>
                <Text style={styles.statValue}>{insightData.apptCount}</Text>
                <View style={styles.changeBadge}>
                  <ArrowUp size={10} color={P.textSecondary} />
                  <Text style={styles.changeText}>0%</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Avg. sale</Text>
                <Text style={styles.statValue}>{avgSaleText}</Text>
                <View style={styles.changeBadge}>
                  <ArrowUp size={10} color={P.textSecondary} />
                  <Text style={styles.changeText}>0%</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>New clients</Text>
                <Text style={styles.statValue}>{insightData.newClients}</Text>
                <View style={styles.changeBadge}>
                  <ArrowUp size={10} color={P.textSecondary} />
                  <Text style={styles.changeText}>0%</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Returning clients</Text>
                <Text style={styles.statValue}>{insightData.returningClients}</Text>
                <View style={styles.changeBadge}>
                  <ArrowUp size={10} color={P.textSecondary} />
                  <Text style={styles.changeText}>0%</Text>
                </View>
              </View>
            </View>

            {/* Next 7 days */}
            <View style={styles.next7Card}>
              <View style={styles.salesCardHeader}>
                <View>
                  <Text style={styles.salesCardLabel}>Next 7 days</Text>
                  <Text style={styles.insightsSubtitle}>22 Jun – 28 Jun</Text>
                </View>
                <TouchableOpacity onPress={() => console.log('[More] View next 7 days pressed')}>
                  <Text style={styles.viewLink}>View</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.statLabel}>Scheduled appointments</Text>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.insightsSubtitle}>BHD 0 value</Text>

              {/* Simple line chart placeholder */}
              <View style={styles.lineChartPlaceholder}>
                <View style={styles.lineChartLine} />
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Appointments by channel</Text>
              {['Fresha Marketplace', 'Book now link', 'Offline', 'Social', 'Marketing'].map((ch, i) => (
                <View key={i} style={styles.channelRow}>
                  <Text style={styles.channelLabel}>{ch}</Text>
                  <Text style={styles.channelValue}>0</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  headerTitle: { flex: 1, color: P.text, fontSize: 20, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: P.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  gridRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  gridCard: { flex: 1, backgroundColor: P.surface, borderRadius: 12, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: P.border },
  gridIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { color: P.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  divider: { height: 1, backgroundColor: P.border, marginVertical: 16 },
  listSection: { backgroundColor: P.surface, borderRadius: 12, borderWidth: 1, borderColor: P.border, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  listIcon: { width: 24, alignItems: 'center' },
  listLabel: { flex: 1, color: P.text, fontSize: 15 },
  rowDivider: { height: 1, backgroundColor: P.divider, marginLeft: 52 },
  insightsTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  insightsSubtitle: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  periodTabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  periodTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: P.surface, borderWidth: 1, borderColor: P.border },
  periodTabActive: { backgroundColor: P.surfaceElevated, borderColor: P.text },
  periodTabText: { color: P.textSecondary, fontSize: 13 },
  periodTabTextActive: { color: P.text, fontWeight: '700' },
  sectionTitle: { color: P.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { color: P.textSecondary, fontSize: 13, marginBottom: 12 },
  salesCard: { backgroundColor: P.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: P.border, marginBottom: 8 },
  salesCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  salesCardLabel: { color: P.textSecondary, fontSize: 13 },
  viewLink: { color: P.accent, fontSize: 13, fontWeight: '600' },
  salesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  salesAmount: { color: P.text, fontSize: 24, fontWeight: '700' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: P.surfaceElevated, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  changeText: { color: P.textSecondary, fontSize: 11 },
  barChart: { flexDirection: 'row', height: 120, gap: 8 },
  barYAxis: { justifyContent: 'space-between', paddingVertical: 4 },
  barYLabel: { color: P.textTertiary, fontSize: 10 },
  barArea: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barWrapper: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: P.accent, borderRadius: 3 },
  channelSection: { backgroundColor: P.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: P.border, marginBottom: 8 },
  channelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  channelLabel: { flex: 1, color: P.textSecondary, fontSize: 13 },
  channelValue: { color: P.text, fontSize: 13, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: P.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: P.border, gap: 4 },
  statLabel: { color: P.textSecondary, fontSize: 13 },
  statValue: { color: P.text, fontSize: 22, fontWeight: '700' },
  next7Card: { backgroundColor: P.surfaceElevated, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: P.border },
  lineChartPlaceholder: { height: 60, justifyContent: 'center', marginVertical: 12 },
  lineChartLine: { height: 1, backgroundColor: P.border },
});
