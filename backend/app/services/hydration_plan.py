from datetime import date, datetime, time
from typing import Optional

GLASS_ML = 250

HYDRATION_SLOTS = (
    "07:00", "09:00", "11:00", "13:00",
    "15:00", "17:00", "19:00", "21:00",
)


def water_target_ml(weight_kg: float, goal: str = "") -> int:
    base = int(weight_kg * 35)
    if goal in ("muscle_gain", "gain_muscle"):
        base = int(base * 1.1)
    elif goal in ("fat_loss", "lose_weight"):
        base = int(base * 1.05)
    base = max(2000, min(4000, base))
    return round(base / GLASS_ML) * GLASS_ML


def glasses_target(target_ml: int) -> int:
    return max(1, target_ml // GLASS_ML)


def build_hydration_schedule(target_ml: int, consumed_ml: float) -> list[dict]:
    total_glasses = glasses_target(target_ml)
    consumed_glasses = int(consumed_ml // GLASS_ML)
    slots = list(HYDRATION_SLOTS)
    if total_glasses > len(slots):
        slots = [f"Every {round(14 * 60 / total_glasses)} min"] * total_glasses

    schedule = []
    for i in range(total_glasses):
        time_label = slots[i] if i < len(slots) else slots[-1]
        done = i < consumed_glasses
        schedule.append({
            "slot": i + 1,
            "time": time_label,
            "amount_ml": GLASS_ML,
            "completed": done,
            "label": f"Glass {i + 1} · {time_label}",
        })
    return schedule


def hydration_progress(consumed_ml: float, target_ml: int) -> float:
    if not target_ml:
        return 0.0
    return min(100.0, round((consumed_ml / target_ml) * 100, 1))


def next_reminder(schedule: list[dict]) -> Optional[str]:
    for item in schedule:
        if not item["completed"]:
            return f"Next: {item['label']} ({item['amount_ml']}ml)"
    return "Daily hydration goal complete — great job!"


def is_slot_due(time_label: str, now: Optional[datetime] = None) -> bool:
    if ":" not in time_label:
        return False
    now = now or datetime.now()
    try:
        hour, minute = map(int, time_label.split(":"))
        slot_time = time(hour, minute)
        return now.time() >= slot_time
    except ValueError:
        return False