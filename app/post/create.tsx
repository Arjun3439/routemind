import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { communityService } from "@/services/community.service";
import { useAuthStore } from "@/store";
import type { PostType } from "@/types";

export default function CreatePostScreen() {
  const router = useRouter();
  const { type = "route_post", placeId, routeId } = useLocalSearchParams<{ type: PostType; placeId?: string; routeId?: string }>();
  const user = useAuthStore(s => s.user);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePost = async () => {
    if (!user) {
      router.push("/(auth)/welcome");
      return;
    }

    if (!title.trim() || !body.trim()) {
      setError("Title and body are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await communityService.createPost(
        user.id,
        type,
        title.trim(),
        body.trim(),
        [], // Empty media for now
        placeId,
        routeId
      );
      
      router.back();
    } catch (err: any) {
      setError(err.message || "Failed to create post.");
      setLoading(false);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity 
          onPress={handlePost} 
          disabled={loading || !title.trim() || !body.trim()}
          style={[styles.postButton, (!title.trim() || !body.trim()) && styles.postButtonDisabled]}
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
        
        {/* Attachment Placeholder */}
        <TouchableOpacity style={styles.attachButton}>
          <Ionicons name="image-outline" size={24} color={COLORS.primary} />
          <Text style={styles.attachText}>Add Photos</Text>
        </TouchableOpacity>

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
  },
  errorText: {
    color: COLORS.error,
    marginBottom: SPACING.md,
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
    minHeight: 200,
    lineHeight: 24,
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
