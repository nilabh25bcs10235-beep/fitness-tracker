"""Curated food names for fast autocomplete — Indian & common items."""

FOOD_CATALOG = [
    "tandoori chicken", "chicken breast", "chicken curry", "butter chicken",
    "chicken tikka", "chicken biryani", "grilled chicken", "chicken salad",
    "chicken wrap", "chicken soup", "chicken kebab", "chicken fried rice",
    "chicken sandwich", "chicken momos", "chicken shawarma",
    "rice", "rice and dal", "jeera rice", "brown rice", "basmati rice",
    "fried rice", "biryani", "pulao", "khichdi", "lemon rice",
    "dal", "dal tadka", "dal makhani", "chana dal", "moong dal",
    "roti", "naan", "paratha", "chapati", "puri", "bhatura",
    "paneer tikka", "paneer butter masala", "palak paneer", "paneer bhurji",
    "egg omelette", "boiled eggs", "egg curry", "scrambled eggs",
    "fish curry", "grilled fish", "fish fry", "prawn curry", "mutton curry",
    "mutton biryani", "keema", "seekh kebab", "lamb chops",
    "rajma", "chole", "aloo gobi", "baingan bharta", "mixed vegetables",
    "samosa", "pakora", "vada pav", "pav bhaji", "dosa", "idli", "uttapam",
    "upma", "poha", "oats", "cornflakes with milk", "yogurt", "greek yogurt",
    "milk", "lassi", "buttermilk", "smoothie", "protein shake",
    "apple", "banana", "orange", "mango", "berries", "mixed fruit bowl",
    "almonds", "peanuts", "walnuts", "trail mix",
    "salad", "greek salad", "caesar salad", "fruit salad", "sprouts salad",
    "pizza", "burger", "pasta", "noodles", "maggi", "sandwich",
    "avocado toast", "peanut butter toast", "oatmeal", "granola",
    "quinoa bowl", "budha bowl", "sushi", "tacos", "burrito",
    "steak", "pork chops", "turkey breast", "tofu stir fry",
    "sweet potato", "mashed potato", "french fries", "grilled vegetables",
    "hummus", "falafel", "shawarma plate", "kebab platter",
    "ice cream", "chocolate", "protein bar", "energy bar", "cookies",
    "green tea", "black coffee", "cappuccino", "coconut water",
    "whey protein", "casein shake", "mass gainer shake",
    "chia pudding", "overnight oats", "acai bowl",
    "sabzi", "bhindi masala", "matar paneer", "malai kofta",
    "shahi paneer", "kadai chicken", "rogan josh", "hyderabadi biryani",
    "pongal", "appam", "puttu", "thepla", "dhokla", "khandvi",
    "misal pav", "thali", "south indian thali", "north indian thali",
]


def search_foods(query: str, limit: int = 8) -> list[str]:
    q = query.strip().lower()
    if len(q) < 2:
        return []
    scored: list[tuple[int, str]] = []
    for name in FOOD_CATALOG:
        lower = name.lower()
        if q in lower:
            idx = lower.index(q)
            scored.append((idx, name))
    scored.sort(key=lambda x: (x[0], len(x[1])))
    seen: set[str] = set()
    results: list[str] = []
    for _, name in scored:
        if name not in seen:
            seen.add(name)
            results.append(name)
        if len(results) >= limit:
            break
    return results