// ============================================================
// SectionSkeleton — Shimmer placeholder for Explore sections
// ============================================================
import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, ScrollView } from "react-native";
import { COLORS, RADIUS, SPACING } from "@/constants";

interface SkeletonBoxProps {
  width: number | string;
  height: number;
  style?: object;
}

function SkeletonBox({ width, height, style }: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: COLORS.surfaceLight,
          borderRadius: RADIUS.md,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Card skeleton for horizontal scrolling sections
export function HorizontalCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      scrollEnabled={false}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.cardShell}>
          <SkeletonBox width="100%" height={130} style={styles.imageBox} />
          <SkeletonBox width="80%" height={12} style={styles.line} />
          <SkeletonBox width="55%" height={10} style={styles.lineSmall} />
        </View>
      ))}
    </ScrollView>
  );
}

// Tall card skeleton (for routes with score breakdown)
export function TallCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      scrollEnabled={false}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.tallCardShell}>
          <SkeletonBox width="100%" height={160} style={styles.imageBox} />
          <SkeletonBox width="85%" height={12} style={styles.line} />
          <SkeletonBox width="60%" height={10} style={styles.lineSmall} />
          <SkeletonBox width="40%" height={10} style={styles.lineSmall} />
        </View>
      ))}
    </ScrollView>
  );
}

// Avatar row skeleton (for travelers)
export function TravelerSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      scrollEnabled={false}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.travelerShell}>
          <SkeletonBox width={64} height={64} style={styles.avatar} />
          <SkeletonBox width={70} height={10} style={styles.line} />
          <SkeletonBox width={50} height={8}  style={styles.lineSmall} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  cardShell: {
    width: 160,
    gap: SPACING.xs,
  },
  tallCardShell: {
    width: 200,
    gap: SPACING.xs,
  },
  travelerShell: {
    width: 80,
    alignItems: "center",
    gap: SPACING.xs,
  },
  imageBox: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xs,
  },
  avatar: {
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xs,
  },
  line: {
    marginVertical: 2,
    borderRadius: 4,
  },
  lineSmall: {
    marginVertical: 2,
    borderRadius: 4,
  },
});
