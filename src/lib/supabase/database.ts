/**
 * Database Service
 * 
 * Handles all database operations for lost items, claims, and activity logs
 */

import { supabase } from './client';
import { LostItem, Claim, ActivityLog, SecurityQuestion } from '../../types';

// ============================================
// LOST ITEMS OPERATIONS
// ============================================

/**
 * Get all verified lost items (for public Lost & Found Board)
 * 
 * @param filters - Optional filters (item type, location, search query)
 * @returns Array of verified lost items
 */
export const getVerifiedItems = async (filters?: {
  itemType?: string;
  location?: string;
  searchQuery?: string;
}) => {
  try {
    let query = supabase
      .from('lost_items')
      .select('*')
      .eq('status', 'verified')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.itemType && filters.itemType !== 'All') {
      query = query.eq('item_type', filters.itemType);
    }

    if (filters?.location && filters.location !== 'All') {
      query = query.eq('location', filters.location);
    }

    if (filters?.searchQuery) {
      query = query.or(
        `item_type.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%,location.ilike.%${filters.searchQuery}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching verified items:', error);
      return { success: false, error: error.message, data: [] };
    }

    // Map database items to application LostItem type
    const items: LostItem[] = (data || []).map((item) => ({
      id: item.id,
      itemType: item.item_type,
      otherItemTypeDetails: item.other_item_type_details || undefined,
      location: item.location,
      otherLocationDetails: item.other_location_details || undefined,
      dateFound: item.date_found,
      timeFound: item.time_found,
      photoUrl: item.photo_url,
      description: item.description || undefined,
      securityQuestions: item.security_questions as SecurityQuestion[],
      reportedBy: item.reported_by,
      status: item.status as 'pending' | 'verified' | 'claimed',
      reportedAt: item.created_at,
    }));

    return { success: true, data: items };
  } catch (error: any) {
    console.error('Get verified items error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get claimed items (for admin reference)
 * 
 * @returns Array of claimed items
 */
export const getClaimedItems = async () => {
  try {
    const { data, error } = await supabase
      .from('lost_items')
      .select('*')
      .eq('status', 'claimed')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    const items: LostItem[] = (data || []).map((item) => ({
      id: item.id,
      itemType: item.item_type,
      otherItemTypeDetails: item.other_item_type_details || undefined,
      location: item.location,
      otherLocationDetails: item.other_location_details || undefined,
      dateFound: item.date_found,
      timeFound: item.time_found,
      photoUrl: item.photo_url,
      description: item.description || undefined,
      securityQuestions: item.security_questions as SecurityQuestion[],
      reportedBy: item.reported_by,
      status: item.status as 'pending' | 'verified' | 'claimed',
      reportedAt: item.created_at,
    }));

    return { success: true, data: items };
  } catch (error: any) {
    console.error('Get claimed items error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get pending items (for admin review)
 * 
 * @returns Array of pending items with reporter details
 */
export const getPendingItems = async () => {
  try {
    const { data, error } = await supabase
      .from('lost_items')
      .select(`
        *,
        users!lost_items_reported_by_fkey (
          full_name,
          student_id
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    const items: LostItem[] = (data || []).map((item) => ({
      id: item.id,
      itemType: item.item_type,
      otherItemTypeDetails: item.other_item_type_details || undefined,
      location: item.location,
      otherLocationDetails: item.other_location_details || undefined,
      dateFound: item.date_found,
      timeFound: item.time_found,
      photoUrl: item.photo_url,
      description: item.description || undefined,
      securityQuestions: item.security_questions as SecurityQuestion[],
      reportedBy: item.reported_by,
      reporterName: item.users?.full_name,
      reporterStudentId: item.users?.student_id,
      status: item.status as 'pending' | 'verified' | 'claimed',
      reportedAt: item.created_at,
    }));

    return { success: true, data: items };
  } catch (error: any) {
    console.error('Get pending items error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get items reported by a specific user
 * 
 * @param userId - User ID
 * @returns Array of items reported by user
 */
export const getUserReportedItems = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('lost_items')
      .select('*')
      .eq('reported_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    const items: LostItem[] = (data || []).map((item) => ({
      id: item.id,
      itemType: item.item_type,
      otherItemTypeDetails: item.other_item_type_details || undefined,
      location: item.location,
      otherLocationDetails: item.other_location_details || undefined,
      dateFound: item.date_found,
      timeFound: item.time_found,
      photoUrl: item.photo_url,
      description: item.description || undefined,
      securityQuestions: item.security_questions as SecurityQuestion[],
      reportedBy: item.reported_by,
      status: item.status as 'pending' | 'verified' | 'claimed',
      reportedAt: item.created_at,
    }));

    return { success: true, data: items };
  } catch (error: any) {
    console.error('Get user reported items error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Create a new lost item report
 * 
 * @param item - Lost item data
 * @param userId - ID of user reporting the item
 * @returns Created item or error
 */
export const createLostItem = async (
  item: Omit<LostItem, 'id' | 'status' | 'reportedAt'>,
  userId: string
) => {
  try {
    const { data, error } = await supabase
      .from('lost_items')
      .insert({
        item_type: item.itemType,
        other_item_type_details: item.otherItemTypeDetails || null,
        location: item.location,
        other_location_details: item.otherLocationDetails || null,
        date_found: item.dateFound,
        time_found: item.timeFound,
        photo_url: item.photoUrl,
        description: item.description || null,
        security_questions: item.securityQuestions as any,
        reported_by: userId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lost item:', error);
      return { success: false, error: error.message };
    }

    const createdItem: LostItem = {
      id: data.id,
      itemType: data.item_type,
      otherItemTypeDetails: data.other_item_type_details || undefined,
      location: data.location,
      otherLocationDetails: data.other_location_details || undefined,
      dateFound: data.date_found,
      timeFound: data.time_found,
      photoUrl: data.photo_url,
      description: data.description || undefined,
      securityQuestions: data.security_questions as SecurityQuestion[],
      reportedBy: data.reported_by,
      status: data.status as 'pending' | 'verified' | 'claimed',
      reportedAt: data.created_at,
    };

    return { success: true, data: createdItem };
  } catch (error: any) {
    console.error('Create lost item error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update item status (admin only)
 * 
 * @param itemId - Item ID
 * @param status - New status
 * @param adminId - Admin user ID
 * @param rejectionReason - Reason if rejecting
 * @returns Success/error response
 */
export const updateItemStatus = async (
  itemId: string,
  status: 'verified' | 'rejected',
  adminId: string,
  rejectionReason?: string
) => {
  try {
    const updateData: any = {
      status,
      verified_by: adminId,
      verified_at: new Date().toISOString(),
    };

    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { error } = await supabase
      .from('lost_items')
      .update(updateData)
      .eq('id', itemId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Update item status error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete item (admin only)
 * 
 * @param itemId - Item ID
 * @returns Success/error response
 */
export const deleteItem = async (itemId: string) => {
  try {
    const { error } = await supabase
      .from('lost_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete item error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// CLAIMS OPERATIONS
// ============================================

/**
 * Get all pending claims (for admin)
 * 
 * @returns Array of pending claims with claimant information
 */
export const getPendingClaims = async () => {
  try {
    const { data, error } = await supabase
      .from('claims')
      .select(`
        *,
        users:claimant_id (
          full_name,
          student_id
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    const claims: Claim[] = (data || []).map((claim) => ({
      id: claim.id,
      itemId: claim.item_id,
      claimantId: claim.claimant_id,
      claimantName: claim.users?.full_name || 'Unknown User',
      claimantStudentId: claim.users?.student_id || 'N/A',
      claimCode: claim.claim_code,
      answers: claim.answers,
      proofPhotoUrl: claim.proof_photo_url || undefined,
      status: claim.status as 'pending' | 'approved' | 'rejected',
      submittedAt: claim.created_at,
    }));

    return { success: true, data: claims };
  } catch (error: any) {
    console.error('Get pending claims error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get all claims (for admin lookup)
 * 
 * @returns Array of all claims with claimant information
 */
export const getAllClaims = async () => {
  try {
    const { data, error } = await supabase
      .from('claims')
      .select(`
        *,
        users:claimant_id (
          full_name,
          student_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    const claims: Claim[] = (data || []).map((claim) => ({
      id: claim.id,
      itemId: claim.item_id,
      claimantId: claim.claimant_id,
      claimantName: claim.users?.full_name || 'Unknown User',
      claimantStudentId: claim.users?.student_id || 'N/A',
      claimCode: claim.claim_code,
      answers: claim.answers,
      proofPhotoUrl: claim.proof_photo_url || undefined,
      status: claim.status as 'pending' | 'approved' | 'rejected',
      submittedAt: claim.created_at,
    }));

    return { success: true, data: claims };
  } catch (error: any) {
    console.error('Get all claims error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get claims by user
 * 
 * @param userId - User ID
 * @returns Array of user's claims
 */
export const getUserClaims = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('claimant_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    const claims: Claim[] = (data || []).map((claim) => ({
      id: claim.id,
      itemId: claim.item_id,
      claimantId: claim.claimant_id,
      claimCode: claim.claim_code,
      answers: claim.answers,
      proofPhotoUrl: claim.proof_photo_url || undefined,
      status: claim.status as 'pending' | 'approved' | 'rejected',
      submittedAt: claim.created_at,
    }));

    return { success: true, data: claims };
  } catch (error: any) {
    console.error('Get user claims error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get all claims by user WITH their associated items
 * 
 * @param userId - User ID
 * @returns Array of user's claims with item details
 */
export const getUserClaimsWithItems = async (userId: string) => {
  try {
    console.log('🔍 Fetching claims for user:', userId);
    
    // Step 1: Get all user's claims first
    const { data: claimsData, error: claimsError } = await supabase
      .from('claims')
      .select('*')
      .eq('claimant_id', userId)
      .order('created_at', { ascending: false });

    if (claimsError) {
      console.error('❌ Get user claims error:', claimsError);
      return { success: false, error: claimsError.message, data: [] };
    }

    console.log('📦 Raw claims data:', claimsData);
    console.log('📊 Total claims found:', claimsData?.length || 0);

    if (!claimsData || claimsData.length === 0) {
      console.log('ℹ️ No claims found for user');
      return { success: true, data: [] };
    }

    // Step 2: Get all item IDs from claims
    const itemIds = claimsData.map(claim => claim.item_id);
    
    console.log('🔎 Fetching items for claims:', itemIds);

    // Step 3: Fetch all items (bypassing RLS by getting items user claimed)
    // We need to use a different approach - fetch items one by one if join fails
    const { data: itemsData, error: itemsError } = await supabase
      .from('lost_items')
      .select('*')
      .in('id', itemIds);

    if (itemsError) {
      console.error('❌ Get items error:', itemsError);
      // Don't fail completely - we'll handle missing items below
    }

    console.log('📦 Items fetched:', itemsData?.length || 0, 'out of', itemIds.length);

    // Step 4: Map claims to items
    const claimsWithItems = claimsData
      .map((claimRecord: any) => {
        const claim: Claim = {
          id: claimRecord.id,
          itemId: claimRecord.item_id,
          claimantId: claimRecord.claimant_id,
          claimCode: claimRecord.claim_code,
          answers: claimRecord.answers,
          proofPhotoUrl: claimRecord.proof_photo_url || undefined,
          status: claimRecord.status as 'pending' | 'approved' | 'rejected',
          submittedAt: claimRecord.created_at,
        };

        // Find the matching item
        const itemRecord = itemsData?.find(item => item.id === claimRecord.item_id);

        if (!itemRecord) {
          console.warn('⚠️ Claim', claim.claimCode, 'found without associated item:', claimRecord.item_id);
          return null;
        }

        const item: LostItem = {
          id: itemRecord.id,
          itemType: itemRecord.item_type,
          otherItemTypeDetails: itemRecord.other_item_type_details || undefined,
          location: itemRecord.location,
          dateFound: itemRecord.date_found,
          timeFound: itemRecord.time_found,
          photoUrl: itemRecord.photo_url,
          description: itemRecord.description || undefined,
          securityQuestions: itemRecord.security_questions as SecurityQuestion[],
          reportedBy: itemRecord.reported_by,
          status: itemRecord.status as 'pending' | 'verified' | 'claimed',
          reportedAt: itemRecord.created_at,
        };

        console.log('✅ Mapped claim:', claim.claimCode, 'for item:', item.itemType, 'claim status:', claim.status, 'item status:', item.status);

        return { claim, item };
      })
      .filter(Boolean) as Array<{ claim: Claim; item: LostItem }>;

    console.log('✅ Returning', claimsWithItems.length, 'claims with items');
    return { success: true, data: claimsWithItems };
  } catch (error: any) {
    console.error('❌ Get user claims with items error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get claim by claim code (for guard lookup)
 * 
 * @param claimCode - Claim code
 * @returns Claim data or null
 */
export const getClaimByCode = async (claimCode: string) => {
  try {
    const { data, error } = await supabase
      .from('claims')
      .select('*, lost_items(*), users(*)')
      .eq('claim_code', claimCode)
      .single();

    if (error) {
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Get claim by code error:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Create a new claim
 * 
 * @param claim - Claim data
 * @returns Created claim or error
 */
export const createClaim = async (
  claim: Omit<Claim, 'id' | 'status' | 'submittedAt'>
) => {
  try {
    // DUPLICATE CLAIM CHECK: Prevent users from submitting multiple pending claims for the same item
    const { data: existingClaim, error: checkError } = await supabase
      .from('claims')
      .select('*')
      .eq('item_id', claim.itemId)
      .eq('claimant_id', claim.claimantId)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing claim:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existingClaim) {
      return { 
        success: false, 
        error: 'You already have a pending claim for this item. Please wait for admin review before submitting again.' 
      };
    }

    const { data, error } = await supabase
      .from('claims')
      .insert({
        item_id: claim.itemId,
        claimant_id: claim.claimantId,
        claim_code: claim.claimCode,
        answers: claim.answers,
        proof_photo_url: claim.proofPhotoUrl || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating claim:', error);
      return { success: false, error: error.message };
    }

    const createdClaim: Claim = {
      id: data.id,
      itemId: data.item_id,
      claimantId: data.claimant_id,
      claimCode: data.claim_code,
      answers: data.answers,
      proofPhotoUrl: data.proof_photo_url || undefined,
      status: data.status as 'pending' | 'approved' | 'rejected',
      submittedAt: data.created_at,
    };

    return { success: true, data: createdClaim };
  } catch (error: any) {
    console.error('Create claim error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update claim status (admin only)
 * 
 * @param claimId - Claim ID
 * @param status - New status
 * @param adminId - Admin user ID
 * @param adminNotes - Optional admin notes
 * @returns Success/error response
 */
export const updateClaimStatus = async (
  claimId: string,
  status: 'approved' | 'rejected',
  adminId: string,
  adminNotes?: string
) => {
  try {
    const { error } = await supabase
      .from('claims')
      .update({
        status,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      })
      .eq('id', claimId);

    if (error) {
      return { success: false, error: error.message };
    }

    // If approved, update item status to claimed
    if (status === 'approved') {
      const { data: claim } = await supabase
        .from('claims')
        .select('item_id')
        .eq('id', claimId)
        .single();

      if (claim) {
        await supabase
          .from('lost_items')
          .update({ status: 'claimed' })
          .eq('id', claim.item_id);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Update claim status error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// ACTIVITY LOGS OPERATIONS
// ============================================

/**
 * Get all activity logs (admin only) - excludes logs cleared by admin
 * 
 * @returns Array of activity logs
 */
export const getAllActivityLogs = async () => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('cleared_by_admin', false) // ✅ EXCLUDE ADMIN-CLEARED LOGS
      .order('timestamp', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    const logs: ActivityLog[] = (data || []).map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      userId: log.user_id,
      userName: log.user_name,
      action: log.action as ActivityLog['action'],
      itemId: log.item_id || undefined,
      itemType: log.item_type || undefined,
      details: log.details,
      viewed: log.viewed,
      notifyUserId: log.notify_user_id || undefined,
    }));

    return { success: true, data: logs };
  } catch (error: any) {
    console.error('Get activity logs error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get activity logs for a specific user (excludes cleared logs)
 * 
 * @param userId - User ID
 * @returns Array of user's activity logs
 */
export const getUserActivityLogs = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .or(`user_id.eq.${userId},notify_user_id.eq.${userId}`)
      .is('cleared_by_user_id', null) // ✅ EXCLUDE CLEARED LOGS
      .order('timestamp', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    const logs: ActivityLog[] = (data || []).map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      userId: log.user_id,
      userName: log.user_name,
      action: log.action as ActivityLog['action'],
      itemId: log.item_id || undefined,
      itemType: log.item_type || undefined,
      details: log.details,
      viewed: log.viewed,
      notifyUserId: log.notify_user_id || undefined,
    }));

    return { success: true, data: logs };
  } catch (error: any) {
    console.error('Get user activity logs error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Create activity log
 * 
 * @param log - Activity log data
 * @returns Created log or error
 */
export const createActivityLog = async (
  log: Omit<ActivityLog, 'id' | 'timestamp' | 'viewed'>
) => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: log.userId,
        user_name: log.userName,
        action: log.action,
        item_id: log.itemId || null,
        item_type: log.itemType || null,
        details: log.details,
        notify_user_id: log.notifyUserId || null,
        viewed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity log:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Create activity log error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark notifications as viewed
 * 
 * @param userId - User ID (public.users.id)
 * @returns Success/error response
 */
export const markNotificationsAsViewed = async (userId: string) => {
  try {
    // Mark activity_logs as viewed where user_name = 'System' (system notifications)
    const { error } = await supabase
      .from('activity_logs')
      .update({ viewed: true })
      .eq('notify_user_id', userId)
      .eq('user_name', 'System')
      .eq('viewed', false);

    if (error) {
      console.error('Error marking activity logs as viewed:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Mark notifications as viewed error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear all activity logs (admin only) - marks as cleared instead of deleting
 * This preserves institutional records while hiding them from admin dashboard
 * 
 * @returns Success/error response with count of cleared logs
 */
export const clearAllActivityLogs = async () => {
  try {
    console.log('Marking all activity logs as cleared by admin...');
    
    // Mark all non-cleared logs as cleared by admin
    const { data, error } = await supabase
      .from('activity_logs')
      .update({ cleared_by_admin: true })
      .eq('cleared_by_admin', false) // Only update logs not already cleared
      .select();

    if (error) {
      console.error('Clear activity logs error:', error);
      return { success: false, error: error.message };
    }

    const count = data?.length || 0;
    console.log(`Successfully marked ${count} activity logs as cleared by admin`);
    return { success: true, count };
  } catch (error: any) {
    console.error('Clear activity logs error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark user's activity logs as cleared (doesn't actually delete - hides from user view only)
 * Admin can still see all logs in their dashboard
 * 
 * @param userId - User ID
 * @returns Success/error response
 */
export const deleteUserActivityLogs = async (userId: string) => {
  try {
    console.log('Marking activity logs as cleared for user:', userId);
    
    // Mark logs as cleared instead of deleting them
    const { data, error, count } = await supabase
      .from('activity_logs')
      .update({ cleared_by_user_id: userId })
      .or(`user_id.eq.${userId},notify_user_id.eq.${userId}`)
      .is('cleared_by_user_id', null) // Only update logs that haven't been cleared yet
      .select();

    console.log('Mark cleared result:', { data, error, count });

    if (error) {
      console.error('Mark cleared error:', error);
      return { success: false, error: error.message };
    }

    console.log('Successfully marked activity logs as cleared');
    return { success: true };
  } catch (error: any) {
    console.error('Mark activity logs cleared error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate unique claim code
 * 
 * @returns Unique claim code
 */
export const generateClaimCode = async (): Promise<string> => {
  try {
    // Call the database function to generate a unique claim code
    const { data, error } = await supabase.rpc('generate_claim_code');

    if (error || !data) {
      // Fallback: generate locally
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      return `CLM-${year}-${random}`;
    }

    return data;
  } catch (error) {
    // Fallback on error
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `CLM-${year}-${random}`;
  }
};

// ============================================
// USER MANAGEMENT OPERATIONS (ADMIN ONLY)
// ============================================

/**
 * Get all users (admin only)
 * 
 * @returns Array of all users
 */
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Get all users error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get admin users only
 * 
 * @returns Array of admin users
 */
export const getAdminUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Get admin users error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Generate next admin ID (auto-incrementing)
 * 
 * @returns Next available admin ID (e.g., "ADMIN-001", "ADMIN-002")
 */
export const generateAdminId = async () => {
  try {
    const { data, error } = await supabase.rpc('generate_admin_id');
    
    if (error) {
      console.error('Error generating admin ID:', error);
      // Fallback: generate timestamp-based ID
      return `ADMIN-${Date.now().toString().slice(-6)}`;
    }
    
    return data || `ADMIN-${Date.now().toString().slice(-6)}`;
  } catch (error: any) {
    console.error('Generate admin ID error:', error);
    // Fallback
    return `ADMIN-${Date.now().toString().slice(-6)}`;
  }
};

/**
 * Create admin user (admin only)
 * 
 * @param adminData - Admin user data (studentId will be auto-generated if not provided)
 * @param password - Admin password
 * @param createdBy - ID of admin creating this account
 * @returns Created admin or error
 */
export const createAdminUser = async (
  adminData: {
    email: string;
    fullName: string;
    studentId?: string; // Optional - will be auto-generated if not provided
    contactNumber: string;
  },
  createdBy: string | null
) => {
  try {
    // Auto-generate Admin ID if not provided
    const adminId = adminData.studentId || await generateAdminId();
    
    // Generate a temporary random password
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    
    console.log('📧 Creating auth account for admin:', adminData.email);
    console.log('🆔 Admin ID:', adminId);
    
    // Step 1: Create auth account via signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminData.email,
      password: tempPassword,
      options: {
        emailRedirectTo: `${window.location.origin}?type=recovery`,
        data: {
          full_name: adminData.fullName,
          student_id: adminId,
          contact_number: adminData.contactNumber,
        },
      },
    });

    if (authError) {
      console.error('❌ Auth signup error:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create auth account' };
    }

    console.log('✅ Auth account created:', authData.user.id);

    // Step 2: Wait for database trigger to create user profile
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 3: Promote user to admin role
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: 'admin',
        is_verified: true,
        status: 'active',
      })
      .eq('auth_id', authData.user.id);

    if (updateError) {
      console.error('❌ Error promoting to admin:', updateError);
      return { success: false, error: 'Account created but failed to set admin role: ' + updateError.message };
    }

    console.log('✅ User promoted to admin');

    // Step 4: Send password reset email so they can set their own password
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      adminData.email,
      {
        redirectTo: `${window.location.origin}?type=recovery`,
      }
    );

    if (resetError) {
      console.warn('⚠️ Failed to send password reset email:', resetError);
      // Don't fail the creation - admin is created, just warn
    } else {
      console.log('✅ Password reset email sent');
    }

    // Step 5: Get the created user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Failed to fetch created profile:', profileError);
      return { success: false, error: 'Admin created but failed to fetch profile' };
    }

    return { 
      success: true, 
      data: profile,
      message: 'Admin account created successfully! Password reset email sent.'
    };
  } catch (error: any) {
    console.error('Create admin user error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update admin user profile (admin only)
 * 
 * @param userId - User ID
 * @param updates - Fields to update
 * @returns Success/error response
 */
export const updateAdminProfile = async (
  userId: string,
  updates: {
    fullName?: string;
    studentId?: string;
    contactNumber?: string;
    email?: string;
  }
) => {
  try {
    const updateData: any = {};
    
    if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
    if (updates.studentId !== undefined) updateData.student_id = updates.studentId;
    if (updates.contactNumber !== undefined) updateData.contact_number = updates.contactNumber;
    if (updates.email !== undefined) updateData.email = updates.email;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Error updating admin profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Update admin profile error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user status (admin only)
 * 
 * @param userId - User ID
 * @param status - New status
 * @returns Success/error response
 */
export const updateUserStatus = async (
  userId: string,
  status: 'active' | 'inactive'
) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Update user status error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete user (admin only)
 * WARNING: This also deletes all user's items, claims, and activity logs
 * Uses RPC function to delete from both public.users and auth.users
 * 
 * @param userId - User ID
 * @returns Success/error response
 */
export const deleteUser = async (userId: string) => {
  try {
    console.log('🗑️ Deleting user:', userId);
    
    // Call the RPC function to delete user completely
    const { data, error } = await supabase
      .rpc('delete_user_completely', { user_id_to_delete: userId });

    if (error) {
      console.error('❌ Error calling delete function:', error);
      return { success: false, error: error.message };
    }

    // Check if the RPC function returned success
    if (data && typeof data === 'object' && 'success' in data) {
      if (data.success) {
        console.log('✅ User completely deleted (profile + auth)');
        return { success: true };
      } else {
        console.error('❌ Delete failed:', data.error);
        return { success: false, error: data.error || 'Unknown error' };
      }
    }

    console.log('✅ User deleted successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Delete user error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user by ID
 * 
 * @param userId - User ID
 * @returns User data or error
 */
export const getUserById = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Get user by ID error:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Check if student ID already exists
 * 
 * @param studentId - Student ID to check
 * @returns True if exists, false otherwise
 */
export const checkStudentIdExists = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('student_id', studentId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Check student ID error:', error);
      return { success: false, error: error.message, exists: false };
    }

    return { success: true, exists: !!data };
  } catch (error: any) {
    console.error('Check student ID exists error:', error);
    return { success: false, error: error.message, exists: false };
  }
};

/**
 * Get user email by student ID (for login)
 * 
 * @param studentId - Student ID
 * @returns User email or null
 */
export const getEmailByStudentId = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('student_id', studentId)
      .single();

    if (error) {
      return { success: false, error: error.message, email: null };
    }

    return { success: true, email: data?.email || null };
  } catch (error: any) {
    console.error('Get email by student ID error:', error);
    return { success: false, error: error.message, email: null };
  }
};

// ============================================
// ADMIN ACTIVITY LOGS
// ============================================

/**
 * Log admin activity (admin management, claim approvals, etc.)
 * Separate from user activity logs - only visible to admins
 * 
 * @param actionData - Activity details
 * @returns Success/error response
 */
export const logAdminActivity = async (actionData: {
  adminId: string;
  adminName: string;
  actionType: string;
  targetUserId?: string;
  targetUserName?: string;
  targetItemId?: string;
  targetClaimId?: string;
  details?: any;
}) => {
  try {
    const { error } = await supabase
      .from('admin_activity_logs')
      .insert({
        admin_id: actionData.adminId,
        admin_name: actionData.adminName,
        action_type: actionData.actionType,
        target_user_id: actionData.targetUserId || null,
        target_user_name: actionData.targetUserName || null,
        target_item_id: actionData.targetItemId || null,
        target_claim_id: actionData.targetClaimId || null,
        details: actionData.details || null,
      });

    if (error) {
      console.error('Error logging admin activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Log admin activity error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get admin activity logs (admin only)
 * 
 * @param filters - Optional filters
 * @returns Array of admin activity logs
 */
export const getAdminActivityLogs = async (filters?: {
  actionType?: string;
  adminId?: string;
  limit?: number;
}) => {
  try {
    let query = supabase
      .from('admin_activity_logs')
      .select('*')
      .eq('cleared_by_admin', false) // ✅ EXCLUDE ADMIN-CLEARED LOGS
      .order('created_at', { ascending: false });

    if (filters?.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters?.adminId) {
      query = query.eq('admin_id', filters.adminId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching admin activity logs:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Get admin activity logs error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Clear all admin activity logs (mark as cleared, don't delete)
 * 
 * @returns Success/error response with count
 */
export const clearAdminActivityLogs = async () => {
  try {
    console.log('Marking all admin activity logs as cleared...');
    
    // Mark all non-cleared logs as cleared
    const { data, error } = await supabase
      .from('admin_activity_logs')
      .update({ cleared_by_admin: true })
      .eq('cleared_by_admin', false) // Only update logs not already cleared
      .select();

    if (error) {
      console.error('Error clearing admin activity logs:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Cleared', data?.length || 0, 'admin activity logs');
    return { success: true, count: data?.length || 0 };
  } catch (error: any) {
    console.error('Clear admin activity logs error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete all PENDING items reported by user
 * (Verified/claimed items are institutional records and cannot be deleted by users)
 * 
 * @param userId - User ID
 * @returns Success/error response with count
 */
export const deleteUserReportedItems = async (userId: string) => {
  try {
    console.log('Deleting PENDING reported items for user:', userId);
    // Only delete items with status 'pending' - verified/claimed are institutional records
    const { data, error, count } = await supabase
      .from('lost_items')
      .delete()
      .eq('reported_by', userId)
      .eq('status', 'pending') // ✅ ONLY DELETE PENDING ITEMS
      .select();

    console.log('Delete pending items result:', { data, error, count });

    if (error) {
      console.error('Delete pending items error:', error);
      return { success: false, error: error.message };
    }

    console.log(`Successfully deleted ${data?.length || 0} pending items`);
    return { success: true, count: data?.length || 0 };
  } catch (error: any) {
    console.error('Delete user reported items error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete all PENDING/REJECTED claims by user
 * (Approved claims are institutional records and cannot be deleted by users)
 * 
 * @param userId - User ID
 * @returns Success/error response with count
 */
export const deleteUserClaims = async (userId: string) => {
  try {
    console.log('Deleting PENDING/REJECTED claims for user:', userId);
    // Only delete claims with status 'pending' or 'rejected' - approved are institutional records
    const { data, error, count } = await supabase
      .from('claims')
      .delete()
      .eq('claimant_id', userId)
      .in('status', ['pending', 'rejected']) // ✅ ONLY DELETE PENDING/REJECTED CLAIMS
      .select();

    console.log('Delete pending/rejected claims result:', { data, error, count });

    if (error) {
      console.error('Delete claims error:', error);
      return { success: false, error: error.message };
    }

    console.log(`Successfully deleted ${data?.length || 0} pending/rejected claims`);
    return { success: true, count: data?.length || 0 };
  } catch (error: any) {
    console.error('Delete user claims error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// NOTIFICATIONS OPERATIONS
// ============================================

/**
 * Create a notification for a user
 * 
 * @param notification - Notification data
 * @returns Success/error response
 */
export const createNotification = async (notification: {
  userId: string;
  message: string;
  type: string;
  relatedItemId?: string;
  relatedClaimId?: string;
}) => {
  try {
    // Get the user's auth_id AND full_name from their user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('auth_id, full_name')
      .eq('id', notification.userId)
      .single();

    if (userError || !userData?.auth_id) {
      console.error('Error getting user auth_id:', userError);
      return { success: false, error: 'User not found' };
    }

    // 1. Create notification in notifications table
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userData.auth_id,
        message: notification.message,
        type: notification.type,
        related_item_id: notification.relatedItemId || null,
        related_claim_id: notification.relatedClaimId || null,
      });

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }

    // 2. ALSO create activity log for notification bell to work
    // Use the public.users.id (not auth_id) for foreign key constraint
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: notification.userId, // Use public.users.id (FK constraint requirement)
        user_name: 'System',
        action: notification.type,
        item_id: notification.relatedItemId || null,
        item_type: null,
        details: notification.message,
        notify_user_id: notification.userId, // This triggers the notification bell!
        viewed: false,
      });

    if (logError) {
      console.error('Error creating activity log:', logError);
      // Don't fail the whole operation if just the activity log fails
    }

    console.log('✅ Notification created for user:', userData.full_name);
    return { success: true };
  } catch (error: any) {
    console.error('Create notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get notifications for a user
 * 
 * @param userId - User ID (public.users.id)
 * @returns Array of notifications
 */
export const getUserNotifications = async (userId: string) => {
  try {
    // Get the user's auth_id from their user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('auth_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.auth_id) {
      console.error('Error getting user auth_id:', userError);
      return { success: false, error: 'User not found', data: [] };
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userData.auth_id)
      .eq('cleared', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Get user notifications error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Clear notifications for a user
 * 
 * @param userId - User ID (public.users.id)
 * @returns Success/error response
 */
export const clearUserNotifications = async (userId: string) => {
  try {
    // Get the user's auth_id from their user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('auth_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.auth_id) {
      console.error('Error getting user auth_id:', userError);
      return { success: false, error: 'User not found' };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ cleared: true })
      .eq('user_id', userData.auth_id)
      .eq('cleared', false);

    if (error) {
      console.error('Error clearing notifications:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Clear user notifications error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get the count of unviewed notifications for a user
 * 
 * @param userId - User ID (public.users.id)
 * @returns Count of unviewed notifications
 */
export const getUnviewedNotificationCount = async (userId: string): Promise<number> => {
  try {
    // Count unviewed "System" notifications from activity_logs
    // System notifications are activity logs where user_name = 'System' and notify_user_id = current user
    const { count, error } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('notify_user_id', userId)
      .eq('user_name', 'System')
      .eq('viewed', false);

    if (error) {
      console.error('Error counting unviewed notifications:', error);
      return 0;
    }

    return count || 0;
  } catch (error: any) {
    console.error('Get unviewed notification count error:', error);
    return 0;
  }
};