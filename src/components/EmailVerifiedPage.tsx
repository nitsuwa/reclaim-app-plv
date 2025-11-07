import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { PLVLogo } from './PLVLogo';
import { supabase } from '../lib/supabase/client';

export const EmailVerifiedPage = () => {
  const { setCurrentPage, setCurrentUser } = useApp();
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log('🔍 Starting email verification check...');
        console.log('🌐 Full URL:', window.location.href);
        console.log('📍 Search:', window.location.search);
        console.log('📍 Hash:', window.location.hash);

        // IMPORTANT: Supabase redirects with tokens in the URL fragment (hash)
        // The format is: https://yourapp.com/#access_token=xxx&refresh_token=yyy&type=signup
        // We need to let Supabase's detectSessionInUrl handle this automatically
        
        // Give Supabase time to detect and process the session from URL
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Check for error first
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const error = searchParams.get('error') || hashParams.get('error');
        const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');

        if (error) {
          console.error('❌ Verification error from URL:', error, errorDescription);
          setVerificationStatus('error');
          setErrorMessage(errorDescription || 'Email verification failed. Please try again.');
          return;
        }

        // Try to get the current session (Supabase should have auto-processed it)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('📧 Session check:', session ? 'Found' : 'Not found');
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setVerificationStatus('error');
          setErrorMessage('Failed to verify email. Please try again.');
          return;
        }

        if (session?.user) {
          console.log('✅ User session found:', session.user.email);
          console.log('📧 Email confirmed at:', session.user.email_confirmed_at);
          
          // Check if email is confirmed
          if (session.user.email_confirmed_at) {
            console.log('🎉 Email is verified!');
            
            // Update the user's is_verified status in the database
            const { error: updateError } = await supabase
              .from('users')
              .update({ is_verified: true })
              .eq('auth_id', session.user.id);

            if (updateError) {
              console.error('❌ Failed to update is_verified:', updateError);
              // Don't fail the verification - just log the error
            } else {
              console.log('✅ Database is_verified updated to true');
            }
            
            // Sign out the user so they can log in fresh
            await supabase.auth.signOut();
            console.log('👋 Signed out - user can now log in');
            
            setVerificationStatus('success');
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          } else {
            console.warn('⚠️ Session exists but email not confirmed');
            setVerificationStatus('error');
            setErrorMessage('Email verification is still pending. Please check your email again.');
            return;
          }
        }

        // If we reach here, Supabase didn't auto-detect the session
        // This might happen if the URL doesn't contain the expected tokens
        console.error('❌ No session found after verification attempt');
        console.log('🔍 Checking URL for tokens manually...');
        
        // Check what's in the URL
        const hasAccessToken = hashParams.has('access_token') || searchParams.has('access_token');
        const hasType = hashParams.get('type') === 'signup' || searchParams.get('type') === 'email';
        
        console.log('📊 URL analysis:', { 
          hasAccessToken, 
          hasType,
          hashType: hashParams.get('type'),
          queryType: searchParams.get('type')
        });

        if (hasType && !hasAccessToken) {
          // Type parameter exists but no access token - likely already used link
          console.warn('⚠️ Type parameter found but no access token - link may be expired');
          setVerificationStatus('error');
          setErrorMessage('This verification link has expired or was already used. Please register again.');
        } else {
          // No clear indication of what went wrong
          setVerificationStatus('error');
          setErrorMessage('Invalid or expired verification link. Please register again or request a new verification email.');
        }
      } catch (err: any) {
        console.error('❌ Verification exception:', err);
        setVerificationStatus('error');
        setErrorMessage(err.message || 'An unexpected error occurred.');
      }
    };

    verifyEmail();
  }, []);

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