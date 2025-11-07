/**
 * Supabase Services - Main Export
 * 
 * Centralized exports for all Supabase services.
 * Import from here instead of individual files for cleaner imports.
 * 
 * Example:
 * import { signIn, createLostItem, uploadItemPhoto } from './lib/supabase';
 */

// Client
export { supabase, isSupabaseConfigured } from './client';

// Authentication
export {
  validatePLVEmail,
  signUp,
  signIn,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  getCurrentSession,
  getCurrentUser,
  onAuthStateChange,
  resendVerificationEmail,
} from './auth';

// Database - Lost Items
export {
  getVerifiedItems,
  getPendingItems,
  getUserReportedItems,
  createLostItem,
  updateItemStatus,
  deleteItem,
} from './database';

// Database - Claims
export {
  getPendingClaims,
  getUserClaims,
  getUserClaimsWithItems,
  getClaimByCode,
  createClaim,
  updateClaimStatus,
  generateClaimCode,
} from './database';

// Database - Activity Logs
export {
  getAllActivityLogs,
  getUserActivityLogs,
  createActivityLog,
  markNotificationsAsViewed,
  clearAllActivityLogs,
  deleteUserActivityLogs,
} from './database';

// Database - User Management (Admin Only)
export {
  getAllUsers,
  getAdminUsers,
  createAdminUser,
  updateAdminProfile,
  updateUserStatus,
  deleteUser,
  getUserById,
} from './database';

// Database - Admin Activity Logs
export {
  logAdminActivity,
  getAdminActivityLogs,
} from './database';

// Storage
export {
  uploadItemPhoto,
  uploadClaimProof,
  deleteImage,
  uploadWithProgress,
  fileToDataUrl,
  createSignedUrl,
  STORAGE_BUCKETS,
} from './storage';

// OTP - Built-in
export {
  sendBuiltInOTP,
  verifyBuiltInOTP,
} from './otp';

// OTP - Custom
export {
  sendCustomOTP,
  verifyCustomOTP,
  cleanupExpiredOTPs,
  isValidOTPFormat,
  resendOTP,
} from './otp';
