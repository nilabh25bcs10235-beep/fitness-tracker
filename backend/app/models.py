from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    auth_id = Column(String(36), unique=True, index=True, nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(32), nullable=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    weight_kg = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=True)
    gender = Column(String(20), nullable=True)
    goal = Column(String(50), nullable=False)
    dietary_restrictions = Column(Text, default="")
    daily_calorie_target = Column(Integer, nullable=True)
    daily_protein_target = Column(Integer, nullable=True)
    daily_carbs_target = Column(Integer, nullable=True)
    daily_fat_target = Column(Integer, nullable=True)
    target_reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meals = relationship("Meal", back_populates="user", cascade="all, delete-orphan")
    weight_logs = relationship("WeightLog", back_populates="user", cascade="all, delete-orphan")
    workouts = relationship("WorkoutLog", back_populates="user", cascade="all, delete-orphan")
    meal_plan = relationship("UserMealPlan", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    meal_type = Column(String(30), default="snack")
    calories = Column(Float, default=0)
    protein_g = Column(Float, default=0)
    carbs_g = Column(Float, default=0)
    fat_g = Column(Float, default=0)
    fiber_g = Column(Float, default=0)
    health_score = Column(String(30), nullable=True)
    image_path = Column(String(500), nullable=True)
    ai_analysis = Column(Text, nullable=True)
    logged_at = Column(DateTime, default=datetime.utcnow)
    log_date = Column(Date, default=date.today)

    user = relationship("User", back_populates="meals")


class WeightLog(Base):
    __tablename__ = "weight_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    weight_kg = Column(Float, nullable=False)
    body_fat_pct = Column(Float, nullable=True)
    muscle_mass_kg = Column(Float, nullable=True)
    logged_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="weight_logs")


class WorkoutLog(Base):
    __tablename__ = "workout_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity = Column(String(200), nullable=False)
    body_part = Column(String(100), nullable=True)
    duration_min = Column(Integer, default=0)
    calories_burned = Column(Float, default=0)
    intensity = Column(String(30), default="moderate")
    notes = Column(Text, nullable=True)
    logged_at = Column(DateTime, default=datetime.utcnow)
    log_date = Column(Date, default=date.today)

    user = relationship("User", back_populates="workouts")


class UserMealPlan(Base):
    __tablename__ = "user_meal_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    recipes_json = Column(Text, default="[]")
    weekly_schedule_json = Column(Text, default="[]")
    grocery_list_json = Column(Text, default="[]")
    today_plan_json = Column(Text, default="[]")
    ai_notes = Column(Text, default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="meal_plan")