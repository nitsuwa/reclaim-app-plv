-- ============================================
-- PLV LOST & FOUND - COMPLETE SETUP FROM SCRATCH
-- ============================================
-- Run this ENTIRE file in Supabase SQL Editor
-- This includes database schema + RLS fixes + storage policies
-- ============================================

-- ============================================
-- STEP 1: ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- STEP 2: CREATE CUSTOM TYPES
-- ============================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE item_status AS ENUM ('pending', 'verified', 'claimed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE otp_purpose AS ENUM ('signup', 'reset_password', 'claim_verification');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_action AS ENUM (
    'item_reported',
    'item_verified',
    'item_rejected',
    'claim_submitted',
    'claim_approved',
    'claim_rejected',
    'failed_claim_attempt',
    'item_status_changed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- STEP 3: CREATE TABLES
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  student_id TEXT UNIQUE NOT NULL,
  contact_number TEXT NOT NULL,
  role user_role DEFAULT 'student' NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID REFERENCES users(id)
);

-- Lost Items Table
CREATE TABLE IF NOT EXISTS lost_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_type TEXT NOT NULL,
  other_item_type_details TEXT,
  location TEXT NOT NULL,
  date_found DATE NOT NULL,
  time_found TIME NOT NULL,
  photo_url TEXT NOT NULL,
  description TEXT CHECK (char_length(description) <= 200),
  security_questions JSONB NOT NULL,
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status item_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  rejection_reason TEXT
);

-- Claims Table
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES lost_items(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_code TEXT UNIQUE NOT NULL,
  answers TEXT[] NOT NULL,
  proof_photo_url TEXT,
  status claim_status DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  action activity_action NOT NULL,
  item_id UUID REFERENCES lost_items(id) ON DELETE SET NULL,
  item_type TEXT,
  details TEXT NOT NULL,
  viewed BOOLEAN DEFAULT false,
  notify_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- OTP Codes Table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose otp_purpose NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 4: CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_lost_items_reported_by ON lost_items(reported_by);
CREATE INDEX IF NOT EXISTS idx_lost_items_status ON lost_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_items_created_at ON lost_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lost_items_item_type ON lost_items(item_type);
CREATE INDEX IF NOT EXISTS idx_lost_items_location ON lost_items(location);

CREATE INDEX IF NOT EXISTS idx_claims_item_id ON claims(item_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant_id ON claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_claim_code ON claims(claim_code);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_notify_user_id ON activity_logs(notify_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose ON otp_codes(purpose);

-- ============================================
-- STEP 5: CREATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lost_items_updated_at ON lost_items;
CREATE TRIGGER update_lost_items_updated_at BEFORE UPDATE ON lost_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_claims_updated_at ON claims;
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: ENABLE RLS
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 7: CREATE HELPER FUNCTION (Prevents infinite recursion)
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 8: DROP OLD POLICIES (Clean slate)
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can create admin users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;

DROP POLICY IF EXISTS "Anyone can view verified items" ON lost_items;
DROP POLICY IF EXISTS "Users can view own reported items" ON lost_items;
DROP POLICY IF EXISTS "Admins can view all items" ON lost_items;
DROP POLICY IF EXISTS "Authenticated users can create items" ON lost_items;
DROP POLICY IF EXISTS "Users can update own pending items" ON lost_items;
DROP POLICY IF EXISTS "Admins can update any item" ON lost_items;
DROP POLICY IF EXISTS "Admins can delete items" ON lost_items;

DROP POLICY IF EXISTS "Users can view own claims" ON claims;
DROP POLICY IF EXISTS "Admins can view all claims" ON claims;
DROP POLICY IF EXISTS "Item reporters can view claims for their items" ON claims;
DROP POLICY IF EXISTS "Authenticated users can create claims" ON claims;
DROP POLICY IF EXISTS "Admins can update claims" ON claims;
DROP POLICY IF EXISTS "Admins can delete claims" ON claims;

DROP POLICY IF EXISTS "Users can view own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can view notification logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can mark own notifications as viewed" ON activity_logs;
DROP POLICY IF EXISTS "Admins can update any activity log" ON activity_logs;
DROP POLICY IF EXISTS "Admins can delete activity logs" ON activity_logs;

DROP POLICY IF EXISTS "Allow OTP creation" ON otp_codes;
DROP POLICY IF EXISTS "Allow OTP updates" ON otp_codes;

-- ============================================
-- STEP 9: CREATE RLS POLICIES
-- ============================================

-- ===== USERS TABLE =====
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can create admin users"
  ON users FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (is_admin());

CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (auth_id = auth.uid());

-- ===== LOST ITEMS TABLE =====
CREATE POLICY "Anyone can view verified items"
  ON lost_items FOR SELECT
  USING (status = 'verified');

CREATE POLICY "Users can view own reported items"
  ON lost_items FOR SELECT
  USING (reported_by IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Admins can view all items"
  ON lost_items FOR SELECT
  USING (is_admin());

CREATE POLICY "Authenticated users can create items"
  ON lost_items FOR INSERT
  WITH CHECK (
    reported_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own pending items"
  ON lost_items FOR UPDATE
  USING (
    reported_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ) AND status = 'pending'
  );

CREATE POLICY "Admins can update any item"
  ON lost_items FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete items"
  ON lost_items FOR DELETE
  USING (is_admin());

-- ===== CLAIMS TABLE =====
CREATE POLICY "Users can view own claims"
  ON claims FOR SELECT
  USING (
    claimant_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all claims"
  ON claims FOR SELECT
  USING (is_admin());

CREATE POLICY "Item reporters can view claims for their items"
  ON claims FOR SELECT
  USING (
    item_id IN (
      SELECT id FROM lost_items
      WHERE reported_by IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Authenticated users can create claims"
  ON claims FOR INSERT
  WITH CHECK (
    claimant_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update claims"
  ON claims FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete claims"
  ON claims FOR DELETE
  USING (is_admin());

-- ===== ACTIVITY LOGS TABLE =====
CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can view notification logs"
  ON activity_logs FOR SELECT
  USING (
    notify_user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark own notifications as viewed"
  ON activity_logs FOR UPDATE
  USING (
    notify_user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    notify_user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update any activity log"
  ON activity_logs FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete activity logs"
  ON activity_logs FOR DELETE
  USING (is_admin());

-- ===== OTP CODES TABLE =====
CREATE POLICY "Allow OTP creation"
  ON otp_codes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow OTP updates"
  ON otp_codes FOR UPDATE
  USING (true);

-- ============================================
-- STEP 10: CREATE HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION generate_claim_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    SELECT EXISTS(SELECT 1 FROM claims WHERE claim_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ✅ DATABASE SETUP COMPLETE!
-- ============================================
-- Next: Create storage buckets and set up storage policies
-- See instructions below
-- ============================================

SELECT 'Database setup complete! ✅' AS status;
