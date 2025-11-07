import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { PLVLogo } from './PLVLogo';
import { supabase } from '../lib/supabase/client';

export const EmailVerifiedPage = () => {
  const { setCurrentPage, currentUser, setCurrentUser } = useApp();
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log('🔍 Starting email verification check...');
        console.log('🌐 Full URL:', window.location.href);

        // Wait a moment for everything to settle
        await new Promise(resolve => setTimeout(resolve, 800));

        // STRATEGY 1: Check if user is already logged in with verified email
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ Session found:', session.user.email);
          console.log('📧 Email confirmed at:', session.user.email_confirmed_at);
          
          if (session.user.email_confirmed_at) {
            console.log('🎉 Email is verified! User was auto-logged in by Supabase');
            
            // Email is verified! Sign them out so they can login fresh
            await supabase.auth.signOut();
            console.log('👋 Signed out - user must now log in manually');
            
            setVerificationStatus('success');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          } else {
            console.warn('⚠️ Session exists but email not confirmed yet');
            // Don't fail yet - try token method below
          }
        }

        // STRATEGY 2: Try to get tokens from URL (hash or query params)
        let accessToken = null;
        let refreshToken = null;

        // Check hash first
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
          console.log('🔑 Hash tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
        }

        // Fallback to query params
        if (!accessToken) {
          const searchParams = new URLSearchParams(window.location.search);
          accessToken = searchParams.get('access_token');
          refreshToken = searchParams.get('refresh_token');
          console.log('🔑 Query tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
        }

        if (accessToken && refreshToken) {
          console.log('✅ Tokens found! Setting session...');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('❌ Session error:', error);
            setVerificationStatus('error');
            setErrorMessage('Failed to verify email. Please try the link again.');
            return;
          }

          if (data.user?.email_confirmed_at) {
            console.log('🎉 Email verified via token method!');
            setVerificationStatus('success');
            
            // Sign out so they can log in fresh
            await supabase.auth.signOut();
            console.log('👋 Signed out - user can now log in');
          } else {
            console.error('❌ Email not confirmed');
            setVerificationStatus('error');
            setErrorMessage('Email verification incomplete. Please try again.');
          }
          
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          // No tokens and no verified session = real failure
          if (!session?.user) {
            console.error('❌ No tokens and no session found');
            setVerificationStatus('error');
            setErrorMessage('Invalid or expired verification link. Please register again.');
          } else {
            // Session exists but email not verified
            console.error('❌ Session exists but email not verified');
            setVerificationStatus('error');
            setErrorMessage('Email verification is still pending. Please check your email again.');
          }
        }
      } catch (err: any) {
        console.error('❌ Verification exception:', err);
        setVerificationStatus('error');
        setErrorMessage(err.message || 'An unexpected error occurred.');
      }
    };

    verifyEmail();
  }, []);

  // Sign out on mount to ensure clean state
  useEffect(() => {
    const signOutIfNeeded = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && verificationStatus === 'success') {
        await supabase.auth.signOut();
        setCurrentUser(null);
      }
    };
    
    if (verificationStatus === 'success') {
      signOutIfNeeded();
    }
  }, [verificationStatus, setCurrentUser]);

  // Checking state
  if (verificationStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-[#004d99] to-accent flex items-center justify-center p-4">
        <div className="text-white text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto" />
          <p className="text-lg">Verifying your email...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (verificationStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-[#004d99] to-accent flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <Card className="w-full max-w-md shadow-2xl relative z-10 border border-primary/10 bg-white">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="flex justify-center mb-2">
              <PLVLogo size="md" />
            </div>

            <div className="flex justify-center">
              <div className="bg-destructive rounded-full p-6 shadow-md">
                <AlertCircle className="h-16 w-16 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-primary">Verification Failed</h2>
              <p className="text-muted-foreground text-sm">{errorMessage}</p>
            </div>

            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">
                The verification link may have expired or was already used. Please register again or request a new verification email.
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => {
                  setCurrentUser(null);
                  setCurrentPage('register');
                }}
                className="w-full h-12 bg-accent text-white hover:bg-accent/90 shadow-md"
              >
                Register Again
              </Button>
              <Button
                onClick={() => {
                  setCurrentUser(null);
                  setCurrentPage('login');
                }}
                variant="outline"
                className="w-full h-12"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-[#004d99] to-accent flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <Card className="w-full max-w-md shadow-2xl relative z-10 border border-primary/10 bg-white">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="flex justify-center mb-2">
            <PLVLogo size="md" />
          </div>

          {/* Success Icon - NO CONFETTI */}
          <div className="flex justify-center">
            <div className="bg-accent rounded-full p-6 shadow-lg">
              <CheckCircle2 className="h-16 w-16 text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-primary">Email Verified Successfully!</h2>
            <p className="text-muted-foreground">
              Congratulations! Your PLV email has been verified.
            </p>
          </div>

          <div className="bg-accent/10 border-2 border-accent/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              <p className="text-sm font-medium text-foreground">
                Account Activated
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              You can now log in and access all features of the PLV Lost & Found System.
            </p>
          </div>

          <Button 
            onClick={() => {
              setCurrentUser(null);
              setCurrentPage('login');
            }}
            className="w-full h-12 bg-accent text-white hover:bg-accent/90 shadow-md transition-all hover:shadow-lg"
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};