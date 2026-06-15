import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@clerk/clerk-expo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { COLORS, SPACING, FONT_SIZE, RADIUS, CATEGORY_ICONS, CATEGORY_LABELS } from "@/constants";
import { tipService, placeService } from "@/services/supabase.service";
import { useTripStore } from "@/store";
import { getScoreLabel, getScoreColor, calculateWorthStopScore } from "@/services/recommendation.service";
import { scheduleApproachNotification } from "@/services/notification.service";
import type { Tip } from "@/types";
import { openMapsNavigation } from "@/utils/openMapsNavigation";
import ReviewSummarySection from "@/components/place/ReviewSummarySection";

const { width } = Dimensions.get("window");

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { discoveredPlaces, currentTrip } = useTripStore();

  // Find place in current trip
  const place = discoveredPlaces.find((p) => p.googlePlaceId === id);

  const [tipText, setTipText] = useState("");
  const [isSaved, setIsSaved] = useState(place?.isSaved || false);
  const [isVisited, setIsVisited] = useState(place?.isVisited || false);
  const [activeTab, setActiveTab] = useState<"feed"|"live"|"ai"|"gems"|"top">("feed");

  // Fetch tips from Supabase
  const { data: tips = [], isLoading: tipsLoading } = useQuery({
    queryKey: ["tips", id],
    queryFn: () => tipService.getTipsByPlace(id!, user?.id),
    enabled: !!id,
  });

  // Create tip mutation
  const createTipMutation = useMutation({
    mutationFn: ({ content }: { content: string }) =>
      tipService.createTip(id!, user?.id || "", content),
    onSuccess: () => {
      setTipText("");
      queryClient.invalidateQueries({ queryKey: ["tips", id] });
      Alert.alert("✅ Tip Added", "Your tip has been shared with the community!");
    },
    onError: (err: any) => Alert.alert("Error", err?.message || "Failed to add tip"),
  });

  // Upvote mutation
  const upvoteMutation = useMutation({
    mutationFn: ({ tipId, hasUpvoted }: { tipId: string; hasUpvoted: boolean }) =>
      hasUpvoted
        ? tipService.removeUpvote(tipId, user?.id || "")
        : tipService.upvoteTip(tipId, user?.id || ""),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tips", id] }),
  });

  const handleSave = async () => {
    if (!user?.id || !id) return;
    try {
      if (isSaved) {
        await placeService.unsavePlace(user.id, id);
        setIsSaved(false);
      } else {
        await placeService.savePlace(user.id, id);
        setIsSaved(true);
      }
    } catch {
      Alert.alert("Error", "Could not save place. Please try again.");
    }
  };

  const handleVisited = async () => {
    if (!user?.id || !id) return;
    try {
      await placeService.markVisited(user.id, id, currentTrip?.id);
      setIsVisited(true);
      Alert.alert("✅ Marked as Visited!", "Added to your travel history.");
    } catch {
      Alert.alert("Error", "Could not mark as visited.");
    }
  };

  const handleNotifyMe = async () => {
    if (!place) return;
    const notifId = await scheduleApproachNotification(place);
    if (notifId) {
      Alert.alert("🔔 Reminder Set!", `You'll be notified when approaching ${place.name}.`);
    } else {
      Alert.alert("Permission Needed", "Grant notification access in Settings to enable reminders.");
    }
  };

  const handleAddTip = () => {
    if (tipText.trim().length < 10) {
      Alert.alert("Too short", "Tips must be at least 10 characters.");
      return;
    }
    createTipMutation.mutate({ content: tipText.trim() });
  };

  if (!place) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundEmoji}>😕</Text>
        <Text style={styles.notFoundText}>Place not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scoreColor = getScoreColor(place.worthStopScore);
  const scoreLabel = getScoreLabel(place.worthStopScore);
  const icon = CATEGORY_ICONS[place.category] || "📍";

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Hero Image */}
        <View style={styles.hero}>
          {place.photoUrl ? (
            <Image source={{ uri: place.photoUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.heroPlaceholder}>
              <Text style={styles.heroEmoji}>{icon}</Text>
            </LinearGradient>
          )}
          <LinearGradient
            colors={["rgba(2,6,23,0.0)", "rgba(2,6,23,1)"]}
            style={styles.heroGradient}
          />

          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title Row */}
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{icon} {CATEGORY_LABELS[place.category]}</Text>
              </View>
              <Text style={styles.placeName}>{place.name}</Text>
              <Text style={styles.placeAddress}>{place.address}</Text>
            </View>
          </View>

          {/* Score + Stats Row */}
          <View style={styles.statsCard}>
            {/* Worth Stop Score */}
            <View style={styles.statItem}>
              <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
                <Text style={[styles.scoreNum, { color: scoreColor }]}>{place.worthStopScore}</Text>
              </View>
              <Text style={styles.statLabel}>Worth Stop</Text>
              <Text style={[styles.statSub, { color: scoreColor }]}>{scoreLabel}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statBig}>⭐ {place.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
              <Text style={styles.statSub}>{place.totalRatings.toLocaleString()} reviews</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statBig}>🚗 {place.detourMinutes}m</Text>
              <Text style={styles.statLabel}>Detour</Text>
              <Text style={styles.statSub}>{place.detourKm.toFixed(1)} km off-route</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, isSaved && styles.actionBtnActive]}
              onPress={handleSave}
            >
              <Text style={styles.actionBtnEmoji}>{isSaved ? "❤️" : "🤍"}</Text>
              <Text style={styles.actionBtnText}>{isSaved ? "Saved" : "Save"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, isVisited && styles.actionBtnActive]}
              onPress={handleVisited}
            >
              <Text style={styles.actionBtnEmoji}>{isVisited ? "✅" : "🗺"}</Text>
              <Text style={styles.actionBtnText}>{isVisited ? "Visited" : "Mark Visited"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleNotifyMe}>
              <Text style={styles.actionBtnEmoji}>🔔</Text>
              <Text style={styles.actionBtnText}>Notify Me</Text>
            </TouchableOpacity>

            {/* Navigate button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnNavigate]}
              onPress={() =>
                openMapsNavigation(place.lat, place.lng, place.name).catch(() =>
                  Alert.alert("Error", "Could not open Google Maps.")
                )
              }
            >
              <Text style={styles.actionBtnEmoji}>🧭</Text>
              <Text style={styles.actionBtnText}>Navigate</Text>
            </TouchableOpacity>
          </View>

          {/* Gemini Review Summary — all bullets on detail screen */}
          <ReviewSummarySection placeId={id!} maxBullets={5} />

          {/* V3 Sub-Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabsContainer}>
            {(["feed", "live", "ai", "gems", "top"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.subTab, activeTab === tab && styles.subTabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.subTabText, activeTab === tab && styles.subTabTextActive]}>
                  {tab === "feed" && "Community Feed"}
                  {tab === "live" && "Live Updates"}
                  {tab === "ai" && "AI Summary"}
                  {tab === "gems" && "Nearby Gems"}
                  {tab === "top" && "Top Contributors"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tab Content */}
          {activeTab === "feed" && (
            <>
              {/* Community Tips */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>💬 Community Feed</Text>
                <Text style={styles.sectionCount}>{tips.length} tips</Text>
              </View>

              {/* Add Tip */}
              <View style={styles.addTipCard}>
                <TextInput
                  style={styles.tipInput}
                  placeholder="Share a tip or post about this place..."
                  placeholderTextColor={COLORS.textMuted}
                  value={tipText}
                  onChangeText={setTipText}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.addTipBtn, createTipMutation.isPending && styles.btnDisabled]}
                  onPress={handleAddTip}
                  disabled={createTipMutation.isPending}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.addTipGradient}
                  >
                    {createTipMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.addTipBtnText}>Post to Feed ✨</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Tips List */}
              {tipsLoading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
              ) : tips.length === 0 ? (
                <View style={styles.noTips}>
                  <Text style={styles.noTipsEmoji}>💡</Text>
                  <Text style={styles.noTipsText}>Be the first to share something!</Text>
                </View>
              ) : (
                tips.map((tip) => (
                  <TipItem
                    key={tip.id}
                    tip={tip}
                    onUpvote={() => upvoteMutation.mutate({ tipId: tip.id, hasUpvoted: tip.hasUpvoted || false })}
                  />
                ))
              )}
            </>
          )}

          {activeTab === "live" && (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderEmoji}>📡</Text>
              <Text style={styles.placeholderText}>Live Updates</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push(`/post/create?type=place_post&placeId=${id}`)}>
                <Text style={styles.primaryBtnText}>Broadcast Update</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === "ai" && (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderEmoji}>✨</Text>
              <Text style={styles.placeholderText}>AI Summary is generating...</Text>
            </View>
          )}

          {activeTab === "gems" && (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderEmoji}>💎</Text>
              <Text style={styles.placeholderText}>No hidden gems nearby yet.</Text>
            </View>
          )}

          {activeTab === "top" && (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderEmoji}>🏆</Text>
              <Text style={styles.placeholderText}>Top Contributors</Text>
            </View>
          )}

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================
// Tip Item Component
// ============================================================
function TipItem({ tip, onUpvote }: { tip: Tip; onUpvote: () => void }) {
  return (
    <View style={styles.tipItem}>
      <View style={styles.tipHeader}>
        <View style={styles.tipAvatar}>
          <Text style={styles.tipAvatarText}>
            {(tip.userName || "U").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.tipUser}>
          <Text style={styles.tipUserName}>{tip.userName || "Traveler"}</Text>
          <Text style={styles.tipTime}>
            {new Date(tip.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </Text>
        </View>
        <TouchableOpacity style={styles.upvoteBtn} onPress={onUpvote}>
          <Text style={styles.upvoteEmoji}>{tip.hasUpvoted ? "❤️" : "🤍"}</Text>
          <Text style={styles.upvoteCount}>{tip.upvotes}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.tipContent}>{tip.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  notFound: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundEmoji: { fontSize: 48, marginBottom: SPACING.md },
  notFoundText: { fontSize: FONT_SIZE.lg, color: COLORS.textPrimary, marginBottom: SPACING.base },
  backLink: { color: COLORS.secondary, fontSize: FONT_SIZE.base },

  // Hero
  hero: { height: 280, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  heroEmoji: { fontSize: 72 },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  backBtn: {
    position: "absolute",
    top: 52,
    left: SPACING.base,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(2,6,23,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: { fontSize: 20, color: "#fff" },

  // Content
  content: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS["2xl"],
    borderTopRightRadius: RADIUS["2xl"],
    marginTop: -RADIUS["2xl"],
    padding: SPACING.xl,
  },

  titleRow: { marginBottom: SPACING.base },
  titleLeft: { flex: 1 },
  categoryPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(37,99,235,0.15)",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginBottom: SPACING.sm,
  },
  categoryPillText: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: "700" },
  placeName: {
    fontSize: FONT_SIZE["3xl"],
    fontWeight: "800",
    color: COLORS.textPrimary,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  placeAddress: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Stats Card
  statsCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.base,
    marginBottom: SPACING.xl,
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: SPACING.xs,
  },
  scoreBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    marginBottom: SPACING.xs,
  },
  scoreNum: { fontSize: FONT_SIZE.xl, fontWeight: "900" },
  statBig: { fontSize: FONT_SIZE.lg, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SPACING.xs },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: "600" },
  statSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2, textAlign: "center" },

  // Actions
  actionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    flexWrap: "wrap",
  },
  actionBtn: {
    flex: 1,
    minWidth: 70,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  actionBtnActive: {
    backgroundColor: "rgba(37,99,235,0.15)",
    borderColor: "rgba(37,99,235,0.4)",
  },
  actionBtnNavigate: {
    backgroundColor: "rgba(6,182,212,0.12)",
    borderColor: "rgba(6,182,212,0.3)",
  },
  actionBtnEmoji: { fontSize: 20, marginBottom: 4 },
  actionBtnText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: "600" },

  // Section
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: "700", color: COLORS.textPrimary },
  sectionCount: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },

  // Add Tip
  addTipCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: SPACING.base,
    marginBottom: SPACING.xl,
  },
  tipInput: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.base,
    minHeight: 80,
    marginBottom: SPACING.md,
  },
  addTipBtn: { borderRadius: RADIUS.md, overflow: "hidden" },
  btnDisabled: { opacity: 0.6 },
  addTipGradient: {
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  addTipBtnText: { fontSize: FONT_SIZE.sm, fontWeight: "700", color: "#fff" },

  // Tips
  noTips: { alignItems: "center", paddingVertical: SPACING["2xl"] },
  noTipsEmoji: { fontSize: 36, marginBottom: SPACING.sm },
  noTipsText: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary },

  tipItem: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: SPACING.base,
    marginBottom: SPACING.sm,
  },
  tipHeader: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm },
  tipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  tipAvatarText: { fontSize: FONT_SIZE.base, fontWeight: "700", color: "#fff" },
  tipUser: { flex: 1 },
  tipUserName: { fontSize: FONT_SIZE.sm, fontWeight: "700", color: COLORS.textPrimary },
  tipTime: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  upvoteBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  upvoteEmoji: { fontSize: 18 },
  upvoteCount: { fontSize: FONT_SIZE.sm, fontWeight: "700", color: COLORS.textSecondary },
  tipContent: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, lineHeight: 22 },
  
  // Sub-Tabs
  subTabsContainer: {
    marginBottom: SPACING.lg,
    flexDirection: "row",
  },
  subTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  subTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  subTabText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: FONT_SIZE.sm,
  },
  subTabTextActive: {
    color: "#fff",
  },
  placeholderContainer: {
    alignItems: "center",
    paddingVertical: SPACING["2xl"],
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  placeholderEmoji: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  placeholderText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.base,
    marginBottom: SPACING.md,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
