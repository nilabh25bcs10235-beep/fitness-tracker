import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from .database import engine, Base
from .routers import users, meals, progress, recipes, ai, workouts


def _ensure_user_auth_columns():
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("users")}
    statements = []
    if "auth_id" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN auth_id VARCHAR(36)")
    if "email" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN email VARCHAR(255)")
    if "phone" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN phone VARCHAR(32)")
    if not statements:
        return
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


def _ensure_schema_updates():
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    statements = []
    if "meals" in tables:
        meal_cols = {col["name"] for col in inspector.get_columns("meals")}
        if "health_score" not in meal_cols:
            statements.append("ALTER TABLE meals ADD COLUMN health_score VARCHAR(30)")
    if not statements:
        return
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


Base.metadata.create_all(bind=engine)
_ensure_user_auth_columns()
_ensure_schema_updates()

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

_default_origins = "http://localhost:5173,http://127.0.0.1:5173,https://fitness-tracker90.vercel.app"
_allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.onrender\.com",
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
app.include_router(workouts.router)


@app.get("/api/health")
def health():
    from .llm.groq_client import _ai_available
    return {"status": "ok", "ai_enabled": _ai_available()}


static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")