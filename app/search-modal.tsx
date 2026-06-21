import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  Search,
  MapPin,
  Calendar,
  Clock,
  Scissors,
  Sparkles,
  Hand,
  Waves,
  Heart,
  Eye,
  Dumbbell,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MADAR_COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const RECENT_SEARCHES = [
  'Classic haircut',
  'Beard trim',
  'Gel manicure',
  'Swedish massage',
];

const POPULAR_CATEGORIES = [
  { id: 'barber', label: 'Barber', Icon: Scissors },
  { id: 'salon', label: 'Salon', Icon: Sparkles },
  { id: 'nails', label: 'Nails', Icon: Hand },
  { id: 'spa', label: 'Spa', Icon: Waves },
  { id: 'massage', label: 'Massage', Icon: Heart },
  { id: 'brows', label: 'Brows', Icon: Eye },
  { id: 'fitness', label: 'Fitness', Icon: Dumbbell },
];

const FAVOURITE_VENUES = [
  { id: '1', name: 'Level Barber Shop', category: 'Barber' },
  { id: '2', name: 'Luxe Spa', category: 'Spa' },
];

export default function SearchModalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [treatment, setTreatment] = useState('Any');
  const [location, setLocation] = useState('Map area');
  const [dateTime, setDateTime] = useState('Anytime');

  const handleClose = useCallback(() => {
    console.log('[SearchModal] Close pressed');
    router.back();
  }, [router]);

  const handleSearch = useCallback(() => {
    console.log('[SearchModal] Search pressed, query:', query, 'treatment:', treatment, 'location:', location, 'dateTime:', dateTime);
    router.back();
    router.push('/(tabs)/discover');
  }, [query, treatment, location, dateTime, router]);

  const handleRecentSearch = useCallback((term: string) => {
    console.log('[SearchModal] Recent search pressed:', term);
    setQuery(term);
  }, []);

  const handleCategoryPress = useCallback((id: string, label: string) => {
    console.log('[SearchModal] Category pressed:', id, label);
    router.back();
    router.push('/(tabs)/discover');
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <AnimatedPressable onPress={handleClose} style={styles.closeBtn}>
          <X size={20} color={MADAR_COLORS.text} />
        </AnimatedPressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Main search input */}
        <View style={styles.searchInputWrapper}>
          <Search size={18} color={MADAR_COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Any treatments, venues or professionals"
            placeholderTextColor={MADAR_COLORS.textTertiary}
            value={query}
            onChangeText={(text) => {
              console.log('[SearchModal] Query changed:', text);
              setQuery(text);
            }}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {query.length > 0 && (
            <AnimatedPressable onPress={() => setQuery('')}>
              <X size={16} color={MADAR_COLORS.textTertiary} />
            </AnimatedPressable>
          )}
        </View>

        {/* Quick fields */}
        <View style={styles.quickFields}>
          <AnimatedPressable
            onPress={() => console.log('[SearchModal] Treatment field pressed')}
            style={styles.quickField}
          >
            <Scissors size={16} color={MADAR_COLORS.gold} />
            <View style={styles.quickFieldInfo}>
              <Text style={styles.quickFieldLabel}>Treatment</Text>
              <Text style={styles.quickFieldValue}>{treatment}</Text>
            </View>
          </AnimatedPressable>
          <View style={styles.fieldDivider} />
          <AnimatedPressable
            onPress={() => console.log('[SearchModal] Location field pressed')}
            style={styles.quickField}
          >
            <MapPin size={16} color={MADAR_COLORS.gold} />
            <View style={styles.quickFieldInfo}>
              <Text style={styles.quickFieldLabel}>Location</Text>
              <Text style={styles.quickFieldValue}>{location}</Text>
            </View>
          </AnimatedPressable>
          <View style={styles.fieldDivider} />
          <AnimatedPressable
            onPress={() => console.log('[SearchModal] Date/time field pressed')}
            style={styles.quickField}
          >
            <Calendar size={16} color={MADAR_COLORS.gold} />
            <View style={styles.quickFieldInfo}>
              <Text style={styles.quickFieldLabel}>Date & time</Text>
              <Text style={styles.quickFieldValue}>{dateTime}</Text>
            </View>
          </AnimatedPressable>
        </View>

        {/* Favourites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favourites</Text>
          {FAVOURITE_VENUES.map((v) => (
            <AnimatedPressable
              key={v.id}
              onPress={() => {
                console.log('[SearchModal] Favourite venue pressed:', v.id, v.name);
                router.back();
                router.push(`/venue/${v.id}`);
              }}
              style={styles.venueRow}
            >
              <Heart size={16} color={MADAR_COLORS.danger} fill={MADAR_COLORS.danger} />
              <View style={styles.venueInfo}>
                <Text style={styles.venueName}>{v.name}</Text>
                <Text style={styles.venueCategory}>{v.category}</Text>
              </View>
            </AnimatedPressable>
          ))}
        </View>

        {/* Recent searches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent searches</Text>
          {RECENT_SEARCHES.map((term) => (
            <AnimatedPressable
              key={term}
              onPress={() => handleRecentSearch(term)}
              style={styles.recentRow}
            >
              <Clock size={16} color={MADAR_COLORS.textTertiary} />
              <Text style={styles.recentText}>{term}</Text>
            </AnimatedPressable>
          ))}
        </View>

        {/* Popular categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular categories</Text>
          <View style={styles.categoriesGrid}>
            {POPULAR_CATEGORIES.map((cat) => {
              const CatIcon = cat.Icon;
              return (
                <AnimatedPressable
                  key={cat.id}
                  onPress={() => handleCategoryPress(cat.id, cat.label)}
                  style={styles.categoryChip}
                >
                  <CatIcon size={14} color={MADAR_COLORS.gold} />
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Search button */}
      <View style={[styles.searchBtnContainer, { paddingBottom: insets.bottom + 16 }]}>
        <AnimatedPressable onPress={handleSearch} style={styles.searchBtn}>
          <LinearGradient
            colors={['#C9A84C', '#E8C96A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.searchBtnGradient}
          >
            <Search size={18} color={MADAR_COLORS.background} />
            <Text style={styles.searchBtnText}>Search</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MADAR_COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: MADAR_COLORS.text },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: MADAR_COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 20 },
  searchInputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: MADAR_COLORS.surfaceSecondary,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: MADAR_COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: MADAR_COLORS.text },
  quickFields: {
    backgroundColor: MADAR_COLORS.surface,
    borderRadius: 16, borderWidth: 1, borderColor: MADAR_COLORS.border,
    overflow: 'hidden',
  },
  quickField: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  fieldDivider: { height: 1, backgroundColor: MADAR_COLORS.divider, marginHorizontal: 14 },
  quickFieldInfo: { flex: 1 },
  quickFieldLabel: { fontSize: 11, color: MADAR_COLORS.textTertiary, fontWeight: '600', letterSpacing: 0.3 },
  quickFieldValue: { fontSize: 14, color: MADAR_COLORS.text, fontWeight: '600', marginTop: 2 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.text },
  venueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: MADAR_COLORS.divider,
  },
  venueInfo: { flex: 1 },
  venueName: { fontSize: 14, fontWeight: '600', color: MADAR_COLORS.text },
  venueCategory: { fontSize: 12, color: MADAR_COLORS.textSecondary },
  recentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: MADAR_COLORS.divider,
  },
  recentText: { fontSize: 14, color: MADAR_COLORS.textSecondary },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: MADAR_COLORS.surface,
    borderWidth: 1, borderColor: MADAR_COLORS.goldBorder,
  },
  categoryLabel: { fontSize: 13, color: MADAR_COLORS.gold, fontWeight: '500' },
  searchBtnContainer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: MADAR_COLORS.surface, borderTopWidth: 1, borderTopColor: MADAR_COLORS.border },
  searchBtn: { borderRadius: 12 },
  searchBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12 },
  searchBtnText: { fontSize: 16, fontWeight: '700', color: MADAR_COLORS.background },
});
