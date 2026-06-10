-- ============================================================
-- RouteMind — Complete Database Schema
-- PostgreSQL + PostGIS
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy text search

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- TRIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source           TEXT NOT NULL,
  destination      TEXT NOT NULL,
  prompt           TEXT NOT NULL,
  source_lat       DOUBLE PRECISION NOT NULL,
  source_lng       DOUBLE PRECISION NOT NULL,
  destination_lat  DOUBLE PRECISION NOT NULL,
  destination_lng  DOUBLE PRECISION NOT NULL,
  -- encoded polyline from Google Directions API
  polyline         TEXT NOT NULL,
  -- PostGIS route geometry for spatial queries
  route_geom       GEOMETRY(LINESTRING, 4326),
  status           TEXT NOT NULL DEFAULT 'active' 
                   CHECK (status IN ('pending', 'active', 'completed')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_created_at ON trips(created_at DESC);
CREATE INDEX idx_trips_route_geom ON trips USING GIST(route_geom);

-- ============================================================
-- PLACES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS places (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_place_id   TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  address           TEXT,
  lat               DOUBLE PRECISION NOT NULL,
  lng               DOUBLE PRECISION NOT NULL,
  -- PostGIS point for efficient geo queries
  location          GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (
                      ST_SetSRID(ST_MakePoint(lng, lat), 4326)
                    ) STORED,
  category          TEXT NOT NULL DEFAULT 'other'
                    CHECK (category IN (
                      'restaurant','cafe','attraction','hidden_gem',
                      'viewpoint','shopping','gas_station','hotel','other'
                    )),
  rating            DECIMAL(3,1) DEFAULT 0,
  total_ratings     INTEGER DEFAULT 0,
  price_level       INTEGER CHECK (price_level BETWEEN 0 AND 4),
  photo_reference   TEXT,
  photo_url         TEXT,
  open_now          BOOLEAN,
  tags              TEXT[] DEFAULT '{}',
  tip_count         INTEGER DEFAULT 0,
  community_score   INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_places_google_place_id ON places(google_place_id);
CREATE INDEX idx_places_location ON places USING GIST(location);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_rating ON places(rating DESC);
CREATE INDEX idx_places_name_trgm ON places USING GIN(name gin_trgm_ops);

-- ============================================================
-- TRIP_PLACES (Join table with scores)
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_places (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id           UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  place_id          UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  worth_stop_score  INTEGER NOT NULL DEFAULT 0 CHECK (worth_stop_score BETWEEN 0 AND 100),
  detour_minutes    DECIMAL(5,1) DEFAULT 0,
  detour_km         DECIMAL(5,2) DEFAULT 0,
  rank              INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (trip_id, place_id)
);

CREATE INDEX idx_trip_places_trip_id ON trip_places(trip_id);
CREATE INDEX idx_trip_places_place_id ON trip_places(place_id);
CREATE INDEX idx_trip_places_score ON trip_places(worth_stop_score DESC);

-- ============================================================
-- TIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tips (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id    UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 10 AND 500),
  upvotes     INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tips_place_id ON tips(place_id);
CREATE INDEX idx_tips_user_id ON tips(user_id);
CREATE INDEX idx_tips_upvotes ON tips(upvotes DESC);

-- ============================================================
-- UPVOTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS upvotes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tip_id      UUID NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tip_id, user_id)
);

CREATE INDEX idx_upvotes_tip_id ON upvotes(tip_id);
CREATE INDEX idx_upvotes_user_id ON upvotes(user_id);

-- ============================================================
-- SAVED_PLACES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_places (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id    UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  saved_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, place_id)
);

CREATE INDEX idx_saved_places_user_id ON saved_places(user_id);
CREATE INDEX idx_saved_places_place_id ON saved_places(place_id);

-- ============================================================
-- VISITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS visits (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id     UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  trip_id      UUID REFERENCES trips(id) ON DELETE SET NULL,
  visited_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visits_user_id ON visits(user_id);
CREATE INDEX idx_visits_place_id ON visits(place_id);
CREATE INDEX idx_visits_trip_id ON visits(trip_id);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id    UUID REFERENCES places(id) ON DELETE SET NULL,
  trip_id     UUID REFERENCES trips(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB DEFAULT '{}',
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at DESC);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_places_updated_at
  BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tips_updated_at
  BEFORE UPDATE ON tips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Increment/decrement tip upvotes safely
CREATE OR REPLACE FUNCTION increment_tip_upvotes(tip_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tips SET upvotes = upvotes + 1 WHERE id = tip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_tip_upvotes(tip_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tips SET upvotes = GREATEST(0, upvotes - 1) WHERE id = tip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update place tip_count when a tip is added/removed
CREATE OR REPLACE FUNCTION update_place_tip_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE places SET tip_count = tip_count + 1 WHERE id = NEW.place_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE places SET tip_count = GREATEST(0, tip_count - 1) WHERE id = OLD.place_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tip_count_on_insert
  AFTER INSERT ON tips
  FOR EACH ROW EXECUTE FUNCTION update_place_tip_count();

CREATE TRIGGER update_tip_count_on_delete
  AFTER DELETE ON tips
  FOR EACH ROW EXECUTE FUNCTION update_place_tip_count();

-- Find places within a corridor around a route
CREATE OR REPLACE FUNCTION find_places_along_route(
  route_geom GEOMETRY,
  corridor_radius_meters DOUBLE PRECISION DEFAULT 10000
)
RETURNS TABLE(
  place_id UUID,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS place_id,
    ST_Distance(
      p.location::GEOGRAPHY,
      ST_ClosestPoint(route_geom, p.location)::GEOGRAPHY
    ) AS distance_meters
  FROM places p
  WHERE ST_DWithin(
    p.location::GEOGRAPHY,
    route_geom::GEOGRAPHY,
    corridor_radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update their own record
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT WITH CHECK (auth.uid()::text = clerk_id);

-- Trips: users manage their own trips
CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can insert own trips"
  ON trips FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Places: all authenticated users can read; service role inserts
CREATE POLICY "Authenticated users can view places"
  ON places FOR SELECT TO authenticated USING (true);

-- Trip Places: users can view their own trip places
CREATE POLICY "Users can view own trip places"
  ON trip_places FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
      )
    )
  );

-- Tips: all can read; authenticated users can create
CREATE POLICY "Anyone can view tips"
  ON tips FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create tips"
  ON tips FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can delete own tips"
  ON tips FOR DELETE
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Upvotes
CREATE POLICY "Anyone can view upvotes"
  ON upvotes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can upvote"
  ON upvotes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can remove own upvotes"
  ON upvotes FOR DELETE
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Saved Places
CREATE POLICY "Users can view own saved places"
  ON saved_places FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can save places"
  ON saved_places FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can unsave places"
  ON saved_places FOR DELETE
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Visits
CREATE POLICY "Users can view own visits"
  ON visits FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can log visits"
  ON visits FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ============================================================
-- SAMPLE SEED DATA (optional, for testing)
-- ============================================================
-- Run this section only in development

/*
INSERT INTO users (clerk_id, email, name) VALUES
  ('user_test_001', 'demo@routemind.app', 'Demo User');
*/
