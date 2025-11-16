import { useState, useRef, useEffect } from 'react';
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
import { BackToTopButton } from './BackToTopButton';

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
    securityAnswer3: '',
    securityQuestion4: '',
    securityAnswer4: ''
  });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Validation errors state
  const [errors, setErrors] = useState({
    itemType: false,
    otherItemTypeDetails: false,
    description: false,
    location: false,
    otherLocationDetails: false,
    dateFound: false,
    timeFound: false,
    securityAnswer1: false,
    securityAnswer2: false,
    securityAnswer3: false,
    securityAnswer4: false
  });
  const [touched, setTouched] = useState({
    itemType: false,
    otherItemTypeDetails: false,
    description: false,
    location: false,
    otherLocationDetails: false,
    dateFound: false,
    timeFound: false,
    securityAnswer1: false,
    securityAnswer2: false,
    securityAnswer3: false,
    securityAnswer4: false
  });

  // Predefined security questions based on item type
  const predefinedQuestions: Record<string, string[]> = {
    'Wallet': [
      'What is the primary color of the wallet?',
      'What material is the wallet made of (leather, fabric, synthetic, etc.)?',
      'What brand or logo is visible on the wallet?',
      'What are the contents of the wallet? (e.g., number of cards, cash amount, IDs, receipts)'
    ],
    'Phone': [
      'What is the brand and model of the phone?',
      'What color is the phone or phone case?',
      'Describe any visible damage, scratches, or distinctive marks on the phone.',
      'Does the phone case have any cards, cash, or items stored in it? If yes, describe.'
    ],
    'ID Card': [
      'What is the complete ID number printed on the card?',
      'What is the full name printed on the ID card?',
      'What year was the ID card issued or what is the expiration year?'
    ],
    'Bag': [
      'What is the primary color and material of the bag?',
      'What brand or logo appears on the bag?',
      'How many main compartments or pockets does the bag have?',
      'What are the main contents inside the bag? (e.g., books, laptop, clothes, gadgets)'
    ],
    'Keys': [
      'How many keys are attached to the keychain?',
      'What color and shape is the keychain holder?',
      'Describe any distinctive tags, labels, or accessories on the keychain.',
      'Are there any other items attached besides keys? (e.g., USB, ID holder, charms)'
    ],
    'Laptop': [
      'What is the brand and model of the laptop?',
      'What is the approximate screen size (13", 14", 15", etc.)?',
      'Describe any stickers, scratches, or distinctive marks on the laptop.',
      'Are there any accessories with the laptop? (e.g., charger, mouse, bag, case)'
    ],
    'Book': [
      'What is the complete title of the book?',
      'Who is the author of the book?',
      'What is the color of the book cover and approximate number of pages?',
      'Are there any bookmarks, notes, papers, or items inside the book? If yes, describe.'
    ],
    'Other': [
      'What is the specific name or type of the item?',
      'What is the primary color and material of the item?',
      'Describe any distinctive features, markings, or serial numbers on the item.',
      'Does this item contain or come with any accessories or additional items? If yes, describe.'
    ]
  };

  // Validation function
  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'itemType':
        return value.trim() === '';
      case 'otherItemTypeDetails':
        return formData.itemType === 'Other' && value.trim() === '';
      case 'description':
        return value.trim() === '';
      case 'location':
        return value.trim() === '';
      case 'otherLocationDetails':
        return formData.location === 'Other' && value.trim() === '';
      case 'dateFound':
        return value.trim() === '';
      case 'timeFound':
        return value.trim() === '';
      case 'securityAnswer1':
      case 'securityAnswer2':
      case 'securityAnswer3':
        return formData.itemType && value.trim() === '';
      case 'securityAnswer4':
        return formData.securityQuestion4 && formData.securityQuestion4.trim() !== '' && value.trim() === '';
      default:
        return false;
    }
  };

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Helper function to clear form data
  const clearFormData = () => {
    localStorage.removeItem('reportItemFormData');
    localStorage.removeItem('reportItemPhotoPreview');
    localStorage.removeItem('reportItemSelectedDate');
    setFormData({
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
      securityAnswer3: '',
      securityQuestion4: '',
      securityAnswer4: ''
    });
    setPhotoPreview('');
    setPhotoFile(null);
    setSelectedDate(undefined);
  };

  // Load persisted form data from localStorage on mount
  useEffect(() => {
    // Only load saved data if user is logged in
    if (!currentUser) {
      clearFormData();
      return;
    }

    const savedFormData = localStorage.getItem('reportItemFormData');
    const savedPhotoPreview = localStorage.getItem('reportItemPhotoPreview');
    const savedDate = localStorage.getItem('reportItemSelectedDate');
    
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setFormData(parsedData);
      } catch (e) {
        console.error('Error loading saved form data:', e);
      }
    }
    
    if (savedPhotoPreview) {
      setPhotoPreview(savedPhotoPreview);
    }
    
    if (savedDate) {
      try {
        setSelectedDate(new Date(savedDate));
      } catch (e) {
        console.error('Error loading saved date:', e);
      }
    }
  }, [currentUser]);

  // Save form data to localStorage whenever it changes (ONLY if user is logged in)
  useEffect(() => {
    if (currentUser && (formData.itemType || formData.description || formData.location)) {
      localStorage.setItem('reportItemFormData', JSON.stringify(formData));
    }
  }, [formData, currentUser]);

  // Save photo preview to localStorage (ONLY if user is logged in)
  useEffect(() => {
    if (currentUser && photoPreview) {
      localStorage.setItem('reportItemPhotoPreview', photoPreview);
    }
  }, [photoPreview, currentUser]);

  // Save selected date to localStorage (ONLY if user is logged in)
  useEffect(() => {
    if (currentUser && selectedDate) {
      localStorage.setItem('reportItemSelectedDate', selectedDate.toISOString());
    }
  }, [selectedDate, currentUser]);

  // Clear form data on logout or when user explicitly submits
  useEffect(() => {
    if (!currentUser) {
      clearFormData();
      // Redirect to board when logged out
      setCurrentPage('board');
    }
  }, [currentUser, setCurrentPage]);

  // Clear form data when success screen appears
  useEffect(() => {
    if (submitted) {
      clearFormData();
    }
  }, [submitted]);

  // Clear form data when component unmounts (user leaves page)
  useEffect(() => {
    return () => {
      // Only clear if user is navigating away (not on success screen)
      if (!submitted) {
        const hasFormData = formData.itemType || formData.description || formData.location;
        if (hasFormData) {
          // Data will be preserved in localStorage for logged-in users
          // But we don't want to preserve it indefinitely
          console.log('Form has unsaved data on unmount');
        }
      }
    };
  }, [submitted, formData]);

  // Add beforeunload event listener to warn user about unsaved data
  useEffect(() => {
    const hasFormData = formData.itemType || formData.description || formData.location;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasFormData && !submitted) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    if (hasFormData) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData, submitted]);

  // Real-time validation
  useEffect(() => {
    const newErrors = {
      itemType: touched.itemType && validateField('itemType', formData.itemType),
      otherItemTypeDetails: touched.otherItemTypeDetails && validateField('otherItemTypeDetails', formData.otherItemTypeDetails),
      description: touched.description && validateField('description', formData.description),
      location: touched.location && validateField('location', formData.location),
      otherLocationDetails: touched.otherLocationDetails && validateField('otherLocationDetails', formData.otherLocationDetails),
      dateFound: touched.dateFound && validateField('dateFound', formData.dateFound),
      timeFound: touched.timeFound && validateField('timeFound', formData.timeFound),
      securityAnswer1: touched.securityAnswer1 && validateField('securityAnswer1', formData.securityAnswer1),
      securityAnswer2: touched.securityAnswer2 && validateField('securityAnswer3', formData.securityAnswer3),
      securityAnswer3: touched.securityAnswer3 && validateField('securityAnswer3', formData.securityAnswer3),
      securityAnswer4: touched.securityAnswer4 && validateField('securityAnswer4', formData.securityAnswer4),
    };
    setErrors(newErrors);
  }, [formData, touched]);

  // Update security questions when item type changes
  useEffect(() => {
    if (formData.itemType && predefinedQuestions[formData.itemType]) {
      const questions = predefinedQuestions[formData.itemType];
      setFormData(prev => ({
        ...prev,
        securityQuestion1: questions[0] || '',
        securityQuestion2: questions[1] || '',
        securityQuestion3: questions[2] || '',
        securityQuestion4: questions[3] || ''
      }));
    }
  }, [formData.itemType]);

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

  // Calculate form completion percentage
  const calculateCompletion = (): number => {
    const requiredFields = [
      'itemType',
      'description',
      'location',
      'dateFound',
      'timeFound',
      'securityAnswer1',
      'securityAnswer2',
      'securityAnswer3'
    ];

    // Only include securityAnswer4 if securityQuestion4 exists
    if (formData.securityQuestion4 && formData.securityQuestion4.trim() !== '') {
      requiredFields.push('securityAnswer4');
    }

    // Add conditional required fields
    const conditionalFields: string[] = [];
    if (formData.itemType === 'Other') {
      conditionalFields.push('otherItemTypeDetails');
    }
    if (formData.location === 'Other') {
      conditionalFields.push('otherLocationDetails');
    }

    const allRequiredFields = [...requiredFields, ...conditionalFields];
    const filledFields = allRequiredFields.filter(field => {
      const value = formData[field as keyof typeof formData];
      return value && value.trim() !== '';
    });

    return Math.round((filledFields.length / allRequiredFields.length) * 100);
  };

  const completionPercentage = calculateCompletion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('You must be logged in to report an item');
      return;
    }
    
    // Mark all fields as touched to show validation errors
    setTouched({
      itemType: true,
      otherItemTypeDetails: true,
      description: true,
      location: true,
      otherLocationDetails: true,
      dateFound: true,
      timeFound: true,
      securityAnswer1: true,
      securityAnswer2: true,
      securityAnswer3: true,
      securityAnswer4: true
    });
    
    // Validate required fields
    if (!formData.itemType) {
      toast.error('Please select an item type');
      return;
    }
    
    if (formData.itemType === 'Other' && !formData.otherItemTypeDetails.trim()) {
      toast.error('Please specify the item type');
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error('Please provide an item description');
      return;
    }
    
    if (!formData.location) {
      toast.error('Please select a location');
      return;
    }
    
    if (formData.location === 'Other' && !formData.otherLocationDetails.trim()) {
      toast.error('Please specify the location');
      return;
    }
    
    if (!formData.dateFound) {
      toast.error('Please select the date found');
      return;
    }
    
    if (!formData.timeFound) {
      toast.error('Please select the time found');
      return;
    }
    
    // Validate answers based on number of questions for this item type
    const hasQuestion4 = formData.securityQuestion4 && formData.securityQuestion4.trim() !== '';
    if (!formData.securityAnswer1 || !formData.securityAnswer2 || !formData.securityAnswer3) {
      toast.error('Please answer all security questions');
      return;
    }
    if (hasQuestion4 && !formData.securityAnswer4) {
      toast.error('Please answer all security questions');
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
        formData.securityQuestion3 && { question: formData.securityQuestion3, answer: formData.securityAnswer3 },
        formData.securityQuestion4 && { question: formData.securityQuestion4, answer: formData.securityAnswer4 }
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
    
    // Add activity log - Use custom item type if "Other" was selected
    const displayItemType = itemData.itemType === 'Other' ? itemData.otherItemTypeDetails : itemData.itemType;
    const displayLocation = itemData.location === 'Other' ? itemData.otherLocationDetails : itemData.location;
    await addActivityLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: 'item_reported',
      itemId: result.data?.id || '',
      itemType: displayItemType,
      details: `Reported found item: ${displayItemType} at ${displayLocation}`
    });
    
    toast.success('Item reported successfully!');
    setSubmitted(true);
    clearFormData(); // Clear localStorage after successful submission
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-4 px-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-8 pb-6 px-6 space-y-5 text-center">
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
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground border-b border-primary/20 shadow-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Button variant="secondary" size="sm" onClick={() => setCurrentPage('board')} className="bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-lg transition-all w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Board
          </Button>
        </div>
        
        {/* Progress Bar - Inside sticky header */}
        <div className="bg-background border-t border-border pt-6 pb-4">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-300 ease-out"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
              <span className="font-mono text-primary min-w-[3rem] text-right">{completionPercentage}%</span>
            </div>
          </div>
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
                <Select 
                  value={formData.itemType} 
                  onValueChange={(value) => {
                    setFormData({...formData, itemType: value});
                    setTouched({...touched, itemType: true});
                  }}
                >
                  <SelectTrigger className={cn(errors.itemType && "border-destructive focus:ring-destructive")}>
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
                {errors.itemType && (
                  <p className="text-sm text-destructive">Please select an item type</p>
                )}
              </div>

              {formData.itemType === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="otherItemTypeDetails">Specify Item Type *</Label>
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
                  Answer the security questions below to help verify the rightful owner. Questions are automatically set based on the item type.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">Question 1 *</Label>
                    <div className="bg-accent/10 border-2 border-accent/30 rounded-lg p-3">
                      <p className="text-foreground leading-relaxed">{formData.securityQuestion1 || 'Please select an item type first'}</p>
                    </div>
                    <Input
                      placeholder={formData.itemType ? "Your answer" : "Select item type first"}
                      value={formData.securityAnswer1}
                      onChange={(e) => setFormData({...formData, securityAnswer1: e.target.value})}
                      onBlur={() => setTouched({...touched, securityAnswer1: true})}
                      className={cn(errors.securityAnswer1 && "border-destructive focus-visible:ring-destructive")}
                      maxLength={100}
                      disabled={!formData.itemType}
                      required
                    />
                    {errors.securityAnswer1 && (
                      <p className="text-sm text-destructive">Please answer this question</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base">Question 2 *</Label>
                    <div className="bg-accent/10 border-2 border-accent/30 rounded-lg p-3">
                      <p className="text-foreground leading-relaxed">{formData.securityQuestion2 || 'Please select an item type first'}</p>
                    </div>
                    <Input
                      placeholder={formData.itemType ? "Your answer" : "Select item type first"}
                      value={formData.securityAnswer2}
                      onChange={(e) => setFormData({...formData, securityAnswer2: e.target.value})}
                      onBlur={() => setTouched({...touched, securityAnswer2: true})}
                      className={cn(errors.securityAnswer2 && "border-destructive focus-visible:ring-destructive")}
                      maxLength={100}
                      disabled={!formData.itemType}
                      required
                    />
                    {errors.securityAnswer2 && (
                      <p className="text-sm text-destructive">Please answer this question</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base">Question 3 *</Label>
                    <div className="bg-accent/10 border-2 border-accent/30 rounded-lg p-3">
                      <p className="text-foreground leading-relaxed">{formData.securityQuestion3 || 'Please select an item type first'}</p>
                    </div>
                    <Input
                      placeholder={formData.itemType ? "Your answer" : "Select item type first"}
                      value={formData.securityAnswer3}
                      onChange={(e) => setFormData({...formData, securityAnswer3: e.target.value})}
                      onBlur={() => setTouched({...touched, securityAnswer3: true})}
                      className={cn(errors.securityAnswer3 && "border-destructive focus-visible:ring-destructive")}
                      maxLength={100}
                      disabled={!formData.itemType}
                      required
                    />
                    {errors.securityAnswer3 && (
                      <p className="text-sm text-destructive">Please answer this question</p>
                    )}
                  </div>

                  {formData.securityQuestion4 && formData.securityQuestion4.trim() !== '' && (
                    <div className="space-y-2">
                      <Label className="text-base">Question 4 *</Label>
                      <div className="bg-accent/10 border-2 border-accent/30 rounded-lg p-3">
                        <p className="text-foreground leading-relaxed">{formData.securityQuestion4}</p>
                      </div>
                      <Input
                        placeholder="Your answer"
                        value={formData.securityAnswer4}
                        onChange={(e) => setFormData({...formData, securityAnswer4: e.target.value})}
                        onBlur={() => setTouched({...touched, securityAnswer4: true})}
                        className={cn(errors.securityAnswer4 && "border-destructive focus-visible:ring-destructive")}
                        maxLength={100}
                        required
                      />
                      {errors.securityAnswer4 && (
                        <p className="text-sm text-destructive">Please answer this question</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-6">
                <Button type="submit" className="w-full py-6" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  className="w-full" 
                  onClick={() => {
                    if (confirm('Are you sure you want to clear the form? All entered data will be lost.')) {
                      clearFormData();
                      toast.success('Form cleared successfully');
                    }
                  }}
                  disabled={uploading}
                >
                  Clear Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <BackToTopButton />
    </div>
  );
};