# FitTrack AI Frontend

React 19 + Vite frontend for FitTrack AI (fitness & nutrition tracker).

## Run the Frontend

```bash
npm install
npm run dev
```

The app will be available at **[http://localhost:5173](http://localhost:5173)**.

## Important: Backend must be running

This frontend proxies API requests to the backend:

- `/api` → `http://localhost:8000`
- `/uploads` → `http://localhost:8000`

You **must** start the backend in another terminal (see root README for details and `GROQ_API_KEY` setup).

## Full Instructions

See the root [../README.md](../README.md) for complete quick start, environment variables, and architecture.
