import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserInfoSection } from './profile/UserInfoSection';
import { ReportedClaimedItems } from './profile/ReportedClaimedItems';
import { ActivitySection } from './profile/ActivitySection';
import { getUserReportedItems, getUserClaimsWithItems, getUserActivityLogs } from '../lib/supabase/database';
import { LostItem, Claim, ActivityLog } from '../types';
import { Loader2 } from 'lucide-react';

export const ProfilePage = () => {
  const { currentUser, setCurrentPage, markNotificationsAsViewed } = useApp();
  const [reportedItems, setReportedItems] = useState<LostItem[]>([]);
  const [userClaims, setUserClaims] = useState<Array<{ claim: Claim; item: LostItem }>>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  if (!currentUser) return null;

  // Redirect admins - they shouldn't access profile page
  if (currentUser.role === 'admin') {
    setCurrentPage('admin');
    return null;
  }

  // Load user's reported items, claims, and activity logs from database
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;

      setLoading(true);
      console.log('📊 Loading user data from database...');

      try {
        // Fetch reported items
        const reportedResult = await getUserReportedItems(currentUser.id);
        if (reportedResult.success && reportedResult.data) {
          console.log('✅ Reported items loaded:', reportedResult.data.length);
          setReportedItems(reportedResult.data);
        } else {
          console.error('❌ Failed to load reported items:', reportedResult.error);
          setReportedItems([]);
        }

        // Fetch user claims WITH items
        const claimsResult = await getUserClaimsWithItems(currentUser.id);
        if (claimsResult.success) {
          console.log('✅ Claims loaded:', claimsResult.data?.length || 0);
          console.log('📋 Claims data:', claimsResult.data);
          setUserClaims(claimsResult.data || []);
        } else {
          console.error('❌ Failed to load claims:', claimsResult.error);
          setUserClaims([]);
        }

        // Fetch user activity logs
        const logsResult = await getUserActivityLogs(currentUser.id);
        if (logsResult.success && logsResult.data) {
          console.log('✅ Activity logs loaded:', logsResult.data.length);
          setActivityLogs(logsResult.data);
        } else {
          console.error('❌ Failed to load activity logs:', logsResult.error);
          setActivityLogs([]);
        }
      } catch (error) {
        console.error('❌ Error loading user data:', error);
        setReportedItems([]);
        setUserClaims([]);
        setActivityLogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser]);

  // Mark notifications as viewed when profile page is opened
  useEffect(() => {
    if (currentUser) {
      markNotificationsAsViewed(currentUser.id);
      console.log('✅ Profile viewed - notifications marked as read');
    }
  }, [currentUser, markNotificationsAsViewed]);

  // Get user's activity logs - include user's own actions AND admin actions on user's items
  const userActivities = activityLogs.filter(log => {
    // User's own actions
    if (log.userId === currentUser.id) return true;
    
    // Admin actions on user's items/claims
    if (log.action === 'item_verified' || log.action === 'item_rejected') {
      const item = reportedItems.find(i => i.id === log.itemId);
      return !!item;
    }
    
    if (log.action === 'claim_approved' || log.action === 'claim_rejected') {
      const claim = userClaims.find(c => c.claim.itemId === log.itemId);
      return !!claim;
    }
    
    return false;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-primary mb-2">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account and track your Lost & Found activity
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
          {/* Left Column - User Profile */}
          <div className="lg:col-span-1">
            {/* User Information Card */}
            <UserInfoSection user={currentUser} />
          </div>

          {/* Right Column - Tabbed Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reported/Claimed Items Section */}
            <ReportedClaimedItems
              reportedItems={reportedItems}
              claimedItems={userClaims}
            />
            
            {/* Activity Section - Pass items for lookup */}
            <ActivitySection activities={userActivities} items={reportedItems} />
          </div>
        </div>
      </div>
    </div>
  );
};
