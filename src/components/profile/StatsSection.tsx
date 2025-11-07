import { Package, CheckCircle, Clock, FileCheck } from 'lucide-react';
import { Card } from '../ui/card';

interface StatsSectionProps {
  totalReported: number;
  totalClaimed: number;
  verifiedItems: number;
  pendingActions: number;
}

export const StatsSection = ({ 
  totalReported, 
  totalClaimed, 
  verifiedItems, 
  pendingActions 
}: StatsSectionProps) => {
  const stats = [
    {
      label: 'Items Reported',
      value: totalReported,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Items Claimed',
      value: totalClaimed,
      icon: CheckCircle,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      label: 'Verified Items',
      value: verifiedItems,
      icon: FileCheck,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      label: 'Pending Actions',
      value: pendingActions,
      icon: Clock,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="p-4 bg-card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl text-foreground">{stat.value}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
