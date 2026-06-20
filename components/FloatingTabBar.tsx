import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter, usePathname, Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import {
  Home,
  Compass,
  CalendarDays,
  MessageCircle,
  User,
  LucideIcon,
} from 'lucide-react-native';
import { MADAR_COLORS } from '@/constants/Colors';

const { width: screenWidth } = Dimensions.get('window');

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  compass: Compass,
  'calendar-days': CalendarDays,
  'message-circle': MessageCircle,
  user: User,
};

export interface TabBarItem {
  name: string;
  route: Href;
  icon: string;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({
  tabs,
  containerWidth = screenWidth - 48,
  borderRadius = 32,
  bottomMargin,
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const activeTabIndex = React.useMemo(() => {
    let bestMatch = -1;
    let bestMatchScore = 0;

    tabs.forEach((tab, index) => {
      let score = 0;
      const routeStr = String(tab.route);

      if (pathname === routeStr) {
        score = 100;
      } else if (pathname.startsWith(routeStr)) {
        score = 80;
      } else if (pathname.includes(tab.name)) {
        score = 60;
      } else if (routeStr.includes('/(tabs)/') && pathname.includes(routeStr.split('/(tabs)/')[1])) {
        score = 40;
      }

      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatch = index;
      }
    });

    return bestMatch >= 0 ? bestMatch : 0;
  }, [pathname, tabs]);

  const indicatorAnim = useRef(new Animated.Value(activeTabIndex)).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: activeTabIndex,
      useNativeDriver: true,
      damping: 20,
      stiffness: 120,
      mass: 1,
    }).start();
  }, [activeTabIndex, indicatorAnim]);

  const tabWidth = (containerWidth - 8) / tabs.length;

  const indicatorTranslateX = indicatorAnim.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => i * tabWidth),
  });

  const handleTabPress = (route: Href, label: string) => {
    console.log('[TabBar] Tab pressed:', label, route);
    router.push(route);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View
        style={[
          styles.container,
          { width: containerWidth, marginBottom: bottomMargin ?? 16 },
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 60 : 0}
          style={[styles.blurContainer, { borderRadius }]}
        >
          <View style={[styles.background, { borderRadius }]} />

          {/* Active indicator pill */}
          <Animated.View
            style={[
              styles.indicator,
              {
                width: tabWidth - 8,
                transform: [{ translateX: indicatorTranslateX }],
              },
            ]}
          />

          <View style={styles.tabsContainer}>
            {tabs.map((tab, index) => {
              const isActive = activeTabIndex === index;
              const IconComponent = ICON_MAP[tab.icon] ?? Home;

              return (
                <TabItem
                  key={tab.name}
                  tab={tab}
                  isActive={isActive}
                  IconComponent={IconComponent}
                  onPress={() => handleTabPress(tab.route, tab.label)}
                />
              );
            })}
          </View>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

function TabItem({
  tab,
  isActive,
  IconComponent,
  onPress,
}: {
  tab: TabBarItem;
  isActive: boolean;
  IconComponent: LucideIcon;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const iconColor = isActive ? MADAR_COLORS.gold : MADAR_COLORS.textTertiary;
  const labelColor = isActive ? MADAR_COLORS.gold : MADAR_COLORS.textTertiary;

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale: scaleAnim }] }]}>
        <IconComponent size={22} color={iconColor} strokeWidth={isActive ? 2.5 : 2} />
        <Text style={[styles.tabLabel, { color: labelColor, fontWeight: isActive ? '600' : '400' }]}>
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  container: {
    alignSelf: 'center',
  },
  blurContainer: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(13,13,20,0.85)',
      },
      android: {
        backgroundColor: 'rgba(13,13,20,0.97)',
      },
      web: {
        backgroundColor: 'rgba(13,13,20,0.95)',
        backdropFilter: 'blur(20px)',
      } as object,
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    left: 4,
    bottom: 6,
    borderRadius: 24,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 44,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
