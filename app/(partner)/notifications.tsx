import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MoreVertical,
  Bell,
  Scissors,
  Star,
  DollarSign,
  ShoppingBag,
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

type NotifTab = 'appointments' | 'reviews' | 'tips' | 'online-sales';

interface Notification {
  id: string;
  profile_id: string;
  type?: string;
  title?: string;
  body?: string;
  read?: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 'n1', profile_id: '', type: 'appointment', title: 'New booking from John Doe', body: 'Haircut on Mon, 23 Jun · 10:00am', read: false, created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 'n2', profile_id: '', type: 'appointment', title: 'Booking confirmed', body: 'Beard Trim on Tue, 24 Jun · 2:00pm', read: false, created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: 'n3', profile_id: '', type: 'review', title: 'New 5-star review', body: '"Great service, will come back!"', read: true, created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'n4', profile_id: '', type: 'appointment', title: 'Booking cancelled', body: 'Jane Doe cancelled their appointment', read: true, created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
];

function filterByTab(notifications: Notification[], tab: NotifTab): Notification[] {
  return notifications.filter(n => {
    const t = (n.type ?? '').toLowerCase();
    if (tab === 'appointments') return t.includes('booking') || t.includes('appointment') || t === '';
    if (tab === 'reviews') return t.includes('review');
    if (tab === 'tips') return t.includes('tip');
    if (tab === 'online-sales') return t.includes('sale') || t.includes('payment') || t.includes('online');
    return false;
  });
}

function getNotifIcon(type?: string) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('review')) return <Star size={18} color={P.gold} />;
  if (t.includes('tip')) return <DollarSign size={18} color={P.success} />;
  if (t.includes('sale') || t.includes('payment')) return <ShoppingBag size={18} color={P.accent} />;
  return <Scissors size={18} color={P.accent} />;
}

function getNotifIconBg(type?: string) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('review')) return 'rgba(201,168,76,0.15)';
  if (t.includes('tip')) return 'rgba(76,175,125,0.15)';
  if (t.includes('sale') || t.includes('payment')) return P.accentLight;
  return P.accentLight;
}

export default function PartnerNotifications() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile } = useAuth();
  const shopId = profile?.shop_id;

  const [activeTab, setActiveTab] = useState<NotifTab>('appointments');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!shopId) {
      console.log('[Notifications] No shopId, showing demo notifications');
      setNotifications(DEMO_NOTIFICATIONS);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (!profile?.id) {
      console.log('[Notifications] No profile.id yet, showing demo notifications');
      setNotifications(DEMO_NOTIFICATIONS);
      setLoading(false);
      return;
    }
    console.log('[Notifications] fetchNotifications called, shopId:', shopId);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      console.log('[Notifications] fetchNotifications result:', data?.length, 'items, error:', error?.message);
      if (error || !data || data.length === 0) {
        // Fall back to bookings-based notifications
        console.log('[Notifications] Falling back to bookings table');
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('id, created_at, customer_name, status, start_at')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (bookingData && bookingData.length > 0) {
          const mapped: Notification[] = bookingData.map(b => ({
            id: b.id,
            profile_id: shopId,
            type: 'appointment',
            title: `New booking from ${b.customer_name ?? 'client'}`,
            body: `Appointment on ${new Date(b.start_at).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}`,
            read: b.status === 'completed' || b.status === 'cancelled',
            created_at: b.created_at,
          }));
          console.log('[Notifications] Mapped', mapped.length, 'bookings as notifications');
          setNotifications(mapped);
        } else {
          console.log('[Notifications] No bookings found, showing demo');
          setNotifications(DEMO_NOTIFICATIONS);
        }
      } else {
        setNotifications(data as Notification[]);
      }
    } catch (err) {
      console.log('[Notifications] fetchNotifications error:', err);
      setNotifications(DEMO_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  }, [shopId, profile?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;
    console.log('[Notifications] Setting up real-time subscription for userId:', user.id);
    const channel = supabase
      .channel('partner-notifs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${user.id}`,
        },
        payload => {
          console.log('[Notifications] Real-time INSERT received:', payload.new);
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();
    return () => {
      console.log('[Notifications] Removing real-time channel');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markRead = async (notif: Notification) => {
    if (notif.read) return;
    console.log('[Notifications] Mark read pressed, id:', notif.id);
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
      console.log('[Notifications] markRead result, error:', error?.message);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    } catch (err) {
      console.log('[Notifications] markRead error:', err);
    }
  };

  const tabItems: { key: NotifTab; label: string }[] = [
    { key: 'appointments', label: 'Appointments' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'tips', label: 'Tips' },
    { key: 'online-sales', label: 'Online sales' },
  ];

  const tabNotifs = filterByTab(notifications, activeTab);
  const unreadCount = (tab: NotifTab) => filterByTab(notifications, tab).filter(n => !n.read).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { console.log('[Notifications] Back pressed'); router.back(); }}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={P.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => console.log('[Notifications] Menu pressed')}
        >
          <MoreVertical size={20} color={P.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 0 }}
      >
        {tabItems.map(tab => {
          const isActive = activeTab === tab.key;
          const count = unreadCount(tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => { console.log('[Notifications] Tab pressed:', tab.key); setActiveTab(tab.key); }}
            >
              <View style={styles.tabLabelRow}>
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{tab.label}</Text>
                {count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={P.accent} />
        </View>
      ) : tabNotifs.length === 0 ? (
        <View style={styles.emptyState}>
          {/* Gradient-style icon */}
          <View style={styles.emptyIconOuter}>
            <View style={styles.emptyIconInner}>
              <Bell size={28} color={P.accent} />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySub}>You do not have any notifications yet.</Text>
        </View>
      ) : (
        <FlatList
          data={tabNotifs}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            const timeText = timeAgo(item.created_at);
            const iconBg = getNotifIconBg(item.type);
            const icon = getNotifIcon(item.type);
            const titleText = item.title ?? 'Notification';
            const bodyText = item.body ?? '';
            return (
              <TouchableOpacity
                style={[styles.notifRow, !item.read && styles.notifRowUnread]}
                onPress={() => markRead(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.notifIcon, { backgroundColor: iconBg }]}>{icon}</View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.notifTitle}>{titleText}</Text>
                  {bodyText ? <Text style={styles.notifBody}>{bodyText}</Text> : null}
                </View>
                <Text style={styles.notifTime}>{timeText}</Text>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, color: P.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  tabsScroll: { borderBottomWidth: 1, borderBottomColor: P.border, maxHeight: 48 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: P.accent },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabBtnText: { color: P.textSecondary, fontSize: 14, fontWeight: '500' },
  tabBtnTextActive: { color: P.text, fontWeight: '700' },
  badge: { backgroundColor: P.accent, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyIconOuter: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center' },
  emptyIconInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: P.accentLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: P.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: P.textSecondary, fontSize: 14, textAlign: 'center' },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  notifRowUnread: { backgroundColor: P.accentLight },
  notifIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  notifTitle: { color: P.text, fontSize: 14, fontWeight: '700' },
  notifBody: { color: P.textSecondary, fontSize: 13 },
  notifTime: { color: P.textTertiary, fontSize: 11, marginTop: 2 },
  separator: { height: 1, backgroundColor: P.divider },
});
