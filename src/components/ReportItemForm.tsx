import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Upload, CheckCircle2, CalendarIcon, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format } from 'date-fns@4.1.0';
import { cn } from './ui/utils';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { uploadItemPhoto } from '../lib/supabase';
import { createLostItem } from '../lib/supabase/database';

export const ReportItemForm = () => {
  const { setCurrentPage, items, setItems, currentUser, addActivityLog } = useApp();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    itemType: '',
    otherItemTypeDetails: '',
    description: '',
    location: '',
    otherLocationDetails: '',
    dateFound: '',
    timeFound: '',
    photoUrl: '',
    securityQuestion1: '',
    securityAnswer1: '',
    securityQuestion2: '',
    securityAnswer2: '',
    securityQuestion3: '',
    securityAnswer3: ''
  });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setFormData({ ...formData, photoUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('You must be logged in to report an item');
      return;
    }
    
    // Validate optional security questions
    if ((formData.securityQuestion2 && !formData.securityAnswer2) || 
        (!formData.securityQuestion2 && formData.securityAnswer2)) {
      toast.error('Question 2: Both question and answer must be filled or both left empty');
      return;
    }
    
    if ((formData.securityQuestion3 && !formData.securityAnswer3) || 
        (!formData.securityQuestion3 && formData.securityAnswer3)) {
      toast.error('Question 3: Both question and answer must be filled or both left empty');
      return;
    }

    setUploading(true);

    // Upload photo if selected
    let uploadedPhotoUrl = '';
    if (photoFile) {
      const tempItemId = Date.now().toString();
      const uploadResult = await uploadItemPhoto(photoFile, tempItemId);

      if (uploadResult.success && uploadResult.url) {
        uploadedPhotoUrl = uploadResult.url;
      } else {
        toast.error(`Failed to upload photo: ${uploadResult.error || 'Unknown error'}`);
        setUploading(false);
        return;
      }
    }
    
    // Prepare item data for database
    const itemData = {
      itemType: formData.itemType,
      otherItemTypeDetails: formData.itemType === 'Other' ? formData.otherItemTypeDetails : undefined,
      description: formData.description,
      location: formData.location,
      otherLocationDetails: formData.location === 'Other' ? formData.otherLocationDetails : undefined,
      dateFound: formData.dateFound,
      timeFound: formData.timeFound,
      photoUrl: uploadedPhotoUrl || '',
      securityQuestions: [
        { question: formData.securityQuestion1, answer: formData.securityAnswer1 },
        formData.securityQuestion2 && { question: formData.securityQuestion2, answer: formData.securityAnswer2 },
        formData.securityQuestion3 && { question: formData.securityQuestion3, answer: formData.securityAnswer3 }
      ].filter(Boolean) as { question: string; answer: string }[],
      reportedBy: currentUser.id,
    };

    // Save to database
    const result = await createLostItem(itemData, currentUser.id);
    setUploading(false);

    if (!result.success) {
      toast.error(`Failed to report item: ${result.error || 'Unknown error'}`);
      return;
    }

    console.log('✅ Item reported successfully:', result.data);
    
    // Add activity log
    const displayLocation = itemData.location === 'Other' ? itemData.otherLocationDetails : itemData.location;
    await addActivityLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: 'item_reported',
      itemId: result.data?.id || '',
      itemType: itemData.itemType,
      details: `Reported found item: ${itemData.itemType} at ${displayLocation}`
    });
    
    toast.success('Item reported successfully!');
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-4">
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="mb-3">Report Submitted Successfully!</h2>
              <p className="text-muted-foreground mb-2">
                Thank you for reporting the found item. Please bring the item to the Guard Post for verification.
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                Your report will be reviewed by the admin and will appear on the Lost & Found Board once verified.
              </p>
              <div className="bg-muted/50 border border-border rounded-lg p-3 text-left">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> You cannot claim items you've reported. 
                  Only other users can submit claims for this item.
                </p>
              </div>
            </motion.div>
            <motion.div 
              className="flex gap-3 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground border-b border-primary/20 shadow-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Button variant="secondary" size="sm" onClick={() => setCurrentPage('board')} className="bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-lg transition-all w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Board
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-primary">Report Found Item</CardTitle>
            <CardDescription className="mt-2">
              Fill in the details of the item you found. This helps the owner identify and claim their item.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="itemType">Item Type *</Label>
                <Select value={formData.itemType} onValueChange={(value) => setFormData({...formData, itemType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wallet">Wallet</SelectItem>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="ID Card">ID Card</SelectItem>
                    <SelectItem value="Bag">Bag</SelectItem>
                    <SelectItem value="Keys">Keys</SelectItem>
                    <SelectItem value="Laptop">Laptop</SelectItem>
                    <SelectItem value="Book">Book</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.itemType === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="otherItemTypeDetails">Item Description *</Label>
                  <Input
                    id="otherItemTypeDetails"
                    placeholder="Describe the item (e.g., Red umbrella, Calculator, etc.)"
                    value={formData.otherItemTypeDetails}
                    onChange={(e) => setFormData({...formData, otherItemTypeDetails: e.target.value})}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Please provide details about the item type
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Item Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about the item (e.g., brand, color, distinctive features, condition, etc.)"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="min-h-[100px] resize-none"
                  maxLength={200}
                  required
                />
                <div className="flex items-center justify-between text-[10px]">
                  <p className="text-muted-foreground">
                    This description will be visible to users searching for their lost items
                  </p>
                  <p className={`${formData.description.length >= 200 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {formData.description.length}/200
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location Found *</Label>
                <Select value={formData.location} onValueChange={(value) => setFormData({...formData, location: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Library - 1st Floor">Library - 1st Floor</SelectItem>
                    <SelectItem value="Library - 2nd Floor">Library - 2nd Floor</SelectItem>
                    <SelectItem value="Cafeteria">Cafeteria</SelectItem>
                    <SelectItem value="Gym">Gym</SelectItem>
                    <SelectItem value="Classroom Building A">Classroom Building A</SelectItem>
                    <SelectItem value="Classroom Building B">Classroom Building B</SelectItem>
                    <SelectItem value="Laboratory">Laboratory</SelectItem>
                    <SelectItem value="Parking Area">Parking Area</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.location === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="otherLocationDetails">Specify Location *</Label>
                  <Input
                    id="otherLocationDetails"
                    placeholder="e.g., Near Gate 2, Admin Building, Student Center, etc."
                    value={formData.otherLocationDetails}
                    onChange={(e) => setFormData({...formData, otherLocationDetails: e.target.value})}
                    maxLength={100}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Please provide the specific location (max 100 characters)
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFound">Date Found *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-11',
                          !selectedDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          if (date) {
                            setFormData({...formData, dateFound: format(date, 'yyyy-MM-dd')});
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeFound">Time Found *</Label>
                  <Input
                    id="timeFound"
                    type="time"
                    value={formData.timeFound}
                    onChange={(e) => setFormData({...formData, timeFound: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Upload Photo (Optional)</Label>
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
                      alt="Preview" 
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
                <p className="text-xs text-muted-foreground">
                  Photo is optional. If not provided, a placeholder icon will be used.
                </p>
              </div>

              <div className="border-t pt-6">
                <h3 className="mb-2">Security Questions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Set up security questions to help verify the rightful owner. Add at least one question. If you add an optional question, you must also provide an answer.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question 1 *</Label>
                    <Input
                      placeholder="e.g., What color is the item?"
                      value={formData.securityQuestion1}
                      onChange={(e) => setFormData({...formData, securityQuestion1: e.target.value})}
                      maxLength={100}
                      required
                    />
                    <Input
                      placeholder="Answer"
                      value={formData.securityAnswer1}
                      onChange={(e) => setFormData({...formData, securityAnswer1: e.target.value})}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Question 2 (Optional)</Label>
                    <Input
                      placeholder="e.g., What brand is it?"
                      value={formData.securityQuestion2}
                      onChange={(e) => setFormData({...formData, securityQuestion2: e.target.value})}
                      maxLength={100}
                    />
                    <Input
                      placeholder="Answer"
                      value={formData.securityAnswer2}
                      onChange={(e) => setFormData({...formData, securityAnswer2: e.target.value})}
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Question 3 (Optional)</Label>
                    <Input
                      placeholder="e.g., Any unique marks or features?"
                      value={formData.securityQuestion3}
                      onChange={(e) => setFormData({...formData, securityQuestion3: e.target.value})}
                      maxLength={100}
                    />
                    <Input
                      placeholder="Answer"
                      value={formData.securityAnswer3}
                      onChange={(e) => setFormData({...formData, securityAnswer3: e.target.value})}
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full py-6" disabled={uploading}>
                {uploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Uploading Photo...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};