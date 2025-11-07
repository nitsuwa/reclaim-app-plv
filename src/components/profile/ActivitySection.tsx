import { useState, useEffect } from 'react';
import { ActivityLog, LostItem } from '../../types';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle, 
  XCircle, 
  FileCheck, 
  AlertCircle,
  Clock,
  Info,
  Trash2,
  Bell
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { getUserNotifications, clearUserNotifications } from '../../lib/supabase/database';

interface ActivitySectionProps {
  activities: ActivityLog[];
  items: LostItem[];
}

// Combined activity type (activity log + notifications)
interface CombinedActivity {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  itemType?: string;
  otherItemTypeDetails?: string;
  type: 'activity' | 'notification';
}

export const ActivitySection = ({ activities, items }: ActivitySectionProps) => {
  const { currentUser, clearActivityLogs } = useApp();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (!currentUser) return;
      
      const result = await getUserNotifications(currentUser.id);
      if (result.success && result.data) {
        setNotifications(result.data);
      }
      setLoading(false);
    };

    loadNotifications();
  }, [currentUser]);

  const handleClearActivities = async () => {
    if (currentUser) {
      // Clear both activity logs and notifications
      const activityResult = await clearActivityLogs(currentUser.id);
      const notificationsResult = await clearUserNotifications(currentUser.id);
      
      if (activityResult && activityResult.success && notificationsResult.success) {
        toast.success('Activity history cleared successfully');
        setShowClearDialog(false);
        setNotifications([]);
        // Delay reload so user can read the toast
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Failed to clear activity');
        setShowClearDialog(false);
      }
    }
  };

  // Combine and sort activities and notifications
  const combinedActivities: CombinedActivity[] = [
    // Convert activity logs (skip 'System' logs as they're already in notifications)
    ...activities
      .filter(activity => activity.userName !== 'System')
      .map(activity => {
        // Find the item to get otherItemTypeDetails
        const item = activity.itemId ? items.find(i => i.id === activity.itemId) : undefined;
        
        return {
          id: activity.id,
          timestamp: activity.timestamp,
          action: activity.action,
          details: activity.details,
          itemType: activity.itemType,
          otherItemTypeDetails: item?.otherItemTypeDetails,
          type: 'activity' as const
        };
      }),
    // Convert notifications
    ...notifications.map(notif => ({
      id: notif.id,
      timestamp: notif.created_at,
      action: notif.type,
      details: notif.message,
      itemType: undefined,
      otherItemTypeDetails: undefined,
      type: 'notification' as const
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getActivityIcon = (action: string) => {
    const iconMap: Record<string, any> = {
      item_reported: FileCheck,
      item_verified: FileCheck,
      item_rejected: XCircle,
      claim_submitted: Clock,
      claim_approved: CheckCircle,
      claim_rejected: XCircle,
      failed_claim_attempt: AlertCircle,
      item_status_changed: Clock,
      item_claimed: CheckCircle
    };
    return iconMap[action] || Bell;
  };

  const getActivityColor = (action: string) => {
    const colorMap: Record<string, string> = {
      item_reported: 'text-primary bg-primary/10 border-primary/20',
      item_verified: 'text-accent bg-accent/10 border-accent/20',
      item_rejected: 'text-destructive bg-destructive/10 border-destructive/20',
      claim_submitted: 'text-secondary bg-secondary/10 border-secondary/20',
      claim_approved: 'text-primary bg-primary/10 border-primary/20',
      claim_rejected: 'text-destructive bg-destructive/10 border-destructive/20',
      failed_claim_attempt: 'text-destructive bg-destructive/10 border-destructive/20',
      item_status_changed: 'text-accent bg-accent/10 border-accent/20',
      item_claimed: 'text-primary bg-primary/10 border-primary/20'
    };
    return colorMap[action] || 'text-muted-foreground bg-muted border-muted';
  };

  const getActivityLabel = (action: string) => {
    const labelMap: Record<string, string> = {
      item_reported: 'Reported',
      item_verified: 'Verified',
      item_rejected: 'Rejected',
      claim_submitted: 'Claim Submitted',
      claim_approved: 'Approved',
      claim_rejected: 'Rejected',
      failed_claim_attempt: 'Failed Attempt',
      item_status_changed: 'Status Changed',
      item_claimed: 'Item Claimed',
      claim_rejected_on_item: 'Claim Rejected'
    };
    return labelMap[action] || action;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Render details text with highlighted keywords
  const renderDetailsWithHighlight = (details: string, itemType?: string, otherDetails?: string) => {
    // For "Other" item type, replace with more descriptive text
    let processedDetails = details;
    if (itemType === 'Other' && otherDetails) {
      processedDetails = details.replace('Other', otherDetails);
    }

    // Patterns to highlight:
    // 1. Quoted text ("...")
    // 2. Claim codes (CLM-XXXXXXXX)
    // 3. Text after "at " (locations)
    // 4. Text after "item: " or "for " (item types)
    
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    
    const matches: Array<{ start: number; end: number; text: string; type: string }> = [];
    
    // Find all quoted text
    const quotedRegex = /"([^"]+)"/g;
    let match;
    while ((match = quotedRegex.exec(processedDetails)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        type: 'quoted'
      });
    }
    
    // Find claim codes
    const claimCodeRegex = /\(Code: (CLM-[A-Z0-9]+)\)/g;
    while ((match = claimCodeRegex.exec(processedDetails)) !== null) {
      matches.push({
        start: match.index + 7, // Skip "(Code: "
        end: match.index + match[0].length - 1, // Skip ")"
        text: match[1],
        type: 'code'
      });
    }
    
    // Find "at [location]" patterns
    const atLocationRegex = /\sat\s([A-Za-z\s]+?)(?=\s*$|\s*\()/g;
    while ((match = atLocationRegex.exec(processedDetails)) !== null) {
      matches.push({
        start: match.index + 4, // Skip " at "
        end: match.index + match[0].length,
        text: match[1].trim(),
        type: 'location'
      });
    }
    
    // Find "item: [type]" or "for [type]" patterns
    const itemTypeRegex = /(?:item:\s|for\s)([A-Za-z\s]+?)(?=\sat\s|\s\(Code:|\s*$)/g;
    while ((match = itemTypeRegex.exec(processedDetails)) !== null) {
      const startPos = match.index + (match[0].startsWith('item:') ? 6 : 4);
      const text = match[1].trim();
      
      // Don't highlight if already part of another match
      const overlaps = matches.some(m => 
        (startPos >= m.start && startPos < m.end) || 
        (startPos + text.length > m.start && startPos + text.length <= m.end)
      );
      
      if (!overlaps && text.length > 0) {
        matches.push({
          start: startPos,
          end: startPos + text.length,
          text: text,
          type: 'item'
        });
      }
    }
    
    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);
    
    // Build the result with highlighted parts
    matches.forEach((m, index) => {
      // Add text before this match
      if (m.start > lastIndex) {
        parts.push(processedDetails.substring(lastIndex, m.start));
      }
      
      // Add highlighted match
      parts.push(
        <span key={index} className="font-medium text-primary">
          {m.text}
        </span>
      );
      
      lastIndex = m.end;
    });
    
    // Add remaining text
    if (lastIndex < processedDetails.length) {
      parts.push(processedDetails.substring(lastIndex));
    }
    
    return parts.length > 0 ? <>{parts}</> : processedDetails;
  };

  return (
    <Card className="p-6 bg-card">
      <div className="space-y-6">
        <div>
          <h3 className="text-primary mb-2">Activity & Notifications</h3>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground mt-3">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Your activity history and system notifications</p>
          </div>
          {combinedActivities.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          )}
        </div>

        {combinedActivities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No recent activity</p>
            <p className="text-sm text-muted-foreground">
              Your actions and notifications will appear here
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {combinedActivities.map((activity) => {
                const Icon = getActivityIcon(activity.action);
                const colorClass = getActivityColor(activity.action);
                
                return (
                  <div 
                    key={activity.id} 
                    className="flex gap-3 p-3 rounded-lg bg-background hover:shadow-sm transition-all border border-border"
                  >
                    <div className={`h-10 w-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0 border`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getActivityLabel(activity.action)}
                        </Badge>
                        {activity.type === 'notification' && (
                          <Badge variant="secondary" className="text-xs bg-accent/20 text-accent border-accent/30">
                            <Bell className="h-3 w-3 mr-1" />
                            System
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>

                      <p className="text-foreground text-sm leading-relaxed">
                        {renderDetailsWithHighlight(activity.details, activity.itemType, activity.otherItemTypeDetails)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Activity History?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all your activity logs and notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearActivities}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Activities
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
