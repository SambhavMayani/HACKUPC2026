# HACKUPC2026

Minimal Next.js app for a mobile advertising "Creative Intelligence" demo.

## Setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Set `HACKCLUB_AI_API_KEY`
4. Start the app with `npm run dev`

## Included

- Server-side endpoint at `POST /api/generate-sample-data`
- Uses `google/gemini-3-flash-preview` through the Hack Club proxy
- Generates anonymized creative performance records for demo dashboards
