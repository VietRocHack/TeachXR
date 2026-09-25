# 0002: Gemini Live replaces Vapi, Cloud Vision OCR and SingleStore

## Status

Accepted (2026-09-25).

## Context

The hackathon pipeline was:

1. MediaPipe crop.
2. `POST /ocr` to Flask.
3. Google Cloud Vision OCR.
4. Store text and image in SingleStore (Mongo API).
5. Emit a socket.io `newData` event.
6. The frontend fetches `/get_latest`.
7. The user accepts the crop.
8. The text is injected into a **Vapi** call as a system message.

Vapi in turn orchestrated Deepgram (STT), Gemini 1.5 Flash (LLM) and Cartesia
(TTS). The Vapi assistant's prompt and config lived in Vapi's dashboard, not in
the repo, and a private Vapi key was committed to the public frontend repo.

## Decision

Replace all of it with one **Gemini Live** session per visitor
(`gemini-3.8-live`, configurable via `LIVE_MODEL`), relayed server-to-server by
`backend/src/services/live_tutor.py`:

- Voice in and out is native audio-to-audio: 16 kHz PCM up, 24 kHz PCM down,
  with barge-in. Input and output transcriptions drive the chat bubbles.
- Circled crops go in as **images**, not OCR text, via `send_client_content`
  with an inline JPEG. Gemini reads the text, diagrams and math directly.
  `send_realtime_input(video=...)` frames were tried and aren't reliably tied
  to the following question (the model replied that the image didn't attach).
- Typed questions go in as `send_realtime_input(text=...)` in the same session.
  Mixing the two input styles was verified to work (2026-09-25).
- The tutor prompt is in the repo (`SYSTEM_INSTRUCTION`).
- No content database: the Live session holds the conversation, so there's
  nothing like SingleStore to store. Firestore holds only session tickets and
  rate limits (ADR 0005).

The browser audio code (`frontend/src/lib/liveAudio.js`) and the relay loop
are adapted from YoungHeroes (its ADR 0005), which proved the pattern in this
project.

## Consequences

- One vendor and one key, restricted to the Generative Language API.
- A session ends at 8 minutes, and the conversation context doesn't carry over
  a reconnect. See the backlog item on session resumption.
- Real-microphone QA must happen on a real device, because the build
  environment blocks mic access.
