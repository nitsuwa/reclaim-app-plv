import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { PLVLogo } from './PLVLogo';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { supabase } from '../lib/supabase/client';

export const ResetPasswordPage = () => {
  const { setCurrentPage } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sessionValid, setSessionValid] = useState(true);
  const [step, setStep] = useState(1); // 1: Reset form, 2: Success
  
  // ✅ BROADCAST AUTH FLOW STATUS TO OTHER TABS
  useEffect(() => {
    // Set localStorage flag immediately (persists across refreshes)
    console.log('🔒 Setting recovery flow flag in localStorage');
    localStorage.setItem('plv_recovery_in_progress', 'true');
    
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('plv_auth_flow');
      console.log('📡 Broadcasting: Recovery flow started');
      channel.postMessage({ type: 'AUTH_FLOW_START', flow: 'recovery' });
      
      return () => {
        console.log('🔓 Removing recovery flow flag from localStorage');
        localStorage.removeItem('plv_recovery_in_progress');
        console.log('📡 Broadcasting: Recovery flow ended');
        channel.postMessage({ type: 'AUTH_FLOW_END' });
        channel.close();
      };
    } else {
      // Fallback if BroadcastChannel not supported
      return () => {
        console.log('🔓 Removing recovery flow flag from localStorage');
        localStorage.removeItem('plv_recovery_in_progress');
      };
    }
  }, []);

  // ✅ VERIFY SESSION EXISTS (Supabase auto-creates it from the magic link)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkSession = async () => {
      try {
        console.log('🔍 Verifying password reset session...');
        
        // Add timeout protection (8 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Session check timed out after 8 seconds'));
          }, 8000);
        });
        
        const sessionPromise = supabase.auth.getSession();
        
        // Race between session check and timeout
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        clearTimeout(timeoutId);
        
        const { data: { session }, error: sessionError } = result;
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setError('Invalid or expired reset link. Please request a new one.');
          setSessionValid(false);
          setIsLoading(false);
          return;
        }
        
        if (!session) {
          console.error('❌ No session found');
          setError('Invalid or expired reset link. Please request a new one.');
          setSessionValid(false);
          setIsLoading(false);
          return;
        }
        
        console.log('✅ Password reset session verified for:', session.user.email);
        setSessionValid(true);
        setIsLoading(false);
      } catch (err: any) {
        console.error('❌ Unexpected error checking session:', err);
        // If timeout, show user-friendly message
        if (err.message?.includes('timed out')) {
          setError('Connection timed out. Please check your internet and try again.');
        } else {
          setError('An error occurred. Please try again.');
        }
        setSessionValid(false);
        setIsLoading(false);
      }
    };

    checkSession();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/\d/.test(newPassword)) {
      setError('Password must contain at least one number');
      return;
    }

    if (!/[!@#$%^&*]/.test(newPassword)) {
      setError('Password must contain at least one special character (!@#$%^&*)');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsUpdating(true);

    try {
      console.log('🔄 Updating password...');
      
      // Get current session to find student_id
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Session expired. Please request a new password reset link.');
        setIsUpdating(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('❌ Password update error:', updateError);
        setError(updateError.message || 'Failed to reset password');
        setIsUpdating(false);
        return;
      }

      console.log('✅ Password updated successfully');

      // ✅ CLEAR ALL LOCKOUTS AND ATTEMPTS for this user
      const userEmail = session.user.email;
      if (userEmail) {
        console.log('🔓 Clearing lockouts for email:', userEmail);
        
        // Look up student_id from database
        const { data: userData } = await supabase
          .from('users')
          .select('student_id')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (userData?.student_id) {
          console.log('🧹 Clearing all login attempts for student_id:', userData.student_id);
          
          // Use the SQL function to bypass RLS
          const { error: clearError } = await supabase.rpc('clear_login_attempts_for_student', {
            p_student_id: userData.student_id
          });
          
          if (clearError) {
            console.error('❌ Failed to clear lockouts:', clearError);
          } else {
            console.log('✅ Lockouts cleared successfully');
          }
        } else {
          console.warn('⚠️ Could not find student_id to clear lockouts');
        }
      }

      toast.success('Password reset successfully!');
      
      // ✅ SET LOCALSTORAGE FLAG TO NOTIFY OTHER TABS
      console.log('📢 Setting localStorage flag: plv_password_reset_complete');
      localStorage.setItem('plv_password_reset_complete', 'true');
      
      // ✅ CLEAR URL PARAMETERS after successful reset
      window.history.replaceState(null, '', window.location.pathname);
      
      // ✅ SET STEP TO SUCCESS PAGE FIRST
      setStep(2);
      setIsUpdating(false);
      
      // ✅ THEN SIGN OUT THE USER (after a small delay to ensure UI updates)
      setTimeout(async () => {
        console.log('👋 Signing out user after password reset');
        await supabase.auth.signOut();
        
        // ✅ CLEAR ALL FLAGS AFTER SIGNING OUT
        console.log('🔓 Clearing password reset flags');
        localStorage.removeItem('plv_password_reset_in_progress');
        localStorage.removeItem('plv_password_reset_complete');
      }, 100);
    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      setError(err.message || 'Failed to reset password');
      setIsUpdating(false);
    }
  };

  const getPasswordStrength = () => {
    if (!newPassword) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (newPassword.length >= 8) strength += 25;
    if (/[a-z]/.test(newPassword)) strength += 15;
    if (/[A-Z]/.test(newPassword)) strength += 15;
    if (/\d/.test(newPassword)) strength += 20;
    if (/[!@#$%^&*]/.test(newPassword)) strength += 25;

    let label = '';
    let color = '';
    if (strength <= 25) {
      label = 'Weak';
      color = 'text-destructive';
    } else if (strength <= 50) {
      label = 'Fair';
      color = 'text-accent';
    } else if (strength <= 75) {
      label = 'Good';
      color = 'text-secondary';
    } else {
      label = 'Strong';
      color = 'text-green-600';
    }

    return { strength, label, color };
  };

  const passwordStrength = getPasswordStrength();

  // Show loading while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-[#004d99] to-accent flex items-center justify-center p-4">
        <div className="text-white text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-lg">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Show error if session check failed
  if (!sessionValid && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-[#004d99] to-accent flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <Card className="w-full max-w-md shadow-2xl relative z-10 border border-primary/10 bg-white">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-destructive rounded-full p-6 shadow-md">
                <AlertCircle className="h-16 w-16 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-primary">Reset Link Invalid</h2>
              <p className="text-muted-foreground">
                {error}
              </p>
            </div>
            <Button 
              onClick={() => {
                // Clear URL parameters before navigating
                window.history.replaceState(null, '', window.location.pathname);
                setCurrentPage('forgot-password');
              }} 
              className="w-full h-12 bg-accent text-white hover:bg-accent/90 shadow-md"
            >
              Request New Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success page
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-[#004d99] to-accent flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <Card className="w-full max-w-md shadow-2xl relative z-10 border border-primary/10 bg-white">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-accent rounded-full p-6 shadow-md animate-pulse">
                <CheckCircle2 className="h-16 w-16 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-primary">Password Reset Successfully!</h2>
              <p className="text-muted-foreground">
                Your password has been updated.
              </p>
              <p className="text-primary font-medium">
                You can now close this tab and log in with your new password.
              </p>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={() => window.close()} 
                className="w-full h-12 bg-accent text-white hover:bg-accent/90 shadow-md"
              >
                Close This Tab
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-[#004d99] to-accent flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <Card className="w-full max-w-md shadow-2xl relative z-10 border border-primary/10 bg-white">
        <CardHeader className="space-y-4 pb-6 border-b-0">
          <PLVLogo size="md" />
          <div className="text-center space-y-2">
            <CardTitle className="text-primary">Create New Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                  }}
                  required
                  disabled={isUpdating}
                  className="h-12 pr-10 border-2 focus:border-accent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Password strength:</span>
                    <span className={`font-medium ${passwordStrength.color}`}>{passwordStrength.label}</span>
                  </div>
                  <Progress value={passwordStrength.strength} className="h-2" />
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Requirements:</p>
                    <p className={`text-xs flex items-center gap-1 ${newPassword.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {newPassword.length >= 8 ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      At least 8 characters
                    </p>
                    <p className={`text-xs flex items-center gap-1 ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {/[a-z]/.test(newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      One lowercase letter
                    </p>
                    <p className={`text-xs flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {/[A-Z]/.test(newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      One uppercase letter
                    </p>
                    <p className={`text-xs flex items-center gap-1 ${/\d/.test(newPassword) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {/\d/.test(newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      One number
                    </p>
                    <p className={`text-xs flex items-center gap-1 ${/[!@#$%^&*]/.test(newPassword) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {/[!@#$%^&*]/.test(newPassword) ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      One special character (!@#$%^&*)
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  required
                  disabled={isUpdating}
                  className="h-12 pr-10 border-2 focus:border-accent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-accent text-white hover:bg-accent/90 shadow-md transition-all hover:shadow-lg"
              disabled={isUpdating}
            >
              {isUpdating ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
