import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useApp } from '../context/AppContext';
import { ArrowLeft, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { PLVLogo } from './PLVLogo';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from './ui/alert';
import { sendPasswordResetEmail } from '../lib/supabase/auth';

export const ForgotPasswordPage = () => {
  const { setCurrentPage } = useApp();
  const [step, setStep] = useState(1); // 1: Email, 2: Email Sent
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!/@plv\.edu\.ph$/.test(email)) {
      setError('Please use your PLV email address');
      return;
    }

    setIsLoading(true);

    // Send password reset email via Supabase
    const result = await sendPasswordResetEmail(email);

    if (result.success) {
      toast.success('Reset link sent!', {
        description: `Check your email at ${email}`
      });
      setStep(2);
    } else {
      setError(result.error || 'Failed to send reset email');
    }

    setIsLoading(false);
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-[#004d99] to-accent flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <Card className="w-full max-w-md shadow-2xl relative z-10 border border-primary/10 bg-white">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-accent rounded-full p-6 shadow-md animate-bounce">
                <Mail className="h-16 w-16 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-primary">Check Your Email!</h2>
              <p className="text-muted-foreground">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 space-y-2">
              <p className="text-sm text-foreground">
                Click the link in your email to reset your password.
              </p>
              <p className="text-xs text-muted-foreground">
                Don't see it? Check your spam folder.
              </p>
            </div>
            <Button 
              onClick={() => setCurrentPage('login')} 
              className="w-full h-12 bg-accent text-white hover:bg-accent/90 shadow-md"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-[#004d99] to-accent flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      {/* Back Button - Same style as Login */}
      <Button
        variant="ghost"
        onClick={() => setCurrentPage('login')}
        className="absolute top-4 left-4 z-20 text-white hover:bg-white/10"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </Button>

      <Card className="w-full max-w-md shadow-2xl relative z-10 border border-primary/10 bg-white">
        <CardHeader className="space-y-4 pb-6 border-b-0">
          <PLVLogo size="md" />
          <div className="text-center space-y-2">
            <CardTitle className="text-primary">Reset Password</CardTitle>
            <CardDescription>
              Enter your email to receive a password reset link
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label htmlFor="email">PLV Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@plv.edu.ph"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                required
                disabled={isLoading}
                className="h-12 border-2 focus:border-accent transition-all"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-accent text-white hover:bg-accent/90 shadow-md transition-all hover:shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};