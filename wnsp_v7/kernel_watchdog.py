"""
WNSP Kernel Watchdog
====================

Background thread that monitors agent health and reclaims dead channels.

Rules
-----
  An agent is considered DEGRADED when:
    time.time() - last_activity > ttl_seconds

  A DEGRADED agent is RECLAIMED (channel released) after:
    time.time() - last_activity > reclaim_after_seconds

  Core system agents (os_kernel, bus_router, etc.) are EXEMPT
  from reclamation but still monitored.

Author: Te Rata Pou
License: AGPL-3.0
"""

import time
import threading
from typing import TYPE_CHECKING

from wnsp_v7.kernel_boot import CORE_AGENTS as _CORE_AGENT_LIST
from wnsp_v7 import kernel_persistence as _db

EXEMPT_AGENTS = {name for name, _ in _CORE_AGENT_LIST}


class KernelWatchdog:
    """
    Dead-agent monitor and channel reclamation daemon.

    Parameters
    ----------
    coordinator    : WNSPCoordinator instance
    ttl_seconds    : seconds of inactivity before DEGRADED
    reclaim_after  : seconds of inactivity before RECLAIMED
    interval       : how often the watchdog scans (seconds)
    """

    def __init__(
        self,
        coordinator,
        ttl_seconds:   int = 300,   # 5 min → DEGRADED
        reclaim_after: int = 600,   # 10 min → RECLAIMED
        interval:      int = 30,
    ):
        self.coordinator   = coordinator
        self.ttl           = ttl_seconds
        self.reclaim_after = reclaim_after
        self.interval      = interval

        self._running  = False
        self._thread:  threading.Thread | None = None
        self._reclaim_log: list = []
        self._degraded: set = set()

    # ── Control ────────────────────────────────────────────────────

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(
            target=self._loop, daemon=True, name="wnsp-watchdog"
        )
        self._thread.start()

    def stop(self):
        self._running = False

    # ── Main loop ──────────────────────────────────────────────────

    def _loop(self):
        while self._running:
            try:
                self._scan()
            except Exception as e:
                print(f"[WATCHDOG] scan error: {e}")
            time.sleep(self.interval)

    def _scan(self):
        now       = time.time()
        registry  = dict(self.coordinator._registry)
        degraded  = []
        reclaimed = []

        for name, stats in registry.items():
            if name in EXEMPT_AGENTS:
                continue

            # Determine last activity: last routed or registered
            last_active = stats.last_routed_at or stats.registered_at
            idle = now - last_active

            if idle > self.reclaim_after:
                # Reclaim
                ch = stats.channel
                self.coordinator.unregister_agent(name)
                record = {
                    "agent":     name,
                    "channel":   ch.notation(),
                    "idle_s":    round(idle, 1),
                    "action":    "RECLAIMED",
                    "timestamp": now,
                }
                self._reclaim_log.append(record)
                self._degraded.discard(name)
                reclaimed.append(name)
                try:
                    _db.delete_agent(name)
                    _db.log_kernel_event(
                        "AGENT_RECLAIMED",
                        agent_id=name,
                        detail={"channel": ch.notation(), "idle_s": round(idle, 1)},
                    )
                except Exception:
                    pass

            elif idle > self.ttl:
                self._degraded.add(name)
                degraded.append(name)

            else:
                self._degraded.discard(name)

        if reclaimed:
            print(f"[WATCHDOG] Reclaimed {len(reclaimed)} agent(s): {reclaimed}")

    # ── Status ─────────────────────────────────────────────────────

    def status(self) -> dict:
        now = time.time()
        agent_health = {}
        for name, stats in self.coordinator._registry.items():
            last_active = stats.last_routed_at or stats.registered_at
            idle = now - last_active
            if name in EXEMPT_AGENTS:
                health = "EXEMPT"
            elif idle > self.reclaim_after:
                health = "PENDING_RECLAIM"
            elif idle > self.ttl:
                health = "DEGRADED"
            else:
                health = "HEALTHY"
            agent_health[name] = {
                "health":     health,
                "idle_s":     round(idle, 1),
                "channel":    stats.channel.notation(),
                "is_exempt":  name in EXEMPT_AGENTS,
            }

        return {
            "running":        self._running,
            "ttl_s":          self.ttl,
            "reclaim_after_s": self.reclaim_after,
            "interval_s":     self.interval,
            "degraded":       list(self._degraded),
            "total_reclaimed": len(self._reclaim_log),
            "agent_health":   agent_health,
            "reclaim_log":    self._reclaim_log[-20:],
        }

    def force_scan(self) -> dict:
        """Trigger an immediate scan outside the normal interval."""
        self._scan()
        return self.status()
