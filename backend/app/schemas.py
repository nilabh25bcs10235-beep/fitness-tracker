from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    name: str
    age: int = Field(ge=10, le=120)
    weight_kg: float = Field(gt=0)
    height_cm: Optional[float] = Field(default=None, gt=0)
    gender: Optional[str] = None
    goal: str
    dietary_restrictions: str = ""


class UserResponse(BaseModel):
    id: int
    name: str
    age: int
    weight_kg: float
    height_cm: Optional[float]
    gender: Optional[str]
    goal: str
    dietary_restrictions: str
    daily_calorie_target: Optional[int]
    daily_protein_target: Optional[int]
    daily_carbs_target: Optional[int]
    daily_fat_target: Optional[int]
    target_reasoning: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class MealCreate(BaseModel):
    name: str
    description: str = ""
    meal_type: str = "snack"
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0


class MealAnalysis(BaseModel):
    name: str
    description: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    confidence: str
    notes: str


class MealResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: str
    meal_type: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    image_path: Optional[str]
    ai_analysis: Optional[str]
    logged_at: datetime
    log_date: date

    class Config:
        from_attributes = True


class WeightLogCreate(BaseModel):
    weight_kg: float = Field(gt=0)
    body_fat_pct: Optional[float] = Field(default=None, ge=0, le=60)
    muscle_mass_kg: Optional[float] = Field(default=None, gt=0)


class WeightLogResponse(BaseModel):
    id: int
    weight_kg: float
    body_fat_pct: Optional[float]
    muscle_mass_kg: Optional[float]
    logged_at: datetime

    class Config:
        from_attributes = True


class DailySummary(BaseModel):
    date: date
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    calorie_target: Optional[int]
    protein_target: Optional[int]
    carbs_target: Optional[int]
    fat_target: Optional[int]
    meals_count: int


class ProgressDashboard(BaseModel):
    user: UserResponse
    today: DailySummary
    weekly_calories: List[dict]
    weekly_protein: List[dict]
    weight_trend: List[dict]
    body_composition: dict


class RecipeItem(BaseModel):
    name: str
    description: str
    calories: int
    protein_g: int
    prep_time_min: int
    ingredients: List[str]
    instructions: List[str]
    tags: List[str]


class RecipeResponse(BaseModel):
    recipes: List[RecipeItem]
    grocery_list: List[str]
    ai_notes: str


class InsightRequest(BaseModel):
    query: str


class InsightResponse(BaseModel):
    answer: str
    suggestions: List[str]
    is_ai: bool
    source: str = "groq"