# 📁 Supabase Files

**This folder contains all your Supabase backend integration files.**

---

## 🎯 FOR SETUP

### ⭐ **USE THIS FILE:**

**`complete-setup.sql`** - Run this in Supabase SQL Editor

This ONE file contains:
- ✅ All database tables
- ✅ All RLS policies (security)
- ✅ Helper functions
- ✅ Indexes
- ✅ Triggers

**Old files (DO NOT USE):**
- ~~schema.sql~~ - Old, use complete-setup.sql instead
- ~~fix-rls.sql~~ - Old, already included in complete-setup.sql

---

## 📂 CODE FILES (Already Working)

These files are imported by your app and are ready to use:

### **auth.ts**
- Sign up (PLV email only)
- Sign in / Sign out
- Password reset
- Email verification
- Session management ✅ FIXED!

### **database.ts**
- Create/read/update/delete items
- Create/read/update/delete claims
- Activity logs
- User management
- All database queries

### **storage.ts**
- Upload item photos
- Upload claim proof photos
- Delete photos
- Get signed URLs

### **client.ts**
- Supabase client initialization
- Uses keys from `/utils/supabase/info.tsx`

### **index.ts**
- Exports all functions
- Import from here: `import { signIn } from './lib/supabase'`

### **otp.ts**
- OTP/verification code utilities
- Currently not used (Supabase handles OTP)

---

## 🚀 HOW TO USE

### 1. Setup (One Time)

```bash
# 1. Update your API keys
/utils/supabase/info.tsx

# 2. Run SQL setup
Run /lib/supabase/complete-setup.sql in Supabase SQL Editor

# 3. Create storage buckets in Supabase Dashboard
- lost-item-images (public)
- claim-proofs (public)
```

### 2. In Your Code

```typescript
// Import what you need
import { signIn, signOut, getCurrentUser } from './lib/supabase/auth';
import { createLostItem, getVerifiedItems } from './lib/supabase/database';
import { uploadItemPhoto } from './lib/supabase/storage';

// Use the functions
const result = await signIn(email, password);
const items = await getVerifiedItems();
const upload = await uploadItemPhoto(file);
```

---

## ✅ WHAT'S FIXED

These files now have fixes for:
- ✅ Session persistence (no logout on refresh)
- ✅ Proper error handling
- ✅ Type safety
- ✅ RLS policy issues
- ✅ Storage permissions

---

## 📖 FULL DOCUMENTATION

See these guides:
- `/START_HERE.md` - Quick start
- `/FRESH_START_COMPLETE.md` - Complete setup guide
- `/QUICK_REFERENCE.md` - Quick reference card

---

**Everything is ready to use! Just follow the setup guide!** 🎉
