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

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your GROQ_API_KEY to .env
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Your Groq API key (required for AI features) |
| `GROQ_TEXT_MODEL` | Default: `llama-3.3-70b-versatile` |
| `GROQ_VISION_MODEL` | Default: `llama-3.2-90b-vision-preview` |

`GROQ_API_KEY` is **required** — all nutrition analysis, targets, recipes, and insights are generated live by Groq. No hardcoded fitness database.

## API Endpoints

- `POST /api/users` — Create user profile
- `POST /api/meals/analyze-text` — AI text meal analysis
- `POST /api/meals/{id}/with-image` — AI vision meal logging
- `GET /api/progress/{id}/dashboard` — Progress dashboard data
- `GET /api/recipes/{id}` — AI recipe suggestions + grocery list
- `POST /api/ai/{id}/insight` — Smart nutrition insights