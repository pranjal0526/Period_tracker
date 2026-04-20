# Ember Period Tracker

Privacy-first period tracking with Google OAuth, MongoDB, encrypted health notes, AI-generated summaries, and a consent-based partner companion mode.

## What's in this first build

- Marketing landing page and Google sign-in flow
- Protected dashboard, calendar, AI assistant, partner, and settings routes
- NextAuth Google provider wiring with JWT sessions
- MongoDB + Mongoose models for users, cycles, symptoms, moods, partner connections, AI insights, and messages
- Encrypted storage helpers for sensitive notes
- API routes for cycles, symptoms, moods, partner actions, AI chat, and AI analysis
- Tailwind-based UI shell with charts, forms, and setup fallbacks

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- NextAuth.js
- MongoDB Atlas + Mongoose
- Framer Motion
- Recharts
- CryptoJS

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Fill in these values in `.env.local`:

- `MONGODB_URI`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GROQ_API_KEY` (optional, but required for live AI wording)
- `GROQ_MODEL` (optional)
- `ENCRYPTION_SALT`

4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`

## Main routes

- `/` landing page
- `/login` Google sign-in
- `/dashboard` main overview
- `/calendar` cycle timing view
- `/ai-assistant` AI chat and summary generation
- `/partner` invite and connect partner mode
- `/settings` integration readiness and account summary

## Notes

- The build scripts use Webpack because it was the most reliable path in this environment.
- Live auth, database writes, and AI responses require your real environment values.
- Sensitive free-text notes are encrypted before storage when a user encryption key is available.

## Vercel deployment with GitHub

1. Push this repo to GitHub.
2. Import the GitHub repo into Vercel as a new project.
3. Keep the framework preset as `Next.js`.
4. Add the environment variables below in Vercel Project Settings.
5. Redeploy after saving environment variables.

### Environment variables to add in Vercel

Set these for `Production`:

- `MONGODB_URI`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ENCRYPTION_SALT`

Set these if you want live AI insights in production:

- `GROQ_API_KEY`
- `GROQ_MODEL` (optional, defaults to `llama-3.1-8b-instant`)

You can usually set the same values for `Preview`, but Google OAuth needs special care because redirect URLs must be explicitly allowed.

### Google OAuth redirect URIs

Your Google OAuth app must allow these redirect URIs:

- Local development: `http://localhost:3000/api/auth/callback/google`
- Production: `https://YOUR_DOMAIN/api/auth/callback/google`

If you use the default Vercel domain first, replace `YOUR_DOMAIN` with your `*.vercel.app` URL.

Preview deployments:

- Google OAuth preview logins will only work if that preview URL is also added in Google Cloud.
- Because preview URLs change often, the easiest production-ready setup is to rely on localhost for development and your main Vercel/custom domain for production auth.

### Important deployment notes

- `NEXTAUTH_SECRET` must be a strong random string and must not change unless you are okay invalidating sessions.
- `ENCRYPTION_SALT` must stay stable after first production deploy, or encrypted notes and stored user master keys will stop decrypting correctly.
- If you change any Vercel environment variable, it only applies to new deployments, so redeploy after updates.
