from functools import lru_cache

from google import genai

from .. import config


@lru_cache(maxsize=1)
def get_client() -> genai.Client:
    if not config.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=config.GEMINI_API_KEY)
