import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, SPACING, RADIUS } from "@/constants";
import { searchService, SearchResults } from "@/services/search.service";
import { useDebounce } from "@/hooks/useDebounce";

type TabType = "all" | "places" | "routes" | "users" | "lists";

export default function SearchScreen() {
  const router = useRouter();
  
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [results, setResults] = useState<SearchResults>({ places: [], routes: [], users: [], lists: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults({ places: [], routes: [], users: [], lists: [] });
    }
  }, [debouncedQuery]);

  const performSearch = async (searchTerm: string) => {
    setLoading(true);
    try {
      const data = await searchService.search(searchTerm);
      setResults(data);
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const renderTabs = () => {
    const tabs: { key: TabType; label: string }[] = [
      { key: "all", label: "All" },
      { key: "places", label: "Places" },
      { key: "routes", label: "Routes" },
      { key: "users", label: "Travelers" },
      { key: "lists", label: "Lists" },
    ];

    return (
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md }}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSectionHeader = (title: string, count: number, showMoreKey: TabType) => {
    if (count === 0) return null;
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {activeTab === "all" && count >= 5 && (
          <TouchableOpacity onPress={() => setActiveTab(showMoreKey)}>
            <Text style={styles.seeMore}>See more</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search places, routes, travelers..."
            placeholderTextColor={COLORS.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderTabs()}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : query.length < 2 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={COLORS.surfaceLight} />
            <Text style={styles.emptyText}>Type at least 2 characters to search</Text>
          </View>
        ) : (
          <>
            {/* Places */}
            {(activeTab === "all" || activeTab === "places") && results.places.length > 0 && (
              <View style={styles.section}>
                {renderSectionHeader("Places", results.places.length, "places")}
                {results.places.map((place) => (
                  <TouchableOpacity 
                    key={place.id} 
                    style={styles.resultItem}
                    onPress={() => router.push(`/place/${place.googlePlaceId}`)}
                  >
                    <View style={styles.resultIconWrapper}>
                      <Ionicons name="location" size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle}>{place.name}</Text>
                      <Text style={styles.resultSub} numberOfLines={1}>{place.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Routes */}
            {(activeTab === "all" || activeTab === "routes") && results.routes.length > 0 && (
              <View style={styles.section}>
                {renderSectionHeader("Route Communities", results.routes.length, "routes")}
                {results.routes.map((route) => (
                  <TouchableOpacity 
                    key={route.id} 
                    style={styles.resultItem}
                    onPress={() => router.push(`/route-community/${route.id}`)}
                  >
                    <View style={[styles.resultIconWrapper, { backgroundColor: `${COLORS.success}20` }]}>
                      <Ionicons name="map" size={20} color={COLORS.success} />
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle}>{route.originLabel} → {route.destinationLabel}</Text>
                      <Text style={styles.resultSub} numberOfLines={1}>{route.memberCount} members</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Lists */}
            {(activeTab === "all" || activeTab === "lists") && results.lists.length > 0 && (
              <View style={styles.section}>
                {renderSectionHeader("Travel Lists", results.lists.length, "lists")}
                {results.lists.map((list) => (
                  <TouchableOpacity 
                    key={list.id} 
                    style={styles.resultItem}
                    onPress={() => router.push(`/list/${list.id}`)}
                  >
                    <View style={[styles.resultIconWrapper, { backgroundColor: `${COLORS.secondary}20` }]}>
                      <Ionicons name="list" size={20} color={COLORS.secondary} />
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle}>{list.title}</Text>
                      <Text style={styles.resultSub} numberOfLines={1}>By {list.ownerName}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Users */}
            {(activeTab === "all" || activeTab === "users") && results.users.length > 0 && (
              <View style={styles.section}>
                {renderSectionHeader("Travelers", results.users.length, "users")}
                {results.users.map((u) => (
                  <TouchableOpacity 
                    key={u.id} 
                    style={styles.resultItem}
                  >
                    {u.avatarUrl ? (
                      <Image source={{ uri: u.avatarUrl }} style={styles.userAvatar} />
                    ) : (
                      <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                      </View>
                    )}
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle}>{u.name || "Traveler"}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* No Results */}
            {results.places.length === 0 && results.routes.length === 0 && results.lists.length === 0 && results.users.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No results found for "{query}"</Text>
              </View>
            )}
          </  >
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
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    padding: SPACING.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    height: 40,
    marginRight: SPACING.md,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.base,
  },
  tabsContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginRight: SPACING.xs,
    backgroundColor: "transparent",
  },
  activeTab: {
    backgroundColor: `${COLORS.primary}20`,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: FONT_SIZE.sm,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  section: {
    marginTop: SPACING.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  seeMore: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.md,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  resultSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.base,
    marginTop: SPACING.md,
  },
});
