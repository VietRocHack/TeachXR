# 0005: Abuse prevention for the public, Gemini-backed backend

## Status

Accepted (2026-09-25). Modeled on YoungHeroes ADR 0006, without App Check for now.

## Context

Every Live session spends money on Gemini, and the endpoints are public. The
audience is kids, so logins are out: they can't manage accounts, and collecting
data from under-13s raises COPPA issues.

## Decision

Layered limits, no accounts:

1. **Hard ceilings outside the code:**
   - An AI Studio spend cap.
   - The Gemini key restricted to the Generative Language API.
   - Cloud Run `--max-instances=3 --concurrency=20 --timeout=600`.
   - The project-wide $10/month budget alert (shared with the other apps).
2. **`POST /api/session` is the only gate.** It checks `Origin`, then applies
   rate limits: 20 sessions per hour per client IP and 300 per hour globally.
   The counters are hourly buckets in Firestore with hashed keys and an
   `expiresAt` TTL field.
3. **Tickets are single-use.** `WS /api/live/{id}` accepts only a ticket
   issued in the last 10 minutes and not yet claimed. The claim is an atomic
   Firestore transaction. `Origin` is checked before `accept()`, so a rejected
   socket never opens a Gemini session.
4. **In-session caps:**
   - 480 s maximum.
   - 45 s idle timeout. The browser sends mic audio, or a keepalive ping only
     while the tab is visible.
   - Audio frames of 64 KB or less.
   - At most 20 images, each 1 MB or less.
   - At most 60 typed messages, 1000 characters each.

## Consequences

- The client IP is best effort (`Fastly-Client-IP` through Hosting, the last
  `X-Forwarded-For` hop direct to Cloud Run). The global cap and the spend cap
  are what really bound cost.
- Someone could burn the global hourly cap and lock others out for the hour.
  That's acceptable for a free demo.
- Not done: Firebase App Check. Add it (as YoungHeroes did) if abuse shows up.
