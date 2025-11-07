# 📧 Email Flow Setup - Complete Guide

## ✅ **WHAT'S BEEN IMPLEMENTED**

### **New Pages Created:**

1. **`/components/ResetPasswordPage.tsx`**
   - User enters new password after clicking reset link from email
   - Shows password strength indicator
   - Success animation after password reset
   - Redirects to login

2. **`/components/EmailVerifiedPage.tsx`**
   - Congratulations page after clicking verification link from email
   - Bounce animation with party popper icon
   - Auto-redirects to login after 5 seconds

### **Updated Files:**

1. **`/App.tsx`**
   - Added routes for `reset-password` and `email-verified` pages
   - Both pages are public (no auth required)

2. **`/context/AppContext.tsx`**
   - Added URL hash detection for Supabase auth callbacks
   - Detects `type=recovery` → routes to reset-password page
   - Detects `type=signup` → routes to email-verified page
   - Cleans up URL hash after routing

3. **`/lib/supabase/auth.ts`**
   - Updated `signUp()` redirect: `${origin}/#type=signup`
   - Updated `sendPasswordResetEmail()` redirect: `${origin}/#type=recovery`

4. **`/components/RegisterPage.tsx`**
   - Now calls real `signUp()` from Supabase
   - Shows "Check Your Email" page after registration
   - No more mock/demo code

5. **`/components/ForgotPasswordPage.tsx`**
   - Now calls real `sendPasswordResetEmail()` from Supabase
   - Shows "Check Your Email" page after submitting
   - No more mock/demo code

---

## 🔄 **HOW THE FLOWS WORK**

### **Registration Flow:**

```
1. User fills out registration form
   ↓
2. Clicks "Create Account"
   ↓
3. Supabase creates account and sends verification email
   ↓
4. Shows "Check Your Email" page with mail icon animation
   ↓
5. User clicks link in email
   ↓
6. Redirects to: yourapp.com/#type=signup
   ↓
7. AppContext detects hash and routes to "email-verified" page
   ↓
8. Shows "Congratulations!" page with party popper animation
   ↓
9. Auto-redirects to login after 5 seconds
```

### **Password Reset Flow:**

```
1. User enters email on forgot password page
   ↓
2. Clicks "Send Reset Link"
   ↓
3. Supabase sends password reset email
   ↓
4. Shows "Check Your Email" page with mail icon animation
   ↓
5. User clicks link in email
   ↓
6. Redirects to: yourapp.com/#type=recovery
   ↓
7. AppContext detects hash and routes to "reset-password" page
   ↓
8. User enters new password and confirms
   ↓
9. Shows success animation
   ↓
10. Redirects to login
```

---

## ⚙️ **SUPABASE CONFIGURATION NEEDED**

### **Step 1: Set Redirect URLs in Supabase**

1. Go to **Supabase Dashboard**
2. **Authentication** → **URL Configuration**
3. Add these to **Redirect URLs:**
   ```
   http://localhost:5173
   http://localhost:5173/#type=signup
   http://localhost:5173/#type=recovery
   https://your-production-domain.com
   https://your-production-domain.com/#type=signup
   https://your-production-domain.com/#type=recovery
   ```

### **Step 2: Configure Email Templates (Optional)**

You can customize the email templates:

1. **Authentication** → **Email Templates**
2. Edit **"Confirm signup"** template
3. Edit **"Reset password"** template

**Default templates work fine**, but you can add PLV branding if you want.

### **Step 3: Disable Email Confirmation (For Testing Only)**

If you want to test without clicking email links:

1. **Authentication** → **Providers** → **Email**
2. **Turn OFF** "Confirm email"
3. Users can log in immediately without verification

**Note:** Re-enable this in production!

---

## 🧪 **TESTING THE FLOWS**

### **Test Registration:**

1. Go to register page
2. Fill out form with valid PLV email
3. Click "Create Account"
4. Should see "Check Your Email" page
5. Check email inbox (or Supabase Auth logs if email disabled)
6. Click verification link
7. Should see "Congratulations" page
8. Auto-redirects to login

### **Test Password Reset:**

1. Go to forgot password page
2. Enter email
3. Click "Send Reset Link"
4. Should see "Check Your Email" page
5. Check email inbox
6. Click reset link
7. Should see "Create New Password" page
8. Enter and confirm new password
9. Should see success message
10. Redirects to login

---

## 🐛 **TROUBLESHOOTING**

### **Email not arriving?**
- Check spam folder
- Check Supabase Dashboard → **Authentication** → **Users** → View logs
- If email confirmation disabled, you can log in directly
- For development, consider using [Mailtrap](https://mailtrap.io) or disable confirmation

### **Link redirects to wrong page?**
- Check that redirect URLs are set correctly in Supabase
- Make sure hash detection is working in AppContext
- Check browser console for errors

### **"Invalid token" error?**
- Email links expire after 24 hours
- Request a new link
- Check that Supabase project URL matches in client.ts

### **Password reset not working?**
- User must be clicking the link FROM their email
- Can't manually navigate to reset-password page without token
- Check Supabase auth logs for errors

---

## 📋 **NEXT STEPS**

Now that auth flows are complete, you can:

1. ✅ **Test registration and login**
2. ✅ **Test password reset flow**
3. 🔜 **Connect Report Item form to Supabase**
4. 🔜 **Connect Lost & Found Board to database**
5. 🔜 **Implement claim process**
6. 🔜 **Set up admin dashboard**

---

## 🎯 **IMPORTANT NOTES**

- **Email links are single-use** - They expire after being clicked
- **Links expire after 24 hours** by default
- **Hash-based routing** is used because it works in SPAs without server config
- **Production URLs** must be added to Supabase redirect whitelist
- **SMTP setup** is optional - Supabase provides free email service for auth

---

Tapos na ang email flow setup! Ready na to test! 🎉
