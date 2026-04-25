# HACKUPC2026

Minimal Next.js app for a mobile advertising "Creative Intelligence" demo.

## Setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Set `HACKCLUB_AI_API_KEY`
4. Start the app with `npm run dev`

## Included

- Server-side endpoint at `POST /api/generate-sample-data`
- Server-side endpoint at `POST /api/generate-insights`
- Uses `google/gemini-3-flash-preview` through the Hack Club proxy
- Generates anonymized creative performance records for demo dashboards
- Scores top performers with deterministic analysis
- Detects repetitive clusters and fatigue risk
- Generates AI-written test recommendations for marketers

## Workflow

1. Generate a synthetic dataset of creatives and simplified performance metrics
2. Review the dashboard sections for:
   - which creatives are working best
   - which creatives look repetitive or tired
   - what should be tested next
3. Use the generated creative cards as the underlying dataset for further iteration
