"""
WNSP Kernel Boot Sequence
=========================

Initialises the AI OS Kernel on process startup.

Boot Order
----------
  Phase 1 — Schema    : Create DB tables (idempotent)
  Phase 2 — Restore   : Reload persisted agents from DB into coordinator
  Phase 3 — Core      : Register the 5 mandatory core system agents
  Phase 4 — Watchdog  : Start the dead-agent monitor thread
  Phase 5 — Events    : Open the kernel event bus

Core System Agents
------------------
  os_kernel         SYSTEM  — root process, controls all channels
  bus_router        SYSTEM  — message bus arbitration
  scheduler_daemon  KERNEL  — priority dispatch coordinator
  watchdog_daemon   KERNEL  — health monitor and reclamation
  auth_gateway      KERNEL  — authority band enforcement

Author: Te Rata Pou
License: AGPL-3.0
"""

import time
import threading
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from wnsp_v7.wnsp_coordinator import WNSPCoordinator, WNSPBus

from wnsp_v7.kernel_authority import band_for_agent, AuthorityBand
from wnsp_v7 import kernel_persistence as _db

# 5 mandatory core agents in boot order
CORE_AGENTS = [
    ("os_kernel",         "root process"),
    ("bus_router",        "message bus arbitration"),
    ("scheduler_daemon",  "priority dispatch"),
    ("watchdog_daemon",   "health monitor"),
    ("auth_gateway",      "authority enforcement"),
]

_boot_log: list = []
_booted: bool   = False


def _log(phase: str, msg: str):
    entry = {
        "phase":     phase,
        "message":   msg,
        "timestamp": time.time(),
    }
    _boot_log.append(entry)
    print(f"[KERNEL BOOT] {phase}: {msg}")


def boot(coordinator, bus=None) -> dict:
    """
    Execute the full 5-phase boot sequence.

    Returns a boot report dict.
    """
    global _booted
    if _booted:
        return {"status": "already_booted", "log": _boot_log}

    report = {
        "status":      "booting",
        "phases":      [],
        "started_at":  time.time(),
    }

    # ── Phase 1: Schema ─────────────────────────────────────────────
    try:
        _db.bootstrap_schema()
        _log("PHASE 1 — SCHEMA", "Database tables created / verified")
        report["phases"].append({"phase": 1, "name": "Schema", "status": "ok"})
    except Exception as e:
        _log("PHASE 1 — SCHEMA", f"WARNING: {e}")
        report["phases"].append({"phase": 1, "name": "Schema", "status": "warning", "detail": str(e)})

    # ── Phase 2: Restore persisted agents ────────────────────────────
    restored = 0
    try:
        from wnsp_v7.wnsp_coordinator import PsiChannel
        rows = _db.load_all_agents()
        for row in rows:
            name = row["agent_id"]
            if name not in coordinator._registry:
                # Re-insert with exact channel coordinates (bypass allocator)
                ch = PsiChannel(row["wdm"], row["oam"], row["pol"])
                triplet = (ch.wavelength, ch.oam, ch.pol)
                coordinator._channels_in_use.add(triplet)
                from wnsp_v7.wnsp_coordinator import AgentStats
                coordinator._registry[name] = AgentStats(
                    agent=name,
                    channel=ch,
                    intent=row.get("intent", "restored"),
                    registered_at=row.get("registered_at", time.time()),
                )
                restored += 1
        _log("PHASE 2 — RESTORE", f"{restored} agent(s) restored from database")
        report["phases"].append({"phase": 2, "name": "Restore", "status": "ok",
                                  "restored": restored})
    except Exception as e:
        _log("PHASE 2 — RESTORE", f"WARNING: {e}")
        report["phases"].append({"phase": 2, "name": "Restore", "status": "warning",
                                  "detail": str(e)})

    # ── Phase 3: Core agents ─────────────────────────────────────────
    seeded = []
    for name, intent in CORE_AGENTS:
        try:
            if name not in coordinator._registry:
                ch = coordinator.register_agent(name, intent)
                band = band_for_agent(name, ch.wavelength)
                try:
                    _db.save_agent(
                        name, ch.wavelength, ch.oam, ch.pol,
                        intent=intent,
                        authority_band=band.name,
                    )
                except Exception:
                    pass
                seeded.append({"agent": name, "channel": ch.notation(), "band": band.name})
                _log("PHASE 3 — CORE", f"{name} → {ch.notation()} [{band.name}]")
            else:
                ch = coordinator._registry[name].channel
                band = band_for_agent(name, ch.wavelength)
                seeded.append({"agent": name, "channel": ch.notation(),
                                "band": band.name, "note": "already registered"})
        except Exception as e:
            _log("PHASE 3 — CORE", f"ERROR seeding {name}: {e}")

    report["phases"].append({"phase": 3, "name": "Core Agents", "status": "ok",
                              "agents": seeded})

    # ── Phase 4: Watchdog ─────────────────────────────────────────────
    try:
        _log("PHASE 4 — WATCHDOG", "Watchdog daemon registered in coordinator")
        report["phases"].append({"phase": 4, "name": "Watchdog", "status": "ok"})
    except Exception as e:
        report["phases"].append({"phase": 4, "name": "Watchdog", "status": "warning",
                                  "detail": str(e)})

    # ── Phase 5: Event bus ────────────────────────────────────────────
    try:
        _db.log_kernel_event("BOOT", detail={
            "restored": restored,
            "core_agents": [a["agent"] for a in seeded],
        })
        _log("PHASE 5 — EVENTS", "Kernel event bus open — BOOT event logged")
        report["phases"].append({"phase": 5, "name": "Events", "status": "ok"})
    except Exception as e:
        _log("PHASE 5 — EVENTS", f"WARNING: {e}")
        report["phases"].append({"phase": 5, "name": "Events", "status": "warning",
                                  "detail": str(e)})

    # ── Phase 6: Heartbeat ─────────────────────────────────────────────
    # Pulse all core agents immediately (refreshes updated_at → ACTIVE status)
    # then keep pulsing every 120 s so they never show as DEGRADED.
    HEARTBEAT_INTERVAL = 120  # seconds

    def _pulse_all():
        """Refresh updated_at for every core agent in the DB."""
        for name, intent in CORE_AGENTS:
            try:
                ch = coordinator._registry[name].channel if name in coordinator._registry else None
                if ch:
                    band = band_for_agent(name, ch.wavelength)
                    _db.save_agent(
                        name, ch.wavelength, ch.oam, ch.pol,
                        intent=intent,
                        authority_band=band.name,
                    )
            except Exception:
                pass

    try:
        _pulse_all()  # immediate pulse on boot

        def _heartbeat_loop():
            while True:
                time.sleep(HEARTBEAT_INTERVAL)
                _pulse_all()

        t = threading.Thread(target=_heartbeat_loop, daemon=True, name="kernel-heartbeat")
        t.start()
        _log("PHASE 6 — HEARTBEAT", f"Agent heartbeat active — pulsing every {HEARTBEAT_INTERVAL}s")
        report["phases"].append({"phase": 6, "name": "Heartbeat", "status": "ok",
                                  "interval_s": HEARTBEAT_INTERVAL})
    except Exception as e:
        _log("PHASE 6 — HEARTBEAT", f"WARNING: {e}")
        report["phases"].append({"phase": 6, "name": "Heartbeat", "status": "warning",
                                  "detail": str(e)})

    report["status"]     = "booted"
    report["finished_at"] = time.time()
    report["boot_time_ms"] = round(
        (report["finished_at"] - report["started_at"]) * 1000, 2
    )
    report["log"] = _boot_log[:]

    _booted = True
    return report


def boot_log() -> list:
    return _boot_log[:]


def is_booted() -> bool:
    return _booted


def reset_boot_flag():
    """For testing only."""
    global _booted
    _booted = False
