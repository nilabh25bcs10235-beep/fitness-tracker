import json
import os
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

_client_ready = False

if GEMINI_API_KEY:
    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        _client_ready = True
    except Exception as exc:
        print(f"⚠️  Failed to initialize Gemini client: {exc}")


def is_available() -> bool:
    return _client_ready


def _generation_config(temperature: float, max_tokens: int):
    import google.generativeai as genai

    return genai.GenerationConfig(
        temperature=temperature,
        max_output_tokens=max_tokens,
        response_mime_type="application/json",
    )


def chat_json(system: str, user: str, temperature: float = 0.4, max_tokens: int = 900) -> dict:
    import google.generativeai as genai

    model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system)
    response = model.generate_content(
        user,
        generation_config=_generation_config(temperature, max_tokens),
    )
    return json.loads(response.text)


def chat_json_messages(
    system: str,
    messages: list,
    temperature: float = 0.4,
    max_tokens: int = 900,
) -> dict:
    import google.generativeai as genai

    if not messages:
        raise ValueError("messages must not be empty")

    model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system)
    history = []
    for msg in messages[:-1]:
        role = "user" if msg["role"] == "user" else "model"
        history.append({"role": role, "parts": [msg["content"]]})

    chat = model.start_chat(history=history)
    response = chat.send_message(
        messages[-1]["content"],
        generation_config=_generation_config(temperature, max_tokens),
    )
    return json.loads(response.text)


def vision_json(
    system: str,
    user_text: str,
    image_bytes: bytes,
    *,
    mime_type: str = "image/jpeg",
    temperature: float = 0.3,
    max_tokens: int = 1200,
) -> dict:
    import google.generativeai as genai

    model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system)
    response = model.generate_content(
        [
            user_text,
            {"mime_type": mime_type, "data": image_bytes},
        ],
        generation_config=_generation_config(temperature, max_tokens),
    )
    return json.loads(response.text)