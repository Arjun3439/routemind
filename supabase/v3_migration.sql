-- ============================================================
-- RouteMind V3 — Community Intelligence Migration
-- Run AFTER the base schema.sql has been applied.
-- This file is ADDITIVE ONLY — no destructive changes.
-- ============================================================

-- ============================================================
-- ADDITIVE COLUMNS ON EXISTING TABLES
-- ============================================================

-- Places: hidden gem flag + AI summary cache
ALTER TABLE places ADD COLUMN IF NOT EXISTS is_hidden_gem BOOLEAN DEFAULT false;
ALTER TABLE places ADD COLUMN IF NOT EXISTS ai_summary JSONB;

CREATE INDEX IF NOT EXISTS idx_places_is_hidden_gem ON places(is_hidden_gem) WHERE is_hidden_gem = true;

-- ============================================================
-- POSTS TABLE
-- ============================================================
DO $$ BEGIN
  CREATE TYPE post_type AS ENUM ('place_post', 'route_post', 'hidden_gem_nomination', 'travel_story');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            post_type NOT NULL,
  place_id        UUID REFERENCES places(id) ON DELETE SET NULL,
  trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
  route_community_id UUID, -- FK added after route_communities table creation
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  media_urls      JSONB DEFAULT '[]'::jsonb,
  upvote_count    INTEGER DEFAULT 0,
  downvote_count  INTEGER DEFAULT 0,
  comment_count   INTEGER DEFAULT 0,
  is_deleted      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Full-text search
  search_vector   TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_place_id ON posts(place_id);
CREATE INDEX IF NOT EXISTS idx_posts_route_community_id ON posts(route_community_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_upvote_count ON posts(upvote_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_posts_not_deleted ON posts(is_deleted) WHERE is_deleted = false;

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id           UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  body              TEXT NOT NULL,
  upvote_count      INTEGER DEFAULT 0,
  downvote_count    INTEGER DEFAULT 0,
  is_deleted        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ============================================================
-- VOTES TABLE (unified for posts + comments)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE vote_target_type AS ENUM ('post', 'comment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type vote_target_type NOT NULL,
  target_id   UUID NOT NULL,
  value       SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_type, target_id);

-- ============================================================
-- REPORTS TABLE
-- ============================================================
DO $$ BEGIN
  CREATE TYPE report_target_type AS ENUM ('post', 'comment', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type  report_target_type NOT NULL,
  target_id    UUID NOT NULL,
  reason       TEXT NOT NULL,
  status       report_status DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

-- ============================================================
-- MENTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS mentions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id           UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id        UUID REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user ON mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_post_id ON mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_mentions_comment_id ON mentions(comment_id);

-- ============================================================
-- SAVES TABLE (generalized)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE save_target_type AS ENUM ('place', 'post', 'route_community', 'list');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS saves (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type save_target_type NOT NULL,
  target_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_target ON saves(target_type, target_id);

-- ============================================================
-- LIVE REPORTS TABLE
-- ============================================================
DO $$ BEGIN
  CREATE TYPE live_report_type AS ENUM (
    'crowded', 'less_crowded', 'closed', 'open',
    'road_block', 'accident', 'fresh_batch', 'parking_available',
    'long_queue', 'heavy_traffic', 'police_checkpoint', 'weather_alert'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS live_reports (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id           UUID REFERENCES places(id) ON DELETE SET NULL,
  route_community_id UUID, -- FK added after route_communities table creation
  report_type        live_report_type NOT NULL,
  expires_at         TIMESTAMPTZ NOT NULL,
  upvote_count       INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_reports_reporter_id ON live_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_live_reports_place_id ON live_reports(place_id);
CREATE INDEX IF NOT EXISTS idx_live_reports_route_community ON live_reports(route_community_id);
CREATE INDEX IF NOT EXISTS idx_live_reports_expires_at ON live_reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_live_reports_active ON live_reports(expires_at) WHERE expires_at > NOW();

-- ============================================================
-- FOLLOWS TABLE
-- ============================================================
DO $$ BEGIN
  CREATE TYPE follow_target_type AS ENUM ('user', 'place', 'route_community', 'list');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS follows (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_type follow_target_type NOT NULL,
  followed_id   UUID NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, followed_type, followed_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows(followed_type, followed_id);

-- ============================================================
-- ROUTE COMMUNITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS route_communities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  origin_label    TEXT NOT NULL,
  destination_label TEXT NOT NULL,
  description     TEXT,
  cover_image_url TEXT,
  member_count    INTEGER DEFAULT 0,
  post_count      INTEGER DEFAULT 0,
  ai_summary      JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_communities_slug ON route_communities(slug);
CREATE INDEX IF NOT EXISTS idx_route_communities_member_count ON route_communities(member_count DESC);

-- Now add FK constraints for posts and live_reports → route_communities
ALTER TABLE posts
  ADD CONSTRAINT fk_posts_route_community
  FOREIGN KEY (route_community_id) REFERENCES route_communities(id) ON DELETE SET NULL;

ALTER TABLE live_reports
  ADD CONSTRAINT fk_live_reports_route_community
  FOREIGN KEY (route_community_id) REFERENCES route_communities(id) ON DELETE SET NULL;

-- ============================================================
-- ROUTE REPUTATION SCORES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS route_reputation_scores (
  route_community_id  UUID PRIMARY KEY REFERENCES route_communities(id) ON DELETE CASCADE,
  food_score          DECIMAL(5,2) DEFAULT 0,
  coffee_score        DECIMAL(5,2) DEFAULT 0,
  road_quality_score  DECIMAL(5,2) DEFAULT 0,
  photography_score   DECIMAL(5,2) DEFAULT 0,
  safety_score        DECIMAL(5,2) DEFAULT 0,
  night_driving_score DECIMAL(5,2) DEFAULT 0,
  fuel_availability_score DECIMAL(5,2) DEFAULT 0,
  overall_score       DECIMAL(5,2) DEFAULT 0,
  computed_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRAVEL LISTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_lists (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  cover_image_url       TEXT,
  is_public             BOOLEAN DEFAULT true,
  like_count            INTEGER DEFAULT 0,
  save_count            INTEGER DEFAULT 0,
  follow_count          INTEGER DEFAULT 0,
  duplicated_from_list_id UUID REFERENCES travel_lists(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  -- Full-text search
  search_vector         TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_travel_lists_owner_id ON travel_lists(owner_id);
CREATE INDEX IF NOT EXISTS idx_travel_lists_is_public ON travel_lists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_travel_lists_like_count ON travel_lists(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_travel_lists_search_vector ON travel_lists USING GIN(search_vector);

CREATE TRIGGER update_travel_lists_updated_at
  BEFORE UPDATE ON travel_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRAVEL LIST ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_list_items (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id   UUID NOT NULL REFERENCES travel_lists(id) ON DELETE CASCADE,
  place_id  UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  note      TEXT,
  position  INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_travel_list_items_list_id ON travel_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_travel_list_items_place_id ON travel_list_items(place_id);
CREATE INDEX IF NOT EXISTS idx_travel_list_items_position ON travel_list_items(list_id, position);

-- ============================================================
-- USER REPUTATION TABLE
-- ============================================================
DO $$ BEGIN
  CREATE TYPE reputation_level AS ENUM ('traveler', 'explorer', 'guide', 'expert', 'legend');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_reputation (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level                 reputation_level DEFAULT 'traveler',
  xp_points             INTEGER DEFAULT 0,
  badges                JSONB DEFAULT '[]'::jsonb,
  posts_count           INTEGER DEFAULT 0,
  hidden_gems_found     INTEGER DEFAULT 0,
  total_upvotes_received INTEGER DEFAULT 0,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_user_reputation_updated_at
  BEFORE UPDATE ON user_reputation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PLACE TRUST SCORES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS place_trust_scores (
  place_id         UUID PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
  ai_score         DECIMAL(5,2) DEFAULT 0,
  community_score  DECIMAL(5,2) DEFAULT 0,
  freshness_score  DECIMAL(5,2) DEFAULT 0,
  trust_score      DECIMAL(5,2) DEFAULT 0,
  final_score      DECIMAL(5,2) DEFAULT 0,
  computed_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HIDDEN GEM NOMINATIONS TABLE
-- ============================================================
DO $$ BEGIN
  CREATE TYPE gem_nomination_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS hidden_gem_nominations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id        UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  nominated_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id         UUID REFERENCES posts(id) ON DELETE SET NULL,
  upvote_count    INTEGER DEFAULT 0,
  downvote_count  INTEGER DEFAULT 0,
  status          gem_nomination_status DEFAULT 'pending',
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hidden_gem_nominations_place ON hidden_gem_nominations(place_id);
CREATE INDEX IF NOT EXISTS idx_hidden_gem_nominations_status ON hidden_gem_nominations(status);
CREATE INDEX IF NOT EXISTS idx_hidden_gem_nominations_nominated_by ON hidden_gem_nominations(nominated_by);

-- ============================================================
-- TRAVEL STORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_stories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  summary_json    JSONB DEFAULT '{}'::jsonb,
  is_published    BOOLEAN DEFAULT false,
  post_id         UUID REFERENCES posts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_stories_user_id ON travel_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_stories_trip_id ON travel_stories(trip_id);
CREATE INDEX IF NOT EXISTS idx_travel_stories_is_published ON travel_stories(is_published) WHERE is_published = true;

-- ============================================================
-- TRIGGER FUNCTIONS
-- ============================================================

-- Update post vote counts when a vote is inserted/deleted
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' THEN
      IF NEW.value = 1 THEN
        UPDATE posts SET upvote_count = upvote_count + 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE posts SET downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    ELSIF NEW.target_type = 'comment' THEN
      IF NEW.value = 1 THEN
        UPDATE comments SET upvote_count = upvote_count + 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE comments SET downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      IF OLD.value = 1 THEN
        UPDATE posts SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.target_id;
      ELSE
        UPDATE posts SET downvote_count = GREATEST(0, downvote_count - 1) WHERE id = OLD.target_id;
      END IF;
    ELSIF OLD.target_type = 'comment' THEN
      IF OLD.value = 1 THEN
        UPDATE comments SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.target_id;
      ELSE
        UPDATE comments SET downvote_count = GREATEST(0, downvote_count - 1) WHERE id = OLD.target_id;
      END IF;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote flip (e.g. upvote → downvote)
    IF OLD.target_type = 'post' THEN
      IF OLD.value = 1 THEN
        UPDATE posts SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.target_id;
      ELSE
        UPDATE posts SET downvote_count = GREATEST(0, downvote_count - 1) WHERE id = OLD.target_id;
      END IF;
      IF NEW.value = 1 THEN
        UPDATE posts SET upvote_count = upvote_count + 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE posts SET downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    ELSIF OLD.target_type = 'comment' THEN
      IF OLD.value = 1 THEN
        UPDATE comments SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.target_id;
      ELSE
        UPDATE comments SET downvote_count = GREATEST(0, downvote_count - 1) WHERE id = OLD.target_id;
      END IF;
      IF NEW.value = 1 THEN
        UPDATE comments SET upvote_count = upvote_count + 1 WHERE id = NEW.target_id;
      ELSE
        UPDATE comments SET downvote_count = downvote_count + 1 WHERE id = NEW.target_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_vote_counts_insert
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

CREATE TRIGGER trigger_update_vote_counts_delete
  AFTER DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

CREATE TRIGGER trigger_update_vote_counts_update
  AFTER UPDATE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- Update post comment_count when a comment is inserted/deleted
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_comment_count_insert
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

CREATE TRIGGER trigger_comment_count_delete
  AFTER DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Update route_communities.post_count when a post is inserted/deleted
CREATE OR REPLACE FUNCTION update_route_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.route_community_id IS NOT NULL THEN
    UPDATE route_communities SET post_count = post_count + 1 WHERE id = NEW.route_community_id;
  ELSIF TG_OP = 'DELETE' AND OLD.route_community_id IS NOT NULL THEN
    UPDATE route_communities SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.route_community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_route_post_count_insert
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION update_route_post_count();

CREATE TRIGGER trigger_route_post_count_delete
  AFTER DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_route_post_count();

-- Update route_communities.member_count on follow/unfollow
CREATE OR REPLACE FUNCTION update_route_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.followed_type = 'route_community' THEN
    UPDATE route_communities SET member_count = member_count + 1 WHERE id = NEW.followed_id;
  ELSIF TG_OP = 'DELETE' AND OLD.followed_type = 'route_community' THEN
    UPDATE route_communities SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.followed_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_route_member_count_insert
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION update_route_member_count();

CREATE TRIGGER trigger_route_member_count_delete
  AFTER DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_route_member_count();

-- Update travel_lists counters on follows
CREATE OR REPLACE FUNCTION update_list_follow_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.followed_type = 'list' THEN
    UPDATE travel_lists SET follow_count = follow_count + 1 WHERE id = NEW.followed_id;
  ELSIF TG_OP = 'DELETE' AND OLD.followed_type = 'list' THEN
    UPDATE travel_lists SET follow_count = GREATEST(0, follow_count - 1) WHERE id = OLD.followed_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_list_follow_count_insert
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION update_list_follow_count();

CREATE TRIGGER trigger_list_follow_count_delete
  AFTER DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_list_follow_count();

-- Update user_reputation.posts_count
CREATE OR REPLACE FUNCTION update_user_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_reputation (user_id, posts_count, xp_points)
    VALUES (NEW.author_id, 1, 10)
    ON CONFLICT (user_id) DO UPDATE
    SET posts_count = user_reputation.posts_count + 1,
        xp_points = user_reputation.xp_points + 10;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_reputation
    SET posts_count = GREATEST(0, posts_count - 1),
        xp_points = GREATEST(0, xp_points - 10)
    WHERE user_id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_user_posts_count_insert
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION update_user_posts_count();

CREATE TRIGGER trigger_user_posts_count_delete
  AFTER DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_user_posts_count();

-- Update user_reputation.total_upvotes_received when votes change
CREATE OR REPLACE FUNCTION update_user_upvotes_received()
RETURNS TRIGGER AS $$
DECLARE
  target_author UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.value = 1 THEN
    IF NEW.target_type = 'post' THEN
      SELECT author_id INTO target_author FROM posts WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
      SELECT author_id INTO target_author FROM comments WHERE id = NEW.target_id;
    END IF;
    IF target_author IS NOT NULL THEN
      INSERT INTO user_reputation (user_id, total_upvotes_received, xp_points)
      VALUES (target_author, 1, 2)
      ON CONFLICT (user_id) DO UPDATE
      SET total_upvotes_received = user_reputation.total_upvotes_received + 1,
          xp_points = user_reputation.xp_points + 2;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.value = 1 THEN
    IF OLD.target_type = 'post' THEN
      SELECT author_id INTO target_author FROM posts WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'comment' THEN
      SELECT author_id INTO target_author FROM comments WHERE id = OLD.target_id;
    END IF;
    IF target_author IS NOT NULL THEN
      UPDATE user_reputation
      SET total_upvotes_received = GREATEST(0, total_upvotes_received - 1),
          xp_points = GREATEST(0, xp_points - 2)
      WHERE user_id = target_author;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_user_upvotes_on_vote_insert
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION update_user_upvotes_received();

CREATE TRIGGER trigger_user_upvotes_on_vote_delete
  AFTER DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_user_upvotes_received();

-- Auto-approve hidden gems when threshold met
CREATE OR REPLACE FUNCTION check_hidden_gem_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.upvote_count >= 100 THEN
    DECLARE
      ratio NUMERIC;
    BEGIN
      ratio := NEW.upvote_count::NUMERIC / GREATEST(1, NEW.upvote_count + NEW.downvote_count);
      IF ratio >= 0.8 THEN
        NEW.status := 'approved';
        NEW.approved_at := NOW();
        -- Flag the place as hidden gem
        UPDATE places SET is_hidden_gem = true WHERE id = NEW.place_id;
        -- Award XP to nominator
        INSERT INTO user_reputation (user_id, hidden_gems_found, xp_points)
        VALUES (NEW.nominated_by, 1, 50)
        ON CONFLICT (user_id) DO UPDATE
        SET hidden_gems_found = user_reputation.hidden_gems_found + 1,
            xp_points = user_reputation.xp_points + 50;
      END IF;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_check_gem_approval
  BEFORE UPDATE ON hidden_gem_nominations
  FOR EACH ROW EXECUTE FUNCTION check_hidden_gem_approval();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_reputation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_gem_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_stories ENABLE ROW LEVEL SECURITY;

-- ─── Posts: readable by all authenticated, writable by author ───
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT TO authenticated
  USING (is_deleted = false);

CREATE POLICY "Authors can create posts"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE TO authenticated
  USING (author_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Authors can delete own posts"
  ON posts FOR DELETE TO authenticated
  USING (author_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ─── Comments: readable by all, writable by author ───
CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT TO authenticated
  USING (is_deleted = false);

CREATE POLICY "Authors can create comments"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Authors can update own comments"
  ON comments FOR UPDATE TO authenticated
  USING (author_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Authors can delete own comments"
  ON comments FOR DELETE TO authenticated
  USING (author_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ─── Votes: one per user per target ───
CREATE POLICY "Anyone can view votes"
  ON votes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can vote"
  ON votes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can update own votes"
  ON votes FOR UPDATE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can remove own votes"
  ON votes FOR DELETE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ─── Reports: users create, only see own ───
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT TO authenticated
  USING (reporter_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ─── Mentions: readable by mentioned user ───
CREATE POLICY "Users can view own mentions"
  ON mentions FOR SELECT TO authenticated
  USING (mentioned_user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Authenticated can create mentions"
  ON mentions FOR INSERT TO authenticated
  WITH CHECK (true);

-- ─── Saves: user manages own saves ───
CREATE POLICY "Users can view own saves"
  ON saves FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can create saves"
  ON saves FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can delete own saves"
  ON saves FOR DELETE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ─── Live Reports: readable by all, writable by reporter ───
CREATE POLICY "Anyone can view active live reports"
  ON live_reports FOR SELECT TO authenticated
  USING (expires_at > NOW());

CREATE POLICY "Users can create live reports"
  ON live_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can delete own live reports"
  ON live_reports FOR DELETE TO authenticated
  USING (reporter_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ─── Follows: user manages own follows ───
CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can follow"
  ON follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE TO authenticated
  USING (follower_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ─── Route Communities: readable by all ───
CREATE POLICY "Anyone can view route communities"
  ON route_communities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create route communities"
  ON route_communities FOR INSERT TO authenticated WITH CHECK (true);

-- ─── Route Reputation Scores: readable by all ───
CREATE POLICY "Anyone can view route reputation scores"
  ON route_reputation_scores FOR SELECT TO authenticated USING (true);

-- ─── Travel Lists: public readable, owner manages ───
CREATE POLICY "Anyone can view public lists"
  ON travel_lists FOR SELECT TO authenticated
  USING (is_public = true OR owner_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can create lists"
  ON travel_lists FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Owners can update own lists"
  ON travel_lists FOR UPDATE TO authenticated
  USING (owner_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Owners can delete own lists"
  ON travel_lists FOR DELETE TO authenticated
  USING (owner_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ─── Travel List Items: readable with list, owner manages ───
CREATE POLICY "Anyone can view list items of public lists"
  ON travel_list_items FOR SELECT TO authenticated
  USING (
    list_id IN (
      SELECT id FROM travel_lists
      WHERE is_public = true
        OR owner_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
  );

CREATE POLICY "Owners can manage list items"
  ON travel_list_items FOR INSERT TO authenticated
  WITH CHECK (
    list_id IN (
      SELECT id FROM travel_lists
      WHERE owner_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
  );

CREATE POLICY "Owners can update list items"
  ON travel_list_items FOR UPDATE TO authenticated
  USING (
    list_id IN (
      SELECT id FROM travel_lists
      WHERE owner_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
  );

CREATE POLICY "Owners can delete list items"
  ON travel_list_items FOR DELETE TO authenticated
  USING (
    list_id IN (
      SELECT id FROM travel_lists
      WHERE owner_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
  );

-- ─── User Reputation: readable by all, system-managed ───
CREATE POLICY "Anyone can view user reputation"
  ON user_reputation FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view own reputation"
  ON user_reputation FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ─── Place Trust Scores: readable by all ───
CREATE POLICY "Anyone can view place trust scores"
  ON place_trust_scores FOR SELECT TO authenticated USING (true);

-- ─── Hidden Gem Nominations: readable by all, writable by nominator ───
CREATE POLICY "Anyone can view nominations"
  ON hidden_gem_nominations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can nominate"
  ON hidden_gem_nominations FOR INSERT TO authenticated
  WITH CHECK (nominated_by = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ─── Travel Stories: readable when published, writable by author ───
CREATE POLICY "Anyone can view published stories"
  ON travel_stories FOR SELECT TO authenticated
  USING (
    is_published = true
    OR user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "Users can create stories"
  ON travel_stories FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can update own stories"
  ON travel_stories FOR UPDATE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ============================================================
-- HELPER: Clean up expired live reports (run via pg_cron or manual)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_live_reports()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM live_reports WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DONE — V3 Migration Complete
-- ============================================================
