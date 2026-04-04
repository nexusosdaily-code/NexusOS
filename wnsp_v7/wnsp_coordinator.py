"""
WNSP Coordinator
================

Application-layer runtime that maps AI agents and OS processes onto the
25,600-dimensional Hilbert space defined by WNSP-SE v1.0.

Architecture
------------
WNSPCoordinator
 ├── Agent Registry    — name → PsiChannel mapping
 ├── Channel Allocator — deterministic, collision-free SHA256 allocation
 ├── Router            — instruction → CE → SE → Ψ_channel dispatch
 ├── Scheduler         — priority queue for ordered instruction dispatch
 └── Runtime Monitor   — per-agent stats, throughput, uptime

Channel Notation
----------------
  Ψ(wdm, oam, H/V)

  where:
    wdm ∈ [0, 255]  — WDM wavelength index
    oam ∈ [0, 49]   — OAM mode index
    H/V             — H or V polarisation

  Example: Ψ(12, 4, H)

Author: Te Rata Pou
License: AGPL-3.0
"""

import hashlib
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
import heapq

TOTAL_WDM = 256
TOTAL_OAM = 50
TOTAL_POL = 2
TOTAL_CHANNELS = TOTAL_WDM * TOTAL_OAM * TOTAL_POL  # 25,600

VISIBLE_MIN_NM = 380
VISIBLE_MAX_NM = 780
SPEED_OF_LIGHT = 299_792_458
PLANCK_CONSTANT = 6.62607015e-34


# ─────────────────────────────────────────────────────────────────
# PsiChannel — the address of one agent in Hilbert space
# ─────────────────────────────────────────────────────────────────

@dataclass
class PsiChannel:
    """
    An orthogonal basis vector in the WNSP-SE Hilbert space.

    Ψ(wdm, oam, pol) = |λ_wdm⟩ ⊗ |OAM_oam⟩ ⊗ |Pol_pol⟩
    """
    wavelength: int   # WDM index [0, 255]
    oam:        int   # OAM mode  [0, 49]
    pol:        int   # 0 = H, 1 = V

    @property
    def polarisation(self) -> str:
        return "H" if self.pol == 0 else "V"

    @property
    def wavelength_nm(self) -> float:
        """Map WDM index to physical wavelength in nm."""
        return VISIBLE_MIN_NM + (self.wavelength / max(TOTAL_WDM - 1, 1)) * (VISIBLE_MAX_NM - VISIBLE_MIN_NM)

    @property
    def frequency_hz(self) -> float:
        return SPEED_OF_LIGHT / (self.wavelength_nm * 1e-9)

    @property
    def flat_index(self) -> int:
        """Flat Hilbert index [0, 25599]."""
        return (self.wavelength * TOTAL_OAM + self.oam) * TOTAL_POL + self.pol

    def notation(self) -> str:
        """Canonical short-form: Ψ(wdm, oam, H/V)"""
        return f"Ψ({self.wavelength}, {self.oam}, {self.polarisation})"

    def basis(self) -> str:
        """Full Dirac notation."""
        return f"|λ_{self.wavelength}⟩ ⊗ |OAM_{self.oam}⟩ ⊗ |Pol_{self.polarisation}⟩"

    def to_dict(self) -> dict:
        return {
            "notation":      self.notation(),
            "basis":         self.basis(),
            "wdm":           self.wavelength,
            "oam":           self.oam,
            "pol":           self.pol,
            "polarisation":  self.polarisation,
            "flat_index":    self.flat_index,
            "wavelength_nm": round(self.wavelength_nm, 2),
            "frequency_hz":  round(self.frequency_hz, 2),
        }

    def __repr__(self) -> str:
        return self.notation()


# ─────────────────────────────────────────────────────────────────
# Scheduled item (for Scheduler)
# ─────────────────────────────────────────────────────────────────

@dataclass(order=True)
class ScheduledItem:
    priority:   int
    timestamp:  float
    agent:      str   = field(compare=False)
    payload:    Any   = field(compare=False)
    intent:     str   = field(compare=False, default="")


# ─────────────────────────────────────────────────────────────────
# Runtime Monitor — per-agent telemetry
# ─────────────────────────────────────────────────────────────────

@dataclass
class AgentStats:
    agent:           str
    channel:         PsiChannel
    intent:          str
    registered_at:   float
    routed_count:    int = 0
    last_routed_at:  Optional[float] = None
    scheduled_count: int = 0

    def to_dict(self) -> dict:
        return {
            "agent":           self.agent,
            "channel":         self.channel.to_dict(),
            "intent":          self.intent,
            "registered_at":   self.registered_at,
            "routed_count":    self.routed_count,
            "scheduled_count": self.scheduled_count,
            "last_routed_at":  self.last_routed_at,
            "uptime_s":        round(time.time() - self.registered_at, 2),
        }


# ─────────────────────────────────────────────────────────────────
# WNSPCoordinator — the main runtime
# ─────────────────────────────────────────────────────────────────

class WNSPCoordinator:
    """
    Application-layer coordinator for the WNSP Hilbert channel space.

    Usage:
        coordinator = WNSPCoordinator()

        ai1 = coordinator.register_agent("vision_ai")
        ai2 = coordinator.register_agent("planner_ai")
        ai3 = coordinator.register_agent("os_kernel")

        print(ai1)   # Ψ(12, 4, H)
        print(ai2)   # Ψ(87, 21, V)
        print(ai3)   # Ψ(201, 2, H)

        msg = coordinator.route("vision_ai", "detect objects")
    """

    def __init__(self):
        # Agent Registry
        self._registry:  Dict[str, AgentStats] = {}
        # Channel Allocator state
        self._channels_in_use: set = set()
        # Scheduler — min-heap of (priority, timestamp, agent, payload)
        self._schedule: List[ScheduledItem] = []
        # Runtime Monitor — ordered history
        self._route_log: List[dict] = []

    # ── Channel Allocator ──────────────────────────────────────────

    def _allocate_channel(self, agent_id: str) -> PsiChannel:
        """
        Deterministic, collision-free channel allocation.

        Uses SHA256 bytes of the agent_id:
          h[0] % WDM → wavelength index
          h[1] % OAM → OAM mode
          h[2] % POL → polarisation

        If the resulting (wdm, oam, pol) triplet is already occupied,
        increment wdm until a free slot is found.
        """
        h = hashlib.sha256(agent_id.encode()).digest()

        wdm = h[0] % TOTAL_WDM
        oam = h[1] % TOTAL_OAM
        pol = h[2] % TOTAL_POL

        triplet = (wdm, oam, pol)

        while triplet in self._channels_in_use:
            wdm = (wdm + 1) % TOTAL_WDM
            triplet = (wdm, oam, pol)

        self._channels_in_use.add(triplet)
        return PsiChannel(wdm, oam, pol)

    # ── Agent Registry ─────────────────────────────────────────────

    def register_agent(self, name: str, intent: str = "general") -> PsiChannel:
        """
        Register an AI agent and allocate its Ψ_channel.

        Returns the existing channel if the agent is already registered.
        """
        if name in self._registry:
            return self._registry[name].channel

        channel = self._allocate_channel(name)
        self._registry[name] = AgentStats(
            agent=name,
            channel=channel,
            intent=intent,
            registered_at=time.time(),
        )
        return channel

    def unregister_agent(self, name: str) -> bool:
        """Release an agent's channel back to the pool."""
        if name not in self._registry:
            return False
        ch = self._registry[name].channel
        self._channels_in_use.discard((ch.wavelength, ch.oam, ch.pol))
        del self._registry[name]
        return True

    def get_channel(self, name: str) -> Optional[PsiChannel]:
        """Return an agent's allocated channel, or None if not registered."""
        if name in self._registry:
            return self._registry[name].channel
        return None

    # ── Router ─────────────────────────────────────────────────────

    def route(self, agent: str, payload: Any) -> dict:
        """
        Route a payload through an agent's Ψ_channel.

        Binds the payload to the agent's physical address in Hilbert space.
        Records the dispatch in the runtime monitor.
        """
        if agent not in self._registry:
            raise ValueError(f"Agent '{agent}' not registered. Call register_agent() first.")

        stats   = self._registry[agent]
        channel = stats.channel
        ts      = time.time()

        stats.routed_count  += 1
        stats.last_routed_at = ts

        record = {
            "agent":     agent,
            "channel":   channel.to_dict(),
            "timestamp": ts,
            "payload":   payload,
            "display":   f"{agent} → {channel.notation()}",
        }
        self._route_log.append(record)

        return record

    # ── Scheduler ──────────────────────────────────────────────────

    def schedule(self, agent: str, payload: Any,
                 priority: int = 5, intent: str = "") -> int:
        """
        Add an instruction to the priority queue.

        Lower priority number = dispatched first.
        Returns the current queue length.
        """
        if agent not in self._registry:
            self.register_agent(agent, intent or "scheduled")

        item = ScheduledItem(
            priority=priority,
            timestamp=time.time(),
            agent=agent,
            payload=payload,
            intent=intent,
        )
        heapq.heappush(self._schedule, item)
        self._registry[agent].scheduled_count += 1
        return len(self._schedule)

    def dispatch_next(self) -> Optional[dict]:
        """
        Pop and route the highest-priority scheduled item.

        Returns the routed record, or None if the queue is empty.
        """
        if not self._schedule:
            return None
        item = heapq.heappop(self._schedule)
        return self.route(item.agent, item.payload)

    def dispatch_all(self) -> List[dict]:
        """Drain the entire schedule and return all routed records."""
        results = []
        while self._schedule:
            results.append(self.dispatch_next())
        return results

    def queue_depth(self) -> int:
        return len(self._schedule)

    # ── Runtime Monitor ────────────────────────────────────────────

    def status(self) -> dict:
        """Runtime snapshot of the coordinator."""
        return {
            "agents":           len(self._registry),
            "channels_used":    len(self._channels_in_use),
            "capacity":         TOTAL_CHANNELS,
            "utilisation_pct":  round(len(self._channels_in_use) / TOTAL_CHANNELS * 100, 6),
            "queue_depth":      self.queue_depth(),
            "total_routed":     sum(s.routed_count for s in self._registry.values()),
            "orthogonality":    "⟨Ψ_i | Ψ_j⟩ = 0  for i ≠ j",
            "hilbert_dim":      f"{TOTAL_WDM} × {TOTAL_OAM} × {TOTAL_POL} = {TOTAL_CHANNELS}",
        }

    def agent_stats(self, name: str) -> Optional[dict]:
        """Return full stats for one agent."""
        if name not in self._registry:
            return None
        return self._registry[name].to_dict()

    def all_agent_stats(self) -> Dict[str, dict]:
        """Return stats for every registered agent."""
        return {name: s.to_dict() for name, s in self._registry.items()}

    def route_log(self, last_n: int = 50) -> List[dict]:
        """Return the most recent N routed records."""
        return self._route_log[-last_n:]

    def clear_log(self):
        self._route_log.clear()

    # ── Display ────────────────────────────────────────────────────

    def print_registry(self):
        """Pretty-print the agent → channel table."""
        if not self._registry:
            print("No agents registered.")
            return
        w = max(len(n) for n in self._registry) + 2
        for name, stats in self._registry.items():
            print(f"  {name:<{w}} → {stats.channel.notation()}")

    def __repr__(self) -> str:
        return (
            f"WNSPCoordinator("
            f"agents={len(self._registry)}, "
            f"channels={len(self._channels_in_use)}/{TOTAL_CHANNELS})"
        )
