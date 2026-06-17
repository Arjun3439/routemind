-- ============================================================
-- RouteMind Migration: Add review_summary columns to places
-- Additive only — no existing columns, RLS, or indexes touched
-- ============================================================

ALTER TABLE places
  ADD COLUMN IF NOT EXISTS review_summary jsonb,
  ADD COLUMN IF NOT EXISTS review_summary_updated_at timestamptz;

COMMENT ON COLUMN places.review_summary IS
  'Gemini-generated review summary as a JSON array of bullet strings (3-5 items). Null = not yet generated.';

COMMENT ON COLUMN places.review_summary_updated_at IS
  'Timestamp of the last time review_summary was generated/refreshed. Used to enforce a 7-day TTL.';
