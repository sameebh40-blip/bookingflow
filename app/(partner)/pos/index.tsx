import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRootNavigationState, router } from 'expo-router';
import { Plus, Search, Clock, CheckCircle, XCircle, DollarSign, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const P = { bg:'#0B0C10', card:'#1A1B20', border:'#2A2B30', accent:'#7C3AED', text:'#F0F0FF', textSec:'#9090B0', textTer:'#5A5A7A', green:'#10B981', danger:'#E85454', amber:'#F59E0B', divider:'#1E1F24' };

const STATUS_COLORS: Record<string,string> = { open: P.amber, completed: P.green, cancelled: P.danger, refunded: '#06B6D4' };
const STATUS_ICONS: Record<string, React.ComponentType<any>> = { open: Clock, completed: CheckCircle, cancelled: XCircle, refunded: DollarSign };

const DEMO_SALES = [
  { id:'s1', customer_name:'Ahmed Al-Rashid', status:'completed', total:28.00, tip_amount:3.00, created_at: new Date(Date.now()-3600000).toISOString() },
  { id:'s2', customer_name:'Mohammed Hassan', status:'completed', total:40.00, tip_amount:5.00, created_at: new Date(Date.now()-7200000).toISOString() },
  { id:'s3', customer_name:'Walk-In', status:'open', total:45.00, tip_amount:0, created_at: new Date().toISOString() },
  { id:'s4', customer_name:'Khalid Ibrahim', status:'cancelled', total:22.00, tip_amount:0, created_at: new Date(Date.now()-10800000).toISOString() },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SalesHubInner() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const shopId = (profile as any)?.shop_id;
  const [sales, setSales] = useState<any[]>(DEMO_SALES);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const fetchSales = useCallback(async () => {
    if (!shopId) return;
    console.log('[POS] Fetching sales for shop:', shopId);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('id, customer_name, status, total, tip_amount, created_at, completed_at')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) console.log('[POS] Fetch error:', error.message);
      if (data && data.length > 0) {
        console.log('[POS] Loaded', data.length, 'sales');
        setSales(data);
      }
    } catch (e) {
      console.log('[POS] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const filtered = sales.filter(s => {
    const matchSearch = !search || (s.customer_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || s.status === filter;
    return matchSearch && matchFilter;
  });

  const todayTotal = sales
    .filter(s => s.status === 'completed' && new Date(s.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + Number(s.total), 0);
  const openCount = sales.filter(s => s.status === 'open').length;
  const completedCount = sales.filter(s => s.status === 'completed').length;

  const todayTotalDisplay = todayTotal.toFixed(2);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sales</Text>
          <Text style={styles.headerSub}>Point of Sale</Text>
        </View>
        <TouchableOpacity
          style={styles.newSaleBtn}
          onPress={() => {
            console.log('[POS] New Sale button pressed');
            router.push('/(partner)/pos/new' as never);
          }}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.newSaleBtnText}>New Sale</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>BHD {todayTotalDisplay}</Text>
          <Text style={styles.statLabel}>Today's Revenue</Text>
        </View>
        <View style={[styles.statCard, { borderColor: openCount > 0 ? P.amber + '44' : P.border }]}>
          <Text style={[styles.statValue, { color: openCount > 0 ? P.amber : P.text }]}>{openCount}</Text>
          <Text style={styles.statLabel}>Open Sales</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={P.textTer} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sales..."
            placeholderTextColor={P.textTer}
            value={search}
            onChangeText={v => {
              console.log('[POS] Search changed:', v);
              setSearch(v);
            }}
          />
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {['all', 'open', 'completed', 'cancelled'].map(f => {
          const chipLabel = f.charAt(0).toUpperCase() + f.slice(1);
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => {
                console.log('[POS] Filter changed to:', f);
                setFilter(f);
              }}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{chipLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sales list */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              console.log('[POS] Pull-to-refresh triggered');
              setRefreshing(true);
              fetchSales();
            }}
            tintColor={P.accent}
          />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator color={P.accent} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <DollarSign size={40} color={P.textTer} />
            <Text style={styles.emptyTitle}>No sales found</Text>
            <Text style={styles.emptySub}>Tap "New Sale" to create your first sale</Text>
          </View>
        ) : (
          filtered.map(sale => {
            const Icon = STATUS_ICONS[sale.status] ?? Clock;
            const color = STATUS_COLORS[sale.status] ?? P.textSec;
            const saleTotal = Number(sale.total).toFixed(2);
            const saleTip = Number(sale.tip_amount).toFixed(2);
            const hasTip = Number(sale.tip_amount) > 0;
            const timeLabel = timeAgo(sale.created_at);
            const statusLabel = sale.status;
            return (
              <TouchableOpacity
                key={sale.id}
                style={styles.saleCard}
                onPress={() => {
                  console.log('[POS] Sale card pressed, id:', sale.id, 'status:', sale.status);
                  router.push(`/(partner)/pos/${sale.id}` as never);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.saleStatusDot, { backgroundColor: color + '22', borderColor: color + '44' }]}>
                  <Icon size={16} color={color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.saleName}>{sale.customer_name ?? 'Walk-In'}</Text>
                  <View style={styles.saleMetaRow}>
                    <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.statusBadgeText, { color }]}>{statusLabel}</Text>
                    </View>
                    <Text style={styles.saleTime}>{timeLabel}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.saleTotal}>BHD {saleTotal}</Text>
                  {hasTip && <Text style={styles.saleTip}>+BHD {saleTip} tip</Text>}
                </View>
                <ChevronRight size={16} color={P.textTer} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

export default function SalesHub() {
  const navState = useRootNavigationState();
  if (!navState?.key) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B0C10', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#7C3AED" size="large" />
      </View>
    );
  }
  return <SalesHubInner />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: P.text, fontSize: 24, fontWeight: '800' },
  headerSub: { color: P.textSec, fontSize: 13, marginTop: 2 },
  newSaleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  newSaleBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: P.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: P.border },
  statValue: { color: P.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: P.textSec, fontSize: 11, marginTop: 3 },
  searchRow: { paddingHorizontal: 16, marginBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: P.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: P.border },
  searchInput: { flex: 1, color: P.text, fontSize: 14 },
  filterRow: { marginBottom: 12, flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: P.card, borderWidth: 1, borderColor: P.border },
  filterChipActive: { backgroundColor: P.accent + '33', borderColor: P.accent },
  filterChipText: { color: P.textSec, fontSize: 13, fontWeight: '500' },
  filterChipTextActive: { color: P.accent, fontWeight: '700' },
  saleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: P.card, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: P.border },
  saleStatusDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  saleName: { color: P.text, fontSize: 15, fontWeight: '600' },
  saleMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  saleTime: { color: P.textTer, fontSize: 11 },
  saleTotal: { color: P.text, fontSize: 16, fontWeight: '800' },
  saleTip: { color: P.green, fontSize: 11, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { color: P.text, fontSize: 18, fontWeight: '700' },
  emptySub: { color: P.textSec, fontSize: 14, textAlign: 'center' },
});
