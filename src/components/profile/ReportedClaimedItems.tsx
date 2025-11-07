import { useState } from 'react';
import { LostItem, Claim } from '../../types';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useApp } from '../../context/AppContext';
import { Search, MapPin, Calendar, Clock, Package, FileText, Info, Filter, Trash2, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner@2.0.3';
import { deleteUserReportedItems, deleteUserClaims } from '../../lib/supabase/database';

interface ReportedClaimedItemsProps {
  reportedItems: LostItem[];
  claimedItems: Array<{ claim: Claim; item: LostItem }>;
}

export const ReportedClaimedItems = ({ reportedItems, claimedItems }: ReportedClaimedItemsProps) => {
  const { currentUser, clearUserReportedItems, clearUserClaimedItems } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showClearReportedDialog, setShowClearReportedDialog] = useState(false);
  const [showClearClaimedDialog, setShowClearClaimedDialog] = useState(false);
  const [unblurredPhotos, setUnblurredPhotos] = useState<Set<string>>(new Set());

  const handleClearReported = async () => {
    if (currentUser) {
      const result = await deleteUserReportedItems(currentUser.id);
      if (result.success) {
        const count = (result as any).count || 0;
        setShowClearReportedDialog(false);
        if (count > 0) {
          toast.success(`Cleared ${count} pending item${count === 1 ? '' : 's'}`);
          // Delay reload to let user see the toast
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          toast.info('No pending items to clear. Verified items are institutional records.');
        }
      } else {
        console.error('Failed to clear reported items:', result.error);
        toast.error(`Failed to clear reported items: ${result.error || 'Unknown error'}`);
        setShowClearReportedDialog(false);
      }
    }
  };

  const handleClearClaimed = async () => {
    if (currentUser) {
      const result = await deleteUserClaims(currentUser.id);
      if (result.success) {
        const count = (result as any).count || 0;
        setShowClearClaimedDialog(false);
        if (count > 0) {
          toast.success(`Cleared ${count} pending/rejected claim${count === 1 ? '' : 's'}`);
          // Delay reload to let user see the toast
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          toast.info('No pending/rejected claims to clear. Approved claims are institutional records.');
        }
      } else {
        console.error('Failed to clear claimed items:', result.error);
        toast.error(`Failed to clear claimed items: ${result.error || 'Unknown error'}`);
        setShowClearClaimedDialog(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { 
        label: 'Pending Verification', 
        className: 'bg-muted text-muted-foreground',
        icon: Clock
      },
      verified: { 
        label: 'Verified', 
        className: 'bg-accent text-accent-foreground',
        icon: FileText
      },
      claimed: { 
        label: 'Claimed', 
        className: 'bg-primary text-primary-foreground',
        icon: Package
      },
      approved: { 
        label: 'Claim Approved', 
        className: 'bg-primary text-primary-foreground',
        icon: FileText
      },
      rejected: { 
        label: 'Rejected', 
        className: 'bg-destructive text-destructive-foreground',
        icon: FileText
      }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filterItems = (items: LostItem[]) => {
    return items.filter(item => {
      const matchesSearch = 
        item.itemType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.otherItemTypeDetails?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const filterClaims = (claims: Array<{ claim: Claim; item: LostItem }>) => {
    return claims.filter(({ claim, item }) => {
      const matchesSearch = 
        item.itemType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.otherItemTypeDetails?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const filteredReported = filterItems(reportedItems);
  const filteredClaimed = filterClaims(claimedItems);

  return (
    <Card className="p-6 bg-card">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-primary">My Items & Claims</h3>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Track items you've reported and claims you've submitted.</p>
          </div>
        </div>
          
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item type or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 pl-10">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs for Reported and Claimed Items */}
        <Tabs defaultValue="reported" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="reported" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Reported Items</span>
              <span className="sm:hidden">Reported</span>
              <Badge variant="secondary" className="ml-1">{filteredReported.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="claimed" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Claimed Items</span>
              <span className="sm:hidden">Claims</span>
              <Badge variant="secondary" className="ml-1">{filteredClaimed.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Reported Items Tab */}
          <TabsContent value="reported">
            {reportedItems.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearReportedDialog(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Reported Items
                </Button>
              </div>
            )}
            {filteredReported.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">No reported items found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filter'
                    : 'Items you report will appear here'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {filteredReported.map((item) => (
                    <Card key={item.id} className="p-4 bg-background hover:shadow-md transition-all border-l-4 border-l-accent overflow-hidden">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Item Image */}
                        <div 
                          className="relative w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center cursor-pointer group/photo"
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
                                  className={`w-full h-full object-cover transition-all ${
                                    unblurredPhotos.has(item.id) ? '' : 'blur-md'
                                  }`}
                                />
                                {!unblurredPhotos.has(item.id) && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg group-hover/photo:bg-black/40 transition-colors">
                                    <Eye className="h-6 w-6 text-white group-hover/photo:scale-110 transition-transform" />
                                  </div>
                                )}
                              </>
                            ) : (
                              <Package className="h-10 w-10 text-muted-foreground opacity-40" />
                            );
                          })()}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-foreground break-words overflow-wrap-anywhere">
                                {item.itemType}
                                {item.otherItemTypeDetails && ` - ${item.otherItemTypeDetails}`}
                              </h4>
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(item.status)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{item.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span>{item.dateFound}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span>{item.timeFound}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span>{item.securityQuestions.length} security {item.securityQuestions.length === 1 ? 'question' : 'questions'}</span>
                            </div>
                          </div>

                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 italic break-all">
                              "{item.description}"
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Claimed Items Tab */}
          <TabsContent value="claimed">
            {claimedItems.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearClaimedDialog(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Claimed Items
                </Button>
              </div>
            )}
            {filteredClaimed.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">No claimed items found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filter'
                    : 'Items you claim will appear here'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {filteredClaimed.map(({ claim, item }) => (
                    <Card key={claim.id} className="p-4 bg-background hover:shadow-md transition-all border-l-4 border-l-primary overflow-hidden">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Item Image */}
                        <div 
                          className="relative w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center cursor-pointer group/photo"
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
                                  className={`w-full h-full object-cover transition-all ${
                                    unblurredPhotos.has(item.id) ? '' : 'blur-md'
                                  }`}
                                />
                                {!unblurredPhotos.has(item.id) && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg group-hover/photo:bg-black/40 transition-colors">
                                    <Eye className="h-6 w-6 text-white group-hover/photo:scale-110 transition-transform" />
                                  </div>
                                )}
                              </>
                            ) : (
                              <Package className="h-10 w-10 text-muted-foreground opacity-40" />
                            );
                          })()}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-foreground break-words overflow-wrap-anywhere">
                                {item.itemType}
                                {item.otherItemTypeDetails && ` - ${item.otherItemTypeDetails}`}
                              </h4>
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(claim.status)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{item.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span>{item.dateFound}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span>Claim Code: <span className="font-mono text-accent">{claim.claimCode}</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span>Submitted: {new Date(claim.submittedAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 italic break-all">
                              "{item.description}"
                            </p>
                          )}

                          {/* Claim Instructions */}
                          {claim.status === 'approved' && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-sm text-primary mt-2">
                              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <p>Your claim has been approved and the item has been released!</p>
                            </div>
                          )}
                          {claim.status === 'pending' && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground mt-2">
                              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <p>Your claim is being reviewed by the guard. You'll be notified once it's processed.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Clear Reported Items Confirmation Dialog */}
      <AlertDialog open={showClearReportedDialog} onOpenChange={setShowClearReportedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Reported Items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all items you've reported from your history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearReported}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Reported Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Claimed Items Confirmation Dialog */}
      <AlertDialog open={showClearClaimedDialog} onOpenChange={setShowClearClaimedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Claimed Items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all your claim submissions from your history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearClaimed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Claimed Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
