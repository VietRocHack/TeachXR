// Same-origin for plain HTTP: Firebase Hosting rewrites /api/** to the Cloud
// Run backend in production, and vite.config.js proxies it to a local backend
// in dev.
//
// Firebase Hosting's rewrite proxy does NOT forward the WebSocket upgrade
// (YoungHeroes hit this in prod, 2026-09-24), so the Live connection goes
// straight to Cloud Run. Local dev goes through Vite's ws proxy instead.
const CLOUD_RUN_HOST =
  import.meta.env.VITE_LIVE_WS_HOST || 'teachxr-server-246457606106.us-central1.run.app';

export async function createSession() {
  const res = await fetch('/api/session', { method: 'POST' });
  if (res.status === 429) throw new Error('TeachXR is busy right now. Try again in a little while.');
  if (!res.ok) throw new Error(`Couldn't start a TeachXR session (${res.status}).`);
  const { sessionId } = await res.json();
  return sessionId;
}

export function liveUrl(sessionId) {
  const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = isLocalDev ? window.location.host : CLOUD_RUN_HOST;
  return `${scheme}://${host}/api/live/${encodeURIComponent(sessionId)}`;
}
