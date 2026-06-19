-- ============================================================
-- RouteMind — Explore Seed Data (South India + Sri Lanka)
-- ============================================================
-- Run in Supabase SQL Editor AFTER all migrations have been applied.
-- IDEMPOTENT: safe to re-run (ON CONFLICT DO NOTHING throughout).
-- Generates realistic data for all 8 Explore sections.
-- ============================================================

-- ============================================================
-- STEP 1: SEED USERS (15 users with varied reputation levels)
-- Using deterministic UUIDs so re-runs are safe.
-- clerk_id uses 'seed_' prefix to not collide with real users.
-- ============================================================

INSERT INTO users (id, clerk_id, email, name, avatar_url, region) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'seed_user_001', 'arjun.travels@seed.rm', 'Arjun Ramesh',      'https://i.pravatar.cc/150?img=1',  'Tamil Nadu'),
  ('a1000000-0000-0000-0000-000000000002', 'seed_user_002', 'priya.explorer@seed.rm','Priya Sundaram',    'https://i.pravatar.cc/150?img=2',  'Karnataka'),
  ('a1000000-0000-0000-0000-000000000003', 'seed_user_003', 'karthik.road@seed.rm',  'Karthik Nair',      'https://i.pravatar.cc/150?img=3',  'Kerala'),
  ('a1000000-0000-0000-0000-000000000004', 'seed_user_004', 'meera.wanderer@seed.rm','Meera Krishnan',    'https://i.pravatar.cc/150?img=5',  'Tamil Nadu'),
  ('a1000000-0000-0000-0000-000000000005', 'seed_user_005', 'ravi.photospot@seed.rm','Ravi Menon',        'https://i.pravatar.cc/150?img=6',  'Kerala'),
  ('a1000000-0000-0000-0000-000000000006', 'seed_user_006', 'lakshmi.foodie@seed.rm','Lakshmi Iyer',      'https://i.pravatar.cc/150?img=7',  'Tamil Nadu'),
  ('a1000000-0000-0000-0000-000000000007', 'seed_user_007', 'suresh.coffee@seed.rm', 'Suresh Pillai',     'https://i.pravatar.cc/150?img=8',  'Kerala'),
  ('a1000000-0000-0000-0000-000000000008', 'seed_user_008', 'ananya.gems@seed.rm',   'Ananya Bhat',       'https://i.pravatar.cc/150?img=9',  'Karnataka'),
  ('a1000000-0000-0000-0000-000000000009', 'seed_user_009', 'vikram.legend@seed.rm', 'Vikram Chandran',   'https://i.pravatar.cc/150?img=10', 'Tamil Nadu'),
  ('a1000000-0000-0000-0000-000000000010', 'seed_user_010', 'deepa.routes@seed.rm',  'Deepa Natarajan',   'https://i.pravatar.cc/150?img=11', 'Karnataka'),
  ('a1000000-0000-0000-0000-000000000011', 'seed_user_011', 'mohan.lanka@seed.rm',   'Mohan Perera',      'https://i.pravatar.cc/150?img=12', 'Sri Lanka'),
  ('a1000000-0000-0000-0000-000000000012', 'seed_user_012', 'kavya.guide@seed.rm',   'Kavya Reddy',       'https://i.pravatar.cc/150?img=13', 'Karnataka'),
  ('a1000000-0000-0000-0000-000000000013', 'seed_user_013', 'senthil.expert@seed.rm','Senthil Kumar',     'https://i.pravatar.cc/150?img=14', 'Tamil Nadu'),
  ('a1000000-0000-0000-0000-000000000014', 'seed_user_014', 'divya.hills@seed.rm',   'Divya Krishnaswamy','https://i.pravatar.cc/150?img=15', 'Kerala'),
  ('a1000000-0000-0000-0000-000000000015', 'seed_user_015', 'rohit.coorg@seed.rm',   'Rohit Gowda',       'https://i.pravatar.cc/150?img=16', 'Karnataka')
ON CONFLICT (clerk_id) DO NOTHING;

-- ============================================================
-- STEP 2: USER REPUTATION (varied XP → varied levels)
-- traveler<100, explorer<500, guide<2000, expert<10000, legend≥10000
-- ============================================================

INSERT INTO user_reputation (user_id, level, xp_points, badges, posts_count, hidden_gems_found, total_upvotes_received, updated_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'expert',   4200, '["food_explorer","top_contributor","road_tripper"]'::jsonb,   85, 3, 340, NOW() - INTERVAL '2 hours'),
  ('a1000000-0000-0000-0000-000000000002', 'guide',    1800, '["coffee_hunter","photographer"]'::jsonb,                    52, 1, 210, NOW() - INTERVAL '1 hour'),
  ('a1000000-0000-0000-0000-000000000003', 'legend',  11500, '["hidden_gem_finder","top_contributor","food_explorer"]'::jsonb,120,8, 980, NOW() - INTERVAL '30 minutes'),
  ('a1000000-0000-0000-0000-000000000004', 'explorer',  380, '["photographer"]'::jsonb,                                    18, 0, 75,  NOW() - INTERVAL '3 hours'),
  ('a1000000-0000-0000-0000-000000000005', 'expert',   6700, '["photographer","hidden_gem_finder","road_tripper"]'::jsonb,  95, 5, 560, NOW() - INTERVAL '1 hour'),
  ('a1000000-0000-0000-0000-000000000006', 'guide',    1200, '["food_explorer"]'::jsonb,                                   38, 0, 150, NOW() - INTERVAL '4 hours'),
  ('a1000000-0000-0000-0000-000000000007', 'guide',     920, '["coffee_hunter","food_explorer"]'::jsonb,                   30, 1, 120, NOW() - INTERVAL '2 hours'),
  ('a1000000-0000-0000-0000-000000000008', 'legend',  14200, '["hidden_gem_finder","top_contributor","road_tripper","photographer"]'::jsonb, 155, 12, 1340, NOW() - INTERVAL '15 minutes'),
  ('a1000000-0000-0000-0000-000000000009', 'explorer',  210, '[]'::jsonb,                                                  11, 0, 42,  NOW() - INTERVAL '5 hours'),
  ('a1000000-0000-0000-0000-000000000010', 'guide',     750, '["road_tripper"]'::jsonb,                                    28, 0, 90,  NOW() - INTERVAL '3 hours'),
  ('a1000000-0000-0000-0000-000000000011', 'expert',   3100, '["hidden_gem_finder","food_explorer"]'::jsonb,               68, 4, 280, NOW() - INTERVAL '1 hour'),
  ('a1000000-0000-0000-0000-000000000012', 'guide',    1450, '["coffee_hunter"]'::jsonb,                                   45, 1, 190, NOW() - INTERVAL '2 hours'),
  ('a1000000-0000-0000-0000-000000000013', 'traveler',   65, '[]'::jsonb,                                                   4, 0, 12,  NOW() - INTERVAL '6 hours'),
  ('a1000000-0000-0000-0000-000000000014', 'explorer',  450, '["photographer"]'::jsonb,                                    20, 0, 88,  NOW() - INTERVAL '4 hours'),
  ('a1000000-0000-0000-0000-000000000015', 'expert',   2800, '["road_tripper","food_explorer"]'::jsonb,                    60, 2, 250, NOW() - INTERVAL '2 hours')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- STEP 3: REPUTATION CATEGORY STATS (for leaderboard)
-- ============================================================

INSERT INTO reputation_category_stats (user_id, category, score, region, updated_at) VALUES
  -- Arjun: food expert
  ('a1000000-0000-0000-0000-000000000001', 'food',       320, 'Tamil Nadu', NOW()),
  ('a1000000-0000-0000-0000-000000000001', 'overall',    4200, 'Tamil Nadu', NOW()),
  -- Priya: coffee hunter
  ('a1000000-0000-0000-0000-000000000002', 'coffee',     280, 'Karnataka', NOW()),
  ('a1000000-0000-0000-0000-000000000002', 'photography',195, 'Karnataka', NOW()),
  ('a1000000-0000-0000-0000-000000000002', 'overall',    1800, 'Karnataka', NOW()),
  -- Karthik: legend, all-rounder
  ('a1000000-0000-0000-0000-000000000003', 'food',       580, 'Kerala',    NOW()),
  ('a1000000-0000-0000-0000-000000000003', 'hidden_gem', 640, 'Kerala',    NOW()),
  ('a1000000-0000-0000-0000-000000000003', 'overall',    11500,'Kerala',   NOW()),
  -- Ravi: photographer
  ('a1000000-0000-0000-0000-000000000005', 'photography',890, 'Kerala',    NOW()),
  ('a1000000-0000-0000-0000-000000000005', 'hidden_gem', 420, 'Kerala',    NOW()),
  ('a1000000-0000-0000-0000-000000000005', 'overall',    6700, 'Kerala',   NOW()),
  -- Lakshmi: food
  ('a1000000-0000-0000-0000-000000000006', 'food',       210, 'Tamil Nadu', NOW()),
  ('a1000000-0000-0000-0000-000000000006', 'overall',    1200, 'Tamil Nadu', NOW()),
  -- Suresh: coffee
  ('a1000000-0000-0000-0000-000000000007', 'coffee',     340, 'Kerala',    NOW()),
  ('a1000000-0000-0000-0000-000000000007', 'food',       180, 'Kerala',    NOW()),
  ('a1000000-0000-0000-0000-000000000007', 'overall',    920, 'Kerala',    NOW()),
  -- Ananya: top legend hidden_gem
  ('a1000000-0000-0000-0000-000000000008', 'hidden_gem', 1200, 'Karnataka', NOW()),
  ('a1000000-0000-0000-0000-000000000008', 'photography',720, 'Karnataka', NOW()),
  ('a1000000-0000-0000-0000-000000000008', 'overall',    14200,'Karnataka', NOW()),
  -- Mohan: Sri Lanka expert
  ('a1000000-0000-0000-0000-000000000011', 'food',       380, 'Sri Lanka', NOW()),
  ('a1000000-0000-0000-0000-000000000011', 'hidden_gem', 310, 'Sri Lanka', NOW()),
  ('a1000000-0000-0000-0000-000000000011', 'overall',    3100, 'Sri Lanka', NOW()),
  -- Kavya: coffee Karnataka
  ('a1000000-0000-0000-0000-000000000012', 'coffee',     195, 'Karnataka', NOW()),
  ('a1000000-0000-0000-0000-000000000012', 'overall',    1450, 'Karnataka', NOW()),
  -- Rohit: road expert
  ('a1000000-0000-0000-0000-000000000015', 'overall',    2800, 'Karnataka', NOW())
ON CONFLICT (user_id, category) DO NOTHING;

-- ============================================================
-- STEP 4: ROUTE COMMUNITIES (South India + Sri Lanka)
-- ============================================================

INSERT INTO route_communities (id, slug, origin_label, destination_label, description, cover_image_url, member_count, post_count, created_at) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'chennai-to-bangalore',   'Chennai',      'Bangalore',    'The classic South India highway connecting two tech hubs. NH48 — smooth roads, great dhabas.', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 1240, 89, NOW() - INTERVAL '180 days'),
  ('b1000000-0000-0000-0000-000000000002', 'chennai-to-madurai',     'Chennai',      'Madurai',      'Temple trail through the heart of Tamil Nadu. NH38 — stop at Chidambaram and Trichy.', 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80', 980, 72, NOW() - INTERVAL '120 days'),
  ('b1000000-0000-0000-0000-000000000003', 'kochi-to-munnar',        'Kochi',        'Munnar',       'Kerala hill station drive through spice gardens and tea estates. 130km of pure beauty.', 'https://images.unsplash.com/photo-1544461772-722f3e4b63c0?w=800&q=80', 2100, 156, NOW() - INTERVAL '240 days'),
  ('b1000000-0000-0000-0000-000000000004', 'bangalore-to-coorg',     'Bangalore',    'Coorg',        'Coffee country road trip. NH275 through Mysore or Madikeri — misty mornings guaranteed.', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80', 1850, 134, NOW() - INTERVAL '200 days'),
  ('b1000000-0000-0000-0000-000000000005', 'colombo-to-kandy',       'Colombo',      'Kandy',        'Sri Lanka''s most scenic highway through rubber plantations and Buddhist temples. 115km.', 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80', 760, 48, NOW() - INTERVAL '90 days'),
  ('b1000000-0000-0000-0000-000000000006', 'bangalore-to-ooty',      'Bangalore',    'Ooty',         'Nilgiri Mountain Railway route by road — Mysore, Gudalur, the famous 36 hairpin bends.', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', 1420, 98, NOW() - INTERVAL '150 days'),
  ('b1000000-0000-0000-0000-000000000007', 'madurai-to-rameswaram',  'Madurai',      'Rameswaram',   'Pilgrimage and beach road. The iconic Pamban Bridge crossing is unmissable.', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80', 540, 35, NOW() - INTERVAL '60 days'),
  ('b1000000-0000-0000-0000-000000000008', 'trivandrum-to-kovalam',  'Trivandrum',   'Kovalam',      'Quick coastal drive to Kerala''s most famous beach. 15km of palm-lined roads.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', 890, 61, NOW() - INTERVAL '100 days'),
  ('b1000000-0000-0000-0000-000000000009', 'mysore-to-coorg',        'Mysore',       'Coorg',        'Shorter coffee country route through Hunsur and Madikeri. Wildlife sightings en route.', 'https://images.unsplash.com/photo-1597655601841-214a4cfe8b2c?w=800&q=80', 680, 44, NOW() - INTERVAL '80 days'),
  ('b1000000-0000-0000-0000-000000000010', 'pondicherry-to-mahabalipuram', 'Pondicherry', 'Mahabalipuram', 'East Coast Road — ECR. The best coastal drive in Tamil Nadu with beach shacks all along.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', 1560, 112, NOW() - INTERVAL '160 days'),
  ('b1000000-0000-0000-0000-000000000011', 'kandy-to-ella',          'Kandy',        'Ella',         'Sri Lanka''s most scenic train/road journey through tea country. 140km of highland magic.', 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80', 920, 67, NOW() - INTERVAL '110 days'),
  ('b1000000-0000-0000-0000-000000000012', 'calicut-to-wayanad',     'Calicut',      'Wayanad',      'Kerala forest drive through Banasura hills. Tea, tribal villages, and waterfalls.', 'https://images.unsplash.com/photo-1474524955719-b9f87c50ce47?w=800&q=80', 740, 52, NOW() - INTERVAL '95 days')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- STEP 5: ROUTE REPUTATION SCORES (meaningful variance)
-- ============================================================

INSERT INTO route_reputation_scores (route_community_id, food_score, coffee_score, road_quality_score, photography_score, safety_score, night_driving_score, fuel_availability_score, overall_score, computed_at) VALUES
  ('b1000000-0000-0000-0000-000000000001', 82, 75, 91, 70, 88, 85, 92, 84, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000002', 90, 68, 78, 85, 80, 72, 85, 83, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000003', 75, 70, 72, 98, 85, 62, 78, 91, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000004', 88, 95, 80, 94, 82, 70, 75, 92, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000005', 84, 72, 76, 88, 79, 68, 82, 80, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000006', 72, 65, 69, 96, 78, 55, 70, 88, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000007', 78, 58, 74, 90, 76, 65, 80, 79, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000008', 70, 60, 82, 92, 84, 78, 88, 82, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000009', 85, 90, 77, 89, 83, 68, 76, 86, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000010', 88, 78, 88, 85, 86, 80, 90, 87, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000011', 80, 74, 70, 97, 82, 58, 72, 90, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000012', 76, 80, 68, 93, 80, 60, 74, 85, NOW() - INTERVAL '1 day')
ON CONFLICT (route_community_id) DO NOTHING;

-- ============================================================
-- STEP 6: PLACES (South India landmarks for all sections)
-- ============================================================

INSERT INTO places (id, google_place_id, name, address, lat, lng, category, rating, total_ratings, photo_url, tags, tip_count, community_score, is_hidden_gem, created_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'gplc_seed_001', 'Murugan Idli Shop',            'T. Nagar, Chennai, TN',          13.0382, 80.2330, 'restaurant', 4.7, 8420, 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&q=80', '{"idli","south-indian","breakfast"}', 45, 92, false, NOW() - INTERVAL '60 days'),
  ('c1000000-0000-0000-0000-000000000002', 'gplc_seed_002', 'Filter Kaapi House',           'Brigade Road, Bangalore, KA',    12.9716, 77.5946, 'cafe',       4.6, 5210, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80', '{"coffee","filter-kaapi","cafe"}',    32, 88, false, NOW() - INTERVAL '45 days'),
  ('c1000000-0000-0000-0000-000000000003', 'gplc_seed_003', 'Athirappilly Waterfall View',  'Athirappilly, Kerala',           10.2870, 76.5700, 'viewpoint',  4.9, 12300,'https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=400&q=80', '{"waterfall","nature","photography"}', 28, 98, true,  NOW() - INTERVAL '90 days'),
  ('c1000000-0000-0000-0000-000000000004', 'gplc_seed_004', 'Coorg Estate Coffee Trail',    'Madikeri, Coorg, KA',            12.4244, 75.7382, 'attraction', 4.8, 3890, 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&q=80', '{"coffee","estate","nature"}',        22, 95, false, NOW() - INTERVAL '30 days'),
  ('c1000000-0000-0000-0000-000000000005', 'gplc_seed_005', 'Meenakshi Temple Complex',     'Madurai, TN',                    9.9195,  78.1193, 'attraction', 4.8, 21000,'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&q=80', '{"temple","heritage","photography"}', 55, 97, false, NOW() - INTERVAL '120 days'),
  ('c1000000-0000-0000-0000-000000000006', 'gplc_seed_006', 'Kovalam Lighthouse Beach',     'Kovalam, Kerala',                8.3988,  76.9784, 'attraction', 4.5, 9870, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80', '{"beach","sunset","photography"}',    38, 86, false, NOW() - INTERVAL '50 days'),
  ('c1000000-0000-0000-0000-000000000007', 'gplc_seed_007', 'Pamban Bridge Viewpoint',      'Rameswaram, TN',                 9.2876,  79.3129, 'viewpoint',  4.7, 6540, 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400&q=80', '{"bridge","photography","coastal"}',  18, 90, true,  NOW() - INTERVAL '25 days'),
  ('c1000000-0000-0000-0000-000000000008', 'gplc_seed_008', 'Ella Rock Sunrise Point',      'Ella, Sri Lanka',                6.8667,  81.0466, 'viewpoint',  4.9, 4320, 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&q=80', '{"sunrise","hiking","photography"}',  12, 96, true,  NOW() - INTERVAL '15 days'),
  ('c1000000-0000-0000-0000-000000000009', 'gplc_seed_009', 'Wayanad Bamboo Forest Trail',  'Muthanga, Wayanad, Kerala',      11.6234, 76.2343, 'attraction', 4.6, 2150, 'https://images.unsplash.com/photo-1474524955719-b9f87c50ce47?w=400&q=80', '{"forest","nature","hiking"}',         8, 82, true,  NOW() - INTERVAL '8 days'),
  ('c1000000-0000-0000-0000-000000000010', 'gplc_seed_010', 'Saravana Bhavan',              'Anna Salai, Chennai, TN',        13.0569, 80.2490, 'restaurant', 4.5, 15600,'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=400&q=80', '{"restaurant","south-indian","thali"}',62,85, false, NOW() - INTERVAL '200 days'),
  ('c1000000-0000-0000-0000-000000000011', 'gplc_seed_011', 'Ooty Botanical Gardens',       'Ooty, Tamil Nadu',              11.4102,  76.6950, 'attraction', 4.4, 18400,'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80', '{"garden","nature","photography"}',   34, 78, false, NOW() - INTERVAL '100 days'),
  ('c1000000-0000-0000-0000-000000000012', 'gplc_seed_012', 'Mysore Dasara Viewpoint',      'Chamundi Hills, Mysore, KA',     12.2720,  76.6553, 'viewpoint',  4.6, 9200, 'https://images.unsplash.com/photo-1597655601841-214a4cfe8b2c?w=400&q=80', '{"palace","viewpoint","photography"}',28, 88, false, NOW() - INTERVAL '70 days'),
  ('c1000000-0000-0000-0000-000000000013', 'gplc_seed_013', 'Hidden Spice Garden',          'Thekkady, Kerala',              9.5928,   77.1700, 'hidden_gem', 4.9, 340,  'https://images.unsplash.com/photo-1544461772-722f3e4b63c0?w=400&q=80', '{"spices","hidden-gem","nature"}',     3, 94, true,  NOW() - INTERVAL '5 days'),
  ('c1000000-0000-0000-0000-000000000014', 'gplc_seed_014', 'Sigiriya Rock Fortress Trail', 'Sigiriya, Sri Lanka',           7.9570,   80.7603, 'attraction', 4.8, 8900, 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&q=80', '{"heritage","hiking","photography"}', 20, 93, false, NOW() - INTERVAL '40 days'),
  ('c1000000-0000-0000-0000-000000000015', 'gplc_seed_015', 'ECR Secret Shack',             'ECR, Pondicherry',              11.9340,   79.8280, 'restaurant', 4.7, 520,  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', '{"seafood","beach","hidden-gem"}',     4, 91, true,  NOW() - INTERVAL '3 days'),
  ('c1000000-0000-0000-0000-000000000016', 'gplc_seed_016', 'Munnar Tea Museum',            'Munnar, Kerala',               10.0889,   77.0595, 'attraction', 4.3, 6700, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', '{"tea","museum","history"}',           16, 72, false, NOW() - INTERVAL '55 days'),
  ('c1000000-0000-0000-0000-000000000017', 'gplc_seed_017', 'Kandy Temple of Tooth',        'Kandy, Sri Lanka',              7.2936,   80.6413, 'attraction', 4.7, 11200,'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80', '{"temple","heritage","photography"}', 30, 89, false, NOW() - INTERVAL '80 days'),
  ('c1000000-0000-0000-0000-000000000018', 'gplc_seed_018', 'Mahabalipuram Shore Temple',   'Mahabalipuram, TN',            12.6269,   80.1927, 'attraction', 4.6, 14500,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', '{"heritage","beach","photography"}',  42, 91, false, NOW() - INTERVAL '110 days'),
  ('c1000000-0000-0000-0000-000000000019', 'gplc_seed_019', 'Dudhsagar Waterfall',          'Goa-Karnataka Border',         15.3140,   74.3140, 'viewpoint',  4.8, 5600, 'https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=400&q=80', '{"waterfall","photography","nature"}',  2, 87, true,  NOW() - INTERVAL '2 days'),
  ('c1000000-0000-0000-0000-000000000020', 'gplc_seed_020', 'Thali Restaurant Kozhikode',   'Calicut, Kerala',              11.2588,   75.7804, 'restaurant', 4.8, 7800, 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&q=80', '{"fish-curry","kerala-cuisine","thali"}',38, 94, false, NOW() - INTERVAL '35 days')
ON CONFLICT (google_place_id) DO NOTHING;

-- ============================================================
-- STEP 7: PLACE TRUST SCORES (meaningful variance)
-- ============================================================

INSERT INTO place_trust_scores (place_id, ai_score, community_score, freshness_score, trust_score, final_score, computed_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 88, 92, 75, 86, 85, NOW()),
  ('c1000000-0000-0000-0000-000000000002', 82, 88, 80, 84, 83, NOW()),
  ('c1000000-0000-0000-0000-000000000003', 95, 98, 85, 94, 93, NOW()),
  ('c1000000-0000-0000-0000-000000000004', 91, 95, 90, 92, 92, NOW()),
  ('c1000000-0000-0000-0000-000000000005', 94, 97, 70, 93, 88, NOW()),
  ('c1000000-0000-0000-0000-000000000006', 80, 86, 82, 83, 82, NOW()),
  ('c1000000-0000-0000-0000-000000000007', 86, 90, 92, 89, 90, NOW()),
  ('c1000000-0000-0000-0000-000000000008', 93, 96, 96, 95, 95, NOW()),
  ('c1000000-0000-0000-0000-000000000009', 85, 82, 98, 87, 88, NOW()),
  ('c1000000-0000-0000-0000-000000000010', 78, 85, 65, 79, 76, NOW()),
  ('c1000000-0000-0000-0000-000000000011', 72, 78, 72, 74, 73, NOW()),
  ('c1000000-0000-0000-0000-000000000012', 84, 88, 78, 84, 83, NOW()),
  ('c1000000-0000-0000-0000-000000000013', 90, 94, 98, 93, 94, NOW()),
  ('c1000000-0000-0000-0000-000000000014', 89, 93, 84, 89, 88, NOW()),
  ('c1000000-0000-0000-0000-000000000015', 88, 91, 99, 92, 93, NOW()),
  ('c1000000-0000-0000-0000-000000000016', 70, 72, 76, 72, 72, NOW()),
  ('c1000000-0000-0000-0000-000000000017', 87, 89, 74, 85, 83, NOW()),
  ('c1000000-0000-0000-0000-000000000018', 83, 91, 68, 84, 80, NOW()),
  ('c1000000-0000-0000-0000-000000000019', 91, 87, 99, 92, 93, NOW()),
  ('c1000000-0000-0000-0000-000000000020', 90, 94, 86, 91, 91, NOW())
ON CONFLICT (place_id) DO NOTHING;

-- ============================================================
-- STEP 8: HIDDEN GEM NOMINATIONS (mix of approved + pending)
-- ============================================================

INSERT INTO hidden_gem_nominations (id, place_id, nominated_by, upvote_count, downvote_count, status, approved_at, created_at) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 420, 18, 'approved', NOW() - INTERVAL '70 days', NOW() - INTERVAL '85 days'),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000005', 385, 22, 'approved', NOW() - INTERVAL '15 days', NOW() - INTERVAL '22 days'),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000008', 510, 12, 'approved', NOW() - INTERVAL '8 days',  NOW() - INTERVAL '12 days'),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 280, 35, 'approved', NOW() - INTERVAL '5 days',  NOW() - INTERVAL '7 days'),
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000011', 195, 8,  'approved', NOW() - INTERVAL '3 days',  NOW() - INTERVAL '4 days'),
  ('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000001', 142, 15, 'approved', NOW() - INTERVAL '1 day',  NOW() - INTERVAL '2 days'),
  ('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000008', 118, 10, 'approved', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '30 hours'),
  ('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000015', 210, 28, 'approved', NOW() - INTERVAL '25 days', NOW() - INTERVAL '30 days'),
  -- Pending
  ('d1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000014', 45,  12, 'pending',  NULL,                      NOW() - INTERVAL '2 days'),
  ('d1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000012', 62,  8,  'pending',  NULL,                      NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 9: TRAVEL LISTS (with varied like/save/follow counts)
-- ============================================================

INSERT INTO travel_lists (id, owner_id, title, description, cover_image_url, is_public, like_count, save_count, follow_count, created_at) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Ultimate Kerala Road Trip',       'Best stops from Kochi to Munnar, Thekkady, and Alleppey. 5 days of pure bliss.', 'https://images.unsplash.com/photo-1544461772-722f3e4b63c0?w=800&q=80', true, 1240, 890, 420, NOW() - INTERVAL '30 days'),
  ('e1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000008', 'South India''s Hidden Gems',     'Places most tourists miss. Curated by a 12-gem finder. Worth every detour.', 'https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=800&q=80', true, 980,  720, 310, NOW() - INTERVAL '20 days'),
  ('e1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Chennai Food Trail',             'The definitive guide to eating in Chennai. From Murugan Idlis to Karthik''s biriyani.',  'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&q=80', true, 860,  540, 280, NOW() - INTERVAL '15 days'),
  ('e1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000005', 'Photography Routes: South India','Every golden hour spot between Chennai and Bangalore. 48 shooting locations.',  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', true, 720,  480, 195, NOW() - INTERVAL '10 days'),
  ('e1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000007', 'Coffee Culture: Karnataka',      'Bean to cup — the best coffee estates, cafes, and filter stops in Karnataka.', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80', true, 640,  390, 172, NOW() - INTERVAL '8 days'),
  ('e1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000011', 'Sri Lanka in 7 Days',            'Colombo to Kandy, Ella, and Mirissa. A compact island loop with epic stops.', 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80', true, 580,  360, 148, NOW() - INTERVAL '6 days'),
  ('e1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'ECR Weekend Escapes',            'Day trips from Chennai along East Coast Road. Beaches, temples, and seafood.',    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', true, 420,  280, 110, NOW() - INTERVAL '4 days'),
  ('e1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000015', 'Coorg Monsoon Drive',            'Coffee, rain, and mist. The complete Coorg experience when the ghats are green.',  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80', true, 380,  240, 95,  NOW() - INTERVAL '3 days'),
  ('e1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000006', 'Tamil Nadu Temple Circuit',      'The big four: Madurai, Rameswaram, Thanjavur, Chidambaram. Cultural deep dive.', 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80', true, 310,  200, 78,  NOW() - INTERVAL '5 days'),
  ('e1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000014', 'Wayanad Wildlife Weekend',       'Chembra Peak, Banasura Dam, and Muthanga Wildlife Sanctuary. Nature first.',     'https://images.unsplash.com/photo-1474524955719-b9f87c50ce47?w=800&q=80', true, 260,  180, 65,  NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 10: TRAVEL LIST ITEMS
-- ============================================================

INSERT INTO travel_list_items (list_id, place_id, position, note, created_at) VALUES
  -- Kerala Road Trip list
  ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 1, 'Come at sunrise for best light', NOW() - INTERVAL '30 days'),
  ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000013', 2, 'Ask the owner for a guided tour', NOW() - INTERVAL '30 days'),
  ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000016', 3, 'Buy Kolukkumalai first flush tea', NOW() - INTERVAL '30 days'),
  ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006', 4, 'Evening swim is perfect here', NOW() - INTERVAL '30 days'),
  -- Hidden Gems list
  ('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000007', 1, 'Stand on the bridge at 6am', NOW() - INTERVAL '20 days'),
  ('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000008', 2, '3-hour hike but worth every step', NOW() - INTERVAL '20 days'),
  ('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000009', 3, 'Elephant sightings at dusk', NOW() - INTERVAL '20 days'),
  ('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000015', 4, 'Order the crab masala', NOW() - INTERVAL '20 days'),
  -- Chennai Food Trail
  ('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 1, 'The ghee idli is the one', NOW() - INTERVAL '15 days'),
  ('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000010', 2, 'Full meals only before 2pm', NOW() - INTERVAL '15 days'),
  ('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000020', 3, 'Fish curry with rice is legendary', NOW() - INTERVAL '15 days'),
  -- Photography list
  ('e1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000005', 1, 'Gopuram at golden hour',  NOW() - INTERVAL '10 days'),
  ('e1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000011', 2, 'Fog in the mornings = magic', NOW() - INTERVAL '10 days'),
  ('e1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000012', 3, 'Palace lit at night is stunning', NOW() - INTERVAL '10 days'),
  ('e1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000019', 4, 'After monsoon is best season', NOW() - INTERVAL '10 days'),
  -- Coffee list
  ('e1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000002', 1, 'Try the cold brew here', NOW() - INTERVAL '8 days'),
  ('e1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', 2, 'Estate tour at 8am', NOW() - INTERVAL '8 days')
ON CONFLICT (list_id, place_id) DO NOTHING;

-- ============================================================
-- STEP 11: POSTS with RECENT timestamps for trending velocity
-- This is critical — "trending last 7 days" needs recent data.
-- ============================================================

INSERT INTO posts (id, author_id, type, place_id, route_community_id, title, body, upvote_count, downvote_count, comment_count, is_deleted, created_at) VALUES
  -- Recent posts (last 1-3 days) for trending
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000003', 'place_post', 'c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'Athirappilly at dawn — photos inside', 'Monsoon is making this place absolutely magical right now!', 48, 2, 12, false, NOW() - INTERVAL '4 hours'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000008', 'hidden_gem_nomination', 'c1000000-0000-0000-0000-000000000019', 'b1000000-0000-0000-0000-000000000004', 'Dudhsagar is roaring this season!', 'Post-monsoon the falls are at full strength. Crowd is still thin.', 62, 1, 8, false, NOW() - INTERVAL '6 hours'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000001', 'place_post', 'c1000000-0000-0000-0000-000000000015', NULL, 'Found this shack on ECR — life changing crab', 'Tiny shack, no signboard, absolute best crab masala on the coast.', 89, 3, 22, false, NOW() - INTERVAL '8 hours'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000005', 'place_post', 'c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000011', 'Ella Rock sunrise at 5:30am', 'Woke up at 3am to hike. Zero regrets. Post the photos before more tourists arrive.', 105,2, 18, false, NOW() - INTERVAL '12 hours'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000011', 'route_post', NULL, 'b1000000-0000-0000-0000-000000000005', 'Colombo to Kandy — first time tips', 'A16 highway is the fastest. Stop at Pinnawala for elephants.', 45, 1, 9,  false, NOW() - INTERVAL '18 hours'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000015', 'place_post', 'c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'Coorg estate coffee — best I ever had', 'Buy directly from Tata Coffee estate store. Much cheaper than airport.', 72, 4, 15, false, NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000002', 'place_post', 'c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000004', 'Best filter coffee in Bangalore found', 'The kaapi on Brigade Road is the reference point for all other coffees.', 88, 2, 20, false, NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000014', 'place_post', 'c1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000012', 'Wayanad bamboo trail — absolute peace', 'Early morning walk through bamboo forests. No people, just birdsong.', 54, 0, 7,  false, NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000006', 'place_post', 'c1000000-0000-0000-0000-000000000001', NULL, 'Murugan Idli — pilgrimage complete', 'Every South Indian has to eat here at least once. The mini-idli basket is divine.', 130,5, 31, false, NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000012', 'route_post', NULL, 'b1000000-0000-0000-0000-000000000010', 'ECR drive tips — avoid weekends', 'Weekday mornings are golden on ECR. Traffic is brutal on Sundays.', 67, 3, 14, false, NOW() - INTERVAL '2 days'),
  -- More recent posts for other communities
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000003', 'route_post', NULL, 'b1000000-0000-0000-0000-000000000003', 'Kochi to Munnar — updated road conditions', 'NH544 is under repair before Adimali. Add 45 minutes to your ETA.', 58, 2, 11, false, NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000005', 'place_post', 'c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000007', 'Pamban Bridge — new photography spot!', 'The new circular walkway next to the bridge is open. Incredible angles.', 94, 1, 19, false, NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000008', 'place_post', 'c1000000-0000-0000-0000-000000000013', NULL, 'Spice garden nobody knows about', 'GPS will fail you here. The trail behind Thekkady spice market leads to this.', 76, 0, 13, false, NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000001', 'route_post', NULL, 'b1000000-0000-0000-0000-000000000001', 'Chennai to Bangalore — best dhabas', 'Mile marker 42 dhaba has the best biryani on NH48. Always busy but worth the wait.', 83, 4, 17, false, NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000007', 'place_post', 'c1000000-0000-0000-0000-000000000020', NULL, 'Kozhikode thali — worth the drive alone', 'The banana leaf thali here is why Kerala exists. Go for lunch only.', 91, 2, 24, false, NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 12: TIPS (for trending places section)
-- ============================================================

INSERT INTO tips (place_id, user_id, content, upvotes, created_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', 'Order the 14-piece mini idli set with 3 chutneys. The podi chutney is fire.', 42, NOW() - INTERVAL '1 day'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000007', 'Ask for the decoction strong (double shot). Their regular is too mild.', 38, NOW() - INTERVAL '2 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000005', 'Visit between June and September for maximum water. Sunrise from the top rock.', 65, NOW() - INTERVAL '3 hours'),
  ('c1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000003', 'Leave Ella town at 3:30am. Trail takes 2.5 hours. Sunrise is at 6:15am now.', 88, NOW() - INTERVAL '10 hours'),
  ('c1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000001', 'No menu. Just say "crab special for two" and pay whatever they ask. Trust.', 72, NOW() - INTERVAL '6 hours'),
  ('c1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000011', 'Tell them you want the full spice walk, not the short one. Extra 45min but magical.', 51, NOW() - INTERVAL '4 hours'),
  ('c1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000015', 'The 7am estate tour is included with room. Best coffee tasting of my life.', 44, NOW() - INTERVAL '1 day'),
  ('c1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000007', 'Only open for lunch (12-3pm). Get there at 11:30 or you will queue an hour.', 59, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED COMPLETE
-- ============================================================
-- To verify: run these queries
--   SELECT count(*) FROM users WHERE clerk_id LIKE 'seed_%';
--   SELECT count(*) FROM route_communities;
--   SELECT count(*) FROM route_reputation_scores;
--   SELECT count(*) FROM hidden_gem_nominations WHERE status = 'approved';
--   SELECT count(*) FROM travel_lists;
--   SELECT count(*) FROM posts WHERE created_at > NOW() - INTERVAL '7 days';
--   SELECT * FROM get_trending_routes(5);
--   SELECT * FROM get_top_rated_routes(5);
--   SELECT * FROM get_leaderboard('overall', NULL, 10);
-- ============================================================
