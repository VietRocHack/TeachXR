"""Session tickets and rate-limit counters in Firestore (database `teachxr`).

Kept in Firestore rather than memory because Cloud Run instances come and go:
the instance that issues a ticket isn't necessarily the one that serves the
WebSocket. Adapted from YoungHeroes' call_store.py — see
docs/adr/0005-abuse-prevention.md.
"""

import hashlib
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Optional

from google.cloud import firestore

from .. import config

COLLECTION = "sessions"
RATE_LIMIT_COLLECTION = "rateLimits"


@lru_cache(maxsize=1)
def get_db() -> firestore.Client:
    return firestore.Client(project=config.GCP_PROJECT, database=config.FIRESTORE_DATABASE)


def create_session(session_id: str) -> None:
    now = datetime.now(timezone.utc)
    get_db().collection(COLLECTION).document(session_id).set(
        {
            "createdAt": now,
            "isFinished": False,
            # Lets a Firestore TTL policy clean old tickets up automatically.
            "expiresAt": now + timedelta(days=1),
        }
    )


def is_session_open(session: Optional[dict]) -> bool:
    """A ticket is only honored if /api/session issued it recently and it
    hasn't been used up, so nobody can invent IDs or replay an old one."""
    if not session or session.get("isFinished"):
        return False
    created_at = session.get("createdAt")
    if created_at is None:
        return False
    return datetime.now(timezone.utc) - created_at < timedelta(seconds=config.SESSION_ID_MAX_AGE_SECONDS)


def claim_live_session(session_id: str) -> bool:
    """Atomically mark a ticket as used. Returns False if it's unknown, stale,
    finished, or already claimed, so one /api/session buys exactly one Live
    connection rather than unlimited reconnects."""
    db = get_db()
    ref = db.collection(COLLECTION).document(session_id)

    @firestore.transactional
    def claim(transaction) -> bool:
        snapshot = ref.get(transaction=transaction)
        session = snapshot.to_dict() if snapshot.exists else None
        if not is_session_open(session) or session.get("liveStartedAt"):
            return False
        transaction.update(ref, {"liveStartedAt": datetime.now(timezone.utc)})
        return True

    return claim(db.transaction())


def finish_session(session_id: str, reason: str, images: int, texts: int) -> None:
    get_db().collection(COLLECTION).document(session_id).set(
        {
            "isFinished": True,
            "endReason": reason,
            "imageCount": images,
            "textCount": texts,
            "finishedAt": datetime.now(timezone.utc),
        },
        merge=True,
    )


def hit_rate_limit(key: str, limit: int) -> bool:
    """Count one request against `key` in the current UTC hour. Returns True if
    that pushes it over `limit`. The key is hashed so no raw client IPs are
    stored; `expiresAt` is for a Firestore TTL policy."""
    now = datetime.now(timezone.utc)
    bucket = now.strftime("%Y%m%d%H")
    doc_id = f"{hashlib.sha256(key.encode()).hexdigest()[:32]}_{bucket}"
    db = get_db()
    ref = db.collection(RATE_LIMIT_COLLECTION).document(doc_id)

    @firestore.transactional
    def increment(transaction) -> int:
        snapshot = ref.get(transaction=transaction)
        count = (snapshot.to_dict() or {}).get("count", 0) if snapshot.exists else 0
        count += 1
        transaction.set(ref, {"count": count, "expiresAt": now + timedelta(hours=2)})
        return count

    return increment(db.transaction()) > limit
