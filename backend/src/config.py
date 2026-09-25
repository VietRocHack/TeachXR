import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GCP_PROJECT = os.environ.get("GCP_PROJECT", "vietrochack-lab")
FIRESTORE_DATABASE = os.environ.get("FIRESTORE_DATABASE", "teachxr")

# Native audio-to-audio Live model — see docs/adr/0002-gemini-live.md. Model
# names drift as Google's catalog moves on; if this starts failing, list the
# models that support `bidiGenerateContent` and bump it.
LIVE_MODEL = os.environ.get("LIVE_MODEL", "gemini-3.8-live")
# A warm female voice, to match the tutor avatar (female2) in the window.
# Gemini voices are described by tone, not identity; see the Live API voice list.
LIVE_VOICE = os.environ.get("LIVE_VOICE", "Sulafat")

# Abuse prevention — see docs/adr/0005-abuse-prevention.md. Every limit here
# caps how much Gemini spend one visitor (or everyone at once) can trigger;
# the AI Studio spend cap is the hard backstop behind all of them.

# The Live WebSocket connects straight to Cloud Run (not through Hosting —
# see frontend/src/lib/api.js), so this is the only thing stopping another
# site from embedding it.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "https://teachxr.vietrochack.com,"
        "https://vietrochack-teachxr.web.app,"
        "https://vietrochack-teachxr.firebaseapp.com,"
        "http://localhost:5173",
    ).split(",")
    if o.strip()
]

# Keep under Cloud Run's --timeout (600s in scripts/deploy.sh) so we end the
# session cleanly, and tell the browser, before Cloud Run cuts the socket.
LIVE_MAX_SESSION_SECONDS = int(os.environ.get("LIVE_MAX_SESSION_SECONDS", "480"))
# The browser sends mic audio or a keepalive ping while the tab is visible, so
# a gap this long means the tab was hidden or closed.
LIVE_IDLE_SECONDS = int(os.environ.get("LIVE_IDLE_SECONDS", "45"))
# One 256ms 16kHz 16-bit PCM chunk is ~8KB; anything far bigger isn't mic audio.
LIVE_MAX_AUDIO_FRAME_BYTES = int(os.environ.get("LIVE_MAX_AUDIO_FRAME_BYTES", str(64 * 1024)))
# Circled crops are downscaled JPEGs in the browser (frontend/src/lib/capture.js).
MAX_IMAGE_BYTES = int(os.environ.get("MAX_IMAGE_BYTES", str(1024 * 1024)))
MAX_IMAGES_PER_SESSION = int(os.environ.get("MAX_IMAGES_PER_SESSION", "20"))
MAX_TEXT_CHARS = int(os.environ.get("MAX_TEXT_CHARS", "1000"))
MAX_TEXTS_PER_SESSION = int(os.environ.get("MAX_TEXTS_PER_SESSION", "60"))

# A session ID must be claimed within this long of /api/session issuing it.
SESSION_ID_MAX_AGE_SECONDS = int(os.environ.get("SESSION_ID_MAX_AGE_SECONDS", "600"))

# /api/session rate limits, per hour. Per-IP is generous because a classroom
# can share one IP; the global cap bounds total spend even if an attacker
# rotates IPs or spoofs the client-IP header.
SESSIONS_PER_IP_PER_HOUR = int(os.environ.get("SESSIONS_PER_IP_PER_HOUR", "20"))
SESSIONS_GLOBAL_PER_HOUR = int(os.environ.get("SESSIONS_GLOBAL_PER_HOUR", "300"))
