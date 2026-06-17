-- ============================================================
-- RouteMind Migration 004 — Community Final Fix
-- ============================================================
-- Run this in Supabase Dashboard → SQL Editor
-- This migration ensures:
-- 1. Storage bucket "post-images" is public
-- 2. Storage object policies allow upload/read/delete
-- 3. Users table policies allow SELECT so author info shows
-- 4. Posts/Comments/Votes all have correct open policies
-- ============================================================

-- ─── ENSURE post-images bucket is public ─────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  52428800,  -- 50MB limit
  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit;

-- ─── DROP ALL EXISTING storage.objects policies to start clean ─
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- ─── CREATE fresh storage.objects policies ────────────────────

-- Allow anyone to read files from post-images
CREATE POLICY "post_images_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'post-images');

-- Allow anyone (anon key) to upload to post-images
CREATE POLICY "post_images_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'post-images');

-- Allow anyone to update objects in post-images
CREATE POLICY "post_images_update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'post-images')
  WITH CHECK (bucket_id = 'post-images');

-- Allow anyone to delete from post-images
CREATE POLICY "post_images_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'post-images');

-- ─── ENSURE posts table has correct RLS ──────────────────────

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

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

-- ─── ENSURE comments table has correct RLS ───────────────────

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

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

-- ─── ENSURE votes table has correct RLS ──────────────────────

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

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

-- ─── ENSURE users table has correct RLS (most critical!) ─────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

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

-- ─── ENSURE get_for_you_feed returns author_email ─────────────
-- Must DROP first because we are changing the return type (adding author_email column)

DROP FUNCTION IF EXISTS get_for_you_feed(UUID, INTEGER, TIMESTAMPTZ);

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
  author_email        TEXT,
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
      u.email                                                             AS author_email,
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
-- Migration 004 Complete — Community fully enabled
-- ============================================================
