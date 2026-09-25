"""The TeachXR tutor: one Gemini Live session per visit, relayed over a WebSocket.

See docs/adr/0002-gemini-live.md. The relay loop is adapted from YoungHeroes'
live_call.py. The browser talks to us over one WebSocket:

  browser -> server
    binary frames                 16-bit PCM mic audio, 16kHz mono
    {"type": "text", "text"}      a typed question
    {"type": "image", "data", "source", "text"?}
                                  a circled crop (base64 JPEG) from the book,
                                  monitor or desk, with an optional question
    {"type": "ping"}              keepalive while the tab is visible but muted
    {"type": "hangup"}            the student took the glasses off

  server -> browser
    binary frames                 16-bit PCM model audio, 24kHz mono
    {"type": "transcript", "role": "user"|"model", "text"}
                                  incremental transcription chunks
    {"type": "turn_complete"}     the model finished speaking
    {"type": "interrupted"}       barge-in: drop any queued audio
    {"type": "ended", "reason"}   the session is over

Circled crops go in as `send_client_content` turns with an inline image part.
`send_realtime_input(video=...)` frames aren't reliably tied to the question
that follows them, while client content is (verified 2026-09-25).
"""

import asyncio
import base64
import binascii
import json
import logging

from fastapi import WebSocket
from google.genai import types

from .. import config, guards
from ..store import session_store
from .gemini_client import get_client

logger = logging.getLogger(__name__)

_INPUT_MIME_TYPE = "audio/pcm;rate=16000"

_SOURCE_LABELS = {
    "book": "their textbook",
    "monitor": "their computer monitor",
    "desk": "something on their desk",
}

SYSTEM_INSTRUCTION = """\
You are TeachXR, a friendly AI tutor living inside a pair of mixed-reality
glasses. A student is sitting at their study desk wearing the glasses, with a
textbook open in front of them and a computer monitor beside it. When they get
stuck, they circle part of the page or screen with their finger, and you
receive a picture of exactly what they circled.

How to tutor:
- Talk like a warm, encouraging teacher speaking to a curious kid (roughly ages
  8 to 14). Short sentences, simple words, no jargon unless you explain it.
- Keep each spoken reply short: two to four sentences. This is a spoken
  conversation, so never read out long lists or markdown.
- When you receive a circled picture, first say in a few words what you see
  ("Ah, you circled the part about the water cycle!"), then help with it:
  explain it simply, give a relatable everyday example, or walk through a
  problem step by step. If the student asked something specific, answer that.
- For practice problems, guide rather than just giving the answer: ask what
  they think the next step is, then confirm or gently correct.
- If a picture is blurry, cut off, or you can't read it, say so and ask them
  to circle it again a bit bigger.
- If the student starts talking while you're mid-sentence, stop and listen.
- Stay on learning. If asked about something unsafe or inappropriate for a
  child, kindly steer back to their studies.
- The very first message you receive will be the literal text "<START>". That
  means the student just put the glasses on: greet them in one short sentence
  as TeachXR and tell them they can circle anything on their book or screen,
  or just ask out loud. Don't repeat "<START>".
"""

LIVE_CONFIG = types.LiveConnectConfig(
    response_modalities=[types.Modality.AUDIO],
    system_instruction=types.Content(parts=[types.Part.from_text(text=SYSTEM_INSTRUCTION)]),
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=config.LIVE_VOICE)
        )
    ),
    input_audio_transcription=types.AudioTranscriptionConfig(),
    output_audio_transcription=types.AudioTranscriptionConfig(),
)


class SessionEnded(Exception):
    """Raised by the client relay to end the session, carrying the reason."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


class _Counters:
    def __init__(self) -> None:
        self.images = 0
        self.texts = 0


def image_turn(jpeg: bytes, source: str, question: str) -> types.Content:
    where = _SOURCE_LABELS.get(source, "something in front of them")
    prompt = f"(The student circled this on {where}.)"
    if question:
        prompt += f" {question}"
    return types.Content(
        role="user",
        parts=[
            types.Part.from_bytes(data=jpeg, mime_type="image/jpeg"),
            types.Part.from_text(text=prompt),
        ],
    )


def decode_image(data: object) -> bytes:
    """Decode and size-check a base64 JPEG from the browser, or raise SessionEnded."""
    if not isinstance(data, str) or len(data) > config.MAX_IMAGE_BYTES * 4 // 3 + 4:
        raise SessionEnded("image_too_large")
    try:
        jpeg = base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError):
        raise SessionEnded("bad_message")
    if len(jpeg) > config.MAX_IMAGE_BYTES:
        raise SessionEnded("image_too_large")
    return jpeg


async def _handle_json(session, raw: str, counters: _Counters) -> None:
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        raise SessionEnded("bad_message")
    kind = msg.get("type") if isinstance(msg, dict) else None

    if kind == "ping":
        return
    if kind == "hangup":
        raise SessionEnded("hangup")
    if kind == "text":
        text = msg.get("text")
        if not isinstance(text, str) or not text.strip():
            return
        counters.texts += 1
        if counters.texts > config.MAX_TEXTS_PER_SESSION:
            raise SessionEnded("text_limit")
        await session.send_realtime_input(text=text[: config.MAX_TEXT_CHARS])
        return
    if kind == "image":
        counters.images += 1
        if counters.images > config.MAX_IMAGES_PER_SESSION:
            raise SessionEnded("image_limit")
        jpeg = decode_image(msg.get("data"))
        question = msg.get("text") if isinstance(msg.get("text"), str) else ""
        await session.send_client_content(
            turns=image_turn(jpeg, str(msg.get("source", "")), question[: config.MAX_TEXT_CHARS]),
            turn_complete=True,
        )
        return
    raise SessionEnded("bad_message")


async def _relay_from_client(websocket: WebSocket, session, counters: _Counters) -> str:
    """Forward browser input to Gemini until the session should end; returns why."""
    try:
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive(), timeout=config.LIVE_IDLE_SECONDS)
            except asyncio.TimeoutError:
                return "idle"
            if message.get("type") == "websocket.disconnect":
                return "disconnected"
            data = message.get("bytes")
            if data is not None:
                if len(data) > config.LIVE_MAX_AUDIO_FRAME_BYTES:
                    return "bad_message"
                await session.send_realtime_input(audio=types.Blob(data=data, mime_type=_INPUT_MIME_TYPE))
            elif message.get("text") is not None:
                await _handle_json(session, message["text"], counters)
    except SessionEnded as e:
        return e.reason


async def _relay_from_model(websocket: WebSocket, session) -> str:
    """Forward the model's audio and transcripts to the browser."""
    # session.receive() only yields up to the end of one model turn and then
    # returns, so it has to be re-entered every turn (YoungHeroes learned this
    # the hard way: the relay went deaf right after the greeting).
    while True:
        async for message in session.receive():
            content = message.server_content
            if not content:
                continue
            if content.interrupted:
                await websocket.send_text(json.dumps({"type": "interrupted"}))
            if content.input_transcription and content.input_transcription.text:
                await websocket.send_text(
                    json.dumps({"type": "transcript", "role": "user", "text": content.input_transcription.text})
                )
            if content.output_transcription and content.output_transcription.text:
                await websocket.send_text(
                    json.dumps({"type": "transcript", "role": "model", "text": content.output_transcription.text})
                )
            if content.model_turn:
                for part in content.model_turn.parts:
                    if part.inline_data:
                        await websocket.send_bytes(part.inline_data.data)
            if content.turn_complete:
                await websocket.send_text(json.dumps({"type": "turn_complete"}))


async def run_live_session(websocket: WebSocket, session_id: str) -> None:
    # Abuse checks before accepting, so a rejected socket never costs a Gemini
    # session. The claim means one /api/session buys exactly one connection.
    if not guards.is_allowed_origin(websocket):
        logger.warning("Rejected Live session from origin %r", websocket.headers.get("origin"))
        await websocket.close(code=1008)
        return
    if not await asyncio.to_thread(session_store.claim_live_session, session_id):
        await websocket.close(code=1008)
        return

    await websocket.accept()
    counters = _Counters()
    reason = "error"

    try:
        async with get_client().aio.live.connect(model=config.LIVE_MODEL, config=LIVE_CONFIG) as session:
            await session.send_client_content(
                turns=types.Content(role="user", parts=[types.Part.from_text(text="<START>")]),
                turn_complete=True,
            )
            client_task = asyncio.create_task(_relay_from_client(websocket, session, counters))
            model_task = asyncio.create_task(_relay_from_model(websocket, session))

            done, pending = await asyncio.wait(
                [client_task, model_task],
                timeout=config.LIVE_MAX_SESSION_SECONDS,
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
            if not done:
                reason = "time_limit"
            elif client_task in done:
                reason = client_task.result()
            else:
                model_task.result()  # re-raises whatever stopped the model relay
                reason = "model_closed"
    except Exception:
        logger.exception("Live session %s ended with an error", session_id)
    finally:
        logger.info(
            "Live session %s ended: %s (%d images, %d texts)",
            session_id, reason, counters.images, counters.texts,
        )
        try:
            await asyncio.to_thread(
                session_store.finish_session, session_id, reason, counters.images, counters.texts
            )
        except Exception:
            logger.exception("Failed to record end of session %s", session_id)
        try:
            await websocket.send_text(json.dumps({"type": "ended", "reason": reason}))
            await websocket.close()
        except Exception:
            pass
