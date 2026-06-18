-- ============================================================
-- RouteMind — Community Intelligence Migration
-- pgvector + Google Reviews + Semantic Search
-- ============================================================
-- Run this migration AFTER the base schema.sql has been applied.
-- Requires Supabase pgvector extension to be enabled in Dashboard.
-- ============================================================

-- ─── Step 1: Enable pgvector ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Step 2: community_reviews table ──────────────────────────
-- Stores Google reviews (and future sources) with vector embeddings
-- for semantic similarity search.
CREATE TABLE IF NOT EXISTS community_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id          UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  google_review_id  TEXT UNIQUE NOT NULL,   -- dedup key: "{place_id}-{author}-{time}"
  author_name       TEXT NOT NULL DEFAULT 'Anonymous',
  rating            INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text       TEXT NOT NULL,
  source            TEXT NOT NULL DEFAULT 'google',
  embedding         vector(768),            -- Gemini text-embedding-004 dimension
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for community_reviews
CREATE INDEX IF NOT EXISTS idx_community_reviews_place_id
  ON community_reviews(place_id);

CREATE INDEX IF NOT EXISTS idx_community_reviews_google_review_id
  ON community_reviews(google_review_id);

CREATE INDEX IF NOT EXISTS idx_community_reviews_rating
  ON community_reviews(rating DESC);

CREATE INDEX IF NOT EXISTS idx_community_reviews_created_at
  ON community_reviews(created_at DESC);

-- HNSW index for fast vector similarity search (cosine distance)
-- Only indexes rows where embedding IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_community_reviews_embedding
  ON community_reviews
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- ─── Step 3: search_logs table ────────────────────────────────
-- Logs semantic search queries for analytics and improvement.
CREATE TABLE IF NOT EXISTS search_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query         TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  place_id      UUID REFERENCES places(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_created_at
  ON search_logs(created_at DESC);

-- ─── Step 4: match_reviews function ───────────────────────────
-- Performs cosine similarity search on review embeddings.
-- Optionally filters by place_id for place-specific insights.
CREATE OR REPLACE FUNCTION match_reviews(
  query_embedding   vector(768),
  match_count       int DEFAULT 10,
  filter_place_id   uuid DEFAULT NULL,
  similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE(
  id            uuid,
  place_id      uuid,
  review_text   text,
  author_name   text,
  rating        integer,
  similarity    float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.id,
    cr.place_id,
    cr.review_text,
    cr.author_name,
    cr.rating,
    (1 - (cr.embedding <=> query_embedding))::float AS similarity
  FROM community_reviews cr
  WHERE
    cr.embedding IS NOT NULL
    AND (filter_place_id IS NULL OR cr.place_id = filter_place_id)
    AND (1 - (cr.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY cr.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- ─── Step 5: Add caching columns to places table ──────────────
-- community_insights_cached: JSONB cache for RAG-generated summaries
-- reviews_synced_at: Tracks when reviews were last fetched from Google
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'places' AND column_name = 'community_insights_cached'
  ) THEN
    ALTER TABLE places ADD COLUMN community_insights_cached JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'places' AND column_name = 'reviews_synced_at'
  ) THEN
    ALTER TABLE places ADD COLUMN reviews_synced_at TIMESTAMPTZ;
  END IF;
END $$;

-- ─── Step 6: RLS policies for community_reviews ───────────────
ALTER TABLE community_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view community reviews" ON community_reviews;
  DROP POLICY IF EXISTS "Anon can view community reviews" ON community_reviews;
  DROP POLICY IF EXISTS "Anon can insert community reviews" ON community_reviews;
  DROP POLICY IF EXISTS "Authenticated can insert community reviews" ON community_reviews;
  DROP POLICY IF EXISTS "Allow embedding updates" ON community_reviews;
  DROP POLICY IF EXISTS "Anon can update community reviews" ON community_reviews;
  
  DROP POLICY IF EXISTS "Anyone can insert search logs" ON search_logs;
  DROP POLICY IF EXISTS "Anon can insert search logs" ON search_logs;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- Everyone can read community reviews
CREATE POLICY "Anyone can view community reviews"
  ON community_reviews FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon read for review display (public data from Google)
CREATE POLICY "Anon can view community reviews"
  ON community_reviews FOR SELECT
  TO anon
  USING (true);

-- Only service role can insert/update (reviews come from server-side sync)
-- If using client-side with anon key, add insert policy:
CREATE POLICY "Anon can insert community reviews"
  ON community_reviews FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert community reviews"
  ON community_reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow update for embedding backfill
CREATE POLICY "Allow embedding updates"
  ON community_reviews FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Anon can update community reviews"
  ON community_reviews FOR UPDATE
  TO anon
  USING (true);

-- ─── Step 7: RLS policies for search_logs ─────────────────────
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert search logs"
  ON search_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can insert search logs"
  ON search_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================
-- Migration complete.
-- Verify with:
--   SELECT * FROM pg_extension WHERE extname = 'vector';
--   SELECT count(*) FROM community_reviews;
--   SELECT * FROM match_reviews('{0.1,0.2,...}'::vector(768), 5);
-- ============================================================
