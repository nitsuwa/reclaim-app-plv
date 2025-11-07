/**
 * OTP (One-Time Password) Service
 * 
 * This file provides TWO approaches for OTP handling:
 * 1. Supabase Built-in OTP (recommended for simplicity)
 * 2. Custom OTP Table with Edge Function (for more control)
 * 
 * Choose one approach based on your needs.
 */

import { supabase } from './client';

// ============================================
// APPROACH 1: SUPABASE BUILT-IN OTP
// ============================================
// Supabase provides built-in email OTP functionality
// This is the simpler approach and recommended for most use cases

/**
 * Send OTP via Supabase built-in email OTP
 * Used for signup verification, password reset, etc.
 * 
 * @param email - User email
 * @param type - OTP type ('signup', 'recovery', 'email_change')
 * @returns Success/error response
 */
export const sendBuiltInOTP = async (
  email: string,
  type: 'signup' | 'recovery' | 'email_change' = 'signup'
) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: type === 'signup',
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: `OTP sent to ${email}`,
    };
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return { success: false, error: error.message || 'Failed to send OTP' };
  }
};

/**
 * Verify OTP using Supabase built-in verification
 * 
 * @param email - User email
 * @param token - OTP code from email
 * @param type - OTP type
 * @returns Success/error response with session
 */
export const verifyBuiltInOTP = async (
  email: string,
  token: string,
  type: 'signup' | 'recovery' | 'email_change' = 'signup'
) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: type === 'signup' ? 'email' : type === 'recovery' ? 'recovery' : 'email',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'OTP verified successfully',
      session: data.session,
      user: data.user,
    };
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return { success: false, error: error.message || 'Invalid or expired OTP' };
  }
};

// ============================================
// APPROACH 2: CUSTOM OTP TABLE
// ============================================
// For more control over OTP generation, storage, and email templates
// Requires Edge Function deployment and SMTP configuration

/**
 * Generate a random 6-digit OTP code
 */
const generateOTPCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP code for secure storage
 * Uses Web Crypto API for hashing
 * 
 * @param code - OTP code to hash
 * @returns Hashed code
 */
const hashOTPCode = async (code: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Send custom OTP via Edge Function
 * This approach gives you full control over email templates and OTP logic
 * 
 * IMPORTANT: You need to deploy an Edge Function for this to work.
 * See the edge-functions/send-otp/index.ts file for the Edge Function code.
 * 
 * @param email - User email
 * @param purpose - OTP purpose
 * @returns Success/error response
 */
export const sendCustomOTP = async (
  email: string,
  purpose: 'signup' | 'reset_password' | 'claim_verification'
) => {
  try {
    // Generate OTP code
    const code = generateOTPCode();
    
    // Hash the code for storage
    const codeHash = await hashOTPCode(code);
    
    // Set expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    // Store OTP in database
    const { error: dbError } = await supabase.from('otp_codes').insert({
      email,
      code_hash: codeHash,
      purpose,
      expires_at: expiresAt,
      used: false,
    });

    if (dbError) {
      console.error('Database error:', dbError);
      return { success: false, error: 'Failed to generate OTP' };
    }

    // Call Edge Function to send email
    // Note: This requires deploying the Edge Function first
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: {
        email,
        code,
        purpose,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      // Fallback: Return OTP in console for development (REMOVE IN PRODUCTION)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV ONLY] OTP for ${email}: ${code}`);
        return {
          success: true,
          message: `OTP sent to ${email} (check console in dev mode)`,
          devOTP: code, // Only in development
        };
      }
      return { success: false, error: 'Failed to send OTP email' };
    }

    return {
      success: true,
      message: `OTP sent to ${email}`,
    };
  } catch (error: any) {
    console.error('Send custom OTP error:', error);
    return { success: false, error: error.message || 'Failed to send OTP' };
  }
};

/**
 * Verify custom OTP
 * 
 * @param email - User email
 * @param code - OTP code entered by user
 * @param purpose - OTP purpose
 * @returns Success/error response
 */
export const verifyCustomOTP = async (
  email: string,
  code: string,
  purpose: 'signup' | 'reset_password' | 'claim_verification'
) => {
  try {
    // Hash the provided code
    const codeHash = await hashOTPCode(code);
    
    // Find matching OTP in database
    const { data: otpRecords, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('purpose', purpose)
      .eq('code_hash', codeHash)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      return { success: false, error: 'Verification failed' };
    }

    if (!otpRecords || otpRecords.length === 0) {
      return { success: false, error: 'Invalid or expired OTP' };
    }

    const otpRecord = otpRecords[0];

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return { success: false, error: 'Verification failed' };
    }

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  } catch (error: any) {
    console.error('Verify custom OTP error:', error);
    return { success: false, error: error.message || 'Verification failed' };
  }
};

/**
 * Cleanup expired OTPs (should be called periodically or via scheduled job)
 * 
 * @returns Success/error response
 */
export const cleanupExpiredOTPs = async () => {
  try {
    const { error } = await supabase.rpc('cleanup_expired_otps');

    if (error) {
      console.error('Cleanup error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Cleanup expired OTPs error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate OTP code format (6 digits)
 * 
 * @param code - OTP code to validate
 * @returns True if valid format
 */
export const isValidOTPFormat = (code: string): boolean => {
  return /^\d{6}$/.test(code);
};

/**
 * Resend OTP (checks rate limiting)
 * 
 * @param email - User email
 * @param purpose - OTP purpose
 * @param useBuiltIn - Whether to use built-in or custom OTP
 * @returns Success/error response
 */
export const resendOTP = async (
  email: string,
  purpose: 'signup' | 'reset_password' | 'claim_verification',
  useBuiltIn: boolean = true
) => {
  try {
    // Check if user recently requested OTP (rate limiting)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    
    if (!useBuiltIn) {
      const { data: recentOTPs, error } = await supabase
        .from('otp_codes')
        .select('created_at')
        .eq('email', email)
        .eq('purpose', purpose)
        .gte('created_at', oneMinuteAgo);

      if (error) {
        console.error('Rate limit check error:', error);
      }

      if (recentOTPs && recentOTPs.length > 0) {
        return {
          success: false,
          error: 'Please wait at least 1 minute before requesting another OTP',
        };
      }

      // Send custom OTP
      return await sendCustomOTP(email, purpose);
    } else {
      // Send built-in OTP
      const otpType = purpose === 'signup' ? 'signup' : 'recovery';
      return await sendBuiltInOTP(email, otpType);
    }
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    return { success: false, error: error.message || 'Failed to resend OTP' };
  }
};
