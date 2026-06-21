import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRootNavigationState, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, XCircle, Clock, User, FileText } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const P = { bg:'#0B0C10', card:'#1A1B20', border:'#2A2B30', accent:'#7C3AED', text:'#F0F0FF', textSec:'#9090B0', textTer:'#5A5A7A', green:'#10B981', danger:'#E85454', amber:'#F59E0B', divider:'#1E1F24' };

const STATUS_COLORS: Record<string, string> = { open: P.amber, completed: P.green, cancelled: P.danger, refunded: '#06B6D4' };

function SaleDetailInner() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [sale, setSale] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'details' | 'activity'>('details');

  const fetchSale = useCallback(async () => {
    if (!id) return;
    console.log('[POS/Detail] Fetching sale id:', id);
    setLoading(true);
    try {
      const [{ data: s, error: sErr }, { data: si }, { data: sp }, { data: sa }] = await Promise.all([
        supabase.from('sales').select('*').eq('id', id).single(),
        supabase.from('sale_items').select('*').eq('sale_id', id),
        supabase.from('sale_payments').select('*').eq('sale_id', id),
        supabase.from('sale_activity').select('*').eq('sale_id', id).order('created_at', { ascending: false }),
      ]);
      if (sErr) console.log('[POS/Detail] Sale fetch error:', sErr.message);
      if (s) {
        console.log('[POS/Detail] Sale loaded, status:', s.status, 'total:', s.total);
        setSale(s);
      }
      if (si) setItems(si);
      if (sp) setPayments(sp);
      if (sa) setActivity(sa);
    } catch (e) {
      console.log('[POS/Detail] error:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSale(); }, [fetchSale]);

  const handleCancel = () => {
    console.log('[POS/Detail] Cancel sale button pressed, id:', id);
    Alert.alert('Cancel Sale', 'Are you sure you want to cancel this sale?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Sale',
        style: 'destructive',
        onPress: async () => {
          console.log('[POS/Detail] Cancelling sale id:', id);
          const { error } = await supabase
            .from('sales')
            .update({ status: 'cancelled', cancelled_reason: 'Cancelled by staff' })
            .eq('id', id);
          if (error) {
            console.log('[POS/Detail] Cancel error:', error.message);
          } else {
            console.log('[POS/Detail] Sale cancelled successfully');
          }
          await supabase.from('sale_activity').insert({
            sale_id: id,
            actor_name: profile?.full_name ?? 'Staff',
            action: 'Sale cancelled',
            detail: 'Cancelled by staff',
          });
          fetchSale();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: P.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={P.accent} size="large" />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={{ flex: 1, backgroundColor: P.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: P.textSec }}>Sale not found</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[sale.status] ?? P.textSec;
  const saleIdShort = (id ?? '').slice(-8).toUpperCase();
  const saleDate = new Date(sale.created_at).toLocaleString();
  const subtotalDisplay = Number(sale.subtotal).toFixed(2);
  const discountDisplay = Number(sale.discount_amount).toFixed(2);
  const tipDisplay = Number(sale.tip_amount).toFixed(2);
  const serviceChargeDisplay = Number(sale.service_charge).toFixed(2);
  const totalDisplay = Number(sale.total).toFixed(2);
  const changeDueDisplay = Number(sale.change_due).toFixed(2);
  const hasDiscount = Number(sale.discount_amount) > 0;
  const hasTip = Number(sale.tip_amount) > 0;
  const hasServiceCharge = Number(sale.service_charge) > 0;
  const hasChangeDue = Number(sale.change_due) > 0;
  const statusLabel = sale.status;
  const isOpen = sale.status === 'open';
  const isCancelled = sale.status === 'cancelled';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            console.log('[POS/Detail] Back button pressed');
            router.back();
          }}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={P.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Sale</Text>
          <Text style={styles.headerSub}>#{saleIdShort}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '44' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['details', 'activity'] as const).map(t => {
          const tabLabel = t.charAt(0).toUpperCase() + t.slice(1);
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => {
                console.log('[POS/Detail] Tab switched to:', t);
                setTab(t);
              }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{tabLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {tab === 'details' ? (
          <>
            {/* Client & summary */}
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <User size={16} color={P.textSec} />
                <Text style={styles.cardLabel}>Client</Text>
                <Text style={styles.cardValue}>{sale.customer_name ?? 'Walk-In'}</Text>
              </View>
              <View style={styles.cardRow}>
                <Clock size={16} color={P.textSec} />
                <Text style={styles.cardLabel}>Date</Text>
                <Text style={styles.cardValue}>{saleDate}</Text>
              </View>
              {sale.notes ? (
                <View style={styles.cardRow}>
                  <FileText size={16} color={P.textSec} />
                  <Text style={styles.cardLabel}>Notes</Text>
                  <Text style={[styles.cardValue, { flex: 1, textAlign: 'right' }]}>{sale.notes}</Text>
                </View>
              ) : null}
            </View>

            {/* Items */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Services</Text>
              {items.map(item => {
                const lineTotalDisplay = Number(item.line_total).toFixed(2);
                return (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    <Text style={styles.itemQty}>×{item.quantity}</Text>
                    <Text style={styles.itemTotal}>BHD {lineTotalDisplay}</Text>
                  </View>
                );
              })}
            </View>

            {/* Totals */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>BHD {subtotalDisplay}</Text>
              </View>
              {hasDiscount && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: P.green }]}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: P.green }]}>-BHD {discountDisplay}</Text>
                </View>
              )}
              {hasTip && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tip</Text>
                  <Text style={styles.summaryValue}>BHD {tipDisplay}</Text>
                </View>
              )}
              {hasServiceCharge && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service Charge</Text>
                  <Text style={styles.summaryValue}>BHD {serviceChargeDisplay}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>BHD {totalDisplay}</Text>
              </View>
              {hasChangeDue && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: P.green }]}>Change Due</Text>
                  <Text style={[styles.summaryValue, { color: P.green }]}>BHD {changeDueDisplay}</Text>
                </View>
              )}
            </View>

            {/* Payments */}
            {payments.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Payments</Text>
                {payments.map(p => {
                  const pAmtDisplay = Number(p.amount).toFixed(2);
                  const pMethodLabel = p.method.replace('_', ' ');
                  return (
                    <View key={p.id} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{pMethodLabel}</Text>
                      <Text style={[styles.summaryValue, { color: P.green }]}>BHD {pAmtDisplay}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Cancel button */}
            {isOpen && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <XCircle size={18} color={P.danger} />
                <Text style={styles.cancelBtnText}>Cancel Sale</Text>
              </TouchableOpacity>
            )}
            {isCancelled && sale.cancelled_reason ? (
              <View style={styles.cancelReasonCard}>
                <XCircle size={16} color={P.danger} />
                <Text style={styles.cancelReasonText}>Cancelled: {sale.cancelled_reason}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Activity</Text>
            {activity.length === 0 ? (
              <Text style={{ color: P.textSec, textAlign: 'center', padding: 20 }}>No activity recorded</Text>
            ) : (
              activity.map((a, i) => {
                const activityTime = new Date(a.created_at).toLocaleTimeString();
                const isLast = i === activity.length - 1;
                return (
                  <View key={a.id} style={[styles.activityRow, !isLast && styles.activityDivider]}>
                    <View style={styles.activityDot} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.activityAction}>{a.action}</Text>
                      {a.detail ? <Text style={styles.activityDetail}>{a.detail}</Text> : null}
                      <Text style={styles.activityTime}>{a.actor_name} · {activityTime}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function SaleDetail() {
  const navState = useRootNavigationState();
  if (!navState?.key) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B0C10', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#7C3AED" size="large" />
      </View>
    );
  }
  return <SaleDetailInner />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: P.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.border },
  headerTitle: { color: P.text, fontSize: 18, fontWeight: '800' },
  headerSub: { color: P.textSec, fontSize: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: P.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: P.border },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: P.accent },
  tabText: { color: P.textSec, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: P.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: P.border },
  cardTitle: { color: P.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.divider },
  cardLabel: { color: P.textSec, fontSize: 13, flex: 1 },
  cardValue: { color: P.text, fontSize: 13, fontWeight: '500' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.divider },
  itemName: { flex: 1, color: P.text, fontSize: 14 },
  itemQty: { color: P.textSec, fontSize: 13, marginHorizontal: 12 },
  itemTotal: { color: P.text, fontSize: 14, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { color: P.textSec, fontSize: 14 },
  summaryValue: { color: P.text, fontSize: 14, fontWeight: '600' },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: P.border, marginTop: 8, paddingTop: 10 },
  grandTotalLabel: { color: P.text, fontSize: 17, fontWeight: '800' },
  grandTotalValue: { color: P.accent, fontSize: 20, fontWeight: '900' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, backgroundColor: P.danger + '22', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: P.danger + '44' },
  cancelBtnText: { color: P.danger, fontSize: 15, fontWeight: '700' },
  cancelReasonCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, backgroundColor: P.danger + '11', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: P.danger + '33' },
  cancelReasonText: { color: P.danger, fontSize: 13, flex: 1 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  activityDivider: { borderBottomWidth: 1, borderBottomColor: P.divider },
  activityDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: P.accent, marginTop: 4 },
  activityAction: { color: P.text, fontSize: 14, fontWeight: '600' },
  activityDetail: { color: P.textSec, fontSize: 13, marginTop: 2 },
  activityTime: { color: P.textTer, fontSize: 11, marginTop: 4 },
});
