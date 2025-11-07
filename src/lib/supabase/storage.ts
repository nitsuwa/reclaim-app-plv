/**
 * Storage Service
 * 
 * Handles file uploads to Supabase Storage
 * Used for item photos and claim proof photos
 */

import { supabase } from './client';

/**
 * Storage bucket names
 */
export const STORAGE_BUCKETS = {
  ITEM_PHOTOS: 'lost-item-images',
  CLAIM_PROOFS: 'claim-proofs',
} as const;

/**
 * Upload item photo
 * 
 * @param file - Image file to upload
 * @param itemId - Unique identifier for the item (can be temporary ID before DB insert)
 * @returns Public URL of uploaded image or error
 */
export const uploadItemPhoto = async (
  file: File,
  itemId: string = `temp_${Date.now()}`
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' };
    }

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Image size must be less than 5MB' };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${itemId}_${Date.now()}.${fileExt}`;
    const filePath = `items/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.ITEM_PHOTOS)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKETS.ITEM_PHOTOS)
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload item photo error:', error);
    return { success: false, error: error.message || 'Failed to upload image' };
  }
};

/**
 * Upload claim proof photo
 * 
 * @param file - Image file to upload
 * @param claimId - Unique identifier for the claim
 * @returns Public URL of uploaded image or error
 */
export const uploadClaimProof = async (
  file: File,
  claimId: string = `temp_${Date.now()}`
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' };
    }

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Image size must be less than 5MB' };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${claimId}_${Date.now()}.${fileExt}`;
    const filePath = `proofs/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.CLAIM_PROOFS)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKETS.CLAIM_PROOFS)
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload claim proof error:', error);
    return { success: false, error: error.message || 'Failed to upload image' };
  }
};

/**
 * Delete image from storage
 * 
 * @param url - Public URL of the image
 * @param bucket - Storage bucket name
 * @returns Success/error response
 */
export const deleteImage = async (
  url: string,
  bucket: typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS]
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Extract file path from URL
    const urlParts = url.split('/');
    const filePath = urlParts.slice(-2).join('/'); // Get last two parts (folder/filename)

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Storage delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete image error:', error);
    return { success: false, error: error.message || 'Failed to delete image' };
  }
};

/**
 * Upload image with progress tracking
 * 
 * @param file - Image file to upload
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param onProgress - Progress callback (0-100)
 * @returns Public URL of uploaded image or error
 */
export const uploadWithProgress = async (
  file: File,
  bucket: typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS],
  path: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Note: Supabase JS client doesn't support upload progress natively
    // This is a simplified version. For real progress tracking, you'd need to use
    // the REST API directly with XMLHttpRequest or fetch with ReadableStream

    if (onProgress) {
      onProgress(0);
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    if (onProgress) {
      onProgress(100);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload with progress error:', error);
    return { success: false, error: error.message || 'Failed to upload image' };
  }
};

/**
 * Convert File or Blob to base64 data URL (for preview)
 * 
 * @param file - File or Blob
 * @returns Promise resolving to base64 data URL
 */
export const fileToDataUrl = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Create a signed URL for temporary access (e.g., for admin-only files)
 * 
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL or error
 */
export const createSignedUrl = async (
  bucket: typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS],
  path: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Create signed URL error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, url: data.signedUrl };
  } catch (error: any) {
    console.error('Create signed URL error:', error);
    return { success: false, error: error.message || 'Failed to create signed URL' };
  }
};
