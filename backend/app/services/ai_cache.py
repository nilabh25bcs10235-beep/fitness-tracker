import hashlib
import json
import time
from functools import wraps
from typing import Any, Callable, Optional

_DEFAULT_TTL = 3600  # 1 hour
_store: dict[str, tuple[float, Any]] = {}


def _cache_key(namespace: str, payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str)
    digest = hashlib.sha256(raw.encode()).hexdigest()[:24]
    return f"{namespace}:{digest}"


def get_cached(namespace: str, payload: Any) -> Optional[Any]:
    key = _cache_key(namespace, payload)
    entry = _store.get(key)
    if not entry:
        return None
    expires_at, value = entry
    if time.time() > expires_at:
        _store.pop(key, None)
        return None
    return value


def set_cached(namespace: str, payload: Any, value: Any, ttl: int = _DEFAULT_TTL) -> None:
    key = _cache_key(namespace, payload)
    _store[key] = (time.time() + ttl, value)


def cached_ai(namespace: str, ttl: int = _DEFAULT_TTL) -> Callable:
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            payload = {"args": args, "kwargs": kwargs}
            hit = get_cached(namespace, payload)
            if hit is not None:
                return hit
            result = fn(*args, **kwargs)
            set_cached(namespace, payload, result, ttl=ttl)
            return result
        return wrapper
    return decorator