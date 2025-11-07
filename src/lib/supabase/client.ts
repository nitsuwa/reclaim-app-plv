/**
 * Supabase Client Initialization
 * 
 * This file initializes the Supabase client for the Lost and Found System.
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with your actual Supabase project credentials.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Supabase credentials from Figma Make integration
const SUPABASE_URL = `https://${projectId}.supabase.co`;
const SUPABASE_ANON_KEY = publicAnonKey;

// Create and export the Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'pkce',
  },
});

/**
 * Helper function to check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return !!projectId && !!publicAnonKey;
};
