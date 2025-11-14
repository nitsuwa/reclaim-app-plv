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
 * WITH RATE LIMITING: 5 attempts max, 5-minute lockout
 * 
 * @param emailOrStudentId - User email or student ID
 * @param password - User password
 * @returns Success/error response with user data
 */
export const signIn = async (emailOrStudentId: string, password: string): Promise<AuthResult> => {
  try {
    // Handle both full email or just student ID
    let loginEmail = emailOrStudentId;
    let studentId = emailOrStudentId;
    
    // ✅ FIRST: Determine the actual email and student_id from database
    if (!emailOrStudentId.includes('@')) {
      // Input is a student ID - look up the email from database
      const { data: userData } = await supabase
        .from('users')
        .select('email, student_id')
        .eq('student_id', emailOrStudentId)
        .maybeSingle();

      if (!userData) {
        return { 
          success: false, 
          error: 'No account found with this student ID. Please check your student ID or register for a new account.' 
        };
      }

      // Use the actual email and student_id from database
      loginEmail = userData.email;
      studentId = userData.student_id;
    } else {
      // Input is an email - look up the student_id from database
      const { data: userData } = await supabase
        .from('users')
        .select('email, student_id')
        .eq('email', emailOrStudentId)
        .maybeSingle();

      if (!userData) {
        return { 
          success: false, 
          error: 'No account found with this email. Please check your email or register for a new account.' 
        };
      }

      // Use the actual student_id from database
      loginEmail = userData.email;
      studentId = userData.student_id;
    }

    // ✅ NOW CHECK IF ACCOUNT IS LOCKED (using actual student_id from database)
    const { data: lockCheck } = await supabase
      .from('login_attempts')
      .select('locked_until')
      .eq('student_id', studentId)
      .order('attempt_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lockCheck?.locked_until) {
      const lockTime = new Date(lockCheck.locked_until);
      const now = new Date();
      
      if (now < lockTime) {
        const remainingMinutes = Math.ceil((lockTime.getTime() - now.getTime()) / 60000);
        return {
          success: false,
          error: `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`,
        };
      }
    }

    // ✅ TRY TO LOGIN - This will tell us if account is unverified
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (authError) {
      // Check if user exists but email is not verified
      if (authError.message.includes('Email not confirmed')) {
        return {
          success: false,
          error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        };
      }

      // ✅ RECORD FAILED ATTEMPT (only for verified accounts)
      const { data: recentAttempts } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('student_id', studentId)
        .eq('successful', false)
        .gte('attempt_time', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      const failedCount = (recentAttempts?.length || 0) + 1;

      if (failedCount >= 5) {
        // Lock account for 5 minutes
        const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
        await supabase.from('login_attempts').insert({
          student_id: studentId,
          successful: false,
          locked_until: lockedUntil.toISOString(),
        });

        return {
          success: false,
          error: 'Too many failed attempts. Account locked for 5 minutes.',
        };
      } else {
        // Record failed attempt
        await supabase.from('login_attempts').insert({
          student_id: studentId,
          successful: false,
        });

        const remainingAttempts = 5 - failedCount;
        
        return {
          success: false,
          error: `Incorrect password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
        };
      }
    }

    if (!authData.user) {
      return { success: false, error: 'Login failed' };
    }

    // Check if email is verified
    if (!authData.user.email_confirmed_at) {
      return {
        success: false,
        error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
      };
    }

    // ✅ CLEAR ALL FAILED ATTEMPTS ON SUCCESSFUL LOGIN
    console.log('🧹 Clearing all login attempts for student_id:', studentId);
    
    // Use the SQL function to bypass RLS
    const { error: clearError } = await supabase.rpc('clear_login_attempts_for_student', {
      p_student_id: studentId
    });

    if (clearError) {
      console.error('❌ Failed to clear login attempts:', clearError);
    } else {
      console.log('✅ All login attempts cleared successfully');
    }

    // ✅ RECORD SUCCESSFUL ATTEMPT (for audit trail)
    const { error: insertError } = await supabase.from('login_attempts').insert({
      student_id: studentId,
      successful: true,
      locked_until: null,
    });

    if (insertError) {
      console.error('❌ Failed to record successful login:', insertError);
    } else {
      console.log('✅ Successful login recorded');
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return { success: false, error: 'Failed to load user profile' };
    }

    // ✅ AUTO-UPDATE is_verified if email is confirmed but database shows false
    if (authData.user.email_confirmed_at && profile.is_verified === false) {
      console.log('✅ Auto-updating is_verified to true');
      await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', profile.id);
      
      profile.is_verified = true;
    }
    
    // ✅ CLEAR ALL AUTH FLOW FLAGS
    console.log('🧹 Clearing auth flow flags');
    localStorage.removeItem('plv_password_reset_in_progress');
    localStorage.removeItem('plv_email_verification_in_progress');
    localStorage.removeItem('plv_password_reset_complete');

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
    const { error } = await supabase.auth.signOut({ scope: 'local' });
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

    // ✅ CLEAR ALL LOCKOUTS for this user
    const studentId = session.user.email?.split('@')[0];
    if (studentId) {
      console.log('🔓 Clearing lockouts for student ID:', studentId);
      
      // Delete all login attempts and lockouts for this student
      await supabase
        .from('login_attempts')
        .delete()
        .eq('student_id', studentId);
      
      console.log('✅ Lockouts cleared');
    }

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