import { useQuery } from "@tanstack/react-query";
import { communityIntelligenceService } from "@/services/community-intelligence.service";

export function useCommunityInsights(googlePlaceId: string, query?: string) {
  return useQuery({
    // Include query in the queryKey so it refetches when the user searches
    queryKey: ["community-insights", googlePlaceId, query],
    queryFn: () => communityIntelligenceService.getPlaceInsights(googlePlaceId, query),
    enabled: !!googlePlaceId,
    staleTime: 1000 * 60 * 30, // 30 min in-memory cache
    retry: 1,
  });
}
