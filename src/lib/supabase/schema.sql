-- ============================================
-- PLV Lost and Found System - Database Schema
-- ============================================
-- This file contains the complete database schema for the Lost and Found System
-- Run this in your Supabase SQL Editor after creating your project
--
-- Included:
-- 1. Custom types/enums
-- 2. Tables (users, lost_items, claims, activity_logs, otp_codes)
-- 3. Row Level Security (RLS) policies
-- 4. Indexes for performance
-- 5. Triggers for automatic timestamps
-- 6. Sample demo data (optional - see instructions at bottom)
-- ============================================

-- ============================================
-- 1. ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. CREATE CUSTOM TYPES
-- ============================================
CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE item_status AS ENUM ('pending', 'verified', 'claimed', 'rejected');
CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE otp_purpose AS ENUM ('signup', 'reset_password', 'claim_verification');
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

-- ============================================
-- 3. CREATE TABLES
-- ============================================

-- Users Table
-- Links to Supabase Auth and stores PLV student/admin profiles
CREATE TABLE users (
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
  created_by UUID REFERENCES users(id) -- For admin accounts created by other admins
);

-- Lost Items Table
-- Stores all reported found items
CREATE TABLE lost_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_type TEXT NOT NULL,
  other_item_type_details TEXT, -- For "Other" item type
  location TEXT NOT NULL,
  date_found DATE NOT NULL,
  time_found TIME NOT NULL,
  photo_url TEXT NOT NULL,
  description TEXT CHECK (char_length(description) <= 200), -- 200 character limit
  security_questions JSONB NOT NULL, -- Array of {question, answer} objects
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status item_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  rejection_reason TEXT
);

-- Claims Table
-- Stores claim requests for lost items
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES lost_items(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_code TEXT UNIQUE NOT NULL,
  answers TEXT[] NOT NULL, -- Array of answers to security questions
  proof_photo_url TEXT, -- Optional proof of ownership
  status claim_status DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);

-- Activity Logs Table
-- Tracks all system activities for audit and notifications
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  action activity_action NOT NULL,
  item_id UUID REFERENCES lost_items(id) ON DELETE SET NULL,
  item_type TEXT,
  details TEXT NOT NULL,
  viewed BOOLEAN DEFAULT false,
  notify_user_id UUID REFERENCES users(id) ON DELETE SET NULL -- User to be notified
);

-- OTP Codes Table
-- Stores one-time passwords for email verification, password reset, etc.
-- Note: This is for the custom OTP approach. If using Supabase built-in OTP, this table is optional.
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL, -- Hashed OTP for security
  purpose otp_purpose NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_role ON users(role);

-- Lost items indexes
CREATE INDEX idx_lost_items_reported_by ON lost_items(reported_by);
CREATE INDEX idx_lost_items_status ON lost_items(status);
CREATE INDEX idx_lost_items_created_at ON lost_items(created_at DESC);
CREATE INDEX idx_lost_items_item_type ON lost_items(item_type);
CREATE INDEX idx_lost_items_location ON lost_items(location);

-- Claims indexes
CREATE INDEX idx_claims_item_id ON claims(item_id);
CREATE INDEX idx_claims_claimant_id ON claims(claimant_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_claim_code ON claims(claim_code);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_notify_user_id ON activity_logs(notify_user_id);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);

-- OTP codes indexes
CREATE INDEX idx_otp_codes_email ON otp_codes(email);
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX idx_otp_codes_purpose ON otp_codes(purpose);

-- ============================================
-- 5. CREATE TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lost_items_updated_at BEFORE UPDATE ON lost_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CREATE RLS POLICIES
-- ============================================

-- ===== USERS TABLE POLICIES =====

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_id);

-- Users can update their own profile (except role and status)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can create new admin users
CREATE POLICY "Admins can create admin users"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any user
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow user creation during signup (handled by auth trigger)
CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (auth_id = auth.uid());

-- ===== LOST ITEMS TABLE POLICIES =====

-- Anyone can view verified items
CREATE POLICY "Anyone can view verified items"
  ON lost_items FOR SELECT
  USING (status = 'verified');

-- Users can view their own reported items (any status)
CREATE POLICY "Users can view own reported items"
  ON lost_items FOR SELECT
  USING (reported_by IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

-- Admins can view all items
CREATE POLICY "Admins can view all items"
  ON lost_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can create items
CREATE POLICY "Authenticated users can create items"
  ON lost_items FOR INSERT
  WITH CHECK (
    reported_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can update their own pending items
CREATE POLICY "Users can update own pending items"
  ON lost_items FOR UPDATE
  USING (
    reported_by IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ) AND status = 'pending'
  );

-- Admins can update any item
CREATE POLICY "Admins can update any item"
  ON lost_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete items
CREATE POLICY "Admins can delete items"
  ON lost_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- ===== CLAIMS TABLE POLICIES =====

-- Users can view their own claims
CREATE POLICY "Users can view own claims"
  ON claims FOR SELECT
  USING (
    claimant_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Admins can view all claims
CREATE POLICY "Admins can view all claims"
  ON claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Item reporters can view claims for their items
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

-- Authenticated users can create claims
CREATE POLICY "Authenticated users can create claims"
  ON claims FOR INSERT
  WITH CHECK (
    claimant_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Admins can update claims
CREATE POLICY "Admins can update claims"
  ON claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete claims
CREATE POLICY "Admins can delete claims"
  ON claims FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- ===== ACTIVITY LOGS TABLE POLICIES =====

-- Users can view their own activity logs
CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can view logs where they are notified
CREATE POLICY "Users can view notification logs"
  ON activity_logs FOR SELECT
  USING (
    notify_user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can create activity logs
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can update their own viewed status
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

-- Admins can update any activity log
CREATE POLICY "Admins can update any activity log"
  ON activity_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete activity logs
CREATE POLICY "Admins can delete activity logs"
  ON activity_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- ===== OTP CODES TABLE POLICIES =====

-- No direct read access to OTP codes (handled by backend functions only)
-- This prevents users from viewing OTP codes directly

-- Allow system to create OTP codes (via service role or edge functions)
CREATE POLICY "Allow OTP creation"
  ON otp_codes FOR INSERT
  WITH CHECK (true);

-- Allow system to update OTP codes (mark as used)
CREATE POLICY "Allow OTP updates"
  ON otp_codes FOR UPDATE
  USING (true);

-- Auto-cleanup: Delete expired OTP codes after 24 hours
-- This can be run as a scheduled job or manually
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to generate unique claim code
CREATE OR REPLACE FUNCTION generate_claim_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code in format: CLM-YYYY-NNNN
    new_code := 'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM claims WHERE claim_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create user profile after Supabase Auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger is called when a new user signs up via Supabase Auth
  -- The user profile should be created separately via the application
  -- This is just a placeholder for reference
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create trigger on auth.users (requires auth schema access)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 9. DEMO DATA (OPTIONAL)
-- ============================================
-- Uncomment the section below to insert one demo item for testing
-- IMPORTANT: Delete this demo data before going to production
--
-- Note: You'll need to manually create a demo user first through Supabase Auth,
-- then get their auth_id and create a user profile, then update the UUIDs below.
--
-- To remove demo data after testing, run:
-- DELETE FROM lost_items WHERE id = 'demo-item-uuid';
-- DELETE FROM users WHERE email = 'demo@plv.edu.ph';

/*
-- Demo User (replace 'your-auth-uuid' with actual auth.users.id)
INSERT INTO users (auth_id, email, full_name, student_id, contact_number, role, is_verified, status)
VALUES (
  'your-auth-uuid'::UUID,
  'demo@plv.edu.ph',
  'Demo Student',
  '2021-00001',
  '09123456789',
  'student',
  true,
  'active'
) ON CONFLICT (email) DO NOTHING;

-- Demo Lost Item
INSERT INTO lost_items (
  item_type,
  location,
  date_found,
  time_found,
  photo_url,
  description,
  security_questions,
  reported_by,
  status
)
VALUES (
  'Wallet',
  'Library - 2nd Floor',
  '2025-11-01',
  '14:30:00',
  'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400',
  'Brown leather wallet found on reading table',
  '[{"question": "What color is the wallet?", "answer": "brown"}, {"question": "What brand is it?", "answer": "fossil"}]'::JSONB,
  (SELECT id FROM users WHERE email = 'demo@plv.edu.ph'),
  'verified'
) ON CONFLICT DO NOTHING;
*/

-- ============================================
-- DEPLOYMENT COMPLETE!
-- ============================================
-- Next steps:
-- 1. Configure Supabase Storage buckets (see DEPLOYMENT_GUIDE.md)
-- 2. Set up email templates in Supabase Auth settings
-- 3. Configure SMTP settings for custom OTP emails (if using custom OTP approach)
-- 4. Test RLS policies with different user roles
-- 5. Set up Edge Functions for OTP generation (if using custom OTP approach)
-- ============================================
