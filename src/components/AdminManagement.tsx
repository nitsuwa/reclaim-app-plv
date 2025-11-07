import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { ScrollArea } from './ui/scroll-area';
import { UserPlus, Edit, Trash2, Shield, Search, CheckCircle, XCircle, User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AdminUser } from '../types';
import { motion } from 'motion/react';
import { getAdminUsers, createAdminUser, updateAdminProfile, deleteUser, logAdminActivity, signOut } from '../lib/supabase';

interface AdminManagementProps {
  currentUserId?: string;
  currentUserName?: string;
  onAdminActionComplete?: () => Promise<void>;
}

export const AdminManagement = ({ currentUserId, currentUserName, onAdminActionComplete }: AdminManagementProps) => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false); // Prevent double-clicks
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditConfirmDialog, setShowEditConfirmDialog] = useState(false);
  const [showCreateConfirmDialog, setShowCreateConfirmDialog] = useState(false);
  const [showEditSelfDialog, setShowEditSelfDialog] = useState(false);
  const [showEditSelfConfirmDialog, setShowEditSelfConfirmDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    contactNumber: '',
    email: ''
  });

  const [selfEditFormData, setSelfEditFormData] = useState({
    fullName: '',
    contactNumber: '',
  });

  const [formErrors, setFormErrors] = useState({
    fullName: '',
    studentId: '',
    contactNumber: '',
    email: ''
  });

  const [selfEditFormErrors, setSelfEditFormErrors] = useState({
    fullName: '',
    contactNumber: '',
  });

  // Load admin users from database
  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    setLoading(true);
    const result = await getAdminUsers();
    if (result.success && result.data) {
      // Map database users to AdminUser type
      const admins: AdminUser[] = result.data.map((user: any) => ({
        id: user.id,
        fullName: user.full_name,
        studentId: user.student_id,
        contactNumber: user.contact_number,
        email: user.email,
        role: 'admin',
        createdAt: user.created_at,
        status: user.status,
        createdBy: user.created_by || 'system'
      }));
      setAdminUsers(admins);
      
      // Find current admin user
      const current = admins.find(admin => admin.id === currentUserId);
      setCurrentAdmin(current || null);
    } else {
      toast.error('Failed to load admin users');
    }
    setLoading(false);
  };

  const filteredAdmins = adminUsers.filter(admin => 
    admin.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      fullName: '',
      studentId: '',
      contactNumber: '',
      email: ''
    });
    setFormErrors({
      fullName: '',
      studentId: '',
      contactNumber: '',
      email: ''
    });
  };

  const validateCreateForm = () => {
    const errors = {
      fullName: '',
      studentId: '',
      contactNumber: '',
      email: ''
    };

    let isValid = true;

    // Full Name validation
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
      isValid = false;
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!formData.email.endsWith('@plv.edu.ph')) {
      errors.email = 'Email must end with @plv.edu.ph';
      isValid = false;
    } else if (!/^[a-zA-Z0-9._%+-]+@plv\.edu\.ph$/.test(formData.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }

    // Contact Number validation
    if (!formData.contactNumber.trim()) {
      errors.contactNumber = 'Contact number is required';
      isValid = false;
    } else if (!/^09\d{9}$/.test(formData.contactNumber)) {
      errors.contactNumber = 'Contact number must be 11 digits starting with 09';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const validateSelfEditForm = () => {
    const errors = {
      fullName: '',
      contactNumber: '',
    };

    let isValid = true;

    // Full Name validation
    if (!selfEditFormData.fullName.trim()) {
      errors.fullName = 'Full name is required';
      isValid = false;
    } else if (selfEditFormData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
      isValid = false;
    }

    // Contact Number validation
    if (!selfEditFormData.contactNumber.trim()) {
      errors.contactNumber = 'Contact number is required';
      isValid = false;
    } else if (!/^09\d{9}$/.test(selfEditFormData.contactNumber)) {
      errors.contactNumber = 'Contact number must be 11 digits starting with 09';
      isValid = false;
    }

    setSelfEditFormErrors(errors);
    return isValid;
  };

  const handleCreateAdminConfirm = () => {
    if (!validateCreateForm()) {
      return;
    }

    // Check if email already exists
    if (adminUsers.some(admin => admin.email.toLowerCase() === formData.email.toLowerCase())) {
      setFormErrors(prev => ({ ...prev, email: 'Email already exists' }));
      return;
    }

    // Show confirmation dialog
    setShowCreateConfirmDialog(true);
  };

  const handleCreateAdmin = async () => {
    if (processing) return;
    
    setShowCreateConfirmDialog(false);
    setProcessing(true);

    try {
      // Create admin account (Admin ID will be auto-generated)
      const result = await createAdminUser(
        {
          email: formData.email.trim().toLowerCase(),
          fullName: formData.fullName.trim(),
          contactNumber: formData.contactNumber.trim(),
          // No studentId - will be auto-generated
        },
        currentUserId || null
      );

      if (result.success) {
        toast.success('Admin account created!', {
          description: 'A password reset email has been sent to the admin. They can set their own password.',
          duration: 8000
        });

        // Log admin activity
        if (currentUserId && currentUserName) {
          await logAdminActivity({
            adminId: currentUserId,
            adminName: currentUserName,
            actionType: 'admin_created',
            targetUserName: formData.fullName.trim(),
            details: {
              email: formData.email.trim(),
            }
          });
          // Refresh admin logs in AdminDashboard
          if (onAdminActionComplete) {
            await onAdminActionComplete();
          }
        }
        
        // Reload admin users
        await loadAdminUsers();
        setShowCreateDialog(false);
        resetForm();
      } else {
        // Check if it's a duplicate email error
        if (result.error?.includes('duplicate') || result.error?.includes('unique')) {
          if (result.error.includes('email')) {
            setFormErrors(prev => ({ ...prev, email: 'Email already exists in database' }));
          } else {
            toast.error(`Failed to create admin: ${result.error}`);
          }
        } else {
          toast.error(`Failed to create admin: ${result.error}`);
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleEditAdminConfirm = () => {
    if (!selectedAdmin) return;

    // Validate only fullName, studentId, and contactNumber (NOT email)
    const errors = {
      fullName: '',
      studentId: '',
      contactNumber: '',
      email: ''
    };

    let isValid = true;

    // Full Name validation
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
      isValid = false;
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
      isValid = false;
    }

    // Contact Number validation
    if (!formData.contactNumber.trim()) {
      errors.contactNumber = 'Contact number is required';
      isValid = false;
    } else if (!/^09\d{9}$/.test(formData.contactNumber)) {
      errors.contactNumber = 'Contact number must be 11 digits starting with 09';
      isValid = false;
    }

    setFormErrors(errors);

    if (!isValid) {
      return;
    }

    // Show confirmation dialog
    setShowEditConfirmDialog(true);
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin || processing) return;

    setShowEditConfirmDialog(false);
    setProcessing(true);

    try {
      // Update admin profile in database (NO EMAIL OR ADMIN ID EDITING)
      const result = await updateAdminProfile(selectedAdmin.id, {
        fullName: formData.fullName.trim(),
        contactNumber: formData.contactNumber.trim(),
      });

      if (result.success) {
        toast.success('Admin account updated successfully', {
          duration: 3000
        });

        // Log admin activity
        if (currentUserId && currentUserName) {
          await logAdminActivity({
            adminId: currentUserId,
            adminName: currentUserName,
            actionType: 'admin_edited',
            targetUserId: selectedAdmin.id,
            targetUserName: selectedAdmin.fullName,
            details: {
              changes: {
                fullName: formData.fullName.trim(),
                contactNumber: formData.contactNumber.trim(),
              }
            }
          });
          // Refresh admin logs in AdminDashboard
          if (onAdminActionComplete) {
            await onAdminActionComplete();
          }
        }
        
        // Delay reload to let toast be visible
        setTimeout(async () => {
          await loadAdminUsers();
          setShowEditDialog(false);
          setSelectedAdmin(null);
          resetForm();
        }, 500);
      } else {
        // Check if it's a duplicate error
        if (result.error?.includes('duplicate') || result.error?.includes('unique')) {
          if (result.error.includes('email')) {
            setFormErrors(prev => ({ ...prev, email: 'Email already exists in database' }));
          } else if (result.error.includes('student_id')) {
            setFormErrors(prev => ({ ...prev, studentId: 'Admin ID already exists in database' }));
          } else {
            toast.error(`Failed to update admin: ${result.error}`);
          }
        } else {
          toast.error(`Failed to update admin: ${result.error}`);
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleEditSelfProfile = () => {
    if (!currentAdmin) {
      toast.error('Unable to load your profile');
      return;
    }

    setSelfEditFormData({
      fullName: currentAdmin.fullName,
      contactNumber: currentAdmin.contactNumber,
    });
    setSelfEditFormErrors({
      fullName: '',
      contactNumber: '',
    });
    setShowEditSelfDialog(true);
  };

  const handleEditSelfConfirm = () => {
    if (!validateSelfEditForm()) {
      return;
    }

    setShowEditSelfConfirmDialog(true);
  };

  const handleEditSelf = async () => {
    if (!currentAdmin || processing) return;

    setShowEditSelfConfirmDialog(false);
    setProcessing(true);

    try {
      const result = await updateAdminProfile(currentAdmin.id, {
        fullName: selfEditFormData.fullName.trim(),
        contactNumber: selfEditFormData.contactNumber.trim(),
      });

      if (result.success) {
        toast.success('Your profile updated successfully!', {
          duration: 3000
        });

        // Log admin activity
        if (currentUserId && currentUserName) {
          await logAdminActivity({
            adminId: currentUserId,
            adminName: currentUserName,
            actionType: 'profile_edited',
            details: {
              changes: {
                fullName: selfEditFormData.fullName.trim(),
                contactNumber: selfEditFormData.contactNumber.trim(),
              }
            }
          });
          // Refresh admin logs in AdminDashboard
          if (onAdminActionComplete) {
            await onAdminActionComplete();
          }
        }

        // Delay reload to let toast be visible
        setTimeout(async () => {
          await loadAdminUsers();
          setShowEditSelfDialog(false);
        }, 500);
      } else {
        toast.error(`Failed to update profile: ${result.error}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteAdminConfirm = (admin: AdminUser) => {
    // Prevent deleting yourself
    if (admin.id === currentUserId) {
      toast.error('You cannot delete your own account', {
        description: 'Ask another admin to delete your account if needed.',
        duration: 5000
      });
      return;
    }

    setSelectedAdmin(admin);
    setShowDeleteDialog(true);
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin || processing) return;

    setProcessing(true);
    
    const deletedAdminName = selectedAdmin.fullName;
    const deletedAdminId = selectedAdmin.id;
    const deletedAdminEmail = selectedAdmin.email;
    const deletedAdminStudentId = selectedAdmin.studentId;
    const isDeletingOwnAccount = deletedAdminId === currentUserId;

    try {
      // Log admin activity BEFORE deleting (so we can refresh logs)
      if (!isDeletingOwnAccount && currentUserId && currentUserName) {
        await logAdminActivity({
          adminId: currentUserId,
          adminName: currentUserName,
          actionType: 'admin_deleted',
          targetUserId: deletedAdminId,
          targetUserName: deletedAdminName,
          details: {
            email: deletedAdminEmail,
            studentId: deletedAdminStudentId
          }
        });
      }

      const result = await deleteUser(selectedAdmin.id);
      if (result.success) {
        toast.success('Admin account deleted successfully');

        // Refresh admin logs in AdminDashboard
        if (!isDeletingOwnAccount && onAdminActionComplete) {
          await onAdminActionComplete();
        }

        setShowDeleteDialog(false);
        setSelectedAdmin(null);

        // If user deleted their own account, log them out and reload
        if (isDeletingOwnAccount) {
          await signOut();
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          // Otherwise just reload the admin list (no page reload needed)
          await loadAdminUsers();
        }
      } else {
        toast.error(`Failed to delete admin: ${result.error}`);
        setShowDeleteDialog(false);
        setSelectedAdmin(null);
      }
    } finally {
      setProcessing(false);
    }
  };

  const openEditDialog = (admin: AdminUser) => {
    // Prevent editing your own account via this dialog (use Edit My Profile instead)
    if (admin.id === currentUserId) {
      toast.error('Use "Edit My Profile" to edit your own account', {
        description: 'Click the button at the top to edit your profile.',
        duration: 5000
      });
      return;
    }

    setSelectedAdmin(admin);
    setFormData({
      fullName: admin.fullName,
      studentId: admin.studentId,
      contactNumber: admin.contactNumber,
      email: admin.email
    });
    setShowEditDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading admin users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-sm border border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 font-bold">
                <Shield className="h-5 w-5 text-accent" />
                Admin Account Management
              </CardTitle>
              <CardDescription className="mt-2">
                Create and manage admin/guard accounts for the Lost & Found system
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleEditSelfProfile}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <User className="h-4 w-4 mr-2" />
                Edit My Profile
              </Button>
              <Button 
                onClick={() => {
                  resetForm();
                  setShowCreateDialog(true);
                }}
                className="bg-accent text-white hover:bg-accent/90 w-full sm:w-auto"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Admin
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Admin List Card */}
      <Card className="shadow-sm border border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <CardTitle>Admin Accounts</CardTitle>
              <CardDescription className="mt-1">View and manage all admin accounts</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAdmins.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No admins found matching your search' : 'No admin accounts yet'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Admin ID</TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {admin.fullName}
                              {admin.id === currentUserId && (
                                <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground md:hidden">{admin.studentId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{admin.studentId}</TableCell>
                        <TableCell className="hidden lg:table-cell">{admin.email}</TableCell>
                        <TableCell className="hidden lg:table-cell">{admin.contactNumber}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={admin.status === 'active' ? 'default' : 'secondary'}
                            className={admin.status === 'active' ? 'bg-accent text-white' : 'bg-neutral-accent text-white'}
                          >
                            {admin.status === 'active' ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {admin.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(admin)}
                              className="hover:bg-accent hover:text-white"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-2">Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteAdminConfirm(admin)}
                              className="hover:bg-destructive hover:text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Admin Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Admin Account</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new admin/guard account. Admin ID will be auto-generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Full Name *</Label>
              <Input
                id="create-name"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  setFormErrors({ ...formErrors, fullName: '' });
                }}
                className={formErrors.fullName ? 'border-red-500' : ''}
              />
              {formErrors.fullName && (
                <p className="text-sm text-red-500">{formErrors.fullName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="admin@plv.edu.ph"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setFormErrors({ ...formErrors, email: '' });
                }}
                className={formErrors.email ? 'border-red-500' : ''}
              />
              {formErrors.email && (
                <p className="text-sm text-red-500">{formErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-contact">Contact Number *</Label>
              <Input
                id="create-contact"
                placeholder="09123456789"
                value={formData.contactNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 11) {
                    setFormData({ ...formData, contactNumber: value });
                    setFormErrors({ ...formErrors, contactNumber: '' });
                  }
                }}
                maxLength={11}
                className={formErrors.contactNumber ? 'border-red-500' : ''}
              />
              {formErrors.contactNumber && (
                <p className="text-sm text-red-500">{formErrors.contactNumber}</p>
              )}
              <p className="text-xs text-muted-foreground">Format: 09XXXXXXXXX (11 digits)</p>
            </div>
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                ℹ️ Admin ID will be automatically generated (e.g., ADMIN-001, ADMIN-002)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdminConfirm} className="bg-accent text-white hover:bg-accent/90" disabled={processing}>
              <UserPlus className="h-4 w-4 mr-2" />
              {processing ? 'Creating...' : 'Create Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Other Admin Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Admin Account</DialogTitle>
            <DialogDescription>
              Update the admin account details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  setFormErrors({ ...formErrors, fullName: '' });
                }}
                className={formErrors.fullName ? 'border-red-500' : ''}
              />
              {formErrors.fullName && (
                <p className="text-sm text-red-500">{formErrors.fullName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-id">Admin ID (Read-only)</Label>
              <Input
                id="edit-id"
                placeholder="e.g., ADMIN-003"
                value={formData.studentId}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Admin ID cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact">Contact Number *</Label>
              <Input
                id="edit-contact"
                placeholder="09123456789"
                value={formData.contactNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 11) {
                    setFormData({ ...formData, contactNumber: value });
                    setFormErrors({ ...formErrors, contactNumber: '' });
                  }
                }}
                maxLength={11}
                className={formErrors.contactNumber ? 'border-red-500' : ''}
              />
              {formErrors.contactNumber && (
                <p className="text-sm text-red-500">{formErrors.contactNumber}</p>
              )}
              <p className="text-xs text-muted-foreground">Format: 09XXXXXXXXX (11 digits)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email-display">Email (Read-only)</Label>
              <Input
                id="edit-email-display"
                value={formData.email}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleEditAdminConfirm} className="bg-accent text-white hover:bg-accent/90" disabled={processing}>
              <Edit className="h-4 w-4 mr-2" />
              {processing ? 'Updating...' : 'Update Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit My Profile Dialog */}
      <Dialog open={showEditSelfDialog} onOpenChange={setShowEditSelfDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit My Profile</DialogTitle>
            <DialogDescription>
              Update your personal information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="self-name">Full Name *</Label>
              <Input
                id="self-name"
                placeholder="Enter full name"
                value={selfEditFormData.fullName}
                onChange={(e) => {
                  setSelfEditFormData({ ...selfEditFormData, fullName: e.target.value });
                  setSelfEditFormErrors({ ...selfEditFormErrors, fullName: '' });
                }}
                className={selfEditFormErrors.fullName ? 'border-red-500' : ''}
              />
              {selfEditFormErrors.fullName && (
                <p className="text-sm text-red-500">{selfEditFormErrors.fullName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="self-contact">Contact Number *</Label>
              <Input
                id="self-contact"
                placeholder="09123456789"
                value={selfEditFormData.contactNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 11) {
                    setSelfEditFormData({ ...selfEditFormData, contactNumber: value });
                    setSelfEditFormErrors({ ...selfEditFormErrors, contactNumber: '' });
                  }
                }}
                maxLength={11}
                className={selfEditFormErrors.contactNumber ? 'border-red-500' : ''}
              />
              {selfEditFormErrors.contactNumber && (
                <p className="text-sm text-red-500">{selfEditFormErrors.contactNumber}</p>
              )}
              <p className="text-xs text-muted-foreground">Format: 09XXXXXXXXX (11 digits)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="self-email-display">Email (Read-only)</Label>
              <Input
                id="self-email-display"
                value={currentAdmin?.email || ''}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="self-id-display">Admin ID (Read-only)</Label>
              <Input
                id="self-id-display"
                value={currentAdmin?.studentId || ''}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Admin ID cannot be changed</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSelfDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleEditSelfConfirm} className="bg-accent text-white hover:bg-accent/90" disabled={processing}>
              <Edit className="h-4 w-4 mr-2" />
              {processing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the admin account for <strong>{selectedAdmin?.fullName}</strong>? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={processing}
            >
              {processing ? 'Deleting...' : 'Delete Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Other Admin Confirmation Dialog */}
      <AlertDialog open={showEditConfirmDialog} onOpenChange={setShowEditConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Admin Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update the account details for <strong>{selectedAdmin?.fullName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditAdmin}
              className="bg-accent text-white hover:bg-accent/90"
              disabled={processing}
            >
              {processing ? 'Updating...' : 'Update Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Self Confirmation Dialog */}
      <AlertDialog open={showEditSelfConfirmDialog} onOpenChange={setShowEditSelfConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Your Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update your profile information?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditSelf}
              className="bg-accent text-white hover:bg-accent/90"
              disabled={processing}
            >
              {processing ? 'Saving...' : 'Save Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Confirmation Dialog */}
      <AlertDialog open={showCreateConfirmDialog} onOpenChange={setShowCreateConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Admin Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to create a new admin account with the following details?
              <div className="mt-3 space-y-1 text-sm">
                <p><strong>Name:</strong> {formData.fullName}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Contact:</strong> {formData.contactNumber}</p>
                <p><strong>Admin ID:</strong> Auto-generated</p>
              </div>
              <p className="mt-3 text-xs">A password reset email will be sent to the admin.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateAdmin}
              className="bg-accent text-white hover:bg-accent/90"
              disabled={processing}
            >
              {processing ? 'Creating...' : 'Create Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
