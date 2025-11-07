import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Upload, CheckCircle2, Copy, X } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { motion } from 'motion/react';
import { createClaim } from '../lib/supabase/database';
import { uploadItemPhoto } from '../lib/supabase';

export const ClaimItemForm = () => {
  const { setCurrentPage, selectedItem, claims, currentUser, addActivityLog, addClaim } = useApp();
  const [step, setStep] = useState(1);
  const [claimCode, setClaimCode] = useState('');
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyCode = async () => {
    try {
      // Try using the Clipboard API first
      await navigator.clipboard.writeText(claimCode);
      toast.success('Claim code copied to clipboard!');
    } catch (err) {
      // Fallback method using a temporary textarea
      try {
        const textarea = document.createElement('textarea');
        textarea.value = claimCode;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('Claim code copied to clipboard!');
      } catch (fallbackErr) {
        toast.error('Failed to copy. Please copy manually: ' + claimCode);
      }
    }
  };

  // SUCCESS SCREEN: Show this FIRST before any validation checks (to prevent re-render issues)
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-8 pb-6 px-6 space-y-5">
            <motion.div 
              className="flex justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20 
              }}
            >
              <motion.div 
                className="bg-accent rounded-full p-4 shadow-lg"
                animate={{ 
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 0.6,
                  repeat: 2,
                  repeatType: "reverse"
                }}
              >
                <CheckCircle2 className="h-12 w-12 text-accent-foreground" />
              </motion.div>
            </motion.div>
            
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-primary mb-2">Claim Submitted Successfully!</h2>
              <p className="text-muted-foreground">
                Your claim code has been generated
              </p>
            </motion.div>

            <motion.div 
              className="bg-accent/10 border-2 border-accent rounded-lg p-6 text-center shadow-inner"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-sm text-muted-foreground mb-2">Your Claim Code</p>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-white px-4 py-3 rounded-lg border-2 border-accent/30 shadow-sm text-base sm:text-lg">{claimCode}</code>
                <Button size="sm" variant="outline" onClick={handleCopyCode} className="border-accent/50 hover:bg-accent/10">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Alert>
                <AlertDescription>
                  <strong>Next Steps:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>Save or screenshot your claim code</li>
                    <li>Bring your Student ID to the Guard Post</li>
                    <li>Present your claim code to the guard</li>
                    <li>The guard will verify your answers and release the item</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </motion.div>

            <motion.div 
              className="flex gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <Button onClick={() => setCurrentPage('profile')} variant="outline" className="flex-1">
                View Profile
              </Button>
              <Button onClick={() => setCurrentPage('board')} className="flex-1">
                Return to Board
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SECURITY CHECK: Prevent users from claiming items they reported
  if (selectedItem && currentUser && selectedItem.reportedBy === currentUser.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-2 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Cannot Claim Own Item</CardTitle>
            <CardDescription>
              You cannot claim an item that you reported yourself.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-destructive/10 border-destructive/30">
              <AlertDescription>
                <p className="mb-2">
                  <strong>Item:</strong> {selectedItem.itemType}
                  {selectedItem.otherItemTypeDetails && ` - ${selectedItem.otherItemTypeDetails}`}
                </p>
                <p className="text-sm">
                  You reported this item on {new Date(selectedItem.reportedAt || '').toLocaleDateString()}. 
                  You cannot submit a claim for items you've found and reported.
                </p>
              </AlertDescription>
            </Alert>
            <Button onClick={() => setCurrentPage('board')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Board
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // DUPLICATE CLAIM CHECK: Prevent duplicate pending claims for the same item
  const existingPendingClaim = selectedItem && currentUser 
    ? claims.find(
        claim => claim.itemId === selectedItem.id && 
                 claim.claimantId === currentUser.id && 
                 claim.status === 'pending'
      )
    : null;

  if (existingPendingClaim) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-2 border-accent">
          <CardHeader>
            <CardTitle className="text-accent">Claim Already Submitted</CardTitle>
            <CardDescription>
              You already have a pending claim for this item.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-accent/10 border-accent/30">
              <AlertDescription>
                <p className="mb-2">
                  <strong>Item:</strong> {selectedItem?.itemType}
                  {selectedItem?.otherItemTypeDetails && ` - ${selectedItem.otherItemTypeDetails}`}
                </p>
                <p className="mb-2">
                  <strong>Claim Code:</strong> <span className="font-mono text-accent">{existingPendingClaim.claimCode}</span>
                </p>
                <p className="text-sm">
                  Your claim is currently being reviewed by the admin. 
                  You can only submit one claim per item. Please wait for the review to complete before submitting another claim.
                </p>
              </AlertDescription>
            </Alert>
            <Button onClick={() => setCurrentPage('board')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Board
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const generateClaimCode = () => {
    return 'CLM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10MB');
      return;
    }

    setPhotoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !selectedItem) {
      toast.error('Missing information');
      return;
    }

    setSubmitting(true);
    
    const code = generateClaimCode();
    let proofPhotoUrl: string | undefined;

    // Upload photo if provided
    if (photoFile) {
      const uploadResult = await uploadItemPhoto(photoFile);
      if (uploadResult.success && uploadResult.url) {
        proofPhotoUrl = uploadResult.url;
      } else {
        toast.error('Failed to upload photo, but claim will be submitted without it');
      }
    }
    
    // Prepare claim data for database
    const claimData = {
      itemId: selectedItem.id,
      claimantId: currentUser.id,
      claimCode: code,
      answers: answers.filter(a => a.trim() !== ''),
      proofPhotoUrl,
    };

    // Save to database
    const result = await createClaim(claimData);
    setSubmitting(false);

    if (!result.success) {
      toast.error(`Failed to submit claim: ${result.error || 'Unknown error'}`);
      return;
    }

    console.log('✅ Claim submitted successfully:', result.data);
    
    // Set step FIRST to prevent duplicate check from showing
    setClaimCode(code);
    setStep(2);
    
    // Then add claim to context (this will update board in background)
    addClaim(result.data);
    
    // Add activity log
    await addActivityLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: 'claim_submitted',
      itemId: selectedItem.id,
      itemType: selectedItem.itemType,
      details: `Submitted claim for ${selectedItem.itemType} (Code: ${code})`
    });
    
    toast.success('Claim submitted successfully!');
  };

  if (!selectedItem) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No item selected</p>
            <Button onClick={() => setCurrentPage('board')} className="mt-4">
              Return to Board
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground border-b border-primary/20 shadow-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="secondary" size="sm" onClick={() => setCurrentPage('board')} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Board
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-primary">Claim Item</CardTitle>
            <CardDescription>
              Answer the security questions to verify that this is your item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h3 className="mb-2 break-words">{selectedItem.itemType}</h3>
              {selectedItem.description && (
                <p className="text-sm text-muted-foreground mb-3 break-all max-w-full">{selectedItem.description}</p>
              )}
              <div className="text-sm space-y-1">
                <p className="break-words"><span className="text-muted-foreground">Location:</span> {selectedItem.location}</p>
                <p><span className="text-muted-foreground">Date Found:</span> {new Date(selectedItem.dateFound).toLocaleDateString()}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitAnswers} className="space-y-6">
              <div className="space-y-4">
                <h4>Security Questions</h4>
                {selectedItem.securityQuestions.map((sq, index) => (
                  <div key={index} className="space-y-2 min-w-0 max-w-full">
                    <Label className="break-words overflow-wrap-anywhere block">{sq.question} *</Label>
                    <Input
                      placeholder="Your answer"
                      value={answers[index] || ''}
                      onChange={(e) => {
                        const newAnswers = [...answers];
                        newAnswers[index] = e.target.value;
                        setAnswers(newAnswers);
                      }}
                      maxLength={100}
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Proof Photo (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Upload a photo showing proof of ownership (receipt, another photo of the item, etc.)
                </p>
                {!photoPreview ? (
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="relative border-2 border-border rounded-lg">
                    <img 
                      src={photoPreview} 
                      alt="Proof Preview" 
                      className="w-full h-64 object-cover rounded-md"
                    />
                    <div className="absolute top-0 right-0 p-2">
                      <button
                        type="button"
                        className="h-10 w-10 rounded-full shadow-2xl hover:scale-110 transition-all ring-2 ring-white flex items-center justify-center cursor-pointer"
                        style={{ backgroundColor: '#dc2626' }}
                        onClick={handleRemovePhoto}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                      >
                        <X className="h-5 w-5 text-white" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  After submitting, you will receive a claim code. Bring this code and your Student ID to the Guard Post to collect your item.
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Submitting Claim...
                  </>
                ) : (
                  'Submit Claim'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
