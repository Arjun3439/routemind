-- ============================================================
-- RouteMind V3 — Seed Data
-- ============================================================
-- Run this in Supabase SQL Editor to populate dummy data for V3 testing.
-- Make sure to replace the dummy UUIDs with your actual test user IDs if you want them linked to real users.
-- ============================================================

-- Dummy User ID (Use a real UUID from auth.users if you want to test with a specific user)
-- DO $$
-- DECLARE dummy_user_id UUID := '00000000-0000-0000-0000-000000000000';
-- BEGIN

-- 1. Route Communities
INSERT INTO route_communities (id, slug, origin_label, destination_label, description, cover_image_url)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'sf-to-la-pcl', 'San Francisco', 'Los Angeles', 'The iconic Pacific Coast Highway drive.', 'https://images.unsplash.com/photo-1440857774163-fcc731dd9d76?w=800&q=80'),
  ('22222222-2222-2222-2222-222222222222', 'seattle-to-portland', 'Seattle', 'Portland', 'Quick I-5 run or scenic backroads.', 'https://images.unsplash.com/photo-1542223616-740d5dff7f56?w=800&q=80')
ON CONFLICT DO NOTHING;

-- 2. Route Reputation
INSERT INTO route_reputations (route_community_id, overall_score, food_score, coffee_score, road_quality_score, photography_score, safety_score, night_driving_score, fuel_availability_score)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 92, 85, 88, 90, 98, 80, 60, 85),
  ('22222222-2222-2222-2222-222222222222', 84, 90, 95, 85, 75, 88, 80, 92)
ON CONFLICT DO NOTHING;

-- 3. Travel Lists
-- Note: Replace owner_id with a valid user ID if foreign key constraints fail.
-- INSERT INTO travel_lists (id, owner_id, title, description, is_public)
-- VALUES 
--   ('33333333-3333-3333-3333-333333333333', dummy_user_id, 'Best Coffee on PCH', 'My favorite stops for caffeine along the coast.', true),
--   ('44444444-4444-4444-4444-444444444444', dummy_user_id, 'Hidden Viewpoints', 'Don''t miss these pull-offs.', true)
-- ON CONFLICT DO NOTHING;

-- 4. Dummy Posts (requires a real author_id, so leaving commented out as template)
/*
INSERT INTO posts (id, author_id, type, route_community_id, title, body)
VALUES
  (gen_random_uuid(), dummy_user_id, 'route_post', '11111111-1111-1111-1111-111111111111', 'Watch out for fog near Big Sur', 'Visibility drops to 20ft in the mornings right now. Drive safe!'),
  (gen_random_uuid(), dummy_user_id, 'hidden_gem_nomination', '11111111-1111-1111-1111-111111111111', 'Secret beach access!', 'Park near mile marker 42 and walk down the dirt path. It''s stunning and empty.');
*/

-- END $$;
