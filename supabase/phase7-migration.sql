-- ============================================================
-- RouteMind Phase 7 — Smart Notifications Migration
-- ============================================================
-- Run this in the Supabase SQL editor.
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ============================================================
-- 1. Composite index for fast cooldown checks
--    (user + place + sent_at for the 24-hour window query)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_cooldown
  ON notifications(user_id, place_id, sent_at DESC)
  WHERE place_id IS NOT NULL;

-- ============================================================
-- 2. Index for trip-scoped notification queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_trip_id
  ON notifications(trip_id)
  WHERE trip_id IS NOT NULL;

-- ============================================================
-- 3. RLS INSERT policy — allow authenticated users to insert
--    their own notifications (service layer creates them)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
      AND policyname = 'Users can insert own notifications'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can insert own notifications"
        ON notifications FOR INSERT TO authenticated
        WITH CHECK (
          user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
        );
    $policy$;
  END IF;
END $$;

-- ============================================================
-- 4. RLS UPDATE policy — allow users to mark their own read
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
      AND policyname = 'Users can update own notifications'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can update own notifications"
        ON notifications FOR UPDATE
        USING (
          user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
        );
    $policy$;
  END IF;
END $$;

-- ============================================================
-- 5. Helper function: get recent notification count for a
--    user+place within a time window (used for cooldown check)
-- ============================================================
CREATE OR REPLACE FUNCTION get_notification_count_for_place(
  p_user_id UUID,
  p_place_id UUID,
  p_since TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = p_user_id
    AND place_id = p_place_id
    AND sent_at >= p_since;
$$;

-- ============================================================
-- 6. View: unread notification count per user
-- ============================================================
CREATE OR REPLACE VIEW user_notification_stats AS
SELECT
  user_id,
  COUNT(*) AS total_count,
  COUNT(*) FILTER (WHERE read_at IS NULL) AS unread_count,
  MAX(sent_at) AS last_notification_at
FROM notifications
GROUP BY user_id;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT * FROM user_notification_stats WHERE user_id = '<your-uuid>';
