import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Wallet } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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

      {/* Balance card */}
      <LinearGradient
        colors={['#5B3FA0', '#9B59B6', '#C9A84C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Wallet balance</Text>
        <Text style={styles.balanceAmount}>BHD 0.000</Text>
        <View style={styles.topUpBtn}>
          <Text style={styles.topUpText}>Coming soon</Text>
        </View>
      </LinearGradient>

      {/* Coming soon */}
      <View style={styles.comingSoonContainer}>
        <View style={styles.comingSoonIcon}>
          <Wallet size={36} color={MADAR_COLORS.purple} />
        </View>
        <Text style={styles.comingSoonTitle}>In-app payments coming soon</Text>
        <Text style={styles.comingSoonSubtitle}>
          Top up your Hallaq wallet and pay for bookings instantly. Stay tuned for this feature.
        </Text>
      </View>
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
  balanceCard: { borderRadius: 20, padding: 24, gap: 8, marginHorizontal: 20 },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  topUpBtn: {
    alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
  },
  topUpText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  comingSoonIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(124,58,237,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: MADAR_COLORS.text,
    textAlign: 'center',
  },
  comingSoonSubtitle: {
    fontSize: 14,
    color: MADAR_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
