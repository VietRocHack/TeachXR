# TeachXR

**An AI tutor that lives in your mixed-reality glasses.** Circle anything you're
stuck on in your textbook or on your screen, and just ask.

Live demo: **https://teachxr.vietrochack.com** (a browser recreation of the original Meta Quest 3 experience)
· [Devpost](https://devpost.com/software/teachxr) · Cal Hacks 11.0, Hackers' Choice + "Show us your Voice AI" awards

## The demo

1. You're sitting at a dorm study desk (Three.js), with a textbook, a monitor and study clutter.
2. Tap the TeachXR glasses on their charging pad. They fly up to your face and boot up.
3. Drag to look around. Flip the book with ◀ ▶ (five topics: space, plants, fractions, the water cycle, a short story).
4. Switch to **✍ Circle** (or hold Shift) and draw around a paragraph, diagram or problem on the book or monitor.
5. TeachXR sees exactly what you circled and helps, by real-time voice (Gemini Live) or chat.

## Repo map

| Path | What |
|---|---|
| `frontend/` | React + Vite + react-three-fiber scene and HUD, served by Firebase Hosting |
| `backend/` | FastAPI on Cloud Run: session gate + Gemini Live WebSocket relay |
| `docs/` | Decisions (`adr/`), original pitch (`product/`), runbook, backlog, progress log |
| `scripts/deploy.sh` | Manual deploy; `.github/workflows/deploy.yml` does the same on push to `main` |

Local development: see [CLAUDE.md](CLAUDE.md#running-things).

## Credits

- 3D models: [Poly Haven](https://polyhaven.com) (CC0), and the
  [Khronos glTF sample models](https://github.com/KhronosGroup/glTF-Sample-Assets):
  IridescenceLamp and SpecularSilkPouf by Eric Chadwick (CC BY 4.0), plus
  DiffuseTransmissionTeacup, GlassVaseFlowers and WaterBottle (CC0).
- Textures and HDRI: Poly Haven (CC0).

## History

This repo consolidates three hackathon repos, now archived:
[TeachXR-frontend](https://github.com/VietRocHack/TeachXR-frontend) (React + Vapi),
[TeachXR-backend-dataflow](https://github.com/VietRocHack/TeachXR-backend-dataflow) (Flask + Cloud Vision OCR + SingleStore), and
[TeachXR-backend-gesture](https://github.com/VietRocHack/TeachXR-backend-gesture) (MediaPipe hand gestures on a Quest 3 cast).
Everything AI now runs on Gemini; see [docs/adr/0002-gemini-live.md](docs/adr/0002-gemini-live.md).

Built by Duc Vu, Lam Pham, Vuong Ho and Hoang Le. © 2026 [VietRocHack](https://vietrochack.com).
