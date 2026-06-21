import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';

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

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface ClientEntry {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  visits: number;
}

export default function PartnerClients() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuth();
  const shopId = profile?.shop_id;

  const [clients, setClients] = useState<ClientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchClients = useCallback(async () => {
    if (!shopId) return;
    console.log('[Clients] Fetching clients for shop:', shopId);
    try {
      const { data } = await supabase
        .from('bookings')
        .select('customer_profile_id, profiles!customer_profile_id(id, full_name, avatar_url, email, phone)')
        .eq('shop_id', shopId)
        .not('customer_profile_id', 'is', null)
        .order('created_at', { ascending: false });

      const seen = new Map<string, ClientEntry>();
      for (const b of (data ?? []) as { customer_profile_id: string; profiles: { id: string; full_name: string; avatar_url?: string; email?: string; phone?: string } | null }[]) {
        if (!b.profiles) continue;
        const id = b.profiles.id;
        if (seen.has(id)) {
          seen.get(id)!.visits += 1;
        } else {
          seen.set(id, { ...b.profiles, visits: 1 });
        }
      }
      const list = Array.from(seen.values());
      setClients(list);
      console.log('[Clients] Loaded', list.length, 'unique clients');
    } catch (err) {
      console.log('[Clients] fetchClients error:', err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clients</Text>
        <Text style={styles.headerSub}>{clients.length} total</Text>
      </View>

      <View style={styles.searchWrap}>
        <Search size={16} color={P.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={P.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={P.accent} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No clients found</Text>
              <Text style={styles.emptySub}>Clients who book with you will appear here</Text>
            </View>
          ) : (
            filtered.map(client => {
              const initials = client.full_name?.charAt(0)?.toUpperCase() ?? '?';
              const visitsText = `${client.visits} visit${client.visits !== 1 ? 's' : ''}`;
              return (
                <AnimatedPressable
                  key={client.id}
                  onPress={() => {
                    console.log('[Clients] Client tapped:', client.id);
                    router.push(`/(partner)/client/${client.id}` as never);
                  }}
                >
                  <View style={styles.clientRow}>
                    {client.avatar_url ? (
                      <Image source={resolveImageSource(client.avatar_url)} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>{initials}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>{client.full_name}</Text>
                      <Text style={styles.clientSub}>{client.phone ?? client.email ?? 'No contact info'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={styles.visitsText}>{visitsText}</Text>
                      <ChevronRight size={14} color={P.textTertiary} />
                    </View>
                  </View>
                </AnimatedPressable>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: P.text, fontSize: 20, fontWeight: '700' },
  headerSub: { color: P.textSecondary, fontSize: 13 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12, backgroundColor: P.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: P.border },
  searchInput: { flex: 1, color: P.text, fontSize: 15 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { color: P.textSecondary, fontSize: 16, fontWeight: '600' },
  emptySub: { color: P.textTertiary, fontSize: 13, textAlign: 'center' },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: P.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: P.border },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: P.accent, fontSize: 18, fontWeight: '700' },
  clientName: { color: P.text, fontSize: 15, fontWeight: '600' },
  clientSub: { color: P.textSecondary, fontSize: 12, marginTop: 2 },
  visitsText: { color: P.accent, fontSize: 12, fontWeight: '600' },
});
