-- ============================================
-- FIX RLS INFINITE RECURSION
-- ============================================
-- Run this in Supabase SQL Editor to fix the infinite recursion error
-- This drops the problematic policies and recreates them with a proper helper function

-- ============================================
-- 1. CREATE HELPER FUNCTION TO CHECK ADMIN ROLE
-- ============================================

-- This function bypasses RLS to check if current user is admin
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
-- 2. DROP PROBLEMATIC POLICIES
-- ============================================

-- Users table policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can create admin users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;

-- Lost items table policies
DROP POLICY IF EXISTS "Admins can view all items" ON lost_items;
DROP POLICY IF EXISTS "Admins can update any item" ON lost_items;
DROP POLICY IF EXISTS "Admins can delete items" ON lost_items;

-- Claims table policies
DROP POLICY IF EXISTS "Admins can view all claims" ON claims;
DROP POLICY IF EXISTS "Admins can update claims" ON claims;
DROP POLICY IF EXISTS "Admins can delete claims" ON claims;

-- Activity logs table policies
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can update any activity log" ON activity_logs;
DROP POLICY IF EXISTS "Admins can delete activity logs" ON activity_logs;

-- ============================================
-- 3. RECREATE POLICIES WITH HELPER FUNCTION
-- ============================================

-- ===== USERS TABLE POLICIES =====

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (is_admin());

-- Admins can create new admin users
CREATE POLICY "Admins can create admin users"
  ON users FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update any user
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (is_admin());

-- ===== LOST ITEMS TABLE POLICIES =====

-- Admins can view all items
CREATE POLICY "Admins can view all items"
  ON lost_items FOR SELECT
  USING (is_admin());

-- Admins can update any item
CREATE POLICY "Admins can update any item"
  ON lost_items FOR UPDATE
  USING (is_admin());

-- Admins can delete items
CREATE POLICY "Admins can delete items"
  ON lost_items FOR DELETE
  USING (is_admin());

-- ===== CLAIMS TABLE POLICIES =====

-- Admins can view all claims
CREATE POLICY "Admins can view all claims"
  ON claims FOR SELECT
  USING (is_admin());

-- Admins can update claims
CREATE POLICY "Admins can update claims"
  ON claims FOR UPDATE
  USING (is_admin());

-- Admins can delete claims
CREATE POLICY "Admins can delete claims"
  ON claims FOR DELETE
  USING (is_admin());

-- ===== ACTIVITY LOGS TABLE POLICIES =====

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT
  USING (is_admin());

-- Admins can update any activity log
CREATE POLICY "Admins can update any activity log"
  ON activity_logs FOR UPDATE
  USING (is_admin());

-- Admins can delete activity logs
CREATE POLICY "Admins can delete activity logs"
  ON activity_logs FOR DELETE
  USING (is_admin());

-- ============================================
-- DONE! Infinite recursion fixed!
-- ============================================
