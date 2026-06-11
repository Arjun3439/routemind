import { create } from "zustand";
import type { Post, ScoredPost, PostType } from "@/types";

interface CommunityState {
  // Feed state
  forYouFeed: ScoredPost[];
  followingFeed: Post[];
  trendingPosts: Post[];
  
  // Draft composer state
  composerDraft: {
    type: PostType;
    title: string;
    body: string;
    placeId?: string;
    routeCommunityId?: string;
    mediaUrls: string[];
  } | null;

  // Actions
  setForYouFeed: (posts: ScoredPost[]) => void;
  setFollowingFeed: (posts: Post[]) => void;
  setTrendingPosts: (posts: Post[]) => void;
  updatePostInFeeds: (updatedPost: Post) => void;
  
  // Composer actions
  initComposer: (type: PostType, initialData?: Partial<CommunityState["composerDraft"]>) => void;
  updateComposerDraft: (updates: Partial<CommunityState["composerDraft"]>) => void;
  clearComposer: () => void;
}

export const useCommunityStore = create<CommunityState>()((set) => ({
  forYouFeed: [],
  followingFeed: [],
  trendingPosts: [],
  composerDraft: null,

  setForYouFeed: (forYouFeed) => set({ forYouFeed }),
  setFollowingFeed: (followingFeed) => set({ followingFeed }),
  setTrendingPosts: (trendingPosts) => set({ trendingPosts }),

  updatePostInFeeds: (updatedPost) =>
    set((state) => ({
      forYouFeed: state.forYouFeed.map((p) => (p.id === updatedPost.id ? { ...p, ...updatedPost } : p)),
      followingFeed: state.followingFeed.map((p) => (p.id === updatedPost.id ? { ...p, ...updatedPost } : p)),
      trendingPosts: state.trendingPosts.map((p) => (p.id === updatedPost.id ? { ...p, ...updatedPost } : p)),
    })),

  initComposer: (type, initialData) =>
    set({
      composerDraft: {
        type,
        title: "",
        body: "",
        mediaUrls: [],
        ...initialData,
      },
    }),

  updateComposerDraft: (updates) =>
    set((state) => ({
      composerDraft: state.composerDraft ? { ...state.composerDraft, ...updates } : null,
    })),

  clearComposer: () => set({ composerDraft: null }),
}));
