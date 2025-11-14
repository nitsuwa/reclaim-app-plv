import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PLVLogo } from './PLVLogo';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase/client';

export const ResetPasswordPage = () => {
  const { setCurrentPage } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [step, setStep] = useState(1); // 1 = form, 2 = success

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

  // Check if recovery session exists
  useEffect(() => {
    const checkSession = async () => {
      console.log('🔍 Checking recovery session...');
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setError('Invalid or expired reset link. Please request a new one.');
          setIsLoading(false);
          setSessionValid(false);
          return;
        }

        if (!session) {
          console.log('❌ No session found');
          setError('Invalid or expired reset link. Please request a new one.');
          setIsLoading(false);
          setSessionValid(false);
          return;
        }

        console.log('✅ Valid recovery session found');
        setSessionValid(true);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
        setIsLoading(false);
        setSessionValid(false);
      }
    };

    checkSession();
  }, []);

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/\d/.test(password)) strength += 15;
    if (/[!@#$%^&*]/.test(password)) strength += 15;
    
    let label = 'Weak';
    let color = 'text-destructive';
    
    if (strength >= 70) {
      label = 'Strong';
      color = 'text-green-600';
    } else if (strength >= 50) {
      label = 'Medium';
      color = 'text-yellow-600';
    }
    
    return { strength, label, color };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password requirements
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
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
    setError('');

    try {
      console.log('🔄 Updating password...');
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('❌ Password update error:', updateError);
        setError(updateError.message || 'Failed to update password. Please try again.');
        setIsLoading(false);
        return;
      }

      console.log('✅ Password updated successfully');
      
      // Clear the URL parameters
      window.history.replaceState(null, '', window.location.pathname);
      
      // Show success screen
      setStep(2);
      setIsLoading(false);
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Loading state
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
