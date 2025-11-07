import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Bell, AlertCircle, CheckCircle, Clock, Info } from 'lucide-react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationsSectionProps {
  pendingReports: number;
  pendingClaims: number;
  approvedClaims: number;
}

export const NotificationsSection = ({ 
  pendingReports, 
  pendingClaims,
  approvedClaims 
}: NotificationsSectionProps) => {
  // Generate notifications based on pending/approved items
  const notifications: Notification[] = [];

  if (pendingReports > 0) {
    notifications.push({
      id: 'pending-reports',
      type: 'warning',
      title: 'Pending Item Reports',
      message: `You have ${pendingReports} item report${pendingReports > 1 ? 's' : ''} waiting for admin verification.`,
      timestamp: new Date().toISOString(),
      read: false
    });
  }

  if (pendingClaims > 0) {
    notifications.push({
      id: 'pending-claims',
      type: 'info',
      title: 'Pending Claims',
      message: `You have ${pendingClaims} claim${pendingClaims > 1 ? 's' : ''} under review by admin.`,
      timestamp: new Date().toISOString(),
      read: false
    });
  }

  if (approvedClaims > 0) {
    notifications.push({
      id: 'approved-claims',
      type: 'success',
      title: 'Approved Claims',
      message: `You have ${approvedClaims} approved claim${approvedClaims > 1 ? 's' : ''}. Visit the Guard Post to collect your item${approvedClaims > 1 ? 's' : ''}.`,
      timestamp: new Date().toISOString(),
      read: false
    });
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return Clock;
      case 'error':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'text-primary bg-primary/10';
      case 'warning':
        return 'text-accent bg-accent/10';
      case 'error':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <Card className="p-6 bg-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="text-primary">Notifications</h3>
          </div>
          {notifications.length > 0 && (
            <Badge className="bg-accent text-accent-foreground">
              {notifications.length} new
            </Badge>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No new notifications</p>
            <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const colorClass = getNotificationColor(notification.type);

              return (
                <div
                  key={notification.id}
                  className="flex gap-3 p-4 rounded-lg bg-background hover:shadow-sm transition-shadow border border-border"
                >
                  <div className={`h-10 w-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-foreground mb-1">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
