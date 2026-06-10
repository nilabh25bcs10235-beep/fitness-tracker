import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routers import users, meals, progress, recipes, ai

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FitTrack AI",
    description="AI-Powered Fitness & Nutrition Tracker",
    version="1.0.0",
)

# Helpful startup log (does not print the actual key)
if os.getenv("GROQ_API_KEY"):
    print("✅ GROQ_API_KEY detected from environment (Render / hosting platform)")
else:
    print("⚠️  WARNING: GROQ_API_KEY is NOT set in the environment!")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://fitness-tracker90.vercel.app"
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_path = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

app.include_router(users.router)
app.include_router(meals.router)
app.include_router(progress.router)
app.include_router(recipes.router)
app.include_router(ai.router)


@app.get("/api/health")
def health():
    from .llm.groq_client import _ai_available
    return {"status": "ok", "ai_enabled": _ai_available()}