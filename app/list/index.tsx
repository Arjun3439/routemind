import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { useAuthStore } from "@/store";
import { travelListService } from "@/services/travel-list.service";
import ListCard from "@/components/community/ListCard";
import type { TravelList } from "@/types";

export default function ListsScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  const [lists, setLists] = useState<TravelList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLists();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadLists = async () => {
    try {
      const fetchedLists = await travelListService.getUserLists(user!.id);
      setLists(fetchedLists);
    } catch (e) {
      console.error("Failed to load lists:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Please sign in to view your travel lists.</Text>
          <TouchableOpacity style={styles.authBtn} onPress={() => router.push("/(auth)/welcome")}>
            <Text style={styles.authBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Travel Lists</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {lists.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No lists yet</Text>
              <Text style={styles.emptyText}>Create a travel list to curate places for your next adventure.</Text>
            </View>
          ) : (
            lists.map(list => (
              <ListCard 
                key={list.id} 
                list={list} 
                onPress={() => router.push(`/list/${list.id}`)} 
              />
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push("/list/create")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
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
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: SPACING.xl,
  },
  authBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  authBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
