"""
WNSP Kernel Persistence
=======================

Saves and restores coordinator state (agent registry + bus route log)
to PostgreSQL so channel allocations survive process restarts.

Tables created on first use (idempotent):
  wnsp_agents   — registered agents + PsiChannel coordinates
  wnsp_bus_log  — dispatched message route records

Author: Te Rata Pou
License: AGPL-3.0
"""

import os
import json
import time
from typing import List, Optional

try:
    import psycopg2
    import psycopg2.extras
    _PSYCOPG2_AVAILABLE = True
except ImportError:
    psycopg2 = None  # type: ignore
    _PSYCOPG2_AVAILABLE = False

_DSN = os.environ.get("DATABASE_URL", "")


def _connect():
    if not _PSYCOPG2_AVAILABLE:
        raise RuntimeError("psycopg2 not installed — persistence unavailable")
    if not _DSN:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return psycopg2.connect(_DSN)


# ─────────────────────────────────────────────────────────────────
# Schema bootstrap (idempotent)
# ─────────────────────────────────────────────────────────────────

BOOTSTRAP_SQL = """
CREATE TABLE IF NOT EXISTS wnsp_agents (
    agent_id        TEXT PRIMARY KEY,
    wdm             INTEGER NOT NULL,
    oam             INTEGER NOT NULL,
    pol             INTEGER NOT NULL,
    intent          TEXT    NOT NULL DEFAULT 'general',
    authority_band  TEXT    NOT NULL DEFAULT 'USER',
    registered_at   DOUBLE PRECISION NOT NULL,
    updated_at      DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS wnsp_bus_log (
    id          SERIAL PRIMARY KEY,
    src         TEXT    NOT NULL,
    dst         TEXT    NOT NULL,
    payload     TEXT    NOT NULL,
    priority    INTEGER NOT NULL DEFAULT 5,
    src_wdm     INTEGER NOT NULL,
    src_oam     INTEGER NOT NULL,
    src_pol     INTEGER NOT NULL,
    dst_wdm     INTEGER NOT NULL,
    dst_oam     INTEGER NOT NULL,
    dst_pol     INTEGER NOT NULL,
    route       TEXT    NOT NULL,
    dispatched_at DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS wnsp_kernel_events (
    id          SERIAL PRIMARY KEY,
    event_type  TEXT    NOT NULL,
    agent_id    TEXT,
    detail      JSONB   NOT NULL DEFAULT '{}',
    created_at  DOUBLE PRECISION NOT NULL
);
"""


def is_available() -> bool:
    """True if psycopg2 is installed and DATABASE_URL is set."""
    return _PSYCOPG2_AVAILABLE and bool(_DSN)


def bootstrap_schema():
    """Create kernel tables if they don't exist (safe to call on every start)."""
    if not is_available():
        raise RuntimeError("psycopg2 not installed — persistence unavailable")
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(BOOTSTRAP_SQL)
        conn.commit()


# ─────────────────────────────────────────────────────────────────
# Agent persistence
# ─────────────────────────────────────────────────────────────────

def save_agent(agent_id: str, wdm: int, oam: int, pol: int,
               intent: str = "general", authority_band: str = "USER",
               registered_at: Optional[float] = None):
    """Upsert an agent record into the DB."""
    now = time.time()
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO wnsp_agents
                    (agent_id, wdm, oam, pol, intent, authority_band,
                     registered_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (agent_id) DO UPDATE SET
                    wdm            = EXCLUDED.wdm,
                    oam            = EXCLUDED.oam,
                    pol            = EXCLUDED.pol,
                    intent         = EXCLUDED.intent,
                    authority_band = EXCLUDED.authority_band,
                    updated_at     = EXCLUDED.updated_at
            """, (agent_id, wdm, oam, pol, intent, authority_band,
                  registered_at or now, now))
        conn.commit()


def delete_agent(agent_id: str):
    """Remove an agent from the DB."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM wnsp_agents WHERE agent_id = %s", (agent_id,))
        conn.commit()


def load_all_agents() -> List[dict]:
    """Return all persisted agents."""
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM wnsp_agents ORDER BY registered_at")
            return [dict(row) for row in cur.fetchall()]


# ─────────────────────────────────────────────────────────────────
# Bus log persistence
# ─────────────────────────────────────────────────────────────────

def save_bus_route(record: dict):
    """Append a dispatched bus route to the DB."""
    sc = record.get("src_channel", {})
    dc = record.get("dst_channel", {})
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO wnsp_bus_log
                    (src, dst, payload, priority,
                     src_wdm, src_oam, src_pol,
                     dst_wdm, dst_oam, dst_pol,
                     route, dispatched_at)
                VALUES (%s,%s,%s,%s, %s,%s,%s, %s,%s,%s, %s,%s)
            """, (
                record.get("src"), record.get("dst"),
                str(record.get("payload", "")),
                record.get("priority", 5),
                sc.get("wdm", 0), sc.get("oam", 0), sc.get("pol", 0),
                dc.get("wdm", 0), dc.get("oam", 0), dc.get("pol", 0),
                record.get("route", ""),
                record.get("timestamp", time.time()),
            ))
        conn.commit()


def load_bus_log(last_n: int = 50) -> List[dict]:
    """Return the most recent N bus routes from DB."""
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM wnsp_bus_log
                ORDER BY dispatched_at DESC LIMIT %s
            """, (last_n,))
            return [dict(row) for row in cur.fetchall()]


# ─────────────────────────────────────────────────────────────────
# Kernel event log
# ─────────────────────────────────────────────────────────────────

def log_kernel_event(event_type: str, agent_id: Optional[str] = None,
                     detail: Optional[dict] = None):
    """Append a kernel lifecycle event to the DB."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO wnsp_kernel_events
                    (event_type, agent_id, detail, created_at)
                VALUES (%s, %s, %s, %s)
            """, (event_type, agent_id,
                  psycopg2.extras.Json(detail or {}),
                  time.time()))
        conn.commit()


def load_kernel_events(last_n: int = 50) -> List[dict]:
    """Return the most recent N kernel events."""
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM wnsp_kernel_events
                ORDER BY created_at DESC LIMIT %s
            """, (last_n,))
            return [dict(row) for row in cur.fetchall()]
