# 📋 QUICK REFERENCE CARD

**Print this out or keep it open while setting up!**

---

## 🔑 YOUR CREDENTIALS

```
Supabase Project ID: _____________________
Supabase anon key: _______________________
Database Password: _______________________

Admin Email: _____________________________
Admin Password: __________________________
```

---

## ⚡ SETUP COMMANDS

### 1. Update API Keys
File: `/utils/supabase/info.tsx`
```typescript
export const projectId = "YOUR_PROJECT_ID"
export const publicAnonKey = "YOUR_ANON_KEY"
```

### 2. Database Setup
Supabase → SQL Editor → Run this file:
```
/lib/supabase/complete-setup.sql
```

### 3. Storage Buckets
Create 2 buckets (both PUBLIC):
```
lost-item-images
claim-proofs
```

### 4. Storage Policies (for EACH bucket)
Policy 1:
```
Name: Allow authenticated uploads
Operation: INSERT
Definition: authenticated
```

Policy 2:
```
Name: Allow public reads  
Operation: SELECT
Definition: true
```

### 5. Auth Settings
```
✅ Disable email confirmation
✅ Add redirect URLs:
   http://localhost:5173
   http://localhost:5173/#type=signup
   http://localhost:5173/#type=recovery
```

### 6. Create Admin (SQL)
```sql
-- Change email, password, name, number
INSERT INTO auth.users (...)
VALUES ('admin@plv.edu.ph', 'YourPassword', ...);
```

---

## ✅ VERIFICATION CHECKLIST

Quick way to verify everything is working:

### Database
- [ ] 5 tables exist in Table Editor
- [ ] Users table has your admin row
- [ ] Admin role = 'admin'

### Storage
- [ ] lost-item-images bucket exists (Public)
- [ ] claim-proofs bucket exists (Public)
- [ ] Each bucket has 2 policies

### Authentication
- [ ] Email confirmation is OFF
- [ ] 3 redirect URLs added
- [ ] Can see admin user in Auth → Users

### App Testing
- [ ] App starts: `npm run dev`
- [ ] Admin can login
- [ ] Refresh keeps you logged in ⭐
- [ ] Can upload photo ⭐
- [ ] Activity logs show ⭐

---

## 🆘 QUICK FIXES

### Issue: "Invalid API key"
```bash
# Fix:
1. Check /utils/supabase/info.tsx has YOUR keys
2. Restart: Ctrl+C then npm run dev
```

### Issue: Can't upload photos
```sql
-- Fix: Run this in SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('lost-item-images', 'lost-item-images', true),
  ('claim-proofs', 'claim-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;
```

### Issue: Refresh logs me out
```bash
# Fix:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Close ALL browser tabs
3. Reopen and test again
```

### Issue: Activity logs empty
```bash
# Fix: Check if admin role is correct
# Run in SQL Editor:
SELECT * FROM users WHERE email = 'your@email.com';
# role should be 'admin'
```

---

## 📞 SUPABASE URLS

```
Dashboard: https://supabase.com/dashboard
Your Project: https://YOUR_PROJECT_ID.supabase.co
SQL Editor: Dashboard → SQL Editor
Storage: Dashboard → Storage
Auth: Dashboard → Authentication
Table Editor: Dashboard → Table Editor
```

---

## 📂 PROJECT FILES

### You Must Edit:
```
/utils/supabase/info.tsx    ← Add YOUR API keys
```

### Run in Supabase:
```
/lib/supabase/complete-setup.sql    ← Run this in SQL Editor
```

### Reference Guides:
```
START_HERE.md                ← Start here
FRESH_START_COMPLETE.md      ← Complete guide
EMAIL_FLOW_SETUP.md          ← Email verification
```

### Code (Already Working):
```
/lib/supabase/auth.ts        ← Authentication
/lib/supabase/database.ts    ← Database queries
/lib/supabase/storage.ts     ← Photo uploads
/context/AppContext.tsx      ← Session management (FIXED!)
/App.tsx                     ← Main app (FIXED!)
```

---

## 🎯 SUCCESS CRITERIA

You're done when:

1. ✅ Login works
2. ✅ F5 refresh doesn't log you out
3. ✅ Can upload photos
4. ✅ Activity logs show
5. ✅ No errors in console (F12)

---

## 💡 PRO TIPS

1. **Always check browser console (F12)** for errors
2. **Save files after editing!** (Ctrl+S)
3. **Restart dev server** after changing API keys
4. **Clear browser cache** if things act weird
5. **Check Supabase Dashboard → Logs** for backend errors
6. **Test with incognito window** to rule out cache issues

---

## ⏱️ TIME ESTIMATES

```
Supabase project:     5 mins
Update API keys:      1 min
Run SQL:              2 mins
Create buckets:       3 mins
Set policies:         5 mins
Configure auth:       3 mins
Create admin:         2 mins
Test everything:      5 mins
----------------------
TOTAL:                ~25 mins
```

---

**Print this page and check off items as you go! ✅**
