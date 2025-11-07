# ⏱️ 30-MINUTE SETUP CHECKLIST

**Print this out and check boxes as you go!**

---

## ☑️ STEP 1: Create Supabase Project (5 min)

- [ ] Go to https://supabase.com/dashboard
- [ ] Click "New Project"
- [ ] Name: PLV Lost and Found
- [ ] Create STRONG password (write it down!)
- [ ] Region: Singapore or Tokyo
- [ ] Click "Create new project"
- [ ] **WAIT** until project is ready (2-3 mins)

---

## ☑️ STEP 2: Get API Keys (2 min)

- [ ] Click "Project Settings" (⚙️ icon)
- [ ] Click "API"
- [ ] Copy Project URL → Get the ID part (e.g., `abcd1234`)
- [ ] Copy anon/public key (the LONG one)
- [ ] Open `/utils/supabase/info.tsx`
- [ ] Paste YOUR Project ID
- [ ] Paste YOUR anon key
- [ ] **SAVE FILE!** (Ctrl+S)

```typescript
export const projectId = "YOUR_ID_HERE"
export const publicAnonKey = "YOUR_KEY_HERE"
```

---

## ☑️ STEP 3: Run Database SQL (5 min)

- [ ] In Supabase, click "SQL Editor"
- [ ] Click "New query"
- [ ] Open `/lib/supabase/complete-setup.sql` in your code
- [ ] **COPY ENTIRE FILE** (Ctrl+A, Ctrl+C)
- [ ] **PASTE** into Supabase SQL Editor
- [ ] Click "Run" ▶️
- [ ] Wait for: "Database setup complete! ✅"
- [ ] Click "Table Editor" in sidebar
- [ ] Verify you see 5 tables:
  - [ ] users
  - [ ] lost_items
  - [ ] claims
  - [ ] activity_logs
  - [ ] otp_codes

---

## ☑️ STEP 4: Create Storage Buckets (5 min)

### Bucket 1:
- [ ] Click "Storage" in sidebar
- [ ] Click "Create a new bucket"
- [ ] Name: `lost-item-images`
- [ ] **CHECK** "Public bucket" ✅
- [ ] Click "Create bucket"

### Bucket 2:
- [ ] Click "Create a new bucket" again
- [ ] Name: `claim-proofs`
- [ ] **CHECK** "Public bucket" ✅
- [ ] Click "Create bucket"

### Policies for lost-item-images:
- [ ] Click on `lost-item-images` bucket
- [ ] Click "Policies" tab
- [ ] Click "New Policy" → "For full customization"
- [ ] Name: `Allow authenticated uploads`
- [ ] Operation: **INSERT**
- [ ] Policy: `authenticated`
- [ ] Click "Review" → "Save policy"

- [ ] Click "New Policy" again → "For full customization"
- [ ] Name: `Allow public reads`
- [ ] Operation: **SELECT**
- [ ] Policy: `true`
- [ ] Click "Review" → "Save policy"

### Policies for claim-proofs:
- [ ] Click on `claim-proofs` bucket
- [ ] Click "Policies" tab
- [ ] Click "New Policy" → "For full customization"
- [ ] Name: `Allow authenticated uploads`
- [ ] Operation: **INSERT**
- [ ] Policy: `authenticated`
- [ ] Click "Review" → "Save policy"

- [ ] Click "New Policy" again → "For full customization"
- [ ] Name: `Allow public reads`
- [ ] Operation: **SELECT**
- [ ] Policy: `true`
- [ ] Click "Review" → "Save policy"

---

## ☑️ STEP 5: Configure Auth (3 min)

- [ ] Click "Authentication" in sidebar
- [ ] Click "Providers"
- [ ] Find "Email" provider
- [ ] **TURN OFF** "Confirm email" toggle
- [ ] Click "Save"
- [ ] Click "URL Configuration"
- [ ] Add these redirect URLs (one by one):
  - [ ] `http://localhost:5173`
  - [ ] `http://localhost:5173/#type=signup`
  - [ ] `http://localhost:5173/#type=recovery`
- [ ] Click "Save"

---

## ☑️ STEP 6: Create Admin Account (5 min)

- [ ] Go to "SQL Editor" → "New query"
- [ ] Copy this SQL (edit the marked fields):

```sql
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'YOUR_EMAIL@plv.edu.ph',  -- ⚠️ CHANGE THIS
    crypt('YourPassword123!', gen_salt('bf')),  -- ⚠️ CHANGE PASSWORD
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Create user profile
  INSERT INTO public.users (
    auth_id, 
    email, 
    full_name, 
    student_id, 
    contact_number, 
    role, 
    is_verified, 
    status
  )
  VALUES (
    new_user_id,
    'YOUR_EMAIL@plv.edu.ph',  -- ⚠️ SAME EMAIL
    'Your Full Name',         -- ⚠️ CHANGE THIS
    'ADMIN-001',          
    '09123456789',            -- ⚠️ CHANGE THIS
    'admin',
    true,
    'active'
  );
  
  RAISE NOTICE 'Admin user created successfully!';
END $$;
```

- [ ] Edit: Email (line 20 & 37)
- [ ] Edit: Password (line 21)
- [ ] Edit: Full Name (line 38)
- [ ] Edit: Contact Number (line 40)
- [ ] Click "Run" ▶️
- [ ] See: "Admin user created successfully!"
- [ ] **WRITE DOWN YOUR LOGIN:**
  - Email: ____________________
  - Password: ____________________

---

## ☑️ STEP 7: Start & Test App (5 min)

### Start App:
- [ ] Open terminal in project folder
- [ ] Run: `npm run dev`
- [ ] App starts with no errors
- [ ] Open: http://localhost:5173

### Test Login:
- [ ] Click "Log In"
- [ ] Enter admin email & password
- [ ] Click "Log In"
- [ ] ✅ See Admin Dashboard

### Test Session:
- [ ] While logged in, press **F5** (refresh)
- [ ] ✅ STILL logged in and on Admin Dashboard

### Test Upload:
- [ ] Log out
- [ ] Register as student (use @plv.edu.ph email)
- [ ] Login as student
- [ ] Click "Report Item"
- [ ] Fill form and upload photo
- [ ] ✅ Item reported successfully

### Test Admin Actions:
- [ ] Log out
- [ ] Log back in as admin
- [ ] See pending item
- [ ] Click "Verify"
- [ ] ✅ Item verified!

### Test Activity Logs:
- [ ] As admin, check activity logs section
- [ ] ✅ See activity logs showing

---

## ✅ FINAL VERIFICATION

If ALL these work, you're done! ✅

- [ ] Admin can login
- [ ] Session persists on refresh ⭐
- [ ] Photos upload successfully ⭐
- [ ] Activity logs showing ⭐
- [ ] Admin can verify items
- [ ] Users can report items
- [ ] Users can claim items
- [ ] No errors in console (F12)

---

## 🎉 SUCCESS!

**You now have a fully working PLV Lost & Found System!**

**Time taken:** ~30 minutes

**Features working:**
- ✅ All admin features
- ✅ All user features  
- ✅ Sessions
- ✅ Photo uploads
- ✅ Activity logs
- ✅ Everything!

---

## 🆘 IF SOMETHING DIDN'T WORK

**Check:**
1. Did you save `/utils/supabase/info.tsx`?
2. Did you restart dev server after updating keys?
3. Are both storage buckets PUBLIC?
4. Do both storage buckets have 2 policies each?
5. Is email confirmation DISABLED?

**Still stuck?**  
See troubleshooting in: `FRESH_START_COMPLETE.md`

---

**🎊 CONGRATULATIONS! YOU DID IT! 🎊**
