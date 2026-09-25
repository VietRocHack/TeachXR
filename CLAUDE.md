# CLAUDE.md

TeachXR: an AI tutor inside mixed-reality glasses, from Cal Hacks 11.0 (see
`docs/product/pitch.md`). The original ran on a Meta Quest 3 with hand-gesture
capture; this repo is the consolidated, web-based recreation: a Three.js dorm
desk where you put the glasses on, circle part of a book or monitor, and talk
to a Gemini Live tutor about it.

## Repo map

- `frontend/`: React 18 + Vite + `@react-three/fiber`/`drei`/`postprocessing` + Tailwind.
  - `src/App.jsx`: the phase machine `desk → wearing → booting → xr → removing → desk`.
  - `src/scene/`: the 3D room. `Room.jsx` (walls, window, bed, shelf), `Desk.jsx`
    (desk + props), `Book.jsx` (flippable canvas-textured pages), `Monitor.jsx`,
    `Glasses.jsx` (procedural glasses + wear animation), `CameraRig.jsx`
    (seated camera, drag-look, chat-panel view offset), `textures.js` (procedural textures).
  - `src/content/`: `topics.js` (book spreads + matching monitor screens) and
    `drawPage.js` (renders them into canvases). Edit content here.
  - `src/hud/`: everything on the lenses. `LookSurface.jsx` does drag-to-look
    and the lasso; `SelectionPopup.jsx` asks about a capture; `ChatPanel.jsx`, `Orb.jsx`, `BootSequence.jsx`.
  - `src/lib/`: `useTutor.js` (Live session client), `liveAudio.js` (PCM mic/player,
    from YoungHeroes), `capture.js` (crop the WebGL canvas + detect book/monitor), `api.js`.
  - `public/models/`: CC0 Poly Haven GLBs, meshopt + WebP compressed (see docs/runbook.md).
- `backend/`: FastAPI on Cloud Run (`teachxr-server`).
  - `src/services/live_tutor.py`: the Gemini Live relay and the WebSocket message
    protocol (documented at the top of the file), plus the tutor system prompt.
  - `src/store/session_store.py`: session tickets + rate limits in Firestore (database `teachxr`).
  - `tests/test_live.py`: offline tests (Firestore and Gemini faked).
- `scripts/deploy.sh`, `.github/workflows/deploy.yml`: the same deploy, manual and on push to `main`.

## UI conventions

Use icons from `react-icons/lu` (Lucide) in the UI, never emoji.

## Before changing anything architectural

Read `docs/adr/` first. Each file is one decision with its reasoning. If you're
about to make a different choice, add a new ADR (or mark the old one
superseded); don't silently deviate.

## Progress logging: one file per day

`docs/progress/YYYYMMDD.md`, one file per calendar day. At the end of a work
session, append a `## HH:MM · title` section to today's file: what changed,
decisions, open TODOs. At the start of a session, read the most recent file.

## Running things

```bash
# Backend (needs backend/.env with GEMINI_API_KEY, and gcloud ADC for Firestore)
cd backend
python -m venv env && env/Scripts/activate   # or: source env/bin/activate
pip install -r requirements.txt pytest httpx
uvicorn src.main:app --reload --port 8080
python -m pytest -q                           # offline tests

# Frontend (proxies /api/**, including the WebSocket, to :8080)
cd frontend
npm install
npm run dev                                   # http://localhost:5173

# Deploy (see docs/runbook.md for one-time setup)
bash scripts/deploy.sh
```

Get a local key with:
`gcloud secrets versions access latest --secret=teachxr-gemini-api-key --project=vietrochack-lab`.
Never commit it.

In dev, `window.__r3f` exposes the R3F state, `window.__cam = { pos, target, fov }`
takes over the camera, and `await window.__snap(400)` overlays a still of the
post-processed frame (click it to dismiss); `window.__snapRaw({ pos, target, fov }, 400)`
does the same synchronously without post-processing, which works on a hidden tab. Handy for inspecting the scene.
