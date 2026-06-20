import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Star, Shuffle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface Staff {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  avatar: string;
}

const MOCK_STAFF: Staff[] = [
  { id: '1', name: 'Ahmed Al-Rashid', specialty: 'Fade specialist', rating: 5.0, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
  { id: '2', name: 'Khalid Hassan', specialty: 'Classic cuts', rating: 4.9, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
  { id: '3', name: 'Omar Saleh', specialty: 'Beard styling', rating: 4.8, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' },
];

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={styles.progressDots}>
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={[styles.dot, s === step && styles.dotActive, s < step && styles.dotDone]} />
      ))}
    </View>
  );
}

export default function BookingStaffScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { venueId, services } = useLocalSearchParams<{ venueId: string; services: string }>();
  const [selectedStaff, setSelectedStaff] = useState<string>('any');

  const handleSelectStaff = useCallback((id: string, name: string) => {
    console.log('[Booking/Staff] Staff selected:', id, name);
    setSelectedStaff(id);
  }, []);

  const handleContinue = useCallback(() => {
    console.log('[Booking/Staff] Continue pressed, staff:', selectedStaff);
    router.push(`/booking/datetime?venueId=${venueId}&services=${services}&staffId=${selectedStaff}`);
  }, [selectedStaff, venueId, services, router]);

  const handleBack = useCallback(() => {
    console.log('[Booking/Staff] Back pressed');
    router.back();
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Choose your specialist</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ProgressDots step={2} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Any available */}
        <AnimatedPressable
          onPress={() => handleSelectStaff('any', 'Any available')}
          style={[styles.staffCard, selectedStaff === 'any' && styles.staffCardSelected]}
        >
          <View style={styles.anyAvatar}>
            <Shuffle size={24} color={MADAR_COLORS.gold} />
          </View>
          <View style={styles.staffInfo}>
            <Text style={styles.staffName}>Any available</Text>
            <Text style={styles.staffSpecialty}>We'll assign the best available specialist</Text>
          </View>
          {selectedStaff === 'any' && (
            <View style={styles.checkCircle}>
              <Check size={14} color={MADAR_COLORS.background} strokeWidth={3} />
            </View>
          )}
        </AnimatedPressable>

        <Text style={styles.orDivider}>or choose a specific specialist</Text>

        {MOCK_STAFF.map((staff) => {
          const isSelected = selectedStaff === staff.id;
          return (
            <AnimatedPressable
              key={staff.id}
              onPress={() => handleSelectStaff(staff.id, staff.name)}
              style={[styles.staffCard, isSelected && styles.staffCardSelected]}
            >
              <Image source={resolveImageSource(staff.avatar)} style={styles.staffAvatar} />
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{staff.name}</Text>
                <Text style={styles.staffSpecialty}>{staff.specialty}</Text>
                <View style={styles.ratingRow}>
                  <Star size={11} color={MADAR_COLORS.gold} fill={MADAR_COLORS.gold} />
                  <Text style={styles.ratingText}>{staff.rating}</Text>
                </View>
              </View>
              {isSelected && (
                <View style={styles.checkCircle}>
                  <Check size={14} color={MADAR_COLORS.background} strokeWidth={3} />
                </View>
              )}
            </AnimatedPressable>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <AnimatedPressable onPress={handleContinue} style={styles.continueBtn}>
          <LinearGradient
            colors={['#C9A84C', '#E8C96A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnGradient}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: MADAR_COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: MADAR_COLORS.text },
  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: MADAR_COLORS.surfaceSecondary },
  dotActive: { backgroundColor: MADAR_COLORS.gold, width: 24 },
  dotDone: { backgroundColor: MADAR_COLORS.goldMuted },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1,
    borderColor: MADAR_COLORS.border,
    marginBottom: 12,
  },
  staffCardSelected: { borderColor: MADAR_COLORS.goldBorder, backgroundColor: MADAR_COLORS.goldMuted },
  anyAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: MADAR_COLORS.goldBorder,
  },
  staffAvatar: { width: 56, height: 56, borderRadius: 28 },
  staffInfo: { flex: 1, gap: 3 },
  staffName: { fontSize: 15, fontWeight: '700', color: MADAR_COLORS.text },
  staffSpecialty: { fontSize: 12, color: MADAR_COLORS.textSecondary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 12, color: MADAR_COLORS.gold, fontWeight: '600' },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: MADAR_COLORS.gold, alignItems: 'center', justifyContent: 'center',
  },
  orDivider: {
    fontSize: 12, color: MADAR_COLORS.textTertiary,
    textAlign: 'center', marginVertical: 16,
  },
  bottomBar: {
    paddingHorizontal: 20, paddingTop: 16,
    backgroundColor: MADAR_COLORS.surface,
    borderTopWidth: 1, borderTopColor: MADAR_COLORS.border,
  },
  continueBtn: { borderRadius: 12 },
  continueBtnGradient: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  continueBtnText: { fontSize: 15, fontWeight: '700', color: MADAR_COLORS.background },
});
