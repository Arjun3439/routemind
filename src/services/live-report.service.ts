// ============================================================
// RouteMind V3 — Live Report Service
// ============================================================
// Service for live, ephemeral intelligence reports.
// ============================================================

import { supabase } from "./supabase.client";
import type { LiveReport, LiveReportType } from "@/types";

export const liveReportService = {
  /**
   * Create a new live report.
   * Expires automatically based on the report type.
   */
  async createReport(
    reporterId: string,
    reportType: LiveReportType,
    placeId?: string,
    routeCommunityId?: string
  ): Promise<LiveReport> {
    // Determine expiration based on type
    let hoursToLive = 2; // Default 2 hours
    switch (reportType) {
      case "road_block":
      case "accident":
      case "police_checkpoint":
      case "heavy_traffic":
        hoursToLive = 4;
        break;
      case "weather_alert":
      case "closed":
        hoursToLive = 12;
        break;
      case "fresh_batch":
        hoursToLive = 1; // Food runs out fast
        break;
    }

    const expiresAt = new Date(Date.now() + hoursToLive * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("live_reports")
      .insert({
        reporter_id: reporterId,
        report_type: reportType,
        place_id: placeId,
        route_community_id: routeCommunityId,
        expires_at: expiresAt,
      })
      .select(`
        *,
        users:reporter_id (name, avatar_url),
        places:place_id (name)
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      reporterId: data.reporter_id,
      placeId: data.place_id,
      routeCommunityId: data.route_community_id,
      reportType: data.report_type as LiveReportType,
      expiresAt: data.expires_at,
      upvoteCount: data.upvote_count || 0,
      createdAt: data.created_at,
      reporterName: data.users?.name,
      reporterAvatar: data.users?.avatar_url,
      placeName: data.places?.name,
    };
  },

  /**
   * Fetch active reports for a specific place.
   */
  async getActiveReportsForPlace(placeId: string): Promise<LiveReport[]> {
    const { data, error } = await supabase
      .from("live_reports")
      .select(`
        *,
        users:reporter_id (name, avatar_url)
      `)
      .eq("place_id", placeId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapLiveReport);
  },

  /**
   * Fetch active reports for a route community.
   */
  async getActiveReportsForRoute(routeCommunityId: string): Promise<LiveReport[]> {
    const { data, error } = await supabase
      .from("live_reports")
      .select(`
        *,
        users:reporter_id (name, avatar_url),
        places:place_id (name)
      `)
      .eq("route_community_id", routeCommunityId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapLiveReport);
  },
};

function mapLiveReport(data: any): LiveReport {
  return {
    id: data.id,
    reporterId: data.reporter_id,
    placeId: data.place_id,
    routeCommunityId: data.route_community_id,
    reportType: data.report_type as LiveReportType,
    expiresAt: data.expires_at,
    upvoteCount: data.upvote_count || 0,
    createdAt: data.created_at,
    reporterName: data.users?.name,
    reporterAvatar: data.users?.avatar_url,
    placeName: data.places?.name,
  };
}
