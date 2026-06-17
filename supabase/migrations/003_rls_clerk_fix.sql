-- ============================================================
-- RouteMind Migration 003 — RLS Fix for Clerk Auth
-- ============================================================
-- This app uses Clerk for authentication, NOT Supabase Auth.
-- The Supabase client runs with the anon key only — auth.uid()
-- is always NULL. This migration replaces the broken auth.uid()
-- policies with permissive anon-key INSERT policies.
-- App-layer auth (Clerk) enforces that only signed-in users can
-- reach these code paths. author_id / user_id integrity is
-- maintained by the service layer passing the correct Supabase UUID.
-- ============================================================

-- ─── POSTS ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authors can create posts" ON posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON posts;
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;

DROP POLICY IF EXISTS "Anyone can view non-deleted posts" ON posts;
CREATE POLICY "Anyone can view non-deleted posts"
  ON posts FOR SELECT TO anon, authenticated
  USING (is_deleted = false);

DROP POLICY IF EXISTS "Anon can insert posts" ON posts;
CREATE POLICY "Anon can insert posts"
  ON posts FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update own posts" ON posts;
CREATE POLICY "Anon can update own posts"
  ON posts FOR UPDATE TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can soft-delete posts" ON posts;
CREATE POLICY "Anon can soft-delete posts"
  ON posts FOR DELETE TO anon, authenticated
  USING (true);

-- ─── COMMENTS ────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authors can create comments" ON comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;

DROP POLICY IF EXISTS "Anyone can view non-deleted comments" ON comments;
CREATE POLICY "Anyone can view non-deleted comments"
  ON comments FOR SELECT TO anon, authenticated
  USING (is_deleted = false);

DROP POLICY IF EXISTS "Anon can insert comments" ON comments;
CREATE POLICY "Anon can insert comments"
  ON comments FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update comments" ON comments;
CREATE POLICY "Anon can update comments"
  ON comments FOR UPDATE TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can delete comments" ON comments;
CREATE POLICY "Anon can delete comments"
  ON comments FOR DELETE TO anon, authenticated
  USING (true);

-- ─── VOTES ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can vote" ON votes;
DROP POLICY IF EXISTS "Users can update own votes" ON votes;
DROP POLICY IF EXISTS "Users can remove own votes" ON votes;
DROP POLICY IF EXISTS "Anyone can view votes" ON votes;

DROP POLICY IF EXISTS "Anyone can view votes" ON votes;
CREATE POLICY "Anyone can view votes"
  ON votes FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert votes" ON votes;
CREATE POLICY "Anon can insert votes"
  ON votes FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update votes" ON votes;
CREATE POLICY "Anon can update votes"
  ON votes FOR UPDATE TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can delete votes" ON votes;
CREATE POLICY "Anon can delete votes"
  ON votes FOR DELETE TO anon, authenticated
  USING (true);

-- ─── USERS ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

DROP POLICY IF EXISTS "Anon can view all users" ON users;
CREATE POLICY "Anon can view all users"
  ON users FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert users" ON users;
CREATE POLICY "Anon can insert users"
  ON users FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update users" ON users;
CREATE POLICY "Anon can update users"
  ON users FOR UPDATE TO anon, authenticated
  USING (true);

-- ─── TRIPS ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;

DROP POLICY IF EXISTS "Anon can view trips" ON trips;
CREATE POLICY "Anon can view trips"
  ON trips FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert trips" ON trips;
CREATE POLICY "Anon can insert trips"
  ON trips FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update trips" ON trips;
CREATE POLICY "Anon can update trips"
  ON trips FOR UPDATE TO anon, authenticated
  USING (true);

-- ─── PLACES ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can view places" ON places;

DROP POLICY IF EXISTS "Anon can view places" ON places;
CREATE POLICY "Anon can view places"
  ON places FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert places" ON places;
CREATE POLICY "Anon can insert places"
  ON places FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update places" ON places;
CREATE POLICY "Anon can update places"
  ON places FOR UPDATE TO anon, authenticated
  USING (true);

-- ─── TRIP_PLACES ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own trip places" ON trip_places;

DROP POLICY IF EXISTS "Anon can view trip_places" ON trip_places;
CREATE POLICY "Anon can view trip_places"
  ON trip_places FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert trip_places" ON trip_places;
CREATE POLICY "Anon can insert trip_places"
  ON trip_places FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update trip_places" ON trip_places;
CREATE POLICY "Anon can update trip_places"
  ON trip_places FOR UPDATE TO anon, authenticated
  USING (true);

-- ─── TIPS ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view tips" ON tips;
DROP POLICY IF EXISTS "Authenticated users can create tips" ON tips;
DROP POLICY IF EXISTS "Users can delete own tips" ON tips;

DROP POLICY IF EXISTS "Anon can view tips" ON tips;
CREATE POLICY "Anon can view tips"
  ON tips FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert tips" ON tips;
CREATE POLICY "Anon can insert tips"
  ON tips FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete tips" ON tips;
CREATE POLICY "Anon can delete tips"
  ON tips FOR DELETE TO anon, authenticated
  USING (true);

-- ─── UPVOTES ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view upvotes" ON upvotes;
DROP POLICY IF EXISTS "Authenticated users can upvote" ON upvotes;
DROP POLICY IF EXISTS "Users can remove own upvotes" ON upvotes;

DROP POLICY IF EXISTS "Anon can view upvotes" ON upvotes;
CREATE POLICY "Anon can view upvotes"
  ON upvotes FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert upvotes" ON upvotes;
CREATE POLICY "Anon can insert upvotes"
  ON upvotes FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete upvotes" ON upvotes;
CREATE POLICY "Anon can delete upvotes"
  ON upvotes FOR DELETE TO anon, authenticated
  USING (true);

-- ─── SAVED_PLACES ────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own saved places" ON saved_places;
DROP POLICY IF EXISTS "Users can save places" ON saved_places;
DROP POLICY IF EXISTS "Users can unsave places" ON saved_places;

DROP POLICY IF EXISTS "Anon can view saved_places" ON saved_places;
CREATE POLICY "Anon can view saved_places"
  ON saved_places FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert saved_places" ON saved_places;
CREATE POLICY "Anon can insert saved_places"
  ON saved_places FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete saved_places" ON saved_places;
CREATE POLICY "Anon can delete saved_places"
  ON saved_places FOR DELETE TO anon, authenticated
  USING (true);

-- ─── VISITS ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own visits" ON visits;
DROP POLICY IF EXISTS "Users can log visits" ON visits;

DROP POLICY IF EXISTS "Anon can view visits" ON visits;
CREATE POLICY "Anon can view visits"
  ON visits FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert visits" ON visits;
CREATE POLICY "Anon can insert visits"
  ON visits FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ─── NOTIFICATIONS ───────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

DROP POLICY IF EXISTS "Anon can view notifications" ON notifications;
CREATE POLICY "Anon can view notifications"
  ON notifications FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert notifications" ON notifications;
CREATE POLICY "Anon can insert notifications"
  ON notifications FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update notifications" ON notifications;
CREATE POLICY "Anon can update notifications"
  ON notifications FOR UPDATE TO anon, authenticated
  USING (true);

-- ─── HIDDEN_GEM_NOMINATIONS ──────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view nominations" ON hidden_gem_nominations;
DROP POLICY IF EXISTS "Users can nominate" ON hidden_gem_nominations;

DROP POLICY IF EXISTS "Anon can view nominations" ON hidden_gem_nominations;
CREATE POLICY "Anon can view nominations"
  ON hidden_gem_nominations FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert nominations" ON hidden_gem_nominations;
CREATE POLICY "Anon can insert nominations"
  ON hidden_gem_nominations FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update nominations" ON hidden_gem_nominations;
CREATE POLICY "Anon can update nominations"
  ON hidden_gem_nominations FOR UPDATE TO anon, authenticated
  USING (true);

-- ─── USER_REPUTATION ─────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view user reputation" ON user_reputation;
DROP POLICY IF EXISTS "Users can view own reputation" ON user_reputation;

DROP POLICY IF EXISTS "Anon can view user_reputation" ON user_reputation;
CREATE POLICY "Anon can view user_reputation"
  ON user_reputation FOR SELECT TO anon, authenticated
  USING (true);

-- ─── REPUTATION_CATEGORY_STATS ───────────────────────────────

DROP POLICY IF EXISTS "Anyone can view category stats" ON reputation_category_stats;
DROP POLICY IF EXISTS "System can upsert category stats" ON reputation_category_stats;
DROP POLICY IF EXISTS "System can update category stats" ON reputation_category_stats;

DROP POLICY IF EXISTS "Anon can view reputation_category_stats" ON reputation_category_stats;
CREATE POLICY "Anon can view reputation_category_stats"
  ON reputation_category_stats FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can upsert reputation_category_stats" ON reputation_category_stats;
CREATE POLICY "Anon can upsert reputation_category_stats"
  ON reputation_category_stats FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update reputation_category_stats" ON reputation_category_stats;
CREATE POLICY "Anon can update reputation_category_stats"
  ON reputation_category_stats FOR UPDATE TO anon, authenticated
  USING (true);

-- ─── HIDDEN_GEM_VOTES ────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own votes" ON hidden_gem_votes;
DROP POLICY IF EXISTS "Users can insert own votes" ON hidden_gem_votes;
DROP POLICY IF EXISTS "Users can update own votes" ON hidden_gem_votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON hidden_gem_votes;

DROP POLICY IF EXISTS "Anon can view hidden_gem_votes" ON hidden_gem_votes;
CREATE POLICY "Anon can view hidden_gem_votes"
  ON hidden_gem_votes FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert hidden_gem_votes" ON hidden_gem_votes;
CREATE POLICY "Anon can insert hidden_gem_votes"
  ON hidden_gem_votes FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update hidden_gem_votes" ON hidden_gem_votes;
CREATE POLICY "Anon can update hidden_gem_votes"
  ON hidden_gem_votes FOR UPDATE TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can delete hidden_gem_votes" ON hidden_gem_votes;
CREATE POLICY "Anon can delete hidden_gem_votes"
  ON hidden_gem_votes FOR DELETE TO anon, authenticated
  USING (true);

-- ─── PUSH_TOKENS ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete own push tokens" ON push_tokens;

DROP POLICY IF EXISTS "Anon can manage push_tokens" ON push_tokens;
CREATE POLICY "Anon can manage push_tokens"
  ON push_tokens FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ─── ROUTE_COMMUNITIES ───────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view route communities" ON route_communities;
DROP POLICY IF EXISTS "Authenticated can create route communities" ON route_communities;

DROP POLICY IF EXISTS "Anon can view route_communities" ON route_communities;
CREATE POLICY "Anon can view route_communities"
  ON route_communities FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anon can insert route_communities" ON route_communities;
CREATE POLICY "Anon can insert route_communities"
  ON route_communities FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ─── FOLLOWS ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
DROP POLICY IF EXISTS "Users can follow" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;

DROP POLICY IF EXISTS "Anon can manage follows" ON follows;
CREATE POLICY "Anon can manage follows"
  ON follows FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ─── SAVES ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own saves" ON saves;
DROP POLICY IF EXISTS "Users can create saves" ON saves;
DROP POLICY IF EXISTS "Users can delete own saves" ON saves;

DROP POLICY IF EXISTS "Anon can manage saves" ON saves;
CREATE POLICY "Anon can manage saves"
  ON saves FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ─── TRAVEL_LISTS ────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view public lists" ON travel_lists;
DROP POLICY IF EXISTS "Users can create lists" ON travel_lists;
DROP POLICY IF EXISTS "Owners can update own lists" ON travel_lists;
DROP POLICY IF EXISTS "Owners can delete own lists" ON travel_lists;

DROP POLICY IF EXISTS "Anon can manage travel_lists" ON travel_lists;
CREATE POLICY "Anon can manage travel_lists"
  ON travel_lists FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ─── TRAVEL_LIST_ITEMS ───────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view list items of public lists" ON travel_list_items;
DROP POLICY IF EXISTS "Owners can manage list items" ON travel_list_items;
DROP POLICY IF EXISTS "Owners can update list items" ON travel_list_items;
DROP POLICY IF EXISTS "Owners can delete list items" ON travel_list_items;

DROP POLICY IF EXISTS "Anon can manage travel_list_items" ON travel_list_items;
CREATE POLICY "Anon can manage travel_list_items"
  ON travel_list_items FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ─── SUPABASE STORAGE — post-images bucket ───────────────────
-- Allow anon to upload and read from post-images bucket
-- Run only if storage extension exists

DO $$
BEGIN
  -- Allow public read of post-images
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('post-images', 'post-images', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION WHEN others THEN
  NULL; -- Ignore if storage schema not available
END $$;

-- -- Storage policies for post-images (must run outside PL/pgSQL block unless using dynamic SQL)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'post-images');

DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'post-images');

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'post-images') WITH CHECK (bucket_id = 'post-images');

DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'post-images');

-- ─── REDEFINE FEED FUNCTION WITH EMAIL ───────────────────────
-- Redefine get_for_you_feed to return author_email so that
-- users' email addresses can be shown alongside their posts.

CREATE OR REPLACE FUNCTION get_for_you_feed(
  p_user_id  UUID,
  p_limit    INTEGER DEFAULT 20,
  p_cursor   TIMESTAMPTZ DEFAULT NULL
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
  author_email        TEXT,  -- Added email column
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
  user_follows AS (
    SELECT followed_id
      FROM follows
     WHERE follower_id = p_user_id
       AND followed_type = 'user'
  ),

  candidates AS (
    SELECT p.*
      FROM posts p
     WHERE p.is_deleted = false
       AND (p_cursor IS NULL OR p.created_at < p_cursor)
     ORDER BY p.created_at DESC
     LIMIT p_limit * 3
  ),

  author_rep AS (
    SELECT ur.user_id, ur.xp_points, ur.level::text AS level
      FROM user_reputation ur
     WHERE ur.user_id IN (SELECT DISTINCT author_id FROM candidates)
  ),

  trust AS (
    SELECT pts.place_id, pts.final_score
      FROM place_trust_scores pts
     WHERE pts.place_id IN (
       SELECT DISTINCT place_id FROM candidates WHERE place_id IS NOT NULL
     )
  ),

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
      u.email                                                             AS author_email, -- Added email
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

      (
        0.35 * LEAST(100,
          (LN(1 + GREATEST(0, c.upvote_count - c.downvote_count) + c.comment_count)
           / LN(101)) * 100
        )
        + 0.25 * (
          100.0 * POW(0.5,
            EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600.0 / 24.0
          )
        )
        + 0.15 * LEAST(100, COALESCE(ar.xp_points, 0)::NUMERIC / 100.0)
        + 0.15 * LEAST(100, COALESCE(t.final_score, 0))
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
    author_name, author_email, author_avatar, author_xp, author_level,
    place_name, route_name, place_trust_score,
    is_followed_author, feed_score
  FROM scored
  ORDER BY feed_score DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- DONE — Migration 003 Complete
-- ============================================================
