"""Static exercise templates — avoids Groq calls for common body parts."""

TEMPLATES: dict[str, dict] = {
    "back": {
        "body_part": "back",
        "exercises": [
            {"name": "Lat Pulldown", "body_part": "lats", "equipment": "cable", "type": "strength", "sets": 4, "reps": "10-12", "calories_burned_est": 45, "notes": "Pull to upper chest, squeeze lats at bottom."},
            {"name": "Barbell Row", "body_part": "back", "equipment": "barbell", "type": "strength", "sets": 4, "reps": "8-10", "calories_burned_est": 55, "notes": "Hinge at hips, keep spine neutral."},
            {"name": "Seated Cable Row", "body_part": "mid back", "equipment": "cable", "type": "strength", "sets": 3, "reps": "12-15", "calories_burned_est": 40, "notes": "Drive elbows back, avoid shrugging."},
            {"name": "Pull-ups", "body_part": "lats", "equipment": "bodyweight", "type": "strength", "sets": 3, "reps": "6-10", "calories_burned_est": 50, "notes": "Full hang to chin over bar."},
        ],
        "cardio_options": ["Rowing machine 15 min", "Assault bike 10 min"],
        "tips": ["Train back 2x/week with 48h recovery.", "Prioritize scapular retraction on every pull."],
    },
    "chest": {
        "body_part": "chest",
        "exercises": [
            {"name": "Bench Press", "body_part": "chest", "equipment": "barbell", "type": "strength", "sets": 4, "reps": "6-10", "calories_burned_est": 55, "notes": "Retract shoulder blades, feet planted."},
            {"name": "Incline Dumbbell Press", "body_part": "upper chest", "equipment": "dumbbell", "type": "strength", "sets": 3, "reps": "10-12", "calories_burned_est": 45, "notes": "30-45° incline, control the negative."},
            {"name": "Cable Fly", "body_part": "chest", "equipment": "cable", "type": "strength", "sets": 3, "reps": "12-15", "calories_burned_est": 35, "notes": "Slight elbow bend, hug motion."},
            {"name": "Push-ups", "body_part": "chest", "equipment": "bodyweight", "type": "strength", "sets": 3, "reps": "12-20", "calories_burned_est": 40, "notes": "Core tight, full range of motion."},
        ],
        "cardio_options": ["Incline walk 20 min", "Battle ropes 8 min"],
        "tips": ["Warm up shoulders before heavy pressing.", "Balance push volume with back work."],
    },
    "legs": {
        "body_part": "legs",
        "exercises": [
            {"name": "Barbell Squat", "body_part": "quads", "equipment": "barbell", "type": "strength", "sets": 4, "reps": "6-10", "calories_burned_est": 70, "notes": "Depth to parallel, brace core."},
            {"name": "Romanian Deadlift", "body_part": "hamstrings", "equipment": "barbell", "type": "strength", "sets": 3, "reps": "8-12", "calories_burned_est": 55, "notes": "Hip hinge, feel hamstring stretch."},
            {"name": "Leg Press", "body_part": "quads", "equipment": "machine", "type": "strength", "sets": 3, "reps": "12-15", "calories_burned_est": 50, "notes": "Feet shoulder-width, no knee cave."},
            {"name": "Walking Lunges", "body_part": "legs", "equipment": "dumbbell", "type": "strength", "sets": 3, "reps": "12 each", "calories_burned_est": 45, "notes": "Upright torso, knee tracks over toe."},
        ],
        "cardio_options": ["Cycling 20 min", "Stair climber 15 min"],
        "tips": ["Leg day burns the most calories — fuel with protein after.", "Mobilize hips and ankles pre-workout."],
    },
    "shoulders": {
        "body_part": "shoulders",
        "exercises": [
            {"name": "Overhead Press", "body_part": "shoulders", "equipment": "barbell", "type": "strength", "sets": 4, "reps": "6-10", "calories_burned_est": 45, "notes": "Ribs down, press straight up."},
            {"name": "Lateral Raises", "body_part": "side delts", "equipment": "dumbbell", "type": "strength", "sets": 3, "reps": "12-15", "calories_burned_est": 30, "notes": "Lead with elbows, stop at shoulder height."},
            {"name": "Face Pulls", "body_part": "rear delts", "equipment": "cable", "type": "strength", "sets": 3, "reps": "15-20", "calories_burned_est": 25, "notes": "External rotate at end of pull."},
        ],
        "cardio_options": ["Jump rope 10 min", "Elliptical 15 min"],
        "tips": ["High rep rear-delt work improves posture.", "Avoid ego weight on overhead press."],
    },
    "core": {
        "body_part": "core",
        "exercises": [
            {"name": "Hanging Leg Raises", "body_part": "abs", "equipment": "bodyweight", "type": "strength", "sets": 3, "reps": "10-15", "calories_burned_est": 35, "notes": "Control swing, posterior pelvic tilt."},
            {"name": "Cable Crunch", "body_part": "abs", "equipment": "cable", "type": "strength", "sets": 3, "reps": "15-20", "calories_burned_est": 30, "notes": "Round spine, don't pull with arms."},
            {"name": "Pallof Press", "body_part": "core", "equipment": "cable", "type": "strength", "sets": 3, "reps": "12 each", "calories_burned_est": 25, "notes": "Anti-rotation, resist twist."},
            {"name": "Plank", "body_part": "core", "equipment": "bodyweight", "type": "strength", "sets": 3, "reps": "45-60 sec", "calories_burned_est": 20, "notes": "Glutes engaged, neutral spine."},
        ],
        "cardio_options": ["Mountain climbers 5 min", "Burpees 8 min"],
        "tips": ["Core stability supports every lift.", "Breathe out on exertion for bracing."],
    },
    "cardio": {
        "body_part": "cardio",
        "exercises": [
            {"name": "Treadmill Intervals", "body_part": "full body", "equipment": "machine", "type": "cardio", "sets": 1, "reps": "20 min", "calories_burned_est": 180, "notes": "1 min fast / 1 min walk x 10."},
            {"name": "Rowing Machine", "body_part": "full body", "equipment": "machine", "type": "cardio", "sets": 1, "reps": "15 min", "calories_burned_est": 140, "notes": "Drive with legs first."},
            {"name": "Assault Bike", "body_part": "full body", "equipment": "machine", "type": "cardio", "sets": 5, "reps": "30 sec", "calories_burned_est": 120, "notes": "Max effort intervals, 90s rest."},
        ],
        "cardio_options": ["Swimming 30 min", "Outdoor cycling 40 min", "Jump rope 15 min"],
        "tips": ["150 min moderate cardio weekly is a solid baseline.", "Pair cardio with protein for recovery."],
    },
    "biceps": {
        "body_part": "biceps",
        "exercises": [
            {"name": "Barbell Curl", "body_part": "biceps", "equipment": "barbell", "type": "strength", "sets": 3, "reps": "10-12", "calories_burned_est": 30, "notes": "Elbows pinned, no swinging."},
            {"name": "Hammer Curls", "body_part": "biceps", "equipment": "dumbbell", "type": "strength", "sets": 3, "reps": "12-15", "calories_burned_est": 28, "notes": "Neutral grip targets brachialis."},
            {"name": "Incline Dumbbell Curl", "body_part": "biceps", "equipment": "dumbbell", "type": "strength", "sets": 3, "reps": "10-12", "calories_burned_est": 25, "notes": "Stretch at bottom for long-head bias."},
        ],
        "cardio_options": ["Rope curls burnout", "Farmer carry 5 min"],
        "tips": ["Train biceps after back or on a dedicated arm day.", "Full extension on every rep."],
    },
    "triceps": {
        "body_part": "triceps",
        "exercises": [
            {"name": "Tricep Pushdown", "body_part": "triceps", "equipment": "cable", "type": "strength", "sets": 3, "reps": "12-15", "calories_burned_est": 28, "notes": "Lock elbows at sides."},
            {"name": "Skull Crushers", "body_part": "triceps", "equipment": "barbell", "type": "strength", "sets": 3, "reps": "10-12", "calories_burned_est": 32, "notes": "Lower to forehead, elbows in."},
            {"name": "Overhead Extension", "body_part": "triceps", "equipment": "dumbbell", "type": "strength", "sets": 3, "reps": "12-15", "calories_burned_est": 26, "notes": "Stretch long head at bottom."},
        ],
        "cardio_options": ["Close-grip push-up finisher", "Battle ropes 6 min"],
        "tips": ["Triceps respond well to higher reps.", "Pair with chest or shoulders."],
    },
    "glutes": {
        "body_part": "glutes",
        "exercises": [
            {"name": "Hip Thrust", "body_part": "glutes", "equipment": "barbell", "type": "strength", "sets": 4, "reps": "8-12", "calories_burned_est": 50, "notes": "Pause at top, chin tucked."},
            {"name": "Bulgarian Split Squat", "body_part": "glutes", "equipment": "dumbbell", "type": "strength", "sets": 3, "reps": "10 each", "calories_burned_est": 45, "notes": "Torso slight forward lean."},
            {"name": "Cable Kickback", "body_part": "glutes", "equipment": "cable", "type": "strength", "sets": 3, "reps": "15 each", "calories_burned_est": 25, "notes": "Squeeze glute at extension."},
        ],
        "cardio_options": ["Stair climber 15 min", "Hill walk 20 min"],
        "tips": ["Glutes need progressive overload like any muscle.", "Warm up with band walks first."],
    },
    "full body": {
        "body_part": "full body",
        "exercises": [
            {"name": "Deadlift", "body_part": "posterior chain", "equipment": "barbell", "type": "strength", "sets": 4, "reps": "5-8", "calories_burned_est": 65, "notes": "Brace, bar close to shins."},
            {"name": "Squat", "body_part": "legs", "equipment": "barbell", "type": "strength", "sets": 3, "reps": "8-10", "calories_burned_est": 60, "notes": "Compound staple for full-body days."},
            {"name": "Overhead Press", "body_part": "shoulders", "equipment": "barbell", "type": "strength", "sets": 3, "reps": "8-10", "calories_burned_est": 40, "notes": "Standing press for core engagement."},
            {"name": "Pull-ups", "body_part": "back", "equipment": "bodyweight", "type": "strength", "sets": 3, "reps": "6-10", "calories_burned_est": 45, "notes": "Vertical pull balances pressing."},
        ],
        "cardio_options": ["Incline walk 20 min", "Rowing 12 min"],
        "tips": ["Full-body 3x/week works well for beginners.", "Progressive overload on compounds first."],
    },
}


def get_template(body_part: str) -> dict | None:
    key = body_part.strip().lower()
    if key in TEMPLATES:
        return TEMPLATES[key]
    for name, plan in TEMPLATES.items():
        if name in key or key in name:
            return {**plan, "body_part": body_part.strip().title()}
    return None