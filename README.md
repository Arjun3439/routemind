# 🗺 RouteMind — AI Travel Copilot

> "Why search for experiences when they can find you?"

RouteMind is a community-powered AI travel copilot that finds the best places to stop on any route, powered by Gemini AI, Google Maps, and community tips.

---

## 🚀 Quick Start (15 minutes)

### Prerequisites

- Node.js ≥ 18
- npm or yarn
- Expo Go app on your phone (or Android emulator / iOS Simulator)
- API keys (see Environment Setup below)

---

## 📦 Installation

```bash
# 1. Navigate to project
cd routemind

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Fill in API keys in .env (see below)

# 5. Start the development server
npx expo start

# 6. Scan QR code with Expo Go (or press 'a' for Android, 'i' for iOS)
```

---

## 🔑 Environment Setup

Edit `.env` and fill in all keys:

### 1. Clerk (Authentication)
1. Go to [clerk.com](https://clerk.com) → Create account → Create application
2. Choose "Email + Password" authentication
3. Copy Publishable Key → `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

### 2. Supabase (Database)
1. Go to [supabase.com](https://supabase.com) → New project
2. Settings → API → Copy URL and anon key
3. Go to SQL Editor → Run the full `supabase/schema.sql` script
4. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 3. Google AI / Gemini
1. Go to [aistudio.google.com](https://aistudio.google.com/app/apikey)
2. Create API key → `EXPO_PUBLIC_GEMINI_API_KEY`

### 4. Google Maps Platform
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable these APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API
   - Directions API
   - Geocoding API
3. Create a credential (API Key)
4. Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` and `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`

---

## 🗄 Database Setup

Run the SQL schema in Supabase SQL Editor:

```
supabase/schema.sql
```

This creates:
- `users`, `trips`, `places`, `trip_places`
- `tips`, `upvotes`, `saved_places`, `visits`, `notifications`
- PostGIS spatial indexes
- RLS policies
- Trigger functions

---

## 📁 Project Structure

```
routemind/
├── app/
│   ├── _layout.tsx              # Root layout (Clerk + React Query)
│   ├── (auth)/
│   │   ├── sign-in.tsx          # Sign in screen
│   │   └── sign-up.tsx          # Sign up + OTP verification
│   ├── (tabs)/
│   │   ├── index.tsx            # Home screen (route form)
│   │   ├── explore.tsx          # Map tab
│   │   ├── saved.tsx            # Saved places
│   │   └── profile.tsx          # User profile
│   ├── trip/
│   │   └── results.tsx          # Route discovery + map
│   └── place/
│       └── [id].tsx             # Place detail + community tips
├── src/
│   ├── types/index.ts           # All TypeScript types
│   ├── constants/index.ts       # Colors, spacing, weights
│   ├── store/index.ts           # Zustand stores
│   ├── services/
│   │   ├── gemini.service.ts    # Gemini AI integration
│   │   ├── maps.service.ts      # Google Maps + Places
│   │   ├── recommendation.service.ts  # Worth Stop Score
│   │   ├── supabase.client.ts   # Supabase client
│   │   ├── supabase.service.ts  # DB service layer
│   │   └── notification.service.ts    # Push notifications + geofencing
│   ├── components/
│   │   └── place/PlaceCard.tsx  # Place card component
│   └── utils/queryClient.ts     # React Query config
└── supabase/schema.sql          # Full DB schema
```

---

## 🧠 How It Works

### Discovery Flow

```
User enters: Source + Destination + Prompt
     ↓
1. Geocode source & destination (Google Geocoding API)
     ↓
2. Get route polyline (Google Directions API)
     ↓
3. Parse prompt with Gemini AI → structured filters
   { categories, minRating, keywords, maxDetour, ... }
     ↓
4. Sample waypoints along polyline
     ↓
5. Search Google Places API along route corridor
     ↓
6. Calculate detour for each place
     ↓
7. Score each place: Worth Stop Score
   = 40% Rating + 20% Reviews + 20% Distance + 20% Community
     ↓
8. Rank & display on map + bottom sheet
     ↓
9. Start geofence monitoring → push notifications when approaching
```

### Worth Stop Score Formula

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Rating | 40% | `(rating / 5) × 100` |
| Reviews | 20% | `log10(reviews) / log10(1001) × 100` |
| Distance | 20% | `(1 - detourKm / maxDetourKm) × 100` |
| Community | 20% | `min(100, tipUpvotes / tipCount)` |

**Score Labels:**
- 80-100: 🟢 Must Stop
- 60-79: 🟡 Worth It
- 40-59: 🔵 Consider
- 0-39: ⚫ Optional

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary | `#2563EB` |
| Secondary | `#06B6D4` |
| Accent | `#F59E0B` |
| Background | `#020617` |
| Glass card | `rgba(255,255,255,0.06)` |

---

## 📱 Features

- ✅ Clerk auth (email + OTP verification)
- ✅ Glassmorphism + dark mode UI
- ✅ Gemini AI prompt parsing → structured filters
- ✅ Google Maps route rendering (dark style)
- ✅ Google Places API corridor search
- ✅ Worth Stop Score engine (4-factor formula)
- ✅ Save places to Supabase
- ✅ Community tips with upvoting
- ✅ Mark places as visited
- ✅ Geofence-based push notifications
- ✅ React Query caching
- ✅ Zustand state management
- ✅ Full TypeScript

---

## 🧪 Testing

```bash
# Type checking
npx tsc --noEmit

# Lint
npx eslint . --ext .ts,.tsx

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios
```

### Manual Test Flow

1. Sign up with email → verify OTP code
2. Home screen → enter "Chennai" → "Bangalore" → "Best biryani spots"
3. Tap "Discover Stops"
4. Watch 4-step discovery animation
5. See route on dark map with scored markers
6. Tap a place card → View Details
7. Add a tip → share with community
8. Save the place → check Saved tab
9. Mark as visited → appears in profile
10. Check Profile → trip history shown

---

## 🚀 Deployment (EAS Build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build for Android
eas build --platform android --profile preview

# Build for iOS
eas build --platform ios --profile preview

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## 📋 GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: RouteMind CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx eslint . --ext .ts,.tsx --max-warnings 0

  eas-build:
    needs: [type-check, lint]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --non-interactive --profile preview
```

---

## 👥 Team of 3 — 2-Week Plan

| Week | Tasks |
|------|-------|
| **Week 1, Days 1-2** | Setup project, keys, Supabase schema |
| **Week 1, Days 3-4** | Auth screens + home screen polish |
| **Week 1, Days 5-7** | Maps integration + Gemini AI + Discovery engine |
| **Week 2, Days 1-2** | Place detail + Community tips + Save/Visit |
| **Week 2, Days 3-4** | Notifications + Geofencing |
| **Week 2, Days 5-6** | Testing, bug fixes, UI polish |
| **Week 2, Day 7** | Demo prep + EAS build |

---

## 📞 Support

Built with ❤️ by the RouteMind team.
