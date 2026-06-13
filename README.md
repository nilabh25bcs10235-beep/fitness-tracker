# FitTrack AI — Fitness & Nutrition Tracker

AI-powered full-stack fitness and nutrition tracker with Indian non-veg, dairy-free recipe support.

## Tech Stack

- **Frontend:** React + Vite + Recharts
- **Backend:** FastAPI + SQLAlchemy + SQLite
- **AI:** Groq API (text + vision) — adapted from `magic-python-tutor` LLM wrapper

## Features

- User onboarding (age, weight, goals, dietary restrictions)
- Daily meal logging via text or photo (AI calorie/macro estimation)
- Progress dashboard (calories, protein, weight trends, body composition)
- Recipe suggestions + grocery list generator
- AI coach for smart nutrition insights

## Quick Start

> **Prerequisites**: Python 3.10+, Node.js 18+ (npm), pip

### 1. Start the Backend (Terminal 1)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# IMPORTANT: Edit .env and add your real GROQ_API_KEY
uvicorn app.main:app --reload --port 8000
```

### 2. Start the Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Then open **[http://localhost:5173](http://localhost:5173)**

**Notes**
- Keep **both** servers running (two separate terminals).
- The frontend is configured to proxy `/api` and `/uploads` to the backend at `http://localhost:8000`.
- Most features (meal analysis, recipes, AI coach) require a valid `GROQ_API_KEY` in `backend/.env`. Without it, the AI parts will be disabled or fail.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Your Groq API key (required for AI features) |
| `GROQ_TEXT_MODEL` | Default: `llama-3.3-70b-versatile` |
| `GROQ_VISION_MODEL` | Default: `meta-llama/llama-4-scout-17b-16e-instruct` |

`GROQ_API_KEY` is **required** — all nutrition analysis, targets, recipes, and insights are generated live by Groq. No hardcoded fitness database.

## API Endpoints

- `POST /api/users` — Create user profile
- `POST /api/meals/analyze-text` — AI text meal analysis
- `POST /api/meals/{id}/with-image` — AI vision meal logging
- `GET /api/progress/{id}/dashboard` — Progress dashboard data
- `GET /api/recipes/{id}` — AI recipe suggestions + grocery list
- `POST /api/ai/{id}/insight` — Smart nutrition insights