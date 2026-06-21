import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  User,
  Image as ImageIcon,
  Star,
  Building2,
  Settings,
  Gift,
  HelpCircle,
  Globe,
  LogOut,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

const P = {
  bg: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#242438',
  border: '#2A2A45',
  accent: '#7C3AED',
  gold: '#C9A84C',
  text: '#F0F0FF',
  textSecondary: '#9090B0',
  textTertiary: '#5A5A7A',
  danger: '#E85454',
  warning: '#92400E',
  warningBg: '#451A03',
  divider: '#1E1E35',
};

export default function PartnerProfile() {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const [reviewCount] = useState(0);

  const nameParts = (profile?.full_name ?? 'U').split(' ');
  const initials = nameParts
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const displayName = profile?.full_name ?? 'Partner';
  const reviewText = reviewCount === 0 ? 'No reviews yet' : `${reviewCount} reviews`;

  const handleLogout = () => {
    console.log('[PartnerProfile] Log out pressed');
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          console.log('[PartnerProfile] Confirmed log out');
          await signOut();
          router.replace('/auth');
        },
      },
    ]);
  };

  const handleBack = () => {
    console.log('[PartnerProfile] Back pressed');
    router.back();
  };

  const handleVerifyEmail = () => {
    console.log('[PartnerProfile] Verify email banner pressed');
  };

  const handleProfile = () => {
    console.log('[PartnerProfile] Profile row pressed');
    router.push('/(partner)/settings' as never);
  };

  const handlePortfolio = () => {
    console.log('[PartnerProfile] Portfolio row pressed');
    router.push('/(partner)/settings' as never);
  };

  const handleReviews = () => {
    console.log('[PartnerProfile] Reviews row pressed');
  };

  const handleWorkspaces = () => {
    console.log('[PartnerProfile] Workspaces row pressed');
  };

  const handlePersonalSettings = () => {
    console.log('[PartnerProfile] Personal settings row pressed');
    router.push('/(partner)/settings' as never);
  };

  const handleReferFriend = () => {
    console.log('[PartnerProfile] Refer a friend row pressed');
  };

  const handleHelpSupport = () => {
    console.log('[PartnerProfile] Help and support row pressed');
  };

  const handleLanguage = () => {
    console.log('[PartnerProfile] Language row pressed');
  };

  const section1 = [
    { icon: User, label: 'Profile', onPress: handleProfile },
    { icon: ImageIcon, label: 'Portfolio', onPress: handlePortfolio },
    { icon: Star, label: 'Reviews', onPress: handleReviews },
    { icon: Building2, label: 'Workspaces', onPress: handleWorkspaces },
    { icon: Settings, label: 'Personal settings', onPress: handlePersonalSettings },
  ];

  const section2 = [
    { icon: Gift, label: 'Refer a friend', onPress: handleReferFriend, danger: false },
    { icon: HelpCircle, label: 'Help and support', onPress: handleHelpSupport, danger: false },
    { icon: Globe, label: 'English (US)', onPress: handleLanguage, danger: false },
    { icon: LogOut, label: 'Log out', onPress: handleLogout, danger: true },
  ];

  const hasAvatar = Boolean(profile?.avatar_url);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ArrowLeft size={22} color={P.text} />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroSub}>Personal area</Text>
            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroReviews}>{reviewText}</Text>
          </View>
          {hasAvatar ? (
            <Image source={{ uri: profile!.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>

        {/* Email verify banner */}
        <TouchableOpacity
          style={styles.verifyBanner}
          activeOpacity={0.8}
          onPress={handleVerifyEmail}
        >
          <AlertTriangle size={18} color="#F59E0B" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.verifyTitle}>Verify your email address</Text>
            <Text style={styles.verifySub}>Secure your account</Text>
          </View>
          <ChevronRight size={18} color="#F59E0B" />
        </TouchableOpacity>

        {/* Section 1 */}
        <View style={styles.card}>
          {section1.map((item, i) => {
            const Icon = item.icon;
            const isLast = i === section1.length - 1;
            return (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowIcon}>
                    <Icon size={20} color={P.textSecondary} />
                  </View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <ChevronRight size={16} color={P.textTertiary} />
                </TouchableOpacity>
                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Section 2 */}
        <View style={styles.card}>
          {section2.map((item, i) => {
            const Icon = item.icon;
            const isLast = i === section2.length - 1;
            const iconColor = item.danger ? P.danger : P.textSecondary;
            const labelStyle = item.danger
              ? [styles.rowLabel, styles.rowLabelDanger]
              : styles.rowLabel;
            return (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowIcon}>
                    <Icon size={20} color={iconColor} />
                  </View>
                  <Text style={labelStyle}>{item.label}</Text>
                  <ChevronRight size={16} color={P.textTertiary} />
                </TouchableOpacity>
                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heroSub: {
    color: P.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  heroName: {
    color: P.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroReviews: {
    color: P.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E6B8C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  verifyBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: P.warningBg,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: P.warning,
  },
  verifyTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
  },
  verifySub: {
    color: '#D97706',
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: P.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: P.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowLabel: {
    flex: 1,
    color: P.text,
    fontSize: 15,
    fontWeight: '500',
  },
  rowLabelDanger: {
    color: P.danger,
  },
  divider: {
    height: 1,
    backgroundColor: P.divider,
    marginLeft: 66,
  },
});
