# 41Blog – Complete Setup & Deployment Guide

## 📁 Project Structure

```
41blog/
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   ├── posts.ts          # Server Actions: CRUD + likes
│   │   │   └── users.ts          # Server Actions: user management
│   │   ├── api/
│   │   │   └── upload/
│   │   │       └── signed-url/
│   │   │           └── route.ts  # R2 signed URL generator
│   │   ├── admin/
│   │   │   ├── page.tsx          # Admin dashboard
│   │   │   ├── posts/
│   │   │   │   └── new/page.tsx  # Create post
│   │   │   └── users/page.tsx    # User management
│   │   ├── posts/
│   │   │   └── [id]/page.tsx     # Post detail (SSR)
│   │   ├── search/page.tsx       # Search results
│   │   ├── globals.css           # Design system tokens
│   │   ├── layout.tsx            # Root layout + PWA
│   │   └── page.tsx              # Home feed
│   ├── components/
│   │   ├── admin/
│   │   │   ├── NewPostForm.tsx
│   │   │   └── UserManagementClient.tsx
│   │   ├── layout/
│   │   │   └── Navbar.tsx        # Top bar + mobile bottom nav
│   │   ├── posts/
│   │   │   ├── PostCard.tsx      # Feed card with like/share
│   │   │   ├── PostFeed.tsx      # Infinite scroll feed
│   │   │   └── PostDetailClient.tsx
│   │   ├── pwa/
│   │   │   ├── PWAInstallPrompt.tsx
│   │   │   └── ServiceWorkerRegistrar.tsx
│   │   ├── ui/
│   │   │   └── SearchBar.tsx
│   │   └── upload/
│   │       └── ImageUploader.tsx # Full upload pipeline
│   ├── contexts/
│   │   └── AuthContext.tsx       # Firebase auth + role state
│   ├── hooks/
│   │   └── useDebounce.ts
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── client.ts         # Firebase client SDK
│   │   │   └── admin.ts          # Firebase Admin SDK (server)
│   │   ├── r2/
│   │   │   └── client.ts         # Cloudflare R2 client
│   │   ├── image-processor.ts    # Compress/resize/overlay/GPS
│   │   └── permissions.ts        # Pure permission functions
│   ├── types/
│   │   └── index.ts              # Shared TypeScript types
│   └── __tests__/
│       ├── permissions.test.ts   # 22 permission tests
│       └── upload.test.ts        # 11 upload validation tests
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   └── icons/                    # PWA icons (generate below)
├── .env.example                  # Environment template
├── firebase.json                 # Firebase project config
├── firestore.rules               # Security rules
├── firestore.indexes.json        # Composite indexes
├── next.config.ts                # Next.js config
├── jest.config.js                # Test config
└── tsconfig.json
```

---

## 🚀 Step 1: Local Development Setup

### 1.1 Clone & Install

```bash
git clone https://github.com/yourusername/41blog.git
cd 41blog
npm install
```

### 1.2 Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values (see Step 2 & 3 below).

### 1.3 Generate PWA Icons

Install a tool to generate icons from a source image:

```bash
# Option A: Use realfavicongenerator.net (recommended)
# Upload a 512x512 PNG and download the icon pack

# Option B: Use sharp programmatically
npx sharp-cli --input logo.png --output public/icons/icon-192x192.png resize 192 192
npx sharp-cli --input logo.png --output public/icons/icon-512x512.png resize 512 512
# Repeat for all sizes: 72, 96, 128, 144, 152, 192, 384, 512
```

### 1.4 Run Development Server

```bash
npm run dev
# → http://localhost:3000
```

---

## 🔥 Step 2: Firebase Setup

### 2.1 Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create new project → disable Google Analytics (optional)
3. Add a **Web app** → copy the config values to `.env.local`

### 2.2 Enable Authentication

1. Firebase Console → Authentication → Sign-in method
2. Enable **Google** provider
3. Add your domain to authorized domains (add `localhost` for dev)

### 2.3 Create Firestore Database

1. Firebase Console → Firestore Database → Create database
2. Start in **production mode** (rules will be deployed)
3. Choose a region close to your users

### 2.4 Deploy Security Rules & Indexes

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (select your project)
firebase use --add

# Deploy rules and indexes
firebase deploy --only firestore:rules,firestore:indexes
```

### 2.5 Create Admin Config Document

In Firestore, create this document manually:

```
Collection: config
Document ID: admins
Fields:
  emails: ["admin@example.com", "admin2@example.com"]
```

This is how the security rules identify admins.

### 2.6 Generate Admin SDK Key

1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" → download JSON
3. Extract values to `.env.local`:
   - `FIREBASE_ADMIN_PROJECT_ID` = `project_id`
   - `FIREBASE_ADMIN_CLIENT_EMAIL` = `client_email`
   - `FIREBASE_ADMIN_PRIVATE_KEY` = `private_key` (replace `\n` with literal `\n`)

---

## ☁️ Step 3: Cloudflare R2 Setup

### 3.1 Create R2 Bucket

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → R2
2. Create bucket named `41blog-images`
3. Enable **Public access** (or use custom domain)

### 3.2 Create API Token

1. R2 → Manage R2 API Tokens → Create API Token
2. Permissions: **Object Read & Write** for your bucket
3. Copy to `.env.local`:
   - `R2_ACCOUNT_ID` = your Cloudflare Account ID
   - `R2_ACCESS_KEY_ID` = Access Key ID
   - `R2_SECRET_ACCESS_KEY` = Secret Access Key
   - `R2_PUBLIC_URL` = `https://pub-xxxx.r2.dev` (from bucket settings)

### 3.3 Configure CORS (for direct uploads)

In R2 bucket settings → CORS Policy:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 🧪 Step 4: Firebase Emulator (Local Testing)

```bash
# Install Firebase CLI if not already done
npm install -g firebase-tools

# Start emulators
firebase emulators:start

# In another terminal, run app with emulators
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true npm run dev
```

Emulator UI: http://localhost:4000

---

## 🧪 Step 5: Run Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Type checking
npm run type-check
```

Expected output: **33 tests passing** across 2 test suites.

---

## 📦 Step 6: GitHub Repository

```bash
# Initialize git
git init
git add .
git commit -m "feat: initial 41Blog PWA setup"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/41blog.git
git branch -M main
git push -u origin main
```

---

## 🚀 Step 7: Vercel Deployment

### 7.1 Connect to Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

Or connect via [vercel.com/new](https://vercel.com/new) → Import from GitHub.

### 7.2 Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add all variables from `.env.local`.

> ⚠️ For `FIREBASE_ADMIN_PRIVATE_KEY`, paste the raw value with actual newlines, not `\n` escape sequences. Vercel handles this correctly.

### 7.3 Update Firebase Authorized Domains

Firebase Console → Authentication → Settings → Authorized domains → Add your Vercel domain (e.g., `41blog.vercel.app`).

### 7.4 Update R2 CORS

Add your Vercel domain to the R2 CORS policy.

---

## 🔒 Security Checklist

- [x] Firebase security rules deployed
- [x] R2 uploads via signed URLs only (no direct public upload)
- [x] Firebase Admin SDK on server only
- [x] File type validation (server-side)
- [x] File size validation (max 10MB, server-side)
- [x] Security headers configured (X-Frame-Options, CSP, etc.)
- [x] Admin emails in environment variable (not hardcoded)
- [x] ID token verified on every server action

---

## 🚀 Future Upgrade Suggestions

### Phase 2 Features
1. **Comments system** – Firestore subcollection `posts/{id}/comments`
2. **Push notifications** – Firebase Cloud Messaging for new posts
3. **Story/Reel format** – Vertical full-screen image viewer
4. **Post scheduling** – Cloud Functions + Firestore timestamp trigger
5. **Image EXIF extraction** – Read GPS from photo metadata automatically

### AI Automation Ideas
1. **Auto-caption** – Gemini Vision API to generate post descriptions from images
2. **Content moderation** – Cloud Vision API SafeSearch before publishing
3. **Smart tagging** – Auto-tag posts with detected objects/locations
4. **Translation** – Auto-translate posts for multilingual communities
5. **Highlight reel** – AI-curated "best of the week" digest

### Performance Optimizations
1. **Edge caching** – Cache public posts at Vercel Edge
2. **Image CDN** – Cloudflare Images for automatic WebP conversion
3. **Firestore pagination** – Already implemented with cursor-based pagination
4. **React Query** – Replace manual state with TanStack Query for caching
5. **ISR** – Incremental Static Regeneration for post detail pages
6. **Bundle analysis** – `npm run build && npx @next/bundle-analyzer`

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Firebase Admin key error | Ensure `\n` in private key is literal newline in Vercel |
| R2 upload 403 | Check CORS policy and bucket permissions |
| Images not loading | Add R2 domain to `next.config.ts` `remotePatterns` |
| PWA not installing | Serve over HTTPS, check manifest.json is valid |
| Emulator connection refused | Run `firebase emulators:start` first |
