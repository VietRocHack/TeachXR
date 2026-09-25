"""End-to-end smoke test against a running deployment, using real Gemini.

Opens a session, waits for the spoken greeting, sends a rendered "book page"
image with a question, and checks that a transcript and audio come back.

Usage (from backend/, needs the `websockets` and `pillow` packages):
    env/Scripts/python scripts/live_smoke.py                      # production
    env/Scripts/python scripts/live_smoke.py http://localhost:5173 ws://localhost:5173
"""

import asyncio
import base64
import io
import json
import sys
import urllib.request

import websockets
from PIL import Image, ImageDraw, ImageFont

SITE = sys.argv[1] if len(sys.argv) > 1 else "https://vietrochack-teachxr.web.app"
WS_BASE = sys.argv[2] if len(sys.argv) > 2 else "wss://teachxr-server-246457606106.us-central1.run.app"


def page_jpeg() -> str:
    img = Image.new("RGB", (640, 220), "white")
    try:
        font = ImageFont.truetype("arial.ttf", 26)
    except OSError:
        font = ImageFont.load_default()
    ImageDraw.Draw(img).text(
        (20, 20),
        "Evaporation: the Sun warms water in\noceans and lakes, turning it into\nwater vapor that rises into the sky.",
        fill="black",
        font=font,
    )
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    return base64.b64encode(buf.getvalue()).decode()


async def turn(ws) -> tuple[int, str]:
    audio, text = 0, []
    while True:
        msg = await asyncio.wait_for(ws.recv(), 45)
        if isinstance(msg, bytes):
            audio += len(msg)
            continue
        data = json.loads(msg)
        if data["type"] == "transcript" and data["role"] == "model":
            text.append(data["text"])
        elif data["type"] == "turn_complete":
            return audio, "".join(text)
        elif data["type"] == "ended":
            raise SystemExit(f"session ended early: {data}")


async def main() -> None:
    req = urllib.request.Request(f"{SITE}/api/session", method="POST", headers={"Origin": SITE})
    session_id = json.load(urllib.request.urlopen(req))["sessionId"]
    async with websockets.connect(f"{WS_BASE}/api/live/{session_id}", origin=SITE) as ws:
        audio, text = await turn(ws)
        print(f"greeting: {audio} audio bytes | {text}")
        await ws.send(json.dumps({"type": "image", "data": page_jpeg(), "source": "book", "text": "What does this mean?"}))
        audio, text = await turn(ws)
        print(f"answer:   {audio} audio bytes | {text}")
        assert audio > 0 and text, "expected spoken audio and a transcript"
        await ws.send(json.dumps({"type": "hangup"}))
    print("OK")


if __name__ == "__main__":
    asyncio.run(main())
