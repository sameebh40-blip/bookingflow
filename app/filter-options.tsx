import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { filterStore } from '@/utils/filterStore';

const OPTIONS = [
  'Open now', 'Top rated', 'New venues', 'Instant booking',
  'Free cancellation', 'Offers available', 'Men only', 'Women only',
  'Unisex', 'Home service',
];

export default function FilterOptionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((item: string) => {
    console.log('[FilterOptions] Toggle:', item);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    const selectedArr = Array.from(selected);
    console.log('[FilterOptions] Apply pressed, selected:', selectedArr);
    filterStore.setOptions(selectedArr);
    router.back();
  }, [selected, router]);

  const handleClear = useCallback(() => {
    console.log('[FilterOptions] Clear pressed');
    setSelected(new Set());
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Options</Text>
        <AnimatedPressable onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.chipsGrid}>
          {OPTIONS.map((item) => {
            const isSelected = selected.has(item);
            return (
              <AnimatedPressable
                key={item}
                onPress={() => toggle(item)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{item}</Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <AnimatedPressable onPress={handleClear} style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear all</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={handleApply} style={styles.applyBtn}>
          <Text style={styles.applyText}>Apply ({selected.size})</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', color: MADAR_COLORS.text },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: MADAR_COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  chipSelected: { backgroundColor: MADAR_COLORS.goldMuted, borderColor: MADAR_COLORS.goldBorder },
  chipText: { fontSize: 13, color: MADAR_COLORS.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: MADAR_COLORS.gold, fontWeight: '700' },
  footer: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingTop: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderTopWidth: 1, borderTopColor: MADAR_COLORS.border,
  },
  clearBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: MADAR_COLORS.border,
    alignItems: 'center',
  },
  clearText: { fontSize: 15, color: MADAR_COLORS.textSecondary, fontWeight: '600' },
  applyBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: MADAR_COLORS.gold, alignItems: 'center',
  },
  applyText: { fontSize: 15, color: MADAR_COLORS.background, fontWeight: '700' },
});
