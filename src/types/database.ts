/**
 * Database Types for Supabase
 * 
 * These types match the database schema defined in schema.sql
 * Auto-generated types can be obtained using: npx supabase gen types typescript
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          full_name: string;
          student_id: string;
          contact_number: string;
          role: 'student' | 'admin';
          is_verified: boolean;
          created_at: string;
          updated_at: string;
          status: 'active' | 'inactive';
          created_by: string | null;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          full_name: string;
          student_id: string;
          contact_number: string;
          role?: 'student' | 'admin';
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          status?: 'active' | 'inactive';
          created_by?: string | null;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          full_name?: string;
          student_id?: string;
          contact_number?: string;
          role?: 'student' | 'admin';
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          status?: 'active' | 'inactive';
          created_by?: string | null;
        };
      };
      lost_items: {
        Row: {
          id: string;
          item_type: string;
          other_item_type_details: string | null;
          location: string;
          date_found: string;
          time_found: string;
          photo_url: string;
          description: string | null;
          security_questions: Json;
          reported_by: string;
          status: 'pending' | 'verified' | 'claimed' | 'rejected';
          created_at: string;
          updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
          rejection_reason: string | null;
        };
        Insert: {
          id?: string;
          item_type: string;
          other_item_type_details?: string | null;
          location: string;
          date_found: string;
          time_found: string;
          photo_url: string;
          description?: string | null;
          security_questions: Json;
          reported_by: string;
          status?: 'pending' | 'verified' | 'claimed' | 'rejected';
          created_at?: string;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          rejection_reason?: string | null;
        };
        Update: {
          id?: string;
          item_type?: string;
          other_item_type_details?: string | null;
          location?: string;
          date_found?: string;
          time_found?: string;
          photo_url?: string;
          description?: string | null;
          security_questions?: Json;
          reported_by?: string;
          status?: 'pending' | 'verified' | 'claimed' | 'rejected';
          created_at?: string;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          rejection_reason?: string | null;
        };
      };
      claims: {
        Row: {
          id: string;
          item_id: string;
          claimant_id: string;
          claim_code: string;
          answers: string[];
          proof_photo_url: string | null;
          status: 'pending' | 'approved' | 'rejected';
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          claimant_id: string;
          claim_code: string;
          answers: string[];
          proof_photo_url?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          claimant_id?: string;
          claim_code?: string;
          answers?: string[];
          proof_photo_url?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          timestamp: string;
          user_id: string;
          user_name: string;
          action: 'item_reported' | 'item_verified' | 'item_rejected' | 'claim_submitted' | 'claim_approved' | 'claim_rejected' | 'failed_claim_attempt' | 'item_status_changed';
          item_id: string | null;
          item_type: string | null;
          details: string;
          viewed: boolean;
          notify_user_id: string | null;
        };
        Insert: {
          id?: string;
          timestamp?: string;
          user_id: string;
          user_name: string;
          action: 'item_reported' | 'item_verified' | 'item_rejected' | 'claim_submitted' | 'claim_approved' | 'claim_rejected' | 'failed_claim_attempt' | 'item_status_changed';
          item_id?: string | null;
          item_type?: string | null;
          details: string;
          viewed?: boolean;
          notify_user_id?: string | null;
        };
        Update: {
          id?: string;
          timestamp?: string;
          user_id?: string;
          user_name?: string;
          action?: 'item_reported' | 'item_verified' | 'item_rejected' | 'claim_submitted' | 'claim_approved' | 'claim_rejected' | 'failed_claim_attempt' | 'item_status_changed';
          item_id?: string | null;
          item_type?: string | null;
          details?: string;
          viewed?: boolean;
          notify_user_id?: string | null;
        };
      };
      otp_codes: {
        Row: {
          id: string;
          email: string;
          code_hash: string;
          purpose: 'signup' | 'reset_password' | 'claim_verification';
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          code_hash: string;
          purpose: 'signup' | 'reset_password' | 'claim_verification';
          expires_at: string;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          code_hash?: string;
          purpose?: 'signup' | 'reset_password' | 'claim_verification';
          expires_at?: string;
          used?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'student' | 'admin';
      item_status: 'pending' | 'verified' | 'claimed' | 'rejected';
      claim_status: 'pending' | 'approved' | 'rejected';
      otp_purpose: 'signup' | 'reset_password' | 'claim_verification';
      activity_action: 'item_reported' | 'item_verified' | 'item_rejected' | 'claim_submitted' | 'claim_approved' | 'claim_rejected' | 'failed_claim_attempt' | 'item_status_changed';
    };
  };
}
