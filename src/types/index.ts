export type UserRole = 'finder' | 'claimer' | 'admin';

export interface User {
  id: string;
  authId: string; // Supabase auth.users.id (UUID)
  fullName: string;
  studentId: string;
  contactNumber: string;
  email: string;
  role: UserRole;
}

export interface LostItem {
  id: string;
  itemType: string;
  otherItemTypeDetails?: string; // For when itemType is "Other"
  location: string;
  otherLocationDetails?: string; // For when location is "Other"
  dateFound: string;
  foundDate?: string; // Alias for dateFound
  timeFound: string;
  photoUrl: string;
  description?: string;
  securityQuestions: SecurityQuestion[];
  reportedBy: string;
  reporterName?: string; // Full name of reporter (for admin view)
  reporterStudentId?: string; // Student ID of reporter (for verification)
  status: 'pending' | 'verified' | 'claimed';
  reportedAt: string;
}

export interface SecurityQuestion {
  question: string;
  answer: string;
}

export interface Claim {
  id: string;
  itemId: string;
  claimantId: string;
  claimantName?: string; // Full name of claimant (for admin view)
  claimantStudentId?: string; // Student ID of claimant (for verification)
  claimCode: string;
  answers: string[];
  proofPhotoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'item_reported' | 'item_verified' | 'item_rejected' | 'claim_submitted' | 'claim_approved' | 'claim_rejected' | 'failed_claim_attempt' | 'item_status_changed' | 'item_claimed' | 'claim_rejected_on_item';
  itemId?: string;
  itemType?: string;
  details: string;
  viewed?: boolean;
  notifyUserId?: string; // ID of the user to notify (for admin actions on user's items)
}

export interface AdminUser extends User {
  role: 'admin';
  createdAt: string;
  status: 'active' | 'inactive';
  createdBy?: string;
}
