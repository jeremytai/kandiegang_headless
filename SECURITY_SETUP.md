# Security Setup Guide

This guide covers the setup steps for the security improvements implemented for event signup.

## Overview

The following security enhancements have been added:

1. ✅ **Cloudflare Turnstile** - Bot protection for guest signups
2. ✅ **Email Validation** - Format validation and length limits
3. ✅ **Input Sanitization** - Length limits on all text inputs
4. ✅ **Persistent Rate Limiting** - Redis-based rate limiting for serverless
5. ✅ **Enhanced Logging** - Better error tracking and diagnostics

## Required Environment Variables

### 1. Cloudflare Turnstile (Required for Production)

**What it does:** Prevents bots from spamming event signups

**Setup Steps:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** in the sidebar
3. Click **Add Site**
4. Configure:
   - **Site Name:** Kandie Gang
   - **Domain:** `kandiegang.com` (or your domain)
   - **Widget Mode:** Managed (recommended)
5. Copy the **Site Key** and **Secret Key**

**Environment Variables to Add:**
```bash
# Frontend (Vite)
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key

# Backend (Vercel)
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
```

**Add to Vercel:**
```bash
vercel env add VITE_TURNSTILE_SITE_KEY
# Paste your site key when prompted
# Select: Production, Preview, Development

vercel env add TURNSTILE_SECRET_KEY
# Paste your secret key when prompted
# Select: Production, Preview, Development
```

---

### 2. Upstash Redis (Required for Rate Limiting)

**What it does:** Provides persistent rate limiting across serverless functions

**Setup Steps:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project → **Storage** tab
3. Click **Create Database** → **Upstash Redis**
4. Follow the prompts to create a new Redis database
5. Vercel will automatically add the environment variables

**Environment Variables (Auto-configured):**
```bash
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**Alternative Manual Setup:**
1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the REST URL and REST TOKEN
4. Add to Vercel using `vercel env add`

---

## Deployment Checklist

### Before Deploying

- [ ] Cloudflare Turnstile site created
- [ ] `VITE_TURNSTILE_SITE_KEY` added to Vercel
- [ ] `TURNSTILE_SECRET_KEY` added to Vercel
- [ ] Upstash Redis database created
- [ ] `UPSTASH_REDIS_REST_URL` added to Vercel
- [ ] `UPSTASH_REDIS_REST_TOKEN` added to Vercel

### Deploy

```bash
git add .
git commit -m "feat: add security improvements (Turnstile, validation, rate limiting)"
git push
```

### After Deploying

- [ ] Test guest signup with Turnstile widget
- [ ] Verify email validation (try invalid email)
- [ ] Test rate limiting (make 20+ requests quickly)
- [ ] Check Vercel logs for any errors
- [ ] Monitor Upstash dashboard for Redis usage

---

## Testing

### Test Turnstile (Guest Signup)

1. Open event page (not logged in)
2. Click "Sign Up" for a level
3. Fill out guest signup form
4. **Verify:** Turnstile widget appears
5. Complete Turnstile challenge
6. Submit form
7. **Expected:** Signup succeeds and email is sent

### Test Email Validation

Try these invalid emails:
- `notanemail` → Should show error
- `test@` → Should show error
- `@example.com` → Should show error
- `test@example` → Should show error

Valid email:
- `test@example.com` → Should work

### Test Input Length Limits

Try entering:
- First name: 101 characters → Should show error "too long"
- Last name: 101 characters → Should show error "too long"
- Email: 256 characters → Should show error "too long"

### Test Rate Limiting

```bash
# Run this in terminal to test rate limiting
for i in {1..25}; do
  curl -X POST https://kandiegang.com/api/event-signup \
    -H "Content-Type: application/json" \
    -d '{"eventId": 12973, "rideLevel": "level1", "firstName": "Test", "lastName": "User", "email": "test@test.com", "turnstileToken": "test"}' &
done
```

**Expected:** First 20 requests succeed, remaining get 429 error

---

## Monitoring

### Check Rate Limiting

**Upstash Dashboard:**
- Go to [Upstash Console](https://console.upstash.com/)
- View your database → **Data Browser**
- Look for keys starting with `ratelimit:event-signup:`
- These should expire after 60 seconds

**Vercel Logs:**
```bash
vercel logs --follow
```

Look for:
- `[event-signup] Turnstile verification passed`
- `[event-signup] Confirmation email sent to...`
- `[rate-limit] Redis error` (indicates Redis issues)

---

## Troubleshooting

### Turnstile Not Showing

**Symptoms:** Widget doesn't appear on guest signup form

**Fixes:**
1. Check `VITE_TURNSTILE_SITE_KEY` is set in Vercel
2. Rebuild frontend: `npm run build`
3. Verify site key matches your domain
4. Check browser console for errors

### Signups Failing with "Bot verification failed"

**Symptoms:** All guest signups rejected

**Fixes:**
1. Verify `TURNSTILE_SECRET_KEY` is set correctly
2. Check Turnstile dashboard for failed verifications
3. Ensure Turnstile domain matches your deployment domain

### Rate Limiting Not Working

**Symptoms:** Can make unlimited requests

**Fixes:**
1. Check Redis environment variables are set
2. Verify Upstash database is active
3. Check Vercel logs for Redis connection errors
4. If Redis fails, in-memory fallback is used (NOT persistent)

### Emails Not Sending

**Symptoms:** Signup succeeds but no email received

**Fixes:**
1. Check `RESEND_API_KEY` is set
2. Verify `RESEND_FROM_EMAIL` is configured
3. Check Vercel logs for email errors
4. See earlier fix: email fallback to `user.email`

---

## Security Best Practices

### ✅ Implemented

- Bot protection on guest signups (Turnstile)
- Email format validation
- Input length limits (100 chars for names, 255 for email)
- Persistent rate limiting (20 req/min for signups, 60 req/min for capacity)
- Secure environment variable handling

### 🔄 Recommended Next Steps

1. **Add CORS Headers** - Restrict API access to your domain
2. **Implement CSP** - Content Security Policy headers
3. **Add Honeypot Fields** - Additional bot detection
4. **Monitor Abuse Patterns** - Set up alerts for suspicious activity
5. **Regular Security Audits** - Review logs and patterns monthly

---

## Environment Variables Reference

Complete list of all security-related environment variables:

```bash
# Cloudflare Turnstile
VITE_TURNSTILE_SITE_KEY=    # Frontend site key
TURNSTILE_SECRET_KEY=       # Backend secret key

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=     # Redis REST endpoint
UPSTASH_REDIS_REST_TOKEN=   # Redis auth token

# Email (Resend)
RESEND_API_KEY=             # Already configured
RESEND_FROM_EMAIL=          # Already configured

# Supabase
VITE_SUPABASE_URL=          # Already configured
VITE_SUPABASE_ANON_KEY=     # Already configured
SUPABASE_SERVICE_ROLE_KEY=  # Already configured
```

---

## Support

If you encounter issues:

1. Check Vercel logs: `vercel logs --follow`
2. Check Upstash dashboard for Redis errors
3. Check Cloudflare Turnstile dashboard for verification stats
4. Review this guide's troubleshooting section

For critical security issues, review the code in:
- `api/event-signup.ts` - Main signup endpoint
- `api/event-capacity.ts` - Capacity endpoint
- `components/event/EventSignupPanel.tsx` - Frontend form
