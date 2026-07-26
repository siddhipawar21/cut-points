# Cut Points

An AI co-editor for podcasts and video. Upload your audio, and Cut Points flags dead air, energy dips, and off-topic tangents so you can review each suggested cut, accept or reject it, and export a clean edit list to your tool of choice.

## Features

- **Dead air detection** — flags sustained silence segments below a configurable threshold
- **Energy dip detection** — catches passages that drop 10+ dB below the rolling average
- **Tangent detection** — uses Gemini to compare the transcript against your episode topic and flag off-topic passages
- **Review UI** — accept or reject each flagged cut one by one before exporting
- **Export formats** — Adobe Premiere Pro XML markers, Audacity label track (`.txt`), or CSV
- **Ask the episode** — chat with Gemini about the content of any uploaded episode
- **Support chat** — in-app assistant that knows the product

## Tech stack

- [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router)
- React 19
- TypeScript
- Tailwind CSS v4
- [Supabase](https://supabase.com) (auth + database)
- Google Gemini (`gemini-2.0-flash` via REST)

## Local development

### Prerequisites

- [Bun](https://bun.sh) — used as the package manager and runtime
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key

### Setup

```sh
git clone <this-repository-url>
cd cut-points
bun install
```

Copy the example env file and fill in your values:

```sh
cp .env.example .env
```

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase project → Settings → API → Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase project → Settings → API → `anon` public key |
| `SUPABASE_PROJECT_ID` | Supabase project → Settings → General → Reference ID |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same as `SUPABASE_PUBLISHABLE_KEY` |
| `VITE_SUPABASE_PROJECT_ID` | Same as `SUPABASE_PROJECT_ID` |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) → Create API key |

### Run

```sh
bun run dev
```

The app starts at `http://localhost:3000`.

### Other scripts

```sh
bun run build      # production build
bun run preview    # preview the production build locally
bun run lint       # ESLint
bun run format     # Prettier
```
