import React, { useState, useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "@/constants";
import { followService } from "@/services/follow.service";
import { useAuthStore } from "@/store";
import { useRouter } from "expo-router";
import type { FollowTargetType } from "@/types";

interface FollowButtonProps {
  targetType: FollowTargetType;
  targetId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: "small" | "medium";
}

export default function FollowButton({ 
  targetType, 
  targetId, 
  initialIsFollowing = false, 
  onFollowChange,
  size = "medium" 
}: FollowButtonProps) {
  const user = useAuthStore(s => s.user);
  const router = useRouter();

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If not provided initially, fetch status
    if (user && initialIsFollowing === undefined) {
      followService.isFollowing(user.id, targetType, targetId).then(setIsFollowing);
    }
  }, [user, targetType, targetId, initialIsFollowing]);
  const handlePress = async () => {
    if (!user) {
      router.push("/(auth)/sign-in");
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        await followService.unfollow(user.id, targetType, targetId);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await followService.follow(user.id, targetType, targetId);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (e) {
      console.error("Follow error:", e);
    } finally {
      setLoading(false);
    }
  };

  const isSmall = size === "small";

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isSmall ? styles.buttonSmall : styles.buttonMedium,
        isFollowing ? styles.buttonFollowing : styles.buttonFollow
      ]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isFollowing ? COLORS.primary : "#fff"} />
      ) : (
        <Text
          style={[
            styles.text,
            isSmall ? styles.textSmall : styles.textMedium,
            isFollowing ? styles.textFollowing : styles.textFollow
          ]}
        >
          {isFollowing ? "Following" : "Follow"}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  buttonSmall: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  buttonMedium: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
  },
  buttonFollow: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  buttonFollowing: {
    backgroundColor: "transparent",
    borderColor: COLORS.primary,
  },
  text: {
    fontWeight: "600",
  },
  textSmall: {
    fontSize: FONT_SIZE.xs,
  },
  textMedium: {
    fontSize: FONT_SIZE.sm,
  },
  textFollow: {
    color: "#fff",
  },
  textFollowing: {
    color: COLORS.primary,
  },
});
