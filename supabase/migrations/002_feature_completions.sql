-- ============================================================
-- RouteMind — Feature Completions Migration (002)
-- Run AFTER schema.sql + v3_migration.sql
-- ADDITIVE ONLY — no destructive changes.
-- ============================================================

-- ============================================================
-- FEATURE 1 SCHEMA — Push Tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token  TEXT NOT NULL,
  device_type      TEXT NOT NULL DEFAULT 'unknown'
                   CHECK (device_type IN ('ios', 'android', 'unknown')),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  -- One token per device per user (upsert target)
  UNIQUE (user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(user_id) WHERE is_active = true;

CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ============================================================
-- FEATURE 1 SCHEMA — Extend notifications table
-- ============================================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'system'
    CHECK (type IN ('approach', 'geofence', 'system', 'community')),
  ADD COLUMN IF NOT EXISTS expo_receipt_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'dismissed'));

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- ============================================================
-- FEATURE 1 SCHEMA — trip_places.notified_at
-- Prevents duplicate geofence notifications per place per trip.
-- ============================================================

ALTER TABLE trip_places
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- ============================================================
-- FEATURE 2 SCHEMA — users.region
-- Simple user-set region preference for regional leaderboards.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS region TEXT;

CREATE INDEX IF NOT EXISTS idx_users_region ON users(region) WHERE region IS NOT NULL;

-- ============================================================
-- FEATURE 2 SCHEMA — reputation_category_stats
-- Per-category leaderboard scores derived from activity.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE leaderboard_category AS ENUM (
    'food', 'coffee', 'hidden_gem', 'photography', 'overall'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reputation_category_stats (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category   leaderboard_category NOT NULL,
  score      INTEGER NOT NULL DEFAULT 0,
  region     TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_rep_category_stats_user ON reputation_category_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_rep_category_stats_category_score
  ON reputation_category_stats(category, score DESC);
CREATE INDEX IF NOT EXISTS idx_rep_category_stats_region
  ON reputation_category_stats(category, region, score DESC)
  WHERE region IS NOT NULL;

ALTER TABLE reputation_category_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view category stats"
  ON reputation_category_stats FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can upsert category stats"
  ON reputation_category_stats FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "System can update category stats"
  ON reputation_category_stats FOR UPDATE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ============================================================
-- FEATURE 2 RPC — get_leaderboard
-- Returns ranked users for a given category and optional region.
-- SECURITY INVOKER: reads from public reputation data, no elevation needed.
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
SECURITY INVOKER
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
    AND rcs.category = p_category::leaderboard_category
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
-- FEATURE 3 SCHEMA — hidden_gem_votes
-- Atomic, one-vote-per-user enforcement at DB level.
-- ============================================================

CREATE TABLE IF NOT EXISTS hidden_gem_votes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomination_id   UUID NOT NULL REFERENCES hidden_gem_nominations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value           SMALLINT NOT NULL CHECK (value IN (1, -1)),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nomination_id, user_id)   -- enforces one vote per user per nomination
);

CREATE INDEX IF NOT EXISTS idx_gem_votes_nomination ON hidden_gem_votes(nomination_id);
CREATE INDEX IF NOT EXISTS idx_gem_votes_user ON hidden_gem_votes(user_id);

ALTER TABLE hidden_gem_votes ENABLE ROW LEVEL SECURITY;

-- Aggregate counts only exposed; raw votes per user are not selectable by others.
CREATE POLICY "Users can view own votes"
  ON hidden_gem_votes FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can insert own votes"
  ON hidden_gem_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can update own votes"
  ON hidden_gem_votes FOR UPDATE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can delete own votes"
  ON hidden_gem_votes FOR DELETE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ============================================================
-- FEATURE 3 RPC — vote_on_hidden_gem
-- Atomic upsert of vote + recompute nomination counts + auto-approve.
--
-- SECURITY DEFINER is justified here: the function must update
-- hidden_gem_nominations.upvote_count and hidden_gem_nominations.downvote_count
-- (and potentially places.is_hidden_gem) within the same transaction.
-- RLS on hidden_gem_nominations does not allow UPDATE by non-authors,
-- so SECURITY DEFINER is the correct pattern for this tally operation.
-- ============================================================

CREATE OR REPLACE FUNCTION vote_on_hidden_gem(
  p_nomination_id UUID,
  p_user_id       UUID,
  p_value         SMALLINT   -- 1 (upvote) or -1 (downvote)
)
RETURNS SETOF hidden_gem_nominations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_value    SMALLINT;
  v_upvote_delta INTEGER := 0;
  v_downvote_delta INTEGER := 0;
BEGIN
  -- Validate inputs
  IF p_value NOT IN (1, -1) THEN
    RAISE EXCEPTION 'value must be 1 or -1';
  END IF;

  -- Fetch existing vote (if any)
  SELECT value INTO v_old_value
    FROM hidden_gem_votes
   WHERE nomination_id = p_nomination_id
     AND user_id = p_user_id;

  IF NOT FOUND THEN
    -- Brand new vote
    INSERT INTO hidden_gem_votes (nomination_id, user_id, value)
    VALUES (p_nomination_id, p_user_id, p_value);

    IF p_value = 1 THEN
      v_upvote_delta := 1;
    ELSE
      v_downvote_delta := 1;
    END IF;

  ELSIF v_old_value = p_value THEN
    -- Same vote again → toggle off (remove vote)
    DELETE FROM hidden_gem_votes
     WHERE nomination_id = p_nomination_id
       AND user_id = p_user_id;

    IF p_value = 1 THEN
      v_upvote_delta := -1;
    ELSE
      v_downvote_delta := -1;
    END IF;

  ELSE
    -- Vote flip (e.g. downvote → upvote)
    UPDATE hidden_gem_votes
       SET value = p_value
     WHERE nomination_id = p_nomination_id
       AND user_id = p_user_id;

    IF p_value = 1 THEN
      v_upvote_delta := 1;
      v_downvote_delta := -1;
    ELSE
      v_upvote_delta := -1;
      v_downvote_delta := 1;
    END IF;
  END IF;

  -- Atomically update nomination counts
  UPDATE hidden_gem_nominations
     SET upvote_count   = GREATEST(0, upvote_count + v_upvote_delta),
         downvote_count = GREATEST(0, downvote_count + v_downvote_delta)
   WHERE id = p_nomination_id;

  -- The existing trigger `check_hidden_gem_approval` fires BEFORE UPDATE
  -- on hidden_gem_nominations and handles auto-approval + XP award.
  -- No additional logic needed here.

  -- Return the updated nomination row to the client
  RETURN QUERY
    SELECT * FROM hidden_gem_nominations WHERE id = p_nomination_id;
END;
$$;

-- ============================================================
-- FEATURE 4 RPC — get_for_you_feed
-- Server-side ranked feed with follow boost + cursor pagination.
-- SECURITY INVOKER: reads only from RLS-enabled tables.
-- ============================================================

CREATE OR REPLACE FUNCTION get_for_you_feed(
  p_user_id  UUID,
  p_limit    INTEGER DEFAULT 20,
  p_cursor   TIMESTAMPTZ DEFAULT NULL   -- created_at of last seen post (for pagination)
)
RETURNS TABLE (
  id                  UUID,
  author_id           UUID,
  type                TEXT,
  place_id            UUID,
  trip_id             UUID,
  route_community_id  UUID,
  title               TEXT,
  body                TEXT,
  media_urls          JSONB,
  upvote_count        INTEGER,
  downvote_count      INTEGER,
  comment_count       INTEGER,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  author_name         TEXT,
  author_avatar       TEXT,
  author_xp           INTEGER,
  author_level        TEXT,
  place_name          TEXT,
  route_name          TEXT,
  place_trust_score   NUMERIC,
  is_followed_author  BOOLEAN,
  feed_score          NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH
  -- User's follow graph
  user_follows AS (
    SELECT followed_id
      FROM follows
     WHERE follower_id = p_user_id
       AND followed_type = 'user'
  ),

  -- Candidate posts (cursor-paginated, fetch 3× limit for ranking)
  candidates AS (
    SELECT p.*
      FROM posts p
     WHERE p.is_deleted = false
       AND (p_cursor IS NULL OR p.created_at < p_cursor)
     ORDER BY p.created_at DESC
     LIMIT p_limit * 3
  ),

  -- Author reputations in one join
  author_rep AS (
    SELECT ur.user_id, ur.xp_points, ur.level::text AS level
      FROM user_reputation ur
     WHERE ur.user_id IN (SELECT DISTINCT author_id FROM candidates)
  ),

  -- Place trust scores in one join
  trust AS (
    SELECT pts.place_id, pts.final_score
      FROM place_trust_scores pts
     WHERE pts.place_id IN (
       SELECT DISTINCT place_id FROM candidates WHERE place_id IS NOT NULL
     )
  ),

  -- Scored + enriched posts
  scored AS (
    SELECT
      c.id,
      c.author_id,
      c.type::text                                                        AS type,
      c.place_id,
      c.trip_id,
      c.route_community_id,
      c.title,
      c.body,
      c.media_urls,
      c.upvote_count,
      c.downvote_count,
      c.comment_count,
      c.created_at,
      c.updated_at,
      u.name                                                              AS author_name,
      u.avatar_url                                                        AS author_avatar,
      COALESCE(ar.xp_points, 0)                                          AS author_xp,
      COALESCE(ar.level, 'traveler')                                     AS author_level,
      pl.name                                                             AS place_name,
      CASE
        WHEN rc.id IS NOT NULL
        THEN rc.origin_label || ' → ' || rc.destination_label
        ELSE NULL
      END                                                                 AS route_name,
      COALESCE(t.final_score, 0)                                         AS place_trust_score,
      (c.author_id IN (SELECT followed_id FROM user_follows))            AS is_followed_author,

      -- Feed score formula (mirrors client-side weights)
      (
        -- Engagement: log1p of net_votes + comments, normalized 0-100, weight 0.35
        0.35 * LEAST(100,
          (LN(1 + GREATEST(0, c.upvote_count - c.downvote_count) + c.comment_count)
           / LN(101)) * 100
        )
        -- Freshness: exponential decay, half-life 24h, weight 0.25
        + 0.25 * (
          100.0 * POW(0.5,
            EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600.0 / 24.0
          )
        )
        -- Author reputation: XP/10000 normalized, weight 0.15
        + 0.15 * LEAST(100, COALESCE(ar.xp_points, 0)::NUMERIC / 100.0)
        -- Trust score: weight 0.15
        + 0.15 * LEAST(100, COALESCE(t.final_score, 0))
        -- Follow boost: +10 if post author is followed, weight 0.10
        + 0.10 * CASE
            WHEN c.author_id IN (SELECT followed_id FROM user_follows) THEN 100
            ELSE 0
          END
      )                                                                   AS feed_score

    FROM candidates c
    JOIN users u ON u.id = c.author_id
    LEFT JOIN author_rep ar ON ar.user_id = c.author_id
    LEFT JOIN places pl ON pl.id = c.place_id
    LEFT JOIN route_communities rc ON rc.id = c.route_community_id
    LEFT JOIN trust t ON t.place_id = c.place_id
  )

  SELECT
    id, author_id, type, place_id, trip_id, route_community_id,
    title, body, media_urls,
    upvote_count, downvote_count, comment_count,
    created_at, updated_at,
    author_name, author_avatar, author_xp, author_level,
    place_name, route_name, place_trust_score,
    is_followed_author, feed_score
  FROM scored
  ORDER BY feed_score DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- DONE — Feature Completions Migration
-- ============================================================
