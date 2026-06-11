import React, { useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";
import { COLORS } from "@/constants";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_BAR_HEIGHT = 88;
const TAB_BAR_PADDING_BOTTOM = Platform.OS === "ios" ? 28 : 16;
const CONTENT_HEIGHT = TAB_BAR_HEIGHT - TAB_BAR_PADDING_BOTTOM;
const HORIZONTAL_MARGIN = 16;
const TAB_BAR_WIDTH = SCREEN_WIDTH - HORIZONTAL_MARGIN * 2;
const BORDER_RADIUS = 28;

// ─── Icon Components ─────────────────────────────────────────
function HomeIcon({ color, size, filled }: { color: string; size: number; filled: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={color}
        fill={filled ? color : "none"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={filled ? 0.2 : 1}
      />
      {filled && (
        <Path
          d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <Path
        d="M9 21V12h6v9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MapIcon({ color, size, filled }: { color: string; size: number; filled: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"
        stroke={color}
        fill={filled ? color : "none"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={filled ? 0.2 : 1}
      />
      {filled && (
        <Path
          d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <Path d="M8 2v16" stroke={color} strokeWidth={1.8} />
      <Path d="M16 6v16" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function HeartIcon({ color, size, filled }: { color: string; size: number; filled: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"
        stroke={color}
        fill={filled ? color : "none"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={filled ? 0.25 : 1}
      />
      {filled && (
        <Path
          d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function UserIcon({ color, size, filled }: { color: string; size: number; filled: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke={color}
        fill={filled ? color : "none"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={filled ? 0.25 : 1}
      />
      {filled && (
        <Path
          d="M12 11a4 4 0 100-8 4 4 0 000 8z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function UsersIcon({ color, size, filled }: { color: string; size: number; filled: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 11a4 4 0 100-8 4 4 0 000 8z"
        stroke={color}
        fill={filled ? color : "none"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={filled ? 0.25 : 1}
      />
      {filled && (
        <Path
          d="M9 11a4 4 0 100-8 4 4 0 000 8z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <Path
        d="M23 21v-2a4 4 0 00-3-3.87"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 3.13a4 4 0 010 7.75"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CompassIcon({ color, size, filled }: { color: string; size: number; filled: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        fill={filled ? color : "none"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={filled ? 0.25 : 1}
      />
      {filled && (
        <Path
          d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <Path
        d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const ICONS = [HomeIcon, MapIcon, UsersIcon, CompassIcon, UserIcon];

// ─── Tab Item ────────────────────────────────────────────────
interface TabItemProps {
  index: number;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  tabWidth: number;
}

function TabItem({ index, label, isFocused, onPress, onLongPress, tabWidth }: TabItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateYAnim, {
        toValue: isFocused ? -2 : 0,
        damping: 15,
        stiffness: 200,
        mass: 1,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isFocused ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.85,
        damping: 10,
        stiffness: 400,
        mass: 1,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 300,
        mass: 1,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  const IconComponent = ICONS[index];
  const color = isFocused ? COLORS.primary : "rgba(255,255,255,0.55)";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[styles.tabItem, { width: tabWidth }]}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View
        style={{
          transform: [
            { translateY: translateYAnim },
            { scale: scaleAnim },
          ],
        }}
      >
        <IconComponent color={color} size={22} filled={isFocused} />
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          { color, opacity: opacityAnim },
        ]}
      >
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

// ─── Liquid Glass Tab Bar ────────────────────────────────────
export default function LiquidGlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const tabCount = state.routes.length;
  const tabWidth = TAB_BAR_WIDTH / tabCount;

  // Animated pill position
  const pillAnim = useRef(new Animated.Value(state.index * tabWidth)).current;

  useEffect(() => {
    Animated.spring(pillAnim, {
      toValue: state.index * tabWidth,
      damping: 20,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  return (
    <View style={styles.container}>
      {/* Outer glow */}
      <View style={styles.outerGlow} />

      {/* Main glass container */}
      <View style={styles.glassContainer}>
        {/* Blur background */}
        <BlurView
          intensity={40}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />

        {/* Glass layers */}
        <View style={styles.glassOverlay} />
        <View style={styles.glassSheen} />

        {/* Top edge highlight — liquid glass refraction line */}
        <View style={styles.topEdgeHighlight} />

        {/* Inner subtle gradient border */}
        <View style={styles.innerBorder} />

        {/* Sliding active pill */}
        <Animated.View
          style={[
            styles.pillContainer,
            { transform: [{ translateX: pillAnim }] },
          ]}
        >
          <View style={[styles.activePill, { width: tabWidth - 16 }]}>
            <View style={styles.pillGlow} />
          </View>
        </Animated.View>

        {/* Tab items */}
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = (options.title ?? route.name) as string;
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <TabItem
                key={route.key}
                index={index}
                label={label}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                tabWidth={tabWidth}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 8 : 16,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: HORIZONTAL_MARGIN,
  },
  outerGlow: {
    position: "absolute",
    bottom: 10,
    left: HORIZONTAL_MARGIN + 20,
    right: HORIZONTAL_MARGIN + 20,
    height: 60,
    borderRadius: BORDER_RADIUS + 8,
    backgroundColor: "rgba(37, 99, 235, 0.06)",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  glassContainer: {
    width: TAB_BAR_WIDTH,
    height: 67,
    borderRadius: BORDER_RADIUS,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
        shadowColor: "#000",
      },
    }),
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "transparent",
  },
  topEdgeHighlight: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 1,
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  pillContainer: {
    position: "absolute",
    top: 6,
    left: 0,
    height: CONTENT_HEIGHT - 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  activePill: {
    height: "100%",
    borderRadius: 25,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.2)",
    overflow: "hidden",
  },
  pillGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(37, 99, 235, 0.3)",
    backgroundColor: "transparent",
  },
  tabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? TAB_BAR_PADDING_BOTTOM : 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Platform.OS === "ios" ? 29 : 14,
    gap: -1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
