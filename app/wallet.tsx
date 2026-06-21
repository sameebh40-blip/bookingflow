import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const MOCK_TRANSACTIONS = [
  { id: '1', description: 'Classic Haircut - Level Barber', amount: -5, date: 'Jun 19, 2026', type: 'debit' },
  { id: '2', description: 'Wallet top-up', amount: 25, date: 'Jun 15, 2026', type: 'credit' },
  { id: '3', description: 'Fade + Beard Trim - Groom Room', amount: -8, date: 'Jun 10, 2026', type: 'debit' },
  { id: '4', description: 'Refund - Cancelled booking', amount: 7, date: 'Jun 5, 2026', type: 'credit' },
];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const balance = MOCK_TRANSACTIONS.reduce((sum, t) => sum + t.amount, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => {
          console.log('[Wallet] Back pressed');
          router.back();
        }} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance card */}
        <LinearGradient
          colors={['#5B3FA0', '#9B59B6', '#C9A84C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Wallet balance</Text>
          <Text style={styles.balanceAmount}>BHD {balance.toFixed(3)}</Text>
          <AnimatedPressable
            onPress={() => console.log('[Wallet] Top up pressed')}
            style={styles.topUpBtn}
          >
            <Text style={styles.topUpText}>Top up wallet</Text>
          </AnimatedPressable>
        </LinearGradient>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Transaction history</Text>

        {MOCK_TRANSACTIONS.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtitle}>Your wallet transactions will appear here</Text>
          </View>
        ) : (
          MOCK_TRANSACTIONS.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={[styles.txIcon, tx.type === 'credit' ? styles.txIconCredit : styles.txIconDebit]}>
                {tx.type === 'credit'
                  ? <TrendingUp size={16} color={MADAR_COLORS.success} />
                  : <TrendingDown size={16} color={MADAR_COLORS.danger} />
                }
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDescription} numberOfLines={1}>{tx.description}</Text>
                <Text style={styles.txDate}>{tx.date}</Text>
              </View>
              <Text style={[styles.txAmount, tx.type === 'credit' ? styles.txAmountCredit : styles.txAmountDebit]}>
                {tx.type === 'credit' ? '+' : ''}BHD {Math.abs(tx.amount).toFixed(3)}
              </Text>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: MADAR_COLORS.text, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  balanceCard: { borderRadius: 20, padding: 24, gap: 8 },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  topUpBtn: {
    alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
  },
  topUpText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: MADAR_COLORS.text, letterSpacing: -0.2 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: MADAR_COLORS.divider,
  },
  txIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  txIconCredit: { backgroundColor: 'rgba(76,175,125,0.15)' },
  txIconDebit: { backgroundColor: 'rgba(232,84,84,0.15)' },
  txInfo: { flex: 1, gap: 3 },
  txDescription: { fontSize: 14, fontWeight: '600', color: MADAR_COLORS.text },
  txDate: { fontSize: 12, color: MADAR_COLORS.textTertiary },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txAmountCredit: { color: MADAR_COLORS.success },
  txAmountDebit: { color: MADAR_COLORS.danger },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.text },
  emptySubtitle: { fontSize: 13, color: MADAR_COLORS.textSecondary, textAlign: 'center' },
});
