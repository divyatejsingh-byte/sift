# Sift

Sift the signal from the firehose: a 5-minute Monday digest of upstream GitHub releases, classified by urgency (Gemini) and verified against OSV.dev.

## Setup
```bash
npm install
cp .env.local.example .env.local   # add GEMINI_API_KEY (and GITHUB_TOKEN to avoid rate limits)
npm run dev
```

Demo sign-in: `keerthi@fintech.dev` / `1234` (demo gate only — replace before real use).
