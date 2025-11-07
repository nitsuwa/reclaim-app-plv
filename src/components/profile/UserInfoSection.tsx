import { User, Mail, Phone, IdCard, Info } from 'lucide-react';
import { User as UserType } from '../../types';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface UserInfoSectionProps {
  user: UserType;
}

export const UserInfoSection = ({ user }: UserInfoSectionProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const roleMap = {
      finder: { label: 'Student Member', description: 'Can report found items and claim lost items' },
      claimer: { label: 'Student Member', description: 'Can report found items and claim lost items' },
      admin: { label: 'Guard/Admin', description: 'Manages reports and claims' }
    };
    return roleMap[role as keyof typeof roleMap] || roleMap.finder;
  };

  const roleInfo = getRoleBadge(user.role);

  return (
    <Card className="p-6 bg-card h-full">
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center">
          {/* Profile Picture */}
          <Avatar className="h-24 w-24 border-4 border-accent/20 mb-4">
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>

          {/* Name and Role */}
          <div>
            <h3 className="text-primary mb-1">{user.fullName}</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1 text-muted-foreground cursor-help">
                    <span>{roleInfo.label}</span>
                    <Info className="h-3 w-3" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{roleInfo.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Info className="h-4 w-4" />
            <span>Account Information</span>
          </div>

          {/* Email */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-help">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Email Address</p>
                    <p className="text-foreground break-words">{user.email}</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Used for account notifications and claim updates</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Contact Number */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-help">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Contact Number</p>
                    <p className="text-foreground">{user.contactNumber}</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Guards may contact you for item verification</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Student ID */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-help">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <IdCard className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Student ID</p>
                    <p className="text-foreground">{user.studentId}</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Required for identity verification at Guard Post</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* View-Only Notice */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0" />
          <p>Account information is view-only. Contact admin to update details.</p>
        </div>
      </div>
    </Card>
  );
};