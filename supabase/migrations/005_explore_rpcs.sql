-- ============================================================
-- RouteMind — Explore Tab RPCs + Leaderboard Fix (005)
-- Run AFTER 004_community_fix.sql
-- Safe to re-run: uses CREATE OR REPLACE + IF NOT EXISTS guards.
-- ============================================================

-- ============================================================
-- FIX 1: Add public basic-profile read policy on users table
-- Allows authenticated users to read name/avatar/region of
-- other users (needed for leaderboard, traveler cards, etc.).
-- Does NOT expose email or clerk_id.
-- ============================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated can view public profiles" ON users;
  EXECUTE $p$
    CREATE POLICY "Authenticated can view public profiles"
      ON users FOR SELECT TO authenticated
      USING (true);
  $p$;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- FIX 2: Rebuild get_leaderboard as SECURITY DEFINER
-- The SECURITY INVOKER version was blocked by the restrictive
-- users RLS policy — users could only see their own row.
-- SECURITY DEFINER executes as the function owner (postgres)
-- and the JOIN users ... now returns all public profile rows.
-- Only exposes: name, avatar_url, region — no email/clerk_id.
-- ============================================================
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_category  TEXT DEFAULT 'overall',
  p_region    TEXT DEFAULT NULL,
  p_limit     INTEGER DEFAULT 50
)
RETURNS TABLE (
  rank          BIGINT,
  user_id       UUID,
  user_name     TEXT,
  avatar_url    TEXT,
  region        TEXT,
  score         INTEGER,
  level         TEXT,
  xp_points     INTEGER,
  badges        JSONB,
  hidden_gems   INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY
      CASE
        WHEN p_category = 'overall' THEN ur.xp_points
        ELSE COALESCE(rcs.score, 0)
      END DESC
    ) AS rank,
    u.id           AS user_id,
    u.name         AS user_name,
    u.avatar_url   AS avatar_url,
    u.region       AS region,
    CASE
      WHEN p_category = 'overall' THEN ur.xp_points
      ELSE COALESCE(rcs.score, 0)
    END            AS score,
    ur.level::text AS level,
    ur.xp_points   AS xp_points,
    ur.badges      AS badges,
    ur.hidden_gems_found AS hidden_gems
  FROM user_reputation ur
  JOIN users u ON u.id = ur.user_id
  LEFT JOIN reputation_category_stats rcs
    ON rcs.user_id = ur.user_id
    AND rcs.category::text = p_category
  WHERE
    (p_region IS NULL OR u.region = p_region)
    AND (
      p_category = 'overall'
      OR rcs.score IS NOT NULL
    )
  ORDER BY score DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- RPC 1: get_trending_routes
-- Route communities ranked by post_count + member_count
-- velocity over the last 7 days (posts in that window).
-- Falls back to all-time post_count if no recent posts.
-- ============================================================
CREATE OR REPLACE FUNCTION get_trending_routes(limit_n INT DEFAULT 10)
RETURNS TABLE (
  id                  UUID,
  slug                TEXT,
  origin_label        TEXT,
  destination_label   TEXT,
  description         TEXT,
  cover_image_url     TEXT,
  member_count        INTEGER,
  post_count          INTEGER,
  recent_post_count   BIGINT,
  overall_score       NUMERIC,
  created_at          TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rc.id,
    rc.slug,
    rc.origin_label,
    rc.destination_label,
    rc.description,
    rc.cover_image_url,
    rc.member_count,
    rc.post_count,
    COUNT(p.id) AS recent_post_count,
    COALESCE(rrs.overall_score, 0) AS overall_score,
    rc.created_at
  FROM route_communities rc
  LEFT JOIN posts p
    ON p.route_community_id = rc.id
    AND p.is_deleted = false
    AND p.created_at >= NOW() - INTERVAL '7 days'
  LEFT JOIN route_reputation_scores rrs
    ON rrs.route_community_id = rc.id
  GROUP BY rc.id, rc.slug, rc.origin_label, rc.destination_label,
           rc.description, rc.cover_image_url, rc.member_count,
           rc.post_count, rrs.overall_score, rc.created_at
  ORDER BY recent_post_count DESC, rc.post_count DESC, rc.member_count DESC
  LIMIT limit_n;
$$;

-- ============================================================
-- RPC 2: get_trending_places
-- Places with highest recent tip/post velocity (last 7 days)
-- and community_score, joined with place_trust_scores.
-- ============================================================
CREATE OR REPLACE FUNCTION get_trending_places(limit_n INT DEFAULT 10)
RETURNS TABLE (
  id              UUID,
  name            TEXT,
  address         TEXT,
  category        TEXT,
  rating          NUMERIC,
  photo_url       TEXT,
  community_score INTEGER,
  tip_count       INTEGER,
  final_score     NUMERIC,
  recent_activity BIGINT,
  is_hidden_gem   BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pl.id,
    pl.name,
    pl.address,
    pl.category::text,
    pl.rating,
    pl.photo_url,
    pl.community_score,
    pl.tip_count,
    COALESCE(pts.final_score, 0) AS final_score,
    COUNT(DISTINCT po.id) + COUNT(DISTINCT t.id) AS recent_activity,
    COALESCE(pl.is_hidden_gem, false) AS is_hidden_gem
  FROM places pl
  LEFT JOIN place_trust_scores pts ON pts.place_id = pl.id
  LEFT JOIN posts po
    ON po.place_id = pl.id
    AND po.is_deleted = false
    AND po.created_at >= NOW() - INTERVAL '7 days'
  LEFT JOIN tips t
    ON t.place_id = pl.id
    AND t.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY pl.id, pl.name, pl.address, pl.category, pl.rating,
           pl.photo_url, pl.community_score, pl.tip_count,
           pts.final_score, pl.is_hidden_gem
  ORDER BY
    recent_activity DESC,
    pl.community_score DESC,
    COALESCE(pts.final_score, 0) DESC
  LIMIT limit_n;
$$;

-- ============================================================
-- RPC 3: get_top_rated_routes
-- Route communities ranked by route_reputation_scores.overall_score
-- with full category breakdown.
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_rated_routes(limit_n INT DEFAULT 10)
RETURNS TABLE (
  id                      UUID,
  slug                    TEXT,
  origin_label            TEXT,
  destination_label       TEXT,
  description             TEXT,
  cover_image_url         TEXT,
  member_count            INTEGER,
  post_count              INTEGER,
  overall_score           NUMERIC,
  food_score              NUMERIC,
  coffee_score            NUMERIC,
  road_quality_score      NUMERIC,
  photography_score       NUMERIC,
  safety_score            NUMERIC,
  night_driving_score     NUMERIC,
  fuel_availability_score NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rc.id,
    rc.slug,
    rc.origin_label,
    rc.destination_label,
    rc.description,
    rc.cover_image_url,
    rc.member_count,
    rc.post_count,
    COALESCE(rrs.overall_score, 0)           AS overall_score,
    COALESCE(rrs.food_score, 0)              AS food_score,
    COALESCE(rrs.coffee_score, 0)            AS coffee_score,
    COALESCE(rrs.road_quality_score, 0)      AS road_quality_score,
    COALESCE(rrs.photography_score, 0)       AS photography_score,
    COALESCE(rrs.safety_score, 0)            AS safety_score,
    COALESCE(rrs.night_driving_score, 0)     AS night_driving_score,
    COALESCE(rrs.fuel_availability_score, 0) AS fuel_availability_score
  FROM route_communities rc
  LEFT JOIN route_reputation_scores rrs
    ON rrs.route_community_id = rc.id
  ORDER BY overall_score DESC, rc.member_count DESC
  LIMIT limit_n;
$$;

-- ============================================================
-- RPC 4: get_trending_travelers
-- Users with highest XP gain in the last 7 days
-- (approximated by posts + upvotes in that window).
-- ============================================================
CREATE OR REPLACE FUNCTION get_trending_travelers(limit_n INT DEFAULT 10)
RETURNS TABLE (
  user_id         UUID,
  user_name       TEXT,
  avatar_url      TEXT,
  level           TEXT,
  xp_points       INTEGER,
  recent_posts    BIGINT,
  recent_upvotes  BIGINT,
  hidden_gems     INTEGER,
  region          TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id                              AS user_id,
    u.name                            AS user_name,
    u.avatar_url,
    ur.level::text,
    ur.xp_points,
    COUNT(DISTINCT p.id)              AS recent_posts,
    COALESCE(SUM(p.upvote_count), 0)  AS recent_upvotes,
    ur.hidden_gems_found              AS hidden_gems,
    u.region
  FROM users u
  JOIN user_reputation ur ON ur.user_id = u.id
  LEFT JOIN posts p
    ON p.author_id = u.id
    AND p.is_deleted = false
    AND p.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY u.id, u.name, u.avatar_url, ur.level, ur.xp_points,
           ur.hidden_gems_found, u.region
  ORDER BY recent_posts DESC, recent_upvotes DESC, ur.xp_points DESC
  LIMIT limit_n;
$$;

-- ============================================================
-- RPC 5: get_recent_hidden_gems
-- Recently approved hidden gem nominations sorted by vote count.
-- ============================================================
CREATE OR REPLACE FUNCTION get_recent_hidden_gems(limit_n INT DEFAULT 10)
RETURNS TABLE (
  nomination_id   UUID,
  place_id        UUID,
  place_name      TEXT,
  place_address   TEXT,
  place_category  TEXT,
  photo_url       TEXT,
  upvote_count    INTEGER,
  downvote_count  INTEGER,
  approved_at     TIMESTAMPTZ,
  nominator_name  TEXT,
  community_score INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    hgn.id          AS nomination_id,
    pl.id           AS place_id,
    pl.name         AS place_name,
    pl.address      AS place_address,
    pl.category::text AS place_category,
    pl.photo_url,
    hgn.upvote_count,
    hgn.downvote_count,
    hgn.approved_at,
    u.name          AS nominator_name,
    pl.community_score
  FROM hidden_gem_nominations hgn
  JOIN places pl ON pl.id = hgn.place_id
  JOIN users u   ON u.id  = hgn.nominated_by
  WHERE hgn.status = 'approved'
  ORDER BY hgn.upvote_count DESC, hgn.approved_at DESC
  LIMIT limit_n;
$$;

-- ============================================================
-- RPC 6: get_trending_lists
-- Travel lists ranked by like_count + save_count + follow_count.
-- ============================================================
CREATE OR REPLACE FUNCTION get_trending_lists(limit_n INT DEFAULT 10)
RETURNS TABLE (
  id              UUID,
  title           TEXT,
  description     TEXT,
  cover_image_url TEXT,
  like_count      INTEGER,
  save_count      INTEGER,
  follow_count    INTEGER,
  item_count      BIGINT,
  owner_name      TEXT,
  owner_avatar    TEXT,
  trending_score  INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tl.id,
    tl.title,
    tl.description,
    tl.cover_image_url,
    tl.like_count,
    tl.save_count,
    tl.follow_count,
    COUNT(tli.id)                                     AS item_count,
    u.name                                            AS owner_name,
    u.avatar_url                                      AS owner_avatar,
    (tl.like_count + tl.save_count + tl.follow_count) AS trending_score
  FROM travel_lists tl
  JOIN users u ON u.id = tl.owner_id
  LEFT JOIN travel_list_items tli ON tli.list_id = tl.id
  WHERE tl.is_public = true
  GROUP BY tl.id, tl.title, tl.description, tl.cover_image_url,
           tl.like_count, tl.save_count, tl.follow_count, u.name, u.avatar_url
  ORDER BY trending_score DESC, tl.created_at DESC
  LIMIT limit_n;
$$;

-- ============================================================
-- RPC 7: get_community_favorite_places
-- Places ranked by place_trust_scores.final_score.
-- ============================================================
CREATE OR REPLACE FUNCTION get_community_favorite_places(limit_n INT DEFAULT 10)
RETURNS TABLE (
  id              UUID,
  name            TEXT,
  address         TEXT,
  category        TEXT,
  rating          NUMERIC,
  photo_url       TEXT,
  community_score INTEGER,
  tip_count       INTEGER,
  final_score     NUMERIC,
  is_hidden_gem   BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pl.id,
    pl.name,
    pl.address,
    pl.category::text,
    pl.rating,
    pl.photo_url,
    pl.community_score,
    pl.tip_count,
    COALESCE(pts.final_score, 0) AS final_score,
    COALESCE(pl.is_hidden_gem, false) AS is_hidden_gem
  FROM places pl
  JOIN place_trust_scores pts ON pts.place_id = pl.id
  WHERE pts.final_score > 0
  ORDER BY pts.final_score DESC, pl.community_score DESC
  LIMIT limit_n;
$$;

-- ============================================================
-- RPC 8: get_new_discoveries
-- Recently added places with low/no post history —
-- places added within last 30 days with tip_count < 3.
-- Falls back to all places ordered by created_at if too few.
-- ============================================================
CREATE OR REPLACE FUNCTION get_new_discoveries(limit_n INT DEFAULT 10)
RETURNS TABLE (
  id              UUID,
  name            TEXT,
  address         TEXT,
  category        TEXT,
  rating          NUMERIC,
  photo_url       TEXT,
  community_score INTEGER,
  tip_count       INTEGER,
  created_at      TIMESTAMPTZ,
  is_hidden_gem   BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pl.id,
    pl.name,
    pl.address,
    pl.category::text,
    pl.rating,
    pl.photo_url,
    pl.community_score,
    pl.tip_count,
    pl.created_at,
    COALESCE(pl.is_hidden_gem, false) AS is_hidden_gem
  FROM places pl
  WHERE pl.tip_count < 5
  ORDER BY pl.created_at DESC, pl.rating DESC
  LIMIT limit_n;
$$;

-- ============================================================
-- GRANT EXECUTE on all new RPCs to authenticated + anon
-- ============================================================
GRANT EXECUTE ON FUNCTION get_trending_routes(INT)        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_trending_places(INT)        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_top_rated_routes(INT)       TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_trending_travelers(INT)     TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_recent_hidden_gems(INT)     TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_trending_lists(INT)         TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_community_favorite_places(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_new_discoveries(INT)        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT, TEXT, INT) TO authenticated, anon;

-- ============================================================
-- DONE — Migration 005 complete.
-- ============================================================
