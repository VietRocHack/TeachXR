import logging
import uuid

from fastapi import FastAPI, HTTPException, Request, WebSocket

from . import guards
from .services import live_tutor
from .store import session_store

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="TeachXR backend")


@app.get("/api")
def root():
    return {"status": "ok"}


@app.post("/api/session")
def new_session(request: Request):
    """The one gate in front of Gemini: the Live WebSocket only accepts a
    session ID issued here — see docs/adr/0005-abuse-prevention.md."""
    if not guards.is_allowed_origin(request):
        raise HTTPException(status_code=403, detail="Origin not allowed")
    guards.enforce_session_rate_limit(request)
    session_id = str(uuid.uuid4())
    session_store.create_session(session_id)
    return {"sessionId": session_id}


@app.websocket("/api/live/{session_id}")
async def live(websocket: WebSocket, session_id: str):
    await live_tutor.run_live_session(websocket, session_id)
