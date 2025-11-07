import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { PLVLogo } from './PLVLogo';
import { toast } from 'sonner@2.0.3';
import { Progress } from './ui/progress';
import { signUp } from '../lib/supabase/auth';

export const RegisterPage = () => {
  const { setCurrentPage } = useApp();
  const [step, setStep] = useState(1); // 1: Form, 2: Email Sent
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    contactNumber: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Student ID is required';
    } else if (!/^\d{2}-\d{4}$/.test(formData.studentId)) {
      newErrors.studentId = 'Invalid format. Use: 23-1234';
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!/^09\d{9}$/.test(formData.contactNumber)) {
      newErrors.contactNumber = 'Invalid format. Use: 09XXXXXXXXX';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/@plv\.edu\.ph$/.test(formData.email)) {
      newErrors.email = 'Must use PLV email (@plv.edu.ph)';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password) && /[!@#$%^&*]/.test(password)) strength += 25;

    if (strength <= 25) return { strength, label: 'Weak', color: 'bg-destructive' };
    if (strength <= 50) return { strength, label: 'Fair', color: 'bg-accent' };
    if (strength <= 75) return { strength, label: 'Good', color: 'bg-secondary' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);

    // Call Supabase signup
    const result = await signUp(
      formData.email,
      formData.password,
      formData.fullName,
      formData.studentId,
      formData.contactNumber
    );

    if (result.success) {
      console.log('✅ Registration successful - showing email verification step');
      toast.success('Verification email sent!', {
        description: `Please check ${formData.email}`
      });
      setStep(2);
    } else {
      toast.error(result.error || 'Registration failed');
      // If it's a duplicate student ID error, show it in the form
      if (result.error?.includes('Student ID')) {
        setErrors({...errors, studentId: result.error});
      }
    }

    setIsLoading(false);
  };

  const passwordStrength = getPasswordStrength();

  // Step 2: Check Your Email
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
                We've sent a verification link to
              </p>
              <p className="text-primary">{formData.email}</p>
            </div>
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Click the verification link in the email to activate your account
                </p>
              </div>
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Check your spam folder if you don't see it
                </p>
              </div>
              <div className="flex items-start gap-3 text-left">
                <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  The link expires in 24 hours
                </p>
              </div>
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

  // Step 1: Registration Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-[#004d99] to-accent flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      {/* Back Button - Same style as Login */}
      <Button
        variant="ghost"
        onClick={() => setCurrentPage('landing')}
        className="absolute top-4 left-4 z-20 text-white hover:bg-white/10"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Home
      </Button>

      <Card className="w-full max-w-md shadow-2xl relative z-10 border border-primary/10 bg-white max-h-[90vh] overflow-y-auto">
        <CardHeader className="space-y-4 pb-6 border-b-0">
          <PLVLogo size="md" />
          <div className="text-center space-y-2">
            <CardTitle className="text-primary">Create Account</CardTitle>
            <CardDescription>Register for PLV Lost & Found System</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Juan Dela Cruz"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({...formData, fullName: e.target.value});
                  setErrors({...errors, fullName: ''});
                }}
                className={`h-12 border-2 transition-all ${errors.fullName ? 'border-destructive' : 'focus:border-accent'}`}
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.fullName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID *</Label>
              <Input
                id="studentId"
                type="text"
                placeholder="23-1234"
                value={formData.studentId}
                onChange={(e) => {
                  setFormData({...formData, studentId: e.target.value});
                  setErrors({...errors, studentId: ''});
                }}
                className={`h-12 border-2 transition-all ${errors.studentId ? 'border-destructive' : 'focus:border-accent'}`}
                disabled={isLoading}
              />
              {errors.studentId && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.studentId}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number *</Label>
              <Input
                id="contactNumber"
                type="tel"
                placeholder="09123456789"
                value={formData.contactNumber}
                onChange={(e) => {
                  setFormData({...formData, contactNumber: e.target.value});
                  setErrors({...errors, contactNumber: ''});
                }}
                className={`h-12 border-2 transition-all ${errors.contactNumber ? 'border-destructive' : 'focus:border-accent'}`}
                disabled={isLoading}
              />
              {errors.contactNumber && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.contactNumber}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">PLV Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="juan.delacruz@plv.edu.ph"
                value={formData.email}
                onChange={(e) => {
                  setFormData({...formData, email: e.target.value});
                  setErrors({...errors, email: ''});
                }}
                className={`h-12 border-2 transition-all ${errors.email ? 'border-destructive' : 'focus:border-accent'}`}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({...formData, password: e.target.value});
                    setErrors({...errors, password: ''});
                  }}
                  className={`h-12 pr-10 border-2 transition-all ${errors.password ? 'border-destructive' : 'focus:border-accent'}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {formData.password && (
                <div className="space-y-1">
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
                </div>
              )}
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({...formData, confirmPassword: e.target.value});
                    setErrors({...errors, confirmPassword: ''});
                  }}
                  className={`h-12 pr-10 border-2 transition-all ${errors.confirmPassword ? 'border-destructive' : 'focus:border-accent'}`}
                  disabled={isLoading}
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
              {errors.confirmPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-accent text-white hover:bg-accent/90 shadow-md transition-all hover:shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Login Link Section */}
          <div className="mt-8 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-sm text-muted-foreground">Already have an account? </span>
              <button
                type="button"
                onClick={() => setCurrentPage('login')}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Login here
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};