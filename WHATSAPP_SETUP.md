# DentEase – WhatsApp Business API Setup Guide

---

## Overview

| Phase     | Token Type       | Expires   | Can Send To              |
|-----------|------------------|-----------|--------------------------|
| Testing   | Temporary        | 24 hours  | Verified numbers only    |
| Production| Permanent System | Never     | Any WhatsApp number      |

---

## PART A — Testing Setup (Free, Takes 10 Minutes)

---

### Step 1 — Create a Meta Developer Account

1. Go to **https://developers.facebook.com**
2. Click **"Get Started"** — log in with your Facebook account
3. Accept the developer terms and verify your account

---

### Step 2 — Create a Meta App

1. Click **"My Apps"** (top right) → **"Create App"**
2. Select app type: **"Business"** → click Next
3. Fill in:
   - App name: `DentEase`
   - App contact email: your email
4. Click **"Create App"**

---

### Step 3 — Add WhatsApp Product

1. On the app dashboard, scroll down to find **"WhatsApp"**
2. Click **"Set up"**
3. You will land on the **WhatsApp Getting Started** page

---

### Step 4 — Copy Your Credentials

On the **WhatsApp → API Setup** page, you will see:

```
Temporary access token:   EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Phone Number ID:          1234567890123456
```

> ✅ Copy both values — you will need them in Step 6.

---

### Step 5 — Add Test Recipient Number

On the same page, under **"Send and receive messages"**:

1. Find the **"To"** dropdown field
2. Click **"Manage phone number list"**
3. Click **"Add phone number"**
4. Enter: `+91 8792507355`
5. Meta will send a WhatsApp message to that number with a verification code
6. Enter the code to confirm

> ⚠️ During testing you can ONLY send messages to verified numbers added here.

---

### Step 6 — Add Credentials to Render

1. Go to **https://dashboard.render.com**
2. Open your **dentease-backend** service
3. Click the **"Environment"** tab
4. Click **"Add Environment Variable"** and add each of the following:

| Key                        | Value                                  |
|----------------------------|----------------------------------------|
| `WHATSAPP_API_URL`         | `https://graph.facebook.com/v18.0`     |
| `WHATSAPP_API_TOKEN`       | Your temporary token from Step 4       |
| `WHATSAPP_PHONE_NUMBER_ID` | Your Phone Number ID from Step 4       |

5. Click **"Save Changes"**
6. Render will automatically redeploy the backend

---

### Step 7 — Test It

1. Open **https://denteasebooking.netlify.app/dashboard**
2. You will see today's appointments listed
3. Check the checkbox next to one or more appointments
4. Click the green **"Send Reminder"** button
5. Check WhatsApp on `+91 8792507355`

**The patient will receive this message:**
```
Reminder: Hello [Patient Name],
You have an appointment at DentEase Dental Clinic in 2 hours.
Time: 2026-04-09 10:00
See you soon!
```

---

### ⚠️ Token Expiry (Every 24 Hours)

The temporary token expires after **24 hours**. When the Send Reminder button stops working:

1. Go back to **https://developers.facebook.com/apps**
2. Open `DentEase` app → **WhatsApp → API Setup**
3. Copy the new **Temporary access token**
4. Go to Render → Environment → update `WHATSAPP_API_TOKEN`
5. Click **Save Changes**

---

## PART B — Production Setup (Permanent Token)

> Do this when you are ready to send reminders to all patients (not just test numbers).

---

### Step 1 — Create a Meta Business Portfolio

1. Go to **https://business.facebook.com**
2. Click **"Create Account"**
3. Enter your business name: `DentEase`
4. Complete the setup

---

### Step 2 — Verify Your Business

1. In Business Settings → **"Business Info"**
2. Submit business verification documents
3. Meta reviews within 1–3 business days

---

### Step 3 — Add a Real Phone Number

1. Go to your Meta App → **WhatsApp → API Setup**
2. Under **"Production"** section, click **"Add phone number"**
3. Enter your clinic's WhatsApp number: `+91 8792507355`
4. Choose verification method: **SMS** or **Voice call**
5. Enter the verification code received

> ⚠️ This number must NOT be registered on regular WhatsApp.
> If it is, you must delete the WhatsApp account first (Settings → Account → Delete Account).

---

### Step 4 — Create a System User Token

1. Go to **https://business.facebook.com/settings/system-users**
2. Click **"Add"** → name it `dentease-api` → Role: **Admin**
3. Click **"Generate New Token"**
4. Select your `DentEase` app
5. Select these permissions:
   - ✅ `whatsapp_business_messaging`
   - ✅ `whatsapp_business_management`
6. Set expiration: **Never**
7. Click **"Generate Token"** → Copy it immediately (shown only once)

---

### Step 5 — Update Render with Permanent Token

1. Go to Render → **dentease-backend** → **Environment**
2. Update `WHATSAPP_API_TOKEN` with the new permanent token
3. Click **Save Changes**

Now reminders will be sent to **any patient** without token expiry.

---

## Quick Reference

### Credentials Location
| Credential             | Where to Find                                              |
|------------------------|------------------------------------------------------------|
| Temporary token        | developers.facebook.com → App → WhatsApp → API Setup      |
| Phone Number ID        | developers.facebook.com → App → WhatsApp → API Setup      |
| Permanent token        | business.facebook.com → Settings → System Users           |

### Render Environment Variables
| Key                        | Value                               |
|----------------------------|-------------------------------------|
| `WHATSAPP_API_URL`         | `https://graph.facebook.com/v18.0`  |
| `WHATSAPP_API_TOKEN`       | Your token (temporary or permanent) |
| `WHATSAPP_PHONE_NUMBER_ID` | Your WhatsApp Phone Number ID       |

### Useful Links
- Meta Developer Console: https://developers.facebook.com/apps
- Meta Business Suite: https://business.facebook.com
- Render Dashboard: https://dashboard.render.com
- DentEase Frontend: https://denteasebooking.netlify.app
