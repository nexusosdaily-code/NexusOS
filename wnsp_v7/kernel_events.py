"""
WNSP Kernel Event / Interrupt System
=====================================

Push-model subscription and interrupt delivery for the WNSP Kernel.

Architecture
------------
  Agent registers a subscription on a channel or event type.
  When a matching event fires, all subscribers are notified immediately.
  For HTTP clients, events accumulate in a per-client queue that can
  be drained via SSE or polling.

Interrupt Types
---------------
  MESSAGE_ARRIVED  — new message dispatched to agent's inbox
  AGENT_REGISTERED — new agent allocated a Ψ_channel
  AGENT_RELEASED   — channel returned to pool
  AGENT_DEGRADED   — watchdog marked agent unhealthy
  AGENT_RECLAIMED  — watchdog reclaimed dead agent's channel
  BOOT_COMPLETE    — kernel finished boot sequence
  CHANNEL_COLLISION — (should never happen, but auditable)

Author: Te Rata Pou
License: AGPL-3.0
"""

import time
import threading
from collections import defaultdict
from typing import Callable, Dict, List, Optional, Any


# All valid kernel interrupt types
INTERRUPT_TYPES = {
    "MESSAGE_ARRIVED",
    "AGENT_REGISTERED",
    "AGENT_RELEASED",
    "AGENT_DEGRADED",
    "AGENT_RECLAIMED",
    "BOOT_COMPLETE",
    "CHANNEL_COLLISION",
    "WATCHDOG_SCAN",
}


class KernelEvent:
    """A single interrupt / event record."""
    __slots__ = ("event_type", "agent_id", "detail", "timestamp", "seq")

    _seq_counter = 0
    _seq_lock    = threading.Lock()

    def __init__(self, event_type: str, agent_id: Optional[str] = None,
                 detail: Optional[dict] = None):
        with KernelEvent._seq_lock:
            KernelEvent._seq_counter += 1
            self.seq = KernelEvent._seq_counter

        self.event_type = event_type
        self.agent_id   = agent_id
        self.detail     = detail or {}
        self.timestamp  = time.time()

    def to_dict(self) -> dict:
        return {
            "seq":        self.seq,
            "event_type": self.event_type,
            "agent_id":   self.agent_id,
            "detail":     self.detail,
            "timestamp":  self.timestamp,
        }


class KernelEventBus:
    """
    Central interrupt / event bus for the WNSP Kernel.

    Supports:
      - Fire-and-forget emit (in-memory log)
      - Callback subscriptions (per event type or per agent)
      - HTTP client queues (for SSE / polling delivery)
    """

    def __init__(self, max_log: int = 500):
        self._log:          List[KernelEvent] = []
        self._max_log       = max_log
        self._lock          = threading.Lock()

        # event_type → list of callbacks
        self._callbacks:    Dict[str, List[Callable]] = defaultdict(list)

        # client_id → list of pending events (for SSE / polling)
        self._client_queues: Dict[str, List[dict]] = defaultdict(list)

        self._total_emitted = 0

    # ── Emit ───────────────────────────────────────────────────────

    def emit(self, event_type: str, agent_id: Optional[str] = None,
             detail: Optional[dict] = None) -> KernelEvent:
        """
        Fire a kernel interrupt.

        Adds to the log, calls all registered callbacks,
        and pushes to all registered client queues.
        """
        event = KernelEvent(event_type, agent_id, detail)

        with self._lock:
            self._log.append(event)
            if len(self._log) > self._max_log:
                self._log = self._log[-self._max_log:]
            self._total_emitted += 1

            # Push to all subscribed client queues
            ev_dict = event.to_dict()
            for q in self._client_queues.values():
                q.append(ev_dict)

        # Call registered callbacks (outside lock to avoid deadlock)
        for cb in self._callbacks.get(event_type, []):
            try:
                cb(event)
            except Exception:
                pass
        for cb in self._callbacks.get("*", []):
            try:
                cb(event)
            except Exception:
                pass

        return event

    # ── Subscribe (callbacks) ──────────────────────────────────────

    def subscribe(self, event_type: str, callback: Callable):
        """
        Register a callback for an event type.
        Use event_type="*" to receive all events.
        """
        self._callbacks[event_type].append(callback)

    def unsubscribe(self, event_type: str, callback: Callable):
        if callback in self._callbacks.get(event_type, []):
            self._callbacks[event_type].remove(callback)

    # ── HTTP client queues (SSE / polling) ─────────────────────────

    def register_client(self, client_id: str):
        """Register an HTTP client to receive push events."""
        with self._lock:
            if client_id not in self._client_queues:
                self._client_queues[client_id] = []

    def unregister_client(self, client_id: str):
        with self._lock:
            self._client_queues.pop(client_id, None)

    def drain_client(self, client_id: str) -> List[dict]:
        """Drain and return all pending events for a client."""
        with self._lock:
            events = list(self._client_queues.get(client_id, []))
            self._client_queues[client_id] = []
            return events

    # ── Log access ─────────────────────────────────────────────────

    def log(self, last_n: int = 50) -> List[dict]:
        with self._lock:
            return [e.to_dict() for e in self._log[-last_n:]]

    def log_since(self, seq: int) -> List[dict]:
        """Return all events with seq > given value."""
        with self._lock:
            return [e.to_dict() for e in self._log if e.seq > seq]

    # ── Status ─────────────────────────────────────────────────────

    def status(self) -> dict:
        with self._lock:
            return {
                "total_emitted":   self._total_emitted,
                "log_size":        len(self._log),
                "subscriptions":   {k: len(v) for k, v in self._callbacks.items()},
                "active_clients":  len(self._client_queues),
                "interrupt_types": sorted(INTERRUPT_TYPES),
            }
