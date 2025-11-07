import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { useApp } from '../context/AppContext';
import { CheckCircle2, XCircle, Clock, Package, FileCheck, AlertCircle, CheckSquare, ScrollText, Eye, Shield, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';
import { AdminManagement } from './AdminManagement';
import { getPendingItems, getVerifiedItems, getClaimedItems, getPendingClaims, getAllClaims, updateItemStatus, updateClaimStatus, getAdminActivityLogs, clearAdminActivityLogs, logAdminActivity, createNotification } from '../lib/supabase/database';
import { LostItem, Claim } from '../types';

// Admin Activity Log type
interface AdminActivityLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  target_user_id?: string;
  target_user_name?: string;
  target_item_id?: string;
  target_claim_id?: string;
  details?: any;
  created_at: string;
  cleared_by_admin: boolean;
}

export const AdminDashboard = () => {
  const { currentUser, activityLogs, addActivityLog, clearActivityLogs, refreshItems, refreshLogs } = useApp();
  
  // State for fetched data
  const [pendingItems, setPendingItems] = useState<LostItem[]>([]);
  const [verifiedItems, setVerifiedItems] = useState<LostItem[]>([]);
  const [claimedItems, setClaimedItems] = useState<LostItem[]>([]);
  const [pendingClaims, setPendingClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [allItems, setAllItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [unblurredPhotos, setUnblurredPhotos] = useState<Set<string>>(new Set());
  const [claimCodeInput, setClaimCodeInput] = useState('');
  const [lookupClaim, setLookupClaim] = useState<Claim | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'timestamp' | 'userName' | 'action' | 'itemType'; direction: 'asc' | 'desc' }>({ 
    key: 'timestamp', 
    direction: 'desc' 
  });
  const [adminSortConfig, setAdminSortConfig] = useState<{ key: 'created_at' | 'admin_name' | 'action_type'; direction: 'asc' | 'desc' }>({ 
    key: 'created_at', 
    direction: 'desc' 
  });
  const [showClearLogsDialog, setShowClearLogsDialog] = useState(false);
  const [clearLogsConfirmText, setClearLogsConfirmText] = useState('');
  const [adminActivityLogs, setAdminActivityLogs] = useState<AdminActivityLog[]>([]);
  const [logsTab, setLogsTab] = useState<'user' | 'admin'>('user');
  const [showClearAdminLogsDialog, setShowClearAdminLogsDialog] = useState(false);
  const [clearAdminLogsConfirmText, setClearAdminLogsConfirmText] = useState('');
  const [processing, setProcessing] = useState(false); // Prevent double-clicks
  
  // Tab persistence
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('admin-active-tab') || 'reports';
  });
  
  // Confirmation dialog states
  const [confirmAction, setConfirmAction] = useState<{
    show: boolean;
    type: 'verify-item' | 'reject-item' | 'approve-claim' | 'reject-claim' | null;
    itemId?: string;
    claimId?: string;
  }>({ show: false, type: null });

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      console.log('📊 Admin loading data from database...');

      try {
        // Load pending items
        const pendingResult = await getPendingItems();
        if (pendingResult.success && pendingResult.data) {
          console.log('✅ Pending items loaded:', pendingResult.data.length);
          setPendingItems(pendingResult.data);
        }

        // Load verified items
        const verifiedResult = await getVerifiedItems();
        if (verifiedResult.success && verifiedResult.data) {
          console.log('✅ Verified items loaded:', verifiedResult.data.length);
          setVerifiedItems(verifiedResult.data);
        }

        // Load claimed items
        const claimedResult = await getClaimedItems();
        if (claimedResult.success && claimedResult.data) {
          console.log('✅ Claimed items loaded:', claimedResult.data.length);
          setClaimedItems(claimedResult.data);
        }

        // Combine all items for lookup functionality
        setAllItems([
          ...(pendingResult.data || []),
          ...(verifiedResult.data || []),
          ...(claimedResult.data || [])
        ]);

        // Load pending claims
        const claimsResult = await getPendingClaims();
        if (claimsResult.success && claimsResult.data) {
          console.log('✅ Pending claims loaded:', claimsResult.data.length);
          setPendingClaims(claimsResult.data);
        }

        // Load all claims for lookup
        const allClaimsResult = await getAllClaims();
        if (allClaimsResult.success && allClaimsResult.data) {
          console.log('✅ All claims loaded:', allClaimsResult.data.length);
          setAllClaims(allClaimsResult.data);
        }

        // Load admin activity logs
        const adminLogsResult = await getAdminActivityLogs();
        if (adminLogsResult.success && adminLogsResult.data) {
          console.log('✅ Admin activity logs loaded:', adminLogsResult.data.length);
          setAdminActivityLogs(adminLogsResult.data);
        }
      } catch (error) {
        console.error('❌ Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Reload admin activity logs
  const reloadAdminLogs = async () => {
    const adminLogsResult = await getAdminActivityLogs();
    if (adminLogsResult.success && adminLogsResult.data) {
      setAdminActivityLogs(adminLogsResult.data);
    }
  };

  // Clipboard copy helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Claim code copied!');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleClaimCodeLookup = () => {
    if (!claimCodeInput.trim()) {
      toast.error('Please enter a claim code');
      return;
    }
    
    // Search in ALL claims, not just pending
    const claim = allClaims.find(c => c.claimCode === claimCodeInput.trim());
    if (claim) {
      setLookupClaim(claim);
      toast.success('Claim found!');
    } else {
      setLookupClaim(null);
      toast.error('No claim found with this code');
    }
  };

  const confirmVerifyItem = (itemId: string, approve: boolean) => {
    setConfirmAction({
      show: true,
      type: approve ? 'verify-item' : 'reject-item',
      itemId
    });
  };

  const handleVerifyItem = async (itemId: string, approve: boolean) => {
    if (!currentUser || processing) return;

    const item = pendingItems.find(i => i.id === itemId);
    if (!item) return;

    setProcessing(true);
    try {

    // Update in database
    const result = await updateItemStatus(
      itemId,
      approve ? 'verified' : 'rejected',
      currentUser.id
    );

    if (!result.success) {
      toast.error('Failed to update item status');
      return;
    }

    // Create notification for the item reporter (user-perspective)
    await createNotification({
      userId: item.reportedBy,
      message: approve 
        ? `Your reported item "${item.itemType}" has been verified and published to the Lost & Found Board` 
        : `Your reported item "${item.itemType}" was rejected`,
      type: approve ? 'item_verified' : 'item_rejected',
      relatedItemId: item.id,
    });

    // Log admin action (admin-perspective for Admin Actions tab)
    await logAdminActivity({
      adminId: currentUser.id,
      adminName: currentUser.fullName,
      actionType: approve ? 'item_verified' : 'item_rejected',
      targetItemId: item.id,
      targetUserId: item.reportedBy,
      targetUserName: item.reporterName || 'Unknown',
      details: {
        itemType: item.itemType,
        location: item.location,
        reportedBy: item.reporterName || 'Unknown'
      }
    });

    // Refresh admin logs
    const adminLogsResult = await getAdminActivityLogs();
    if (adminLogsResult.success && adminLogsResult.data) {
      setAdminActivityLogs(adminLogsResult.data);
    }

    // Refresh data
    if (approve) {
      setPendingItems(prev => prev.filter(i => i.id !== itemId));
      setVerifiedItems(prev => [...prev, { ...item, status: 'verified' }]);
      // Update allItems for search results
      setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'verified' } : i));
    } else {
      setPendingItems(prev => prev.filter(i => i.id !== itemId));
      // Update allItems for search results
      setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'rejected' } : i));
    }

      await refreshItems();
      toast.success(approve ? 'Item verified and published!' : 'Item report rejected');
      setShowItemDialog(false);
      setSelectedItem(null);
      setConfirmAction({ show: false, type: null });
    } finally {
      setProcessing(false);
    }
  };

  const confirmVerifyClaim = (claimId: string, approve: boolean) => {
    setConfirmAction({
      show: true,
      type: approve ? 'approve-claim' : 'reject-claim',
      claimId
    });
  };

  const handleVerifyClaim = async (claimId: string, approve: boolean) => {
    if (!currentUser || processing) return;

    const claim = pendingClaims.find(c => c.id === claimId);
    const item = claim ? allItems.find(i => i.id === claim.itemId) : null;
    
    if (!claim || !item) return;

    setProcessing(true);
    try {

    // Update in database
    const result = await updateClaimStatus(
      claimId,
      approve ? 'approved' : 'rejected',
      currentUser.id
    );

    if (!result.success) {
      toast.error('Failed to update claim status');
      return;
    }

    // Create notification for CLAIMER (user-perspective)
    await createNotification({
      userId: claim.claimantId,
      message: approve 
        ? `Your claim for "${item.itemType}" has been approved! (Code: ${claim.claimCode})` 
        : `Your claim for "${item.itemType}" was rejected (Code: ${claim.claimCode})`,
      type: approve ? 'claim_approved' : 'claim_rejected',
      relatedItemId: item.id,
      relatedClaimId: claim.id,
    });

    // Create notification for REPORTER (user-perspective)
    await createNotification({
      userId: item.reportedBy,
      message: approve 
        ? `Your reported item "${item.itemType}" has been claimed and released` 
        : `A claim for your reported item "${item.itemType}" was rejected`,
      type: approve ? 'item_claimed' : 'claim_rejected_on_item',
      relatedItemId: item.id,
      relatedClaimId: claim.id,
    });

    // Log admin action (admin-perspective for Admin Actions tab)
    await logAdminActivity({
      adminId: currentUser.id,
      adminName: currentUser.fullName,
      actionType: approve ? 'claim_approved' : 'claim_rejected',
      targetClaimId: claim.id,
      targetItemId: item.id,
      targetUserId: claim.claimantId,
      targetUserName: claim.claimantName,
      details: {
        itemType: item.itemType,
        claimCode: claim.claimCode,
        claimantName: claim.claimantName,
        reportedBy: item.reportedByName
      }
    });

    // Refresh admin logs
    const adminLogsResult = await getAdminActivityLogs();
    if (adminLogsResult.success && adminLogsResult.data) {
      setAdminActivityLogs(adminLogsResult.data);
    }

    // Update local state
    setPendingClaims(prev => prev.filter(c => c.id !== claimId));
    // Update allClaims for search results
    setAllClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: approve ? 'approved' : 'rejected' } : c));
    if (approve) {
      setVerifiedItems(prev => prev.filter(i => i.id !== item.id));
      setClaimedItems(prev => [...prev, { ...item, status: 'claimed' }]);
      // Update allItems for search results
      setAllItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'claimed' } : i));
    }

      toast.success(approve ? 'Claim approved!' : 'Claim rejected');
      setShowClaimDialog(false);
      setSelectedClaim(null);
      // Update lookupClaim if it's the one being updated
      if (lookupClaim && lookupClaim.id === claimId) {
        setLookupClaim({ ...lookupClaim, status: approve ? 'approved' : 'rejected' });
      }
      setConfirmAction({ show: false, type: null });
    } finally {
      setProcessing(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'item_reported': 'Item Reported',
      'item_verified': 'Item Verified',
      'item_rejected': 'Item Rejected',
      'claim_submitted': 'Claim Submitted',
      'claim_approved': 'Claim Approved',
      'claim_rejected': 'Claim Rejected',
      'failed_claim_attempt': 'Failed Claim Attempt',
      'item_status_changed': 'Item Status Changed',
      'item_claimed': 'Item Claimed',
      'claim_rejected_on_item': 'Claim Rejected on Your Item'
    };
    return labels[action] || action;
  };

  const getAdminActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'admin_created': 'Created Admin',
      'admin_edited': 'Edited Admin',
      'admin_deleted': 'Deleted Admin',
      'user_deleted': 'Deleted User',
      'item_verified': 'Verified Item',
      'item_rejected': 'Rejected Item',
      'claim_approved': 'Approved Claim',
      'claim_rejected': 'Rejected Claim',
      'profile_edited': 'Updated Profile'
    };
    return labels[action] || action;
  };

  const getAdminActionMessage = (log: AdminActivityLog) => {
    const details = log.details || {};
    switch (log.action_type) {
      case 'item_verified':
        return `Verified item "${details.itemType || 'Unknown'}" reported by ${details.reportedBy || log.target_user_name || 'Unknown'}`;
      case 'item_rejected':
        return `Rejected item "${details.itemType || 'Unknown'}" reported by ${details.reportedBy || log.target_user_name || 'Unknown'}`;
      case 'claim_approved':
        return `Approved ${log.target_user_name || details.claimantName || 'user'}'s claim for item "${details.itemType || 'Unknown'}"`;
      case 'claim_rejected':
        return `Rejected ${log.target_user_name || details.claimantName || 'user'}'s claim for item "${details.itemType || 'Unknown'}"`;
      case 'admin_created':
        return `Created admin account: ${log.target_user_name || 'Unknown'}`;
      case 'admin_edited':
        return `Updated admin account: ${log.target_user_name || 'Unknown'}`;
      case 'admin_deleted':
        return `Deleted admin account: ${log.target_user_name || 'Unknown'}`;
      case 'user_deleted':
        return `Deleted user account: ${log.target_user_name || 'Unknown'}`;
      case 'profile_edited':
        return `Updated own profile (${log.admin_name})`;
      default:
        return details.message || '-';
    }
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('approved') || action.includes('verified')) return 'default';
    if (action.includes('rejected') || action.includes('failed')) return 'destructive';
    if (action.includes('pending') || action.includes('submitted')) return 'secondary';
    return 'outline';
  };

  const handleSort = (key: 'timestamp' | 'userName' | 'action' | 'itemType') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleAdminSort = (key: 'created_at' | 'admin_name' | 'action_type') => {
    setAdminSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter out admin->user notifications from User Activity tab
  // Only show actions PERFORMED BY users, not notifications TO users
  const userActivityLogs = activityLogs.filter(log => {
    const userActions = ['item_reported', 'claim_submitted', 'failed_claim_attempt'];
    return userActions.includes(log.action);
  });

  const sortedActivityLogs = [...userActivityLogs].sort((a, b) => {
    const { key, direction } = sortConfig;
    let aVal: any = a[key];
    let bVal: any = b[key];

    if (!aVal) aVal = '';
    if (!bVal) bVal = '';

    if (key === 'timestamp') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else {
      aVal = aVal.toString().toLowerCase();
      bVal = bVal.toString().toLowerCase();
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedAdminActivityLogs = [...adminActivityLogs].sort((a, b) => {
    const { key, direction } = adminSortConfig;
    let aVal: any = a[key];
    let bVal: any = b[key];

    if (!aVal) aVal = '';
    if (!bVal) bVal = '';

    if (key === 'created_at') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else {
      aVal = aVal.toString().toLowerCase();
      bVal = bVal.toString().toLowerCase();
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Clear handlers
  const handleClearAllLogs = async () => {
    try {
      const result = await clearActivityLogs();
      if (result) {
        toast.success('User activity logs cleared');
        await refreshLogs();
        setShowClearLogsDialog(false);
        setClearLogsConfirmText('');
      }
    } catch (error) {
      toast.error('Failed to clear logs');
    }
  };

  const handleClearAdminLogs = async () => {
    try {
      const result = await clearAdminActivityLogs();
      if (result.success) {
        toast.success('Admin activity logs cleared');
        // Refresh admin logs
        const adminLogsResult = await getAdminActivityLogs();
        if (adminLogsResult.success && adminLogsResult.data) {
          setAdminActivityLogs(adminLogsResult.data);
        }
        setShowClearAdminLogsDialog(false);
        setClearAdminLogsConfirmText('');
      }
    } catch (error) {
      toast.error('Failed to clear admin logs');
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const selectedItemData = selectedItem ? pendingItems.find(i => i.id === selectedItem) : null;
  const selectedClaimData = selectedClaim ? pendingClaims.find(c => c.id === selectedClaim) : null;
  const selectedClaimItem = selectedClaimData ? allItems.find(i => i.id === selectedClaimData.itemId) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground border-b border-primary/10 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-primary-foreground">Admin Dashboard</h1>
              <p className="text-sm text-primary-foreground/80">Guard / Admin Panel - {currentUser?.fullName}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-md border border-border hover:shadow-lg transition-shadow">
            <CardHeader className="pb-6 pt-6 px-6 border-b-0">
              <div className="flex items-center justify-between">
                <CardDescription className="text-base">Pending Reports</CardDescription>
                <Package className="h-5 w-5 text-accent" />
              </div>
              <CardTitle className="text-accent mt-3">{pendingItems.length}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="shadow-md border border-border hover:shadow-lg transition-shadow">
            <CardHeader className="pb-6 pt-6 px-6 border-b-0">
              <div className="flex items-center justify-between">
                <CardDescription className="text-base">Verified Items</CardDescription>
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-primary mt-3">{verifiedItems.length}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="shadow-md border border-border hover:shadow-lg transition-shadow">
            <CardHeader className="pb-6 pt-6 px-6 border-b-0">
              <div className="flex items-center justify-between">
                <CardDescription className="text-base">Pending Claims</CardDescription>
                <AlertCircle className="h-5 w-5 text-accent" />
              </div>
              <CardTitle className="text-accent mt-3">{pendingClaims.length}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="shadow-md border border-border hover:shadow-lg transition-shadow">
            <CardHeader className="pb-6 pt-6 px-6 border-b-0">
              <div className="flex items-center justify-between">
                <CardDescription className="text-base">Claimed Items</CardDescription>
                <CheckSquare className="h-5 w-5 text-neutral-accent" />
              </div>
              <CardTitle className="text-neutral-accent mt-3">{claimedItems.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          localStorage.setItem('admin-active-tab', value);
        }} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto">
            <TabsTrigger value="reports">Item Reports</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="lookup">Claim Lookup</TabsTrigger>
            <TabsTrigger value="logs">
              <ScrollText className="h-4 w-4 mr-0 md:mr-2" />
              <span className="hidden md:inline">Activity Logs</span>
              <span className="md:hidden">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="admins">
              <Shield className="h-4 w-4 mr-0 md:mr-2" />
              <span className="hidden md:inline">Admins</span>
              <span className="md:hidden">Admins</span>
            </TabsTrigger>
          </TabsList>

          {/* PENDING ITEMS TAB */}
          <TabsContent value="reports" className="space-y-4">
            <Card className="shadow-sm border border-border">
              <CardHeader>
                <CardTitle>Pending Item Reports</CardTitle>
                <CardDescription>Review and verify found item reports</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending reports</p>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {pendingItems.map(item => (
                      <div key={item.id} className="border border-border rounded-lg p-4 flex items-start gap-4 relative">
                        <div 
                          className="relative w-24 h-24 cursor-pointer group/photo flex-shrink-0 bg-muted rounded flex items-center justify-center overflow-hidden"
                          onClick={(e) => {
                            e.stopPropagation();
                            const hasRealPhoto = item.photoUrl && 
                                                item.photoUrl.trim() !== '' && 
                                                !item.photoUrl.includes('unsplash.com') &&
                                                item.photoUrl.startsWith('http');
                            if (hasRealPhoto) {
                              setUnblurredPhotos(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(item.id)) {
                                  newSet.delete(item.id);
                                } else {
                                  newSet.add(item.id);
                                }
                                return newSet;
                              });
                            }
                          }}
                        >
                          {(() => {
                            const hasRealPhoto = item.photoUrl && 
                                                item.photoUrl.trim() !== '' && 
                                                !item.photoUrl.includes('unsplash.com') &&
                                                item.photoUrl.startsWith('http');
                            return hasRealPhoto ? (
                              <>
                                <img
                                  src={item.photoUrl}
                                  alt={item.itemType}
                                  className={`w-24 h-24 object-cover rounded transition-all ${
                                    unblurredPhotos.has(item.id) ? '' : 'blur-md'
                                  }`}
                                />
                                {!unblurredPhotos.has(item.id) && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded group-hover/photo:bg-black/40 transition-colors">
                                    <Eye className="h-6 w-6 text-white group-hover/photo:scale-110 transition-transform" />
                                  </div>
                                )}
                              </>
                            ) : (
                              <Package className="h-10 w-10 text-muted-foreground opacity-40" />
                            );
                          })()}
                        </div>
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="space-y-2">
                            <h4 className="text-primary break-words font-semibold">
                              {item.itemType}
                              {item.otherItemTypeDetails && ` - ${item.otherItemTypeDetails}`}
                            </h4>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                                {item.description}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground break-words">
                              Found at {item.location} on {new Date(item.dateFound).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="space-y-2 pt-2 border-t border-border/40">
                            <p className="text-sm break-words leading-relaxed">
                              <span className="text-muted-foreground">Reporter:</span>{' '}
                              <span className="text-foreground uppercase tracking-wide">{item.reporterName || 'Unknown'}</span>
                            </p>
                            <p className="text-sm break-words leading-relaxed">
                              <span className="text-muted-foreground">Student ID:</span>{' '}
                              <span className="font-mono text-foreground">{item.reporterStudentId || 'N/A'}</span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-accent text-white hover:bg-accent/90"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item.id);
                                setShowItemDialog(true);
                              }}
                            >
                              Review
                            </Button>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-secondary text-white">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border">
              <CardHeader>
                <CardTitle>Verified Items</CardTitle>
                <CardDescription>Items currently on the Lost & Found Board</CardDescription>
              </CardHeader>
              <CardContent>
                {verifiedItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No verified items</p>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                      {verifiedItems.map(item => (
                      <div key={item.id} className="border border-border rounded-lg p-4 flex items-start gap-4">
                        <div 
                          className="relative w-24 h-24 cursor-pointer group/photo flex-shrink-0 bg-muted rounded flex items-center justify-center overflow-hidden"
                          onClick={(e) => {
                            e.stopPropagation();
                            const hasRealPhoto = item.photoUrl && 
                                                item.photoUrl.trim() !== '' && 
                                                !item.photoUrl.includes('unsplash.com') &&
                                                item.photoUrl.startsWith('http');
                            if (hasRealPhoto) {
                              setUnblurredPhotos(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(item.id)) {
                                  newSet.delete(item.id);
                                } else {
                                  newSet.add(item.id);
                                }
                                return newSet;
                              });
                            }
                          }}
                        >
                          {(() => {
                            const hasRealPhoto = item.photoUrl && 
                                                item.photoUrl.trim() !== '' && 
                                                !item.photoUrl.includes('unsplash.com') &&
                                                item.photoUrl.startsWith('http');
                            return hasRealPhoto ? (
                              <>
                                <img
                                  src={item.photoUrl}
                                  alt={item.itemType}
                                  className={`w-24 h-24 object-cover rounded transition-all ${
                                    unblurredPhotos.has(item.id) ? '' : 'blur-md'
                                  }`}
                                />
                                {!unblurredPhotos.has(item.id) && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded group-hover/photo:bg-black/40 transition-colors">
                                    <Eye className="h-6 w-6 text-white group-hover/photo:scale-110 transition-transform" />
                                  </div>
                                )}
                              </>
                            ) : (
                              <Package className="h-10 w-10 text-muted-foreground opacity-40" />
                            );
                          })()}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <h4 className="text-primary break-words font-semibold">
                            {item.itemType}
                            {item.otherItemTypeDetails && ` - ${item.otherItemTypeDetails}`}
                          </h4>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 break-words leading-relaxed">
                              {item.description}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground break-words leading-relaxed">
                            {item.location} - {new Date(item.dateFound).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="default" className="bg-accent text-white flex-shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CLAIMS TAB */}
          <TabsContent value="claims">
            <Card>
              <CardHeader>
                <CardTitle>Pending Claims</CardTitle>
                <CardDescription>Review and approve claim requests</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingClaims.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending claims</p>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {pendingClaims.map(claim => {
                        const item = allItems.find(i => i.id === claim.itemId);
                        return (
                          <div 
                            key={claim.id} 
                            className="border border-border rounded-lg p-4 hover:border-accent transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedClaim(claim.id);
                              setShowClaimDialog(true);
                            }}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h4 className="text-primary font-semibold">
                                  {item?.itemType || 'Unknown Item'}
                                  {item?.otherItemTypeDetails && ` - ${item.otherItemTypeDetails}`}
                                </h4>
                                <div className="mt-3 space-y-2">
                                  <div className="flex items-center gap-2 text-sm leading-relaxed">
                                    <span className="text-muted-foreground">Claimant:</span>
                                    <span className="text-foreground uppercase tracking-wide">{claim.claimantName || 'Unknown'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm leading-relaxed">
                                    <span className="text-muted-foreground">Student ID:</span>
                                    <span className="font-mono text-foreground">{claim.claimantStudentId || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm leading-relaxed">
                                    <span className="text-muted-foreground">Claim Code:</span>
                                    <code 
                                      className="bg-muted px-2 py-1 rounded text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(claim.claimCode);
                                      }}
                                    >
                                      {claim.claimCode}
                                    </code>
                                  </div>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-secondary text-white flex-shrink-0">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            </div>
                            <div className="space-y-2 mb-4">
                              <p className="text-sm">Security Answers:</p>
                              {claim.answers.map((answer, idx) => (
                                <div key={idx} className="text-sm bg-card border border-border p-3 rounded">
                                  <p className="text-muted-foreground mb-1">
                                    <strong>Q{idx + 1}:</strong> {item?.securityQuestions[idx]?.question}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">Answer:</span> {answer}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-accent text-white hover:bg-accent/90"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClaim(claim.id);
                                  setShowClaimDialog(true);
                                }}
                              >
                                Review Claim
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LOOKUP TAB */}
          <TabsContent value="lookup">
            <Card>
              <CardHeader>
                <CardTitle>Claim Code Lookup</CardTitle>
                <CardDescription>Enter a claim code to view and process the claim</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter claim code (e.g., CLM-123456)"
                    value={claimCodeInput}
                    onChange={(e) => setClaimCodeInput(e.target.value.toUpperCase())}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleClaimCodeLookup();
                      }
                    }}
                  />
                  <Button onClick={handleClaimCodeLookup} className="bg-accent text-white hover:bg-accent/90">
                    Search
                  </Button>
                </div>

                {lookupClaim && (() => {
                  const item = allItems.find(i => i.id === lookupClaim.itemId);
                  if (!item) return <p className="text-center text-muted-foreground py-8">Item not found</p>;
                  
                  const statusBadge = lookupClaim.status === 'approved' 
                    ? <Badge variant="default" className="bg-accent text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>
                    : lookupClaim.status === 'rejected' 
                    ? <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
                    : <Badge variant="secondary" className="bg-secondary text-white"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;

                  return (
                    <div className="border border-border rounded-lg p-6 space-y-6">
                      {/* Header with Status */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-primary font-semibold mb-2">Claim Details</h3>
                          <p className="text-sm text-muted-foreground">
                            Submitted on {new Date(lookupClaim.submittedAt).toLocaleDateString()} at {new Date(lookupClaim.submittedAt).toLocaleTimeString()}
                          </p>
                        </div>
                        {statusBadge}
                      </div>

                      {/* Claim Information */}
                      <div className="space-y-4">
                        <div className="bg-muted/30 border border-border p-4 rounded-lg space-y-3">
                          <div className="space-y-2">
                            <p className="text-sm">
                              <span className="text-muted-foreground">Item:</span>{' '}
                              <span className="font-semibold text-foreground">
                                {item.itemType}
                                {item.otherItemTypeDetails && ` - ${item.otherItemTypeDetails}`}
                              </span>
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Location Found:</span>{' '}
                              <span className="text-foreground">{item.location}</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Date Found:</span>{' '}
                              <span className="text-foreground">{new Date(item.dateFound).toLocaleDateString()}</span>
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm leading-relaxed">
                            <span className="text-muted-foreground">Claimant:</span>{' '}
                            <span className="text-foreground uppercase tracking-wide">{lookupClaim.claimantName}</span>
                          </p>
                          <p className="text-sm leading-relaxed">
                            <span className="text-muted-foreground">Student ID:</span>{' '}
                            <span className="font-mono text-foreground">{lookupClaim.claimantStudentId}</span>
                          </p>
                          <p className="text-sm leading-relaxed">
                            <span className="text-muted-foreground">Claim Code:</span>{' '}
                            <code 
                              className="bg-muted px-2 py-1 rounded text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(lookupClaim.claimCode);
                              }}
                            >
                              {lookupClaim.claimCode}
                            </code>
                          </p>
                        </div>

                        {/* Security Answers */}
                        <div className="space-y-2">
                          <p className="text-sm">Security Answers:</p>
                          {lookupClaim.answers.map((answer, idx) => (
                            <div key={idx} className="text-sm bg-card border border-border p-3 rounded">
                              <p className="text-muted-foreground mb-1">
                                <strong>Q{idx + 1}:</strong> {item?.securityQuestions[idx]?.question}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Answer:</span> {answer}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Proof Photo if available */}
                        {lookupClaim.proofPhotoUrl && (
                          <div className="space-y-2">
                            <p className="text-sm">Proof Photo:</p>
                            <img 
                              src={lookupClaim.proofPhotoUrl} 
                              alt="Proof of ownership" 
                              className="w-full max-w-md rounded-lg border border-border"
                            />
                          </div>
                        )}
                      </div>

                      {/* Action Buttons for Pending Claims */}
                      {lookupClaim.status === 'pending' && (
                        <div className="flex gap-2 pt-4 border-t border-border">
                          <Button
                            variant="outline"
                            onClick={() => confirmVerifyClaim(lookupClaim.id, false)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject Claim
                          </Button>
                          <Button
                            className="bg-accent text-white hover:bg-accent/90"
                            onClick={() => confirmVerifyClaim(lookupClaim.id, true)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve Claim
                          </Button>
                        </div>
                      )}

                      {/* Status Message for Completed Claims */}
                      {lookupClaim.status === 'approved' && (
                        <Alert className="bg-accent/10 border-accent">
                          <CheckCircle2 className="h-4 w-4 text-accent" />
                          <AlertDescription className="text-accent">
                            This claim has been approved and the item has been marked as claimed.
                          </AlertDescription>
                        </Alert>
                      )}

                      {lookupClaim.status === 'rejected' && (
                        <Alert className="bg-destructive/10 border-destructive">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <AlertDescription className="text-destructive">
                            This claim has been rejected.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LOGS TAB - WITH TWO SUB-TABS */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>System-wide activity history</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={logsTab} onValueChange={(value) => setLogsTab(value as 'user' | 'admin')} className="space-y-4">
                  <TabsList className="grid grid-cols-2 w-full md:w-auto">
                    <TabsTrigger value="user">User Activity</TabsTrigger>
                    <TabsTrigger value="admin">Admin Actions</TabsTrigger>
                  </TabsList>

                  {/* USER ACTIVITY TAB */}
                  <TabsContent value="user" className="space-y-4">
                    <div className="flex items-center justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowClearLogsDialog(true)}
                        disabled={sortedActivityLogs.length === 0}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Clear All Logs
                      </Button>
                    </div>
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead onClick={() => handleSort('timestamp')} className="cursor-pointer hover:bg-muted/50">
                              Time {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead onClick={() => handleSort('userName')} className="cursor-pointer hover:bg-muted/50">
                              User {sortConfig.key === 'userName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead onClick={() => handleSort('action')} className="cursor-pointer hover:bg-muted/50">
                              Action {sortConfig.key === 'action' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedActivityLogs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="h-64">
                                <div className="flex flex-col items-center justify-center text-center">
                                  <ScrollText className="h-16 w-16 text-muted-foreground opacity-40 mb-4" />
                                  <p className="text-muted-foreground">No user activity logs available</p>
                                  <p className="text-sm text-muted-foreground/60 mt-1">Logs will appear here once users start interacting with the system</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            sortedActivityLogs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell className="text-sm text-muted-foreground">
                                  {new Date(log.timestamp).toLocaleString()}
                                </TableCell>
                                <TableCell>{log.userName}</TableCell>
                                <TableCell>
                                  <Badge variant={getActionBadgeVariant(log.action)}>
                                    {getActionLabel(log.action)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{log.details}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </TabsContent>

                  {/* ADMIN ACTIONS TAB */}
                  <TabsContent value="admin" className="space-y-4">
                    <div className="flex items-center justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowClearAdminLogsDialog(true)}
                        disabled={sortedAdminActivityLogs.length === 0}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Clear All Logs
                      </Button>
                    </div>
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead onClick={() => handleAdminSort('created_at')} className="cursor-pointer hover:bg-muted/50">
                              Time {adminSortConfig.key === 'created_at' && (adminSortConfig.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead onClick={() => handleAdminSort('admin_name')} className="cursor-pointer hover:bg-muted/50">
                              Admin {adminSortConfig.key === 'admin_name' && (adminSortConfig.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead onClick={() => handleAdminSort('action_type')} className="cursor-pointer hover:bg-muted/50">
                              Action {adminSortConfig.key === 'action_type' && (adminSortConfig.direction === 'asc' ? '↑' : '↓')}
                            </TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedAdminActivityLogs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="h-64">
                                <div className="flex flex-col items-center justify-center text-center">
                                  <Shield className="h-16 w-16 text-muted-foreground opacity-40 mb-4" />
                                  <p className="text-muted-foreground">No admin actions logged yet</p>
                                  <p className="text-sm text-muted-foreground/60 mt-1">Admin actions will appear here</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            sortedAdminActivityLogs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell className="text-sm text-muted-foreground">
                                  {new Date(log.created_at).toLocaleString()}
                                </TableCell>
                                <TableCell>{log.admin_name}</TableCell>
                                <TableCell>
                                  <Badge variant={getActionBadgeVariant(log.action_type)}>
                                    {getAdminActionLabel(log.action_type)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {getAdminActionMessage(log)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADMINS TAB */}
          <TabsContent value="admins">
            <AdminManagement 
              currentUserId={currentUser?.id}
              currentUserName={currentUser?.fullName}
              onAdminActionComplete={reloadAdminLogs}
            />
          </TabsContent>
        </Tabs>
      </div>

       {/* Item Review Dialog - WITH SECURITY ANSWERS */}
      {selectedItemData && (
        <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>Review Item Report</DialogTitle>
              <DialogDescription>
                Verify the item details and approve or reject the report
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-x-hidden">
              {(() => {
                const hasRealPhoto = selectedItemData.photoUrl && 
                                    selectedItemData.photoUrl.trim() !== '' && 
                                    !selectedItemData.photoUrl.includes('unsplash.com') &&
                                    selectedItemData.photoUrl.startsWith('http');
                return hasRealPhoto ? (
                  <img 
                    src={selectedItemData.photoUrl} 
                    alt={selectedItemData.itemType} 
                    className="w-full h-64 object-cover rounded-lg" 
                  />
                ) : (
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-sm text-muted-foreground">No photo available</p>
                    </div>
                  </div>
                );
              })()}
              <div className="space-y-3 overflow-x-hidden">
                {/* Reporter Information Alert Box */}
                <Alert className="bg-accent/10 border-accent/30">
                  <AlertDescription className="space-y-2">
                    <p className="text-sm">
                      <strong>Reporter:</strong> {selectedItemData.reporterName || 'Unknown'}
                    </p>
                    <p className="text-sm">
                      <strong>Student ID:</strong> <span className="font-mono">{selectedItemData.reporterStudentId || 'N/A'}</span>
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">Item Type</p>
                    <p className="text-primary break-words overflow-wrap-anywhere">
                      {selectedItemData.itemType}
                      {selectedItemData.otherItemTypeDetails && ` - ${selectedItemData.otherItemTypeDetails}`}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">Location</p>
                    <p className="break-words overflow-wrap-anywhere">{selectedItemData.location}</p>
                  </div>
                </div>

                {selectedItemData.description && (
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere">{selectedItemData.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date Found</p>
                    <p>{new Date(selectedItemData.dateFound).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Time Found</p>
                    <p>{selectedItemData.timeFound}</p>
                  </div>
                </div>

                {/* SECURITY QUESTIONS & ANSWERS SECTION */}
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground mb-2">Security Questions & Answers</p>
                  <div className="space-y-2">
                    {selectedItemData.securityQuestions.map((sq, idx) => (
                      <div key={idx} className="bg-muted/50 border border-border p-3 rounded-lg min-w-0">
                        <p className="text-sm mb-2 break-words overflow-wrap-anywhere">
                          <span className="text-primary">Q{idx + 1}:</span> {sq.question}
                        </p>
                        <p className="text-sm break-words overflow-wrap-anywhere">
                          <span className="text-muted-foreground">Answer:</span>{' '}
                          <span className="text-accent font-medium">{sq.answer}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => confirmVerifyItem(selectedItemData.id, false)}
                className="hover:bg-destructive hover:text-white"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button 
                onClick={() => confirmVerifyItem(selectedItemData.id, true)}
                className="bg-accent text-white hover:bg-accent/90"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve & Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Claim Review Dialog */}
      {selectedClaimData && selectedClaimItem && (
        <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>Review Claim Request</DialogTitle>
              <DialogDescription>
                Verify the claimant's answers and approve or reject the claim
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-x-hidden">
              <Alert className="bg-accent/10 border-accent/30">
                <AlertDescription className="space-y-2">
                  <div className="flex items-center justify-between gap-6">
                    <span><strong>Claim Code:</strong> {selectedClaimData.claimCode}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedClaimData.claimCode)}
                      className="ml-auto"
                    >
                      Copy
                    </Button>
                  </div>
                  <div className="pt-2 border-t border-accent/20">
                    <p className="text-sm mb-1">
                      <strong>Claimant:</strong> {selectedClaimData.claimantName || 'Unknown'}
                    </p>
                    <p className="text-sm">
                      <strong>Student ID:</strong> <span className="font-mono">{selectedClaimData.claimantStudentId || 'N/A'}</span>
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              {selectedClaimData.proofPhotoUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Proof Photo</p>
                  <img 
                    src={selectedClaimData.proofPhotoUrl} 
                    alt="Claim proof" 
                    className="w-full h-64 object-cover rounded-lg border-2 border-border" 
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Item Type</p>
                  <p className="text-primary break-words overflow-wrap-anywhere">
                    {selectedClaimItem.itemType}
                    {selectedClaimItem.otherItemTypeDetails && ` - ${selectedClaimItem.otherItemTypeDetails}`}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Location</p>
                  <p className="break-words overflow-wrap-anywhere">{selectedClaimItem.location}</p>
                </div>
              </div>

              <div className="space-y-3 min-w-0">
                <p className="text-sm text-muted-foreground">Security Questions & Answers</p>
                {selectedClaimData.answers.map((answer, idx) => (
                  <div key={idx} className="bg-muted/50 border border-border p-4 rounded-lg space-y-3 min-w-0">
                    <p className="text-sm break-words overflow-wrap-anywhere">
                      <span className="text-primary">Question {idx + 1}:</span> {selectedClaimItem.securityQuestions[idx]?.question}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Claimant's Answer</p>
                        <p className="text-sm text-primary break-words overflow-wrap-anywhere">{answer}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Correct Answer</p>
                        <p className="text-sm text-accent break-words overflow-wrap-anywhere">{selectedClaimItem.securityQuestions[idx]?.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => confirmVerifyClaim(selectedClaimData.id, false)}
                className="hover:bg-destructive hover:text-white"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Claim
              </Button>
              <Button 
                onClick={() => confirmVerifyClaim(selectedClaimData.id, true)}
                className="bg-accent text-white hover:bg-accent/90"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve & Release
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction.show} onOpenChange={(open) => !open && setConfirmAction({ show: false, type: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction.type === 'verify-item' && 'Verify Item Report?'}
              {confirmAction.type === 'reject-item' && 'Reject Item Report?'}
              {confirmAction.type === 'approve-claim' && 'Approve Claim?'}
              {confirmAction.type === 'reject-claim' && 'Reject Claim?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmAction.type === 'verify-item' && confirmAction.itemId) {
                handleVerifyItem(confirmAction.itemId, true);
              } else if (confirmAction.type === 'reject-item' && confirmAction.itemId) {
                handleVerifyItem(confirmAction.itemId, false);
              } else if (confirmAction.type === 'approve-claim' && confirmAction.claimId) {
                handleVerifyClaim(confirmAction.claimId, true);
              } else if (confirmAction.type === 'reject-claim' && confirmAction.claimId) {
                handleVerifyClaim(confirmAction.claimId, false);
              }
            }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear User Logs Dialog - SECURE WITH CONFIRMATION TEXT */}
      <AlertDialog open={showClearLogsDialog} onOpenChange={(open) => {
        setShowClearLogsDialog(open);
        if (!open) setClearLogsConfirmText(''); // Reset when closing
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All User Activity Logs?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all user activity logs for ALL admins. This action cannot be undone.
              <br /><br />
              Type <strong className="text-destructive">DELETE LOGS</strong> to confirm:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={clearLogsConfirmText}
              onChange={(e) => setClearLogsConfirmText(e.target.value)}
              placeholder="Type DELETE LOGS here"
              className="font-mono border-input"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllLogs}
              disabled={clearLogsConfirmText !== 'DELETE LOGS'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All Logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Admin Logs Dialog - SECURE WITH CONFIRMATION TEXT */}
      <AlertDialog open={showClearAdminLogsDialog} onOpenChange={(open) => {
        setShowClearAdminLogsDialog(open);
        if (!open) setClearAdminLogsConfirmText(''); // Reset when closing
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Admin Action Logs?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all admin action logs for ALL admins. This action cannot be undone.
              <br /><br />
              Type <strong className="text-destructive">DELETE LOGS</strong> to confirm:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={clearAdminLogsConfirmText}
              onChange={(e) => setClearAdminLogsConfirmText(e.target.value)}
              placeholder="Type DELETE LOGS here"
              className="font-mono border-input"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAdminLogs}
              disabled={clearAdminLogsConfirmText !== 'DELETE LOGS'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All Logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
