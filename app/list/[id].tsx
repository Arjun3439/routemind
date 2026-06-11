import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { useAuthStore } from "@/store";
import { supabase } from "@/services/supabase.client";
import { travelListService } from "@/services/travel-list.service";
import FollowButton from "@/components/community/FollowButton";
import type { TravelList, TravelListItem } from "@/types";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  const [listData, setListData] = useState<TravelList | null>(null);
  const [items, setItems] = useState<TravelListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchListDetails();
  }, [id]);

  const fetchListDetails = async () => {
    try {
      setLoading(true);
      // Fetch List
      const { data: listRaw } = await supabase
        .from("travel_lists")
        .select(`
          *,
          users:owner_id (name, avatar_url)
        `)
        .eq("id", id)
        .single();
        
      if (listRaw) {
        setListData({
          id: listRaw.id,
          ownerId: listRaw.owner_id,
          title: listRaw.title,
          description: listRaw.description,
          coverImageUrl: listRaw.cover_image_url,
          isPublic: listRaw.is_public,
          likeCount: listRaw.like_count || 0,
          saveCount: listRaw.save_count || 0,
          followCount: listRaw.follow_count || 0,
          duplicatedFromListId: listRaw.duplicated_from_list_id,
          createdAt: listRaw.created_at,
          updatedAt: listRaw.updated_at,
          ownerName: listRaw.users?.name,
          ownerAvatar: listRaw.users?.avatar_url,
          itemCount: 0, // we will get length from items
        });
      }

      // Fetch Items
      const listItems = await travelListService.getListItems(id);
      setItems(listItems);
      
      if (listData) {
        setListData(prev => prev ? { ...prev, itemCount: listItems.length } : null);
      }

    } catch (e) {
      console.error("Failed to load list details:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!user) return router.push("/(auth)/welcome");
    try {
      const newList = await travelListService.duplicateList(id, user.id);
      router.push(`/list/${newList.id}`);
    } catch (e) {
      console.error("Duplicate failed:", e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!listData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>List not found.</Text>
      </SafeAreaView>
    );
  }

  const isOwner = user?.id === listData.ownerId;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="share-outline" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover */}
        {listData.coverImageUrl ? (
          <Image source={{ uri: listData.coverImageUrl }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="list" size={48} color={COLORS.primary} />
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.title}>{listData.title}</Text>
          {listData.description ? (
            <Text style={styles.description}>{listData.description}</Text>
          ) : null}

          <View style={styles.authorRow}>
            {listData.ownerAvatar ? (
              <Image source={{ uri: listData.ownerAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={16} color={COLORS.textSecondary} />
              </View>
            )}
            <Text style={styles.authorName}>By {listData.ownerName || "Traveler"}</Text>
            
            {!isOwner && (
              <View style={{ marginLeft: "auto" }}>
                <FollowButton targetType="list" targetId={listData.id} size="small" />
              </View>
            )}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="heart-outline" size={20} color={COLORS.textPrimary} />
              <Text style={styles.actionText}>{listData.likeCount}</Text>
            </TouchableOpacity>
            
            {!isOwner && (
              <TouchableOpacity style={styles.actionButton} onPress={handleDuplicate}>
                <Ionicons name="duplicate-outline" size={20} color={COLORS.textPrimary} />
                <Text style={styles.actionText}>Save Copy</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>{items.length} Places</Text>
          
          {items.map((item, index) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.itemCard}
              onPress={() => router.push(`/place/${item.placeId}`)}
            >
              <View style={styles.itemNumberBadge}>
                <Text style={styles.itemNumber}>{index + 1}</Text>
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemName}>{item.place?.name || "Unknown Place"}</Text>
                {item.place?.address && (
                  <Text style={styles.itemAddress} numberOfLines={1}>{item.place.address}</Text>
                )}
                {item.note && (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>"{item.note}"</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {items.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>This list has no places yet.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  headerActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  iconButton: {
    padding: 8,
  },
  errorText: {
    textAlign: "center",
    marginTop: 100,
    color: COLORS.textSecondary,
  },
  coverImage: {
    width: "100%",
    height: 200,
  },
  coverPlaceholder: {
    width: "100%",
    height: 150,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  infoSection: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  authorName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  itemsSection: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  itemNumber: {
    color: "#fff",
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  itemAddress: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  noteBox: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  noteText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textPrimary,
    fontStyle: "italic",
  },
  emptyState: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
});
