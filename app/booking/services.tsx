import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
}

const MOCK_SERVICES: Service[] = [
  { id: '1', name: 'Classic Haircut', duration: 30, price: 5, category: 'Hair' },
  { id: '2', name: 'Fade + Beard Trim', duration: 45, price: 8, category: 'Hair' },
  { id: '3', name: 'Hot Towel Shave', duration: 30, price: 7, category: 'Shaving' },
  { id: '4', name: 'Hair + Beard Combo', duration: 60, price: 12, category: 'Packages' },
  { id: '5', name: 'Kids Haircut', duration: 20, price: 4, category: 'Hair' },
  { id: '6', name: 'Beard Styling', duration: 20, price: 5, category: 'Shaving' },
];

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={styles.progressDots}>
      {[1, 2, 3, 4].map((s) => (
        <View
          key={s}
          style={[styles.dot, s === step && styles.dotActive, s < step && styles.dotDone]}
        />
      ))}
    </View>
  );
}

export default function BookingServicesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleService = useCallback((id: string, name: string) => {
    console.log('[Booking/Services] Toggle service:', id, name);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleContinue = useCallback(() => {
    console.log('[Booking/Services] Continue pressed, selected:', Array.from(selected));
    const selectedIds = Array.from(selected).join(',');
    router.push(`/booking/staff?venueId=${venueId}&services=${selectedIds}`);
  }, [selected, venueId, router]);

  const handleBack = useCallback(() => {
    console.log('[Booking/Services] Back pressed');
    router.back();
  }, [router]);

  const selectedServices = MOCK_SERVICES.filter(s => selected.has(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const servicesByCategory = MOCK_SERVICES.reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Select services</Text>
          <Text style={styles.headerSubtitle}>Level Barber Shop</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ProgressDots step={1} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(servicesByCategory).map(([category, catServices]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {catServices.map((service) => {
              const isSelected = selected.has(service.id);
              return (
                <AnimatedPressable
                  key={service.id}
                  onPress={() => toggleService(service.id, service.name)}
                  style={[styles.serviceRow, isSelected && styles.serviceRowSelected]}
                >
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceMeta}>{service.duration} min · BHD {service.price}</Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={14} color={MADAR_COLORS.background} strokeWidth={3} />}
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomLeft}>
          {selected.size > 0 ? (
            <>
              <Text style={styles.selectedCount}>{selected.size} selected</Text>
              <Text style={styles.selectedPrice}>BHD {totalPrice.toFixed(3)}</Text>
            </>
          ) : (
            <Text style={styles.noSelection}>No services selected</Text>
          )}
        </View>
        <AnimatedPressable
          onPress={handleContinue}
          disabled={selected.size === 0}
          style={styles.continueBtn}
        >
          <LinearGradient
            colors={selected.size > 0 ? ['#C9A84C', '#E8C96A'] : [MADAR_COLORS.surfaceSecondary, MADAR_COLORS.surfaceSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnGradient}
          >
            <Text style={[styles.continueBtnText, selected.size === 0 && { color: MADAR_COLORS.textTertiary }]}>
              Continue
            </Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: MADAR_COLORS.text },
  headerSubtitle: { fontSize: 12, color: MADAR_COLORS.textSecondary },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
  },
  dotActive: { backgroundColor: MADAR_COLORS.gold, width: 24 },
  dotDone: { backgroundColor: MADAR_COLORS.goldMuted },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  categorySection: { marginBottom: 24 },
  categoryTitle: {
    fontSize: 12,
    color: MADAR_COLORS.gold,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
  },
  serviceRowSelected: {
    borderColor: MADAR_COLORS.goldBorder,
    backgroundColor: MADAR_COLORS.goldMuted,
  },
  serviceInfo: { flex: 1, gap: 3 },
  serviceName: { fontSize: 15, fontWeight: '600', color: MADAR_COLORS.text },
  serviceMeta: { fontSize: 12, color: MADAR_COLORS.textSecondary },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: MADAR_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: MADAR_COLORS.gold, borderColor: MADAR_COLORS.gold },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: MADAR_COLORS.border,
  },
  bottomLeft: { gap: 2 },
  selectedCount: { fontSize: 13, color: MADAR_COLORS.textSecondary },
  selectedPrice: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.gold },
  noSelection: { fontSize: 13, color: MADAR_COLORS.textTertiary },
  continueBtn: { borderRadius: 12 },
  continueBtnGradient: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  continueBtnText: { fontSize: 15, fontWeight: '700', color: MADAR_COLORS.background },
});
