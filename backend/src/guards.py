"""Request-level abuse checks — see docs/adr/0005-abuse-prevention.md."""

import logging

from fastapi import HTTPException, Request
from starlette.requests import HTTPConnection

from . import config
from .store import session_store

logger = logging.getLogger(__name__)


def client_ip(conn: HTTPConnection) -> str:
    """Best-effort client IP. Through Firebase Hosting the real client is in
    Fastly-Client-IP; straight to Cloud Run it's X-Forwarded-For's last hop.
    Both can be forged by someone calling Cloud Run directly, which is why the
    per-IP limit is paired with a global one."""
    fastly_ip = conn.headers.get("fastly-client-ip")
    if fastly_ip:
        return fastly_ip.strip()
    forwarded = conn.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return conn.client.host if conn.client else "unknown"


def is_allowed_origin(conn: HTTPConnection) -> bool:
    return conn.headers.get("origin") in config.ALLOWED_ORIGINS


def enforce_session_rate_limit(request: Request) -> None:
    # Per-IP first, so one noisy caller's rejected requests don't also use up
    # the global budget everyone else shares.
    if session_store.hit_rate_limit(f"ip:{client_ip(request)}", config.SESSIONS_PER_IP_PER_HOUR):
        raise HTTPException(status_code=429, detail="Too many sessions, try again later")
    if session_store.hit_rate_limit("global", config.SESSIONS_GLOBAL_PER_HOUR):
        logger.warning("Global /api/session limit reached")
        raise HTTPException(status_code=429, detail="TeachXR is busy right now, try again later")
