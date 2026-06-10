import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, FONT_SIZE, RADIUS, CATEGORY_ICONS } from "@/constants";
import { placeService } from "@/services/supabase.service";
import { getScoreColor, getScoreLabel } from "@/services/recommendation.service";
import type { Place } from "@/types";

export default function SavedScreen() {
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: savedPlaces = [], isLoading } = useQuery({
    queryKey: ["saved-places", user?.id],
    queryFn: () => placeService.getSavedPlaces(user?.id || ""),
    enabled: !!user?.id,
  });

  const unsaveMutation = useMutation({
    mutationFn: (placeId: string) => placeService.unsavePlace(user?.id || "", placeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-places"] }),
  });

  const renderPlace = useCallback(({ item }: { item: Place }) => {
    const scoreColor = getScoreColor(item.worthStopScore);
    const scoreLabel = getScoreLabel(item.worthStopScore);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: "/place/[id]", params: { id: item.googlePlaceId } })}
        activeOpacity={0.88}
      >
        {/* Image */}
        <View style={styles.cardImageContainer}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Text style={styles.cardImageEmoji}>{CATEGORY_ICONS[item.category] || "📍"}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>

          <View style={styles.cardMeta}>
            <View style={[styles.scorePill, { borderColor: scoreColor }]}>
              <Text style={[styles.scorePillText, { color: scoreColor }]}>
                {item.worthStopScore} · {scoreLabel}
              </Text>
            </View>
            <Text style={styles.ratingText}>⭐ {item.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Unsave */}
        <TouchableOpacity
          style={styles.unsaveBtn}
          onPress={() => unsaveMutation.mutate(item.googlePlaceId)}
        >
          <Text style={styles.unsaveBtnText}>❤️</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#020617", "#0F172A"]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Saved Places</Text>
        <Text style={styles.subtitle}>{savedPlaces.length} places saved</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 80 }} />
      ) : savedPlaces.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤍</Text>
          <Text style={styles.emptyTitle}>No saved places yet</Text>
          <Text style={styles.emptyText}>
            Save places you love while exploring routes
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedPlaces}
          keyExtractor={(item) => item.googlePlaceId}
          renderItem={renderPlace}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.base,
  },
  title: { fontSize: FONT_SIZE["3xl"], fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },

  list: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: 100 },

  card: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  cardImageContainer: { width: 90, height: 90 },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(37,99,235,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardImageEmoji: { fontSize: 32 },
  cardInfo: { flex: 1, padding: SPACING.sm },
  cardName: { fontSize: FONT_SIZE.base, fontWeight: "700", color: COLORS.textPrimary },
  cardAddress: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2, marginBottom: SPACING.xs },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  scorePill: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  scorePillText: { fontSize: FONT_SIZE.xs, fontWeight: "700" },
  ratingText: { fontSize: FONT_SIZE.xs, color: COLORS.accent, fontWeight: "600" },
  unsaveBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
  },
  unsaveBtnText: { fontSize: 22 },

  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: SPACING["3xl"] },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.base },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SPACING.xs },
  emptyText: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22 },
});
