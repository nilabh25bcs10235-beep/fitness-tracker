from datetime import datetime, date
from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    name: str
    age: int = Field(ge=10, le=120)
    weight_kg: float = Field(gt=0)
    height_cm: Optional[float] = Field(default=None, gt=0)
    gender: Optional[str] = None
    goal: str
    dietary_restrictions: str = ""


class UserResponse(BaseModel):
    id: int
    email: Optional[str] = None
    phone: Optional[str] = None
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
    daily_water_target_ml: Optional[int] = None
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
    ai_analysis: Optional[str] = None


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
    micronutrients: Dict[str, float] = {}
    micro_description: str = ""


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
    health_score: Optional[str] = None
    image_path: Optional[str]
    ai_analysis: Optional[str]
    logged_at: datetime
    log_date: date

    class Config:
        from_attributes = True


class WorkoutCreate(BaseModel):
    activity: str
    body_part: str = ""
    duration_min: int = Field(gt=0, le=300)
    calories_burned: float = Field(ge=0)
    intensity: str = "moderate"
    notes: str = ""


class WorkoutResponse(BaseModel):
    id: int
    activity: str
    body_part: Optional[str]
    duration_min: int
    calories_burned: float
    intensity: str
    notes: Optional[str]
    logged_at: datetime
    log_date: date

    class Config:
        from_attributes = True


class HydrationSlot(BaseModel):
    slot: int
    time: str
    amount_ml: int
    completed: bool
    label: str


class HydrationLogCreate(BaseModel):
    amount_ml: int = Field(default=250, ge=50, le=1000)


class HydrationTodayResponse(BaseModel):
    date: date
    target_ml: int
    consumed_ml: float
    progress_pct: float
    glasses_logged: int
    glasses_target: int
    glass_size_ml: int
    schedule: List[HydrationSlot]
    next_reminder: str


class DayTracker(BaseModel):
    date: date
    day_name: str
    short_name: str
    is_today: bool
    calorie_target: int
    protein_target: int
    workout_target_min: int
    water_target_ml: int = 2500
    calories_consumed: float
    protein_consumed: float
    water_consumed_ml: float = 0
    calories_burned: float
    workout_minutes: int
    meals_count: int
    workouts_count: int
    net_calories: float
    calorie_progress_pct: float
    protein_progress_pct: float
    workout_progress_pct: float
    water_progress_pct: float = 0
    overall_progress_pct: float
    status: str


class WeeklyTrackerResponse(BaseModel):
    week_start: date
    week_end: date
    today: DayTracker
    days: List[DayTracker]
    today_focus: str
    today_targets: dict


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
    water_consumed_ml: float = 0
    water_target_ml: Optional[int] = None
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


class HydrationLogResponse(BaseModel):
    hydration: HydrationTodayResponse
    weekly_tracker: WeeklyTrackerResponse


class BootstrapResponse(BaseModel):
    dashboard: ProgressDashboard
    weekly_tracker: WeeklyTrackerResponse
    hydration: HydrationTodayResponse


class RecipeItem(BaseModel):
    name: str
    description: str
    calories: int
    protein_g: int
    prep_time_min: int
    ingredients: List[str]
    instructions: List[str]
    tags: List[str]
    frequency: str = ""
    timing: str = ""
    variants: List[str] = []


class RecipePreferences(BaseModel):
    dietary_restrictions: str = ""
    preferences: str = ""
    goals: str = ""
    count: int = 4


class GroceryItem(BaseModel):
    id: str
    text: str
    checked: bool = False


class ScheduleEntry(BaseModel):
    id: str
    day: str
    meal_type: str
    name: str
    description: str = ""
    calories: int = 0
    protein_g: int = 0
    notes: str = ""


class MealPlanUpdateWeekly(BaseModel):
    weekly_schedule: List[ScheduleEntry]


class MealPlanUpdateToday(BaseModel):
    today_plan: List[ScheduleEntry]


class MealPlanUpdateGrocery(BaseModel):
    grocery_list: List[GroceryItem]


class RecipeResponse(BaseModel):
    recipes: List[RecipeItem]
    grocery_list: List[GroceryItem] = []
    ai_notes: str
    consumption_schedule: List[str] = []
    weekly_schedule: List[ScheduleEntry] = []
    today_plan: List[ScheduleEntry] = []
    today_name: str = ""
    updated_at: Optional[str] = None
    has_plan: bool = False


class BodyImageAnalysis(BaseModel):
    estimated_bmi: float
    body_fat_pct: Optional[float] = None
    muscle_mass_kg: Optional[float] = None
    physique_notes: str
    nutritional_advice: str
    goal_recommendations: List[str]
    confidence: str


class ExerciseItem(BaseModel):
    name: str
    body_part: str
    equipment: str
    type: str
    sets: int
    reps: str
    calories_burned_est: int
    notes: str


class ExercisePlanResponse(BaseModel):
    body_part: str
    exercises: List[ExerciseItem]
    cardio_options: List[str]
    tips: List[str]


class CalorieBurnRequest(BaseModel):
    activity: str
    duration_min: int = Field(gt=0, le=300)
    intensity: str = "moderate"


class CalorieBurnResponse(BaseModel):
    activity: str
    duration_min: int
    calories_burned: int
    notes: str
    related_exercises: List[str]


class InsightRequest(BaseModel):
    query: str


class InsightResponse(BaseModel):
    answer: str
    suggestions: List[str]
    is_ai: bool
    source: str = "groq"