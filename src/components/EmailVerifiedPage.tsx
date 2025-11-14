import { useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useApp } from '../context/AppContext';
import { CheckCircle2 } from 'lucide-react';
import { PLVLogo } from './PLVLogo';
import { supabase } from '../lib/supabase/client';

export const EmailVerifiedPage = () => {
  const { setCurrentPage, setCurrentUser } = useApp();

  useEffect(() => {
    const handleVerification = async () => {
      console.log('📧 Email verification page loaded');
      console.log('🌐 Full URL:', window.location.href);

      // Sign out any existing session so user can log in fresh
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('👋 Signing out existing session');
        await supabase.auth.signOut();
      }

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      console.log('✅ Ready for user to login');
    };

    handleVerification();
  }, []);

  // Always show success page
  // The actual verification was done server-side by Supabase when they clicked the link
  // The is_verified update will happen automatically on login (handled in auth.ts)
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
              You can now close this tab and log in to access all features of the PLV Lost & Found System.
            </p>
          </div>

          <Button 
            onClick={() => window.close()}
            className="w-full h-12 bg-accent text-white hover:bg-accent/90 shadow-md transition-all hover:shadow-lg"
          >
            Close This Tab
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};