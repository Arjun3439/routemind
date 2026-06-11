import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import type { TravelList } from "@/types";

interface ListCardProps {
  list: TravelList;
  onPress: () => void;
}

export default function ListCard({ list, onPress }: ListCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {list.coverImageUrl ? (
        <Image source={{ uri: list.coverImageUrl }} style={styles.coverImage} />
      ) : (
        <View style={styles.coverPlaceholder}>
          <Ionicons name="list" size={32} color={COLORS.primary} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{list.title}</Text>
        
        {list.description ? (
          <Text style={styles.description} numberOfLines={2}>{list.description}</Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.authorRow}>
            {list.ownerAvatar ? (
              <Image source={{ uri: list.ownerAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={12} color={COLORS.textSecondary} />
              </View>
            )}
            <Text style={styles.authorName}>{list.ownerName || "Traveler"}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="location" size={12} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{list.itemCount} items</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="bookmark" size={12} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{list.saveCount}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: SPACING.md,
    flexDirection: "row",
    height: 120,
  },
  coverImage: {
    width: 120,
    height: "100%",
  },
  coverPlaceholder: {
    width: 120,
    height: "100%",
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: SPACING.sm,
    justifyContent: "space-between",
  },
  title: {
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  authorName: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
});
