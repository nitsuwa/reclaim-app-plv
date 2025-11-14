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
  const { setCurrentPage, currentUser } = useApp();
  const [step, setStep] = useState(1); // 1: Form, 2: Success
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);

  // ✅ VERIFY SESSION EXISTS (Supabase auto-creates it from the magic link)
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('🔍 Verifying password reset session...');
        
        // Check URL for recovery type
        const searchParams = new URLSearchParams(window.location.search);
        const queryType = searchParams.get('type');
        const hash = window.location.hash;
        let hashType = null;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          hashType = hashParams.get('type');
        }
        const type = queryType || hashType;
        
        if (type !== 'recovery') {
          console.error('❌ Not a recovery flow');
          setError('Invalid password reset link.');
          setSessionChecked(true);
          return;
        }

        // Wait a moment for session to be established
        await new Promise(resolve => setTimeout(resolve, 1500));

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setError('Failed to verify reset link. Please try again.');
          setSessionChecked(true);
          return;
        }

        if (!session) {
          console.error('❌ No session found');
          setError('Invalid or expired reset link. Please request a new one.');
          setSessionChecked(true);
          return;
        }

        console.log('✅ Password reset session verified for:', session.user.email);
        setHasValidSession(true);
        setSessionChecked(true);
      } catch (err) {
        console.error('❌ Session check error:', err);
        setError('Failed to verify reset link. Please try again.');
        setSessionChecked(true);
      }
    };

    checkSession();
  }, []);

  const getPasswordStrength = () => {
    if (!newPassword) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (newPassword.length >= 8) strength += 25;
    if (newPassword.length >= 12) strength += 25;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) strength += 25;
    if (/\d/.test(newPassword) && /[!@#$%^&*]/.test(newPassword)) strength += 25;

    if (strength <= 25) return { strength, label: 'Weak', color: 'bg-destructive' };
    if (strength <= 50) return { strength, label: 'Fair', color: 'bg-accent' };
    if (strength <= 75) return { strength, label: 'Good', color: 'bg-secondary' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

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

    setIsLoading(true);

    try {
      console.log('🔄 Updating password...');
      
      // Get current session to find student_id
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Session expired. Please request a new password reset link.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('❌ Password update error:', error);
        setError(error.message || 'Failed to reset password');
        setIsLoading(false);
        return;
      }

      console.log('✅ Password updated successfully');

      // ✅ CLEAR ALL LOCKOUTS AND ATTEMPTS for this user
      // Get student_id from email or from database
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
      
      // ✅ CLEAR RECOVERY FLAG FROM LOCALSTORAGE
      console.log('🧹 Clearing recovery flag from localStorage');
      localStorage.removeItem('plv_recovery_in_progress');
      
      // Sign out the user so they can log in with new password
      await supabase.auth.signOut();
      
      // ✅ CLEAR URL PARAMETERS after successful reset
      window.history.replaceState(null, '', window.location.pathname);
      
      setStep(2);
      setIsLoading(false);
    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      setError(err.message || 'Failed to reset password');
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  // Show loading while checking session
  if (!sessionChecked) {
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
  if (!hasValidSession && error) {
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
                Your password has been updated. You can now log in with your new password.
              </p>
            </div>
            <Button 
              onClick={() => setCurrentPage('login')} 
              className="w-full h-12 bg-accent text-white hover:bg-accent/90 shadow-md"
            >
              Go to Login
            </Button>
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
              {currentUser ? `Resetting password for ${currentUser.email}` : 'Enter your new password below'}
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
                  disabled={isLoading}
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
                    <span className={`font-medium ${
                      passwordStrength.strength <= 25 ? 'text-destructive' :
                      passwordStrength.strength <= 50 ? 'text-accent' :
                      passwordStrength.strength <= 75 ? 'text-secondary' :
                      'text-green-600'
                    }`}>{passwordStrength.label}</span>
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
                  disabled={isLoading}
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
              disabled={isLoading}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};