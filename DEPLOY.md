# DentEase – Deployment Guide
### Frontend → Netlify | Backend → Render | Database → Neon (already live)

---

## Overview

| Layer    | Service  | Free Tier |
|----------|----------|-----------|
| Frontend | Netlify  | ✅ Yes    |
| Backend  | Render   | ✅ Yes (spins down after 15 min idle) |
| Database | Neon     | ✅ Already configured |

---

## Step 1 — Push Code to GitHub

1. Create a new repository at https://github.com/new  
   Name it e.g. `dentease`

2. In your project root (`C:\Softwares\AppointmentBooking`), open a terminal and run:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/dentease.git
git branch -M main
git push -u origin main
```

> **Important:** Make sure `.gitignore` excludes `.env` files before pushing.

---

## Step 2 — Deploy Backend on Render

### 2a. Create the Render service

1. Go to https://render.com and sign up / log in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select the `dentease` repo
4. Fill in the settings:

| Field | Value |
|-------|-------|
| **Name** | `dentease-api` |
| **Region** | Singapore (closest to Neon AP Southeast) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | Free |

### 2b. Set Environment Variables on Render

In the Render dashboard → your service → **Environment** tab, add these variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql+asyncpg://neondb_owner:npg_kt3mn8sbpMSF@ep-muddy-queen-a1xis0ro-pooler.ap-southeast-1.aws.neon.tech/neondb` |
| `SECRET_KEY` | `6fa4c7f907aa893ee2ebb463b914156fcca4d419d969f886b140e000a0bf2239` |
| `DEBUG` | `false` |
| `APP_NAME` | `DentEase API` |

> **Do NOT use the same SECRET_KEY in production.** Generate a new one:
> ```bash
> python -c "import secrets; print(secrets.token_hex(32))"
> ```

### 2c. Note your backend URL

After deploy, Render gives you a URL like:
```
https://dentease-api.onrender.com
```
Copy this — you need it in Step 3.

---

## Step 3 — Configure Frontend for Production

### 3a. Update the Vite proxy / API client

In production, the Vite dev server proxy isn't available. Netlify handles it via a redirect rule.

Create the file `frontend/public/_redirects`:

```
/api/*  https://dentease-api.onrender.com/api/:splat  200
```

> Replace `https://dentease-api.onrender.com` with your actual Render URL from Step 2c.

This tells Netlify to forward any `/api/*` request to your Render backend — no CORS issues.

### 3b. Create `netlify.toml` in the `frontend` folder

Create `frontend/netlify.toml`:

```toml
[build]
  command   = "npm run build"
  publish   = "dist"

[[redirects]]
  from = "/api/*"
  to   = "https://dentease-api.onrender.com/api/:splat"
  status = 200
  force  = true

[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200
```

> The second redirect rule ensures React Router works correctly (all routes serve `index.html`).

---

## Step 4 — Deploy Frontend on Netlify

1. Go to https://netlify.com and sign up / log in
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and select the `dentease` repo
4. Fill in the build settings:

| Field | Value |
|-------|-------|
| **Base directory** | `frontend` |
| **Build command** | `npm run build` |
| **Publish directory** | `frontend/dist` |

5. Click **"Deploy site"**

Netlify will build and give you a URL like `https://dentease.netlify.app`

### Optional: Set a custom site name
Netlify dashboard → **Site settings** → **Site details** → **Change site name** → type `dentease`

---

## Step 5 — Update CORS on Backend

Once you have your Netlify URL, update `backend/app/main.py` to allow requests from it:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://dentease.netlify.app",   # ← add your Netlify URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit and push — Render will auto-redeploy.

---

## Step 6 — Verify Deployment

1. Open your Netlify URL (e.g. `https://dentease.netlify.app`)
2. Log in with mobile `0000000000` and PIN `1234`
3. Check the dashboard loads correctly
4. Book a test appointment

---

## Summary of Files to Create/Update

| File | Action |
|------|--------|
| `frontend/public/_redirects` | **Create** — API proxy rule |
| `frontend/netlify.toml` | **Create** — build + redirect config |
| `backend/app/main.py` | **Update** — add Netlify URL to CORS |
| `.gitignore` (root) | **Verify** — `.env` is excluded |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Backend spins down (slow first load) | Expected on free Render tier — first request after idle takes ~30s |
| "Network Error" on login | Check `_redirects` has correct Render URL |
| React routes show 404 on refresh | Verify `netlify.toml` has the `/*` → `/index.html` redirect |
| CORS error in browser console | Add Netlify URL to `allow_origins` in `main.py` |
| Neon DB connection error on Render | Ensure `DATABASE_URL` env var is set correctly in Render dashboard |
