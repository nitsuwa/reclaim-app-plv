/**
 * Authentication Service
 * 
 * Handles all authentication-related operations using Supabase Auth
 * Includes sign up (PLV-only), login, logout, password reset, and email verification
 */

import { supabase } from './client';
import { User } from '../../types';
import { getEmailByStudentId } from './database';

// Type definition for auth results
interface AuthResult {
  success: boolean;
  error?: string;
  message?: string;
  user?: any;
  data?: any;
}

/**
 * Email validation: Ensures email ends with @plv.edu.ph
 */
export const validatePLVEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@plv.edu.ph');
};

/**
 * Check if email exists in the users table
 * @param email - Email to check
 * @returns true if email exists, false otherwise
 */
const checkEmailExists = async (email: string): Promise<{ exists: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Check email exists error:', error);
      // If it's just "no rows", that's fine - email doesn't exist
      if (error.code === 'PGRST116') {
        return { exists: false };
      }
      return { exists: false, error: error.message };
    }

    return { exists: !!data };
  } catch (error: any) {
    console.error('Check email exists exception:', error);
    return { exists: false, error: error.message };
  }
};

/**
 * Check if student ID already exists
 * Uses anon key so it works without authentication
 */
const checkStudentIdExists = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('student_id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) {
      console.error('Check student ID error:', error);
      // If it's just "no rows", that's fine - student ID doesn't exist
      if (error.code === 'PGRST116') {
        return { success: true, exists: false };
      }
      return { success: false, error: error.message, exists: false };
    }

    return { success: true, exists: !!data };
  } catch (error: any) {
    console.error('Check student ID exists error:', error);
    return { success: false, error: error.message, exists: false };
  }
};

/**
 * Sign up a new user (PLV students only)
 * With email confirmation enabled, profile is created via database trigger
 * 
 * @param email - Must end with @plv.edu.ph
 * @param password - User password
 * @param fullName - Student's full name
 * @param studentId - PLV student ID
 * @param contactNumber - Contact number
 * @returns Success/error response
 */
export const signUp = async (
  email: string,
  password: string,
  fullName: string,
  studentId: string,
  contactNumber: string
): Promise<AuthResult> => {
  try {
    // Validate PLV email
    if (!validatePLVEmail(email)) {
      return {
        success: false,
        error: 'Only PLV student accounts (@plv.edu.ph) are allowed to register.',
      };
    }

    // ✅ CHECK FOR DUPLICATE STUDENT ID BEFORE CREATING AUTH ACCOUNT
    const duplicateCheck = await checkStudentIdExists(studentId);
    if (duplicateCheck.exists) {
      return {
        success: false,
        error: 'This Student ID is already registered. Please use a different ID or login.',
      };
    }

    console.log('📧 Creating auth account with email verification...');

    // Sign up user with Supabase Auth
    // Profile will be created automatically via database trigger
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}?type=email`,
        data: {
          full_name: fullName,
          student_id: studentId,
          contact_number: contactNumber,
        },
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user account' };
    }

    console.log('✅ Auth account created:', authData.user.id);
    console.log('📧 Verification email sent to:', email);
    console.log('⏳ Profile will be created by database trigger');

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the profile was created
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.warn('⚠️ Profile creation pending or failed:', profileError);
      // Don't fail the signup - they can still verify email
    } else {
      console.log('✅ Profile created successfully:', profile.id);
    }

    return {
      success: true,
      message: 'Verification email sent! Please check your inbox.',
      user: authData.user,
    };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
};

/**
 * Sign in existing user
 * Supports login with email OR student ID
 * 
 * @param emailOrStudentId - User email or student ID
 * @param password - User password
 * @returns Success/error response with user data
 */
export const signIn = async (emailOrStudentId: string, password: string): Promise<AuthResult> => {
  try {
    let loginEmail = emailOrStudentId;

    // ✅ CHECK IF INPUT IS STUDENT ID (format: XX-XXXX)
    if (/^\d{2}-\d{4}$/.test(emailOrStudentId)) {
      const result = await getEmailByStudentId(emailOrStudentId);
      
      if (!result.success || !result.email) {
        return { 
          success: false, 
          error: 'Student ID not found. Please check and try again.' 
        };
      }
      
      loginEmail = result.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Login failed' };
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return { success: false, error: 'Failed to load user profile' };
    }

    // Check if email is verified
    if (!data.user.email_confirmed_at) {
      return {
        success: false,
        error: 'Please verify your email address before logging in.',
      };
    }

    // Check if account is active
    if (profile.status === 'inactive') {
      // Sign out the user immediately
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Your account has been deactivated. Please contact an administrator.',
      };
    }

    // Map database profile to application User type
    const user: User = {
      id: profile.id,
      fullName: profile.full_name,
      studentId: profile.student_id,
      contactNumber: profile.contact_number,
      email: profile.email,
      role: profile.role === 'admin' ? 'admin' : 'finder',
    };

    return { success: true, user };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
};

/**
 * Send password reset email
 * Only sends email if the account exists in the database
 * 
 * @param email - User email
 * @returns Success/error response
 */
export const sendPasswordResetEmail = async (email: string): Promise<AuthResult> => {
  try {
    // ✅ FIRST CHECK IF EMAIL EXISTS IN DATABASE
    console.log('🔍 Checking if email exists in database:', email);
    const emailCheck = await checkEmailExists(email);
    
    if (emailCheck.error) {
      console.error('❌ Error checking email:', emailCheck.error);
      return { 
        success: false, 
        error: 'Unable to verify email. Please try again.' 
      };
    }

    if (!emailCheck.exists) {
      console.log('❌ Email not found in database:', email);
      return { 
        success: false, 
        error: 'No account found with this email address. Please check your email or register.' 
      };
    }

    console.log('✅ Email found, sending reset link...');

    // Email exists, proceed with password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?type=recovery`,
    });

    if (error) {
      console.error('❌ Password reset error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Password reset email sent successfully');
    return {
      success: true,
      message: 'Password reset link sent to your email',
    };
  } catch (error: any) {
    console.error('Password reset exception:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
};

/**
 * Update user password
 * 
 * @param newPassword - New password
 * @returns Success/error response
 */
export const updatePassword = async (newPassword: string): Promise<AuthResult> => {
  try {
    console.log('🔐 Attempting to update password...');
    
    // First verify we have a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session check error:', sessionError);
      return {
        success: false,
        error: 'No active session. Please click the reset link again.',
      };
    }

    if (!session) {
      console.error('No session found');
      return {
        success: false,
        error: 'Your reset link has expired. Please request a new one.',
      };
    }

    console.log('✅ Session found, updating password for:', session.user.email);

    // Update the password
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Password update error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ Password updated successfully');

    // Sign out after password reset for security
    await supabase.auth.signOut();

    return {
      success: true,
      data: data.user,
    };
  } catch (error) {
    console.error('Update password exception:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
};

/**
 * Get current session
 * 
 * @returns Current user session or null
 */
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session fetch error:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
};

/**
 * Get current user profile
 * 
 * @returns User profile or null
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Use getSession instead of getUser - more reliable for initial load
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', session.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return null;
    }

    return {
      id: profile.id,
      fullName: profile.full_name,
      studentId: profile.student_id,
      contactNumber: profile.contact_number,
      email: profile.email,
      role: profile.role === 'admin' ? 'admin' : 'finder',
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Set up auth state change listener
 * Call this on app initialization to handle session changes
 * 
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('Auth state changed:', event);

      if (event === 'SIGNED_OUT') {
        callback(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          // Fetch profile directly instead of calling getCurrentUser
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', session.user.id)
            .single();

          if (profile) {
            const user: User = {
              id: profile.id,
              fullName: profile.full_name,
              studentId: profile.student_id,
              contactNumber: profile.contact_number,
              email: profile.email,
              role: profile.role === 'admin' ? 'admin' : 'finder',
            };
            callback(user);
          } else {
            callback(null);
          }
        } else {
          callback(null);
        }
      }
    }
  );

  return () => {
    subscription.unsubscribe();
  };
};

/**
 * Resend email verification
 * 
 * @param email - User email
 * @returns Success/error response
 */
export const resendVerificationEmail = async (email: string): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}?type=email`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'Verification email sent',
    };
  } catch (error: any) {
    console.error('Resend verification error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
};
