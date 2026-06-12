-- Run in Supabase SQL editor after creating a project.
-- FitTrack AI uses FastAPI for business logic; Postgres stores persistent user data.

create table if not exists users (
  id serial primary key,
  auth_id varchar(36) unique,
  email varchar(255),
  phone varchar(32),
  name varchar(100) not null,
  age integer not null,
  weight_kg double precision not null,
  height_cm double precision,
  gender varchar(20),
  goal varchar(50) not null,
  dietary_restrictions text default '',
  daily_calorie_target integer,
  daily_protein_target integer,
  daily_carbs_target integer,
  daily_fat_target integer,
  target_reasoning text,
  created_at timestamp default now()
);

create table if not exists meals (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  name varchar(200) not null,
  description text default '',
  meal_type varchar(30) default 'snack',
  calories double precision default 0,
  protein_g double precision default 0,
  carbs_g double precision default 0,
  fat_g double precision default 0,
  fiber_g double precision default 0,
  image_path varchar(500),
  ai_analysis text,
  logged_at timestamp default now(),
  log_date date default current_date
);

create table if not exists weight_logs (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  weight_kg double precision not null,
  body_fat_pct double precision,
  muscle_mass_kg double precision,
  logged_at timestamp default now()
);