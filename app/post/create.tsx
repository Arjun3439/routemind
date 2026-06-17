import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { communityService } from "@/services/community.service";
import { storageService } from "@/services/storage.service";
import { useAuthStore, useCommunityStore } from "@/store";
import type { PostType } from "@/types";

export default function CreatePostScreen() {
  const router = useRouter();
  const { type = "route_post", placeId, routeId } = useLocalSearchParams<{ type: PostType; placeId?: string; routeId?: string }>();
  const user = useAuthStore(s => s.user);
  const { updatePostInFeeds, forYouFeed, followingFeed, setForYouFeed } = useCommunityStore();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const handlePickImages = async () => {
    try {
      const selected = await storageService.pickImages(5 - assets.length);
      if (selected.length > 0) {
        setAssets((prev) => [...prev, ...selected].slice(0, 5));
      }
    } catch (err: any) {
      setError(err.message || "Failed to pick images");
    }
  };

  const removeImage = (index: number) => {
    setAssets((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!user) {
      router.push("/(auth)/sign-in");
      return;
    }

    if (!title.trim() || !body.trim()) {
      setError("Title and body are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Upload images if any
      let uploadedUrls: string[] = [];
      if (assets.length > 0) {
        console.log("[CreatePost] Uploading", assets.length, "images...");
        uploadedUrls = await storageService.uploadPostImages(user.id, assets);
        console.log("[CreatePost] Upload complete:", uploadedUrls);
      }

      // 2. Create post record
      console.log("[CreatePost] Creating post...", { authorId: user.id, type, title: title.trim() });
      const newPost = await communityService.createPost(
        user.id,
        type,
        title.trim(),
        body.trim(),
        uploadedUrls,
        placeId,
        routeId
      );
      console.log("[CreatePost] Post created successfully:", newPost.id);
      
      // 3. Optimistically update feed (add to top of For You)
      setForYouFeed([ { ...newPost, feedScore: 100 }, ...forYouFeed ]);
      
      // 4. Always navigate to community tab (not router.back() which may go to home)
      router.replace("/(tabs)/community");
    } catch (err: any) {
      console.error("[CreatePost] Error creating post:", err);
      setError(err.message || "Failed to create post.");
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/community");
    }
  };

  const getHeaderTitle = () => {
    switch(type) {
      case "hidden_gem_nomination": return "Nominate Hidden Gem";
      case "travel_story": return "Share Travel Story";
      case "place_post": return "Review Place";
      default: return "Create Post";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity 
          onPress={handlePost} 
          disabled={loading || !title.trim() || !body.trim()}
          style={[styles.postButton, (!title.trim() || !body.trim() || loading) && styles.postButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {user && (
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{user.name?.charAt(0) || "U"}</Text>
              )}
            </View>
            <View>
              <Text style={styles.authorName}>{user.name}</Text>
              <Text style={styles.authorEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        <TextInput
          style={styles.titleInput}
          placeholder="An engaging title..."
          placeholderTextColor={COLORS.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <TextInput
          style={styles.bodyInput}
          placeholder="Share your thoughts, tips, or experiences..."
          placeholderTextColor={COLORS.textSecondary}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />
        
        {/* Selected Images Preview */}
        {assets.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
            {assets.map((asset, index) => (
              <View key={asset.uri} style={styles.previewWrapper}>
                <Image source={{ uri: asset.uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Attachment Button */}
        {assets.length < 5 && (
          <TouchableOpacity style={styles.attachButton} onPress={handlePickImages}>
            <Ionicons name="image-outline" size={24} color={COLORS.primary} />
            <Text style={styles.attachText}>Add Photos ({assets.length}/5)</Text>
          </TouchableOpacity>
        )}

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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  postButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    minWidth: 70,
    alignItems: "center",
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: FONT_SIZE.base,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: COLORS.textPrimary, fontWeight: "700" },
  authorName: { color: COLORS.textPrimary, fontWeight: "600", fontSize: FONT_SIZE.base },
  authorEmail: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },
  errorText: {
    color: COLORS.error,
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: RADIUS.sm,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  bodyInput: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
    minHeight: 150,
    lineHeight: 24,
  },
  imagePreviewContainer: {
    marginTop: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.sm,
  },
  previewWrapper: {
    position: "relative",
    marginRight: SPACING.sm,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.md,
  },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    marginTop: SPACING.xl,
    justifyContent: "center",
  },
  attachText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: FONT_SIZE.base,
  },
});
