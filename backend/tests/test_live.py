"""Offline tests for the session gate and the Live relay.

Firestore and Gemini are both faked, so these run without credentials:
    env/Scripts/python -m pytest   (from backend/)
For a real end-to-end check against Gemini, use scripts/live_smoke.py.
"""

import asyncio
import base64
import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from src import config
from src.main import app
from src.services import live_tutor
from src.store import session_store

ORIGIN = "http://localhost:5173"


class FakeStore:
    def __init__(self):
        self.sessions = {}
        self.counts = {}

    def create_session(self, sid):
        self.sessions[sid] = {"createdAt": datetime.now(timezone.utc), "isFinished": False}

    def claim_live_session(self, sid):
        s = self.sessions.get(sid)
        if not session_store.is_session_open(s) or s.get("liveStartedAt"):
            return False
        s["liveStartedAt"] = datetime.now(timezone.utc)
        return True

    def finish_session(self, sid, reason, images, texts):
        self.sessions[sid].update(isFinished=True, endReason=reason, imageCount=images, textCount=texts)

    def hit_rate_limit(self, key, limit):
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key] > limit


class FakeMessage:
    def __init__(self, server_content):
        self.server_content = server_content


class FakeContent:
    def __init__(self, **kw):
        self.interrupted = kw.get("interrupted")
        self.input_transcription = kw.get("input_transcription")
        self.output_transcription = kw.get("output_transcription")
        self.model_turn = kw.get("model_turn")
        self.turn_complete = kw.get("turn_complete")


class _T:
    def __init__(self, text):
        self.text = text


class _Part:
    def __init__(self, data):
        self.inline_data = type("D", (), {"data": data})()


class FakeSession:
    """Answers every user turn with one audio chunk + transcript."""

    def __init__(self):
        self.sent = []
        self._turns = asyncio.Queue()

    async def send_client_content(self, turns, turn_complete):
        self.sent.append(("content", turns))
        await self._turns.put("reply")

    async def send_realtime_input(self, **kw):
        self.sent.append(("realtime", kw))
        if "text" in kw:
            await self._turns.put("reply")

    async def receive(self):
        await self._turns.get()
        yield FakeMessage(FakeContent(output_transcription=_T("Hi there!")))
        yield FakeMessage(FakeContent(model_turn=type("M", (), {"parts": [_Part(b"\x00\x01")]})()))
        yield FakeMessage(FakeContent(turn_complete=True))


@pytest.fixture
def store(monkeypatch):
    fake = FakeStore()
    for name in ("create_session", "claim_live_session", "finish_session", "hit_rate_limit"):
        monkeypatch.setattr(session_store, name, getattr(fake, name))
    return fake


@pytest.fixture
def fake_live(monkeypatch):
    session = FakeSession()

    @asynccontextmanager
    async def connect(model, config):
        yield session

    client = type("C", (), {})()
    client.aio = type("A", (), {})()
    client.aio.live = type("L", (), {"connect": staticmethod(connect)})()
    monkeypatch.setattr(live_tutor, "get_client", lambda: client)
    return session


def new_session(tc):
    r = tc.post("/api/session", headers={"origin": ORIGIN})
    assert r.status_code == 200
    return r.json()["sessionId"]


def read_until(ws, predicate, limit=20):
    for _ in range(limit):
        msg = ws.receive()
        if msg.get("text") is not None:
            data = json.loads(msg["text"])
            if predicate(data):
                return data


def test_session_requires_allowed_origin(store):
    tc = TestClient(app)
    assert tc.post("/api/session", headers={"origin": "https://evil.example"}).status_code == 403
    assert tc.post("/api/session").status_code == 403


def test_session_rate_limited_per_ip(store, monkeypatch):
    monkeypatch.setattr(config, "SESSIONS_PER_IP_PER_HOUR", 2)
    tc = TestClient(app)
    codes = [tc.post("/api/session", headers={"origin": ORIGIN}).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


def test_ws_rejects_unknown_session_and_bad_origin(store, fake_live):
    tc = TestClient(app)
    with pytest.raises(WebSocketDisconnect):
        with tc.websocket_connect("/api/live/nope", headers={"origin": ORIGIN}) as ws:
            ws.receive_text()
    sid = new_session(tc)
    with pytest.raises(WebSocketDisconnect):
        with tc.websocket_connect(f"/api/live/{sid}", headers={"origin": "https://evil.example"}) as ws:
            ws.receive_text()


def test_ws_rejects_stale_session(store, fake_live):
    tc = TestClient(app)
    sid = new_session(tc)
    store.sessions[sid]["createdAt"] -= timedelta(seconds=config.SESSION_ID_MAX_AGE_SECONDS + 1)
    with pytest.raises(WebSocketDisconnect):
        with tc.websocket_connect(f"/api/live/{sid}", headers={"origin": ORIGIN}) as ws:
            ws.receive_text()


def test_full_session_flow_and_single_claim(store, fake_live):
    tc = TestClient(app)
    sid = new_session(tc)
    with tc.websocket_connect(f"/api/live/{sid}", headers={"origin": ORIGIN}) as ws:
        # Greeting turn triggered by <START>.
        assert read_until(ws, lambda d: d["type"] == "transcript")["text"] == "Hi there!"
        read_until(ws, lambda d: d["type"] == "turn_complete")

        jpeg = base64.b64encode(b"\xff\xd8fakejpeg").decode()
        ws.send_text(json.dumps({"type": "image", "data": jpeg, "source": "book", "text": "What is this?"}))
        read_until(ws, lambda d: d["type"] == "turn_complete")

        ws.send_text(json.dumps({"type": "text", "text": "Give me an example"}))
        read_until(ws, lambda d: d["type"] == "turn_complete")

        ws.send_bytes(b"\x00" * 1024)
        ws.send_text(json.dumps({"type": "hangup"}))
        assert read_until(ws, lambda d: d["type"] == "ended")["reason"] == "hangup"

    image_turn = fake_live.sent[1][1]
    assert image_turn.parts[0].inline_data.mime_type == "image/jpeg"
    assert "textbook" in image_turn.parts[1].text and "What is this?" in image_turn.parts[1].text
    assert store.sessions[sid]["imageCount"] == 1 and store.sessions[sid]["textCount"] == 1

    # A ticket buys exactly one Live connection.
    with pytest.raises(WebSocketDisconnect):
        with tc.websocket_connect(f"/api/live/{sid}", headers={"origin": ORIGIN}) as ws:
            ws.receive_text()


def test_image_limit_ends_session(store, fake_live, monkeypatch):
    monkeypatch.setattr(config, "MAX_IMAGES_PER_SESSION", 1)
    tc = TestClient(app)
    sid = new_session(tc)
    jpeg = base64.b64encode(b"\xff\xd8x").decode()
    with tc.websocket_connect(f"/api/live/{sid}", headers={"origin": ORIGIN}) as ws:
        ws.send_text(json.dumps({"type": "image", "data": jpeg, "source": "monitor"}))
        ws.send_text(json.dumps({"type": "image", "data": jpeg, "source": "monitor"}))
        assert read_until(ws, lambda d: d["type"] == "ended")["reason"] == "image_limit"


def test_oversized_image_rejected():
    big = base64.b64encode(b"x" * (config.MAX_IMAGE_BYTES + 10)).decode()
    with pytest.raises(live_tutor.SessionEnded):
        live_tutor.decode_image(big)
    with pytest.raises(live_tutor.SessionEnded):
        live_tutor.decode_image("not base64!!")
