# 0001: Deploy topology

## Status

Accepted (2026-09-25).

## Context

TeachXR was three repos that only ran on one team member's Windows machine with
a Quest 3 casting to it. It's moving to the shared `vietrochack-lab` project per
the [migration guide](https://github.com/VietRocHack/migration-guide), to live at
`teachxr.vietrochack.com`. The backend holds a Gemini Live session per visitor,
which is a long-lived WebSocket.

## Decision

- **Frontend**: static Vite build on the Firebase Hosting site `vietrochack-teachxr`.
- **Backend**: FastAPI on Cloud Run (`teachxr-server`), not a Cloud Function,
  because the Live relay is a WebSocket held open for minutes.
- One domain for HTTP: Hosting rewrites `/api/**` to Cloud Run, so `POST /api/session` is same-origin.
- **The WebSocket goes straight to the Cloud Run URL**
  (`frontend/src/lib/api.js`), because Hosting's rewrite proxy drops the
  upgrade (YoungHeroes found this in prod). The backend checks `Origin` itself.
- Per-app resources: Firestore database `teachxr`, Artifact Registry repo
  `teachxr` (images are built there, not in `cloud-run-source-deploy`, so its
  cleanup policy applies), secret `teachxr-gemini-api-key`.
- The 3D models ship with the Hosting deploy (`frontend/public/models/`); no bucket.

## Consequences

- A Cloud Run URL change (new project or region) needs `VITE_LIVE_WS_HOST` or the default in `api.js` updated.
- `--timeout=600` must stay above `LIVE_MAX_SESSION_SECONDS` (480).
