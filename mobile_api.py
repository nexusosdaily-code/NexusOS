"""
NexusOS Mobile API

REST API for iOS/Android mobile access via PWA or native apps.
Provides endpoints for wallet, BHLS, mesh networking, and health programs.

Designed for:
- PWA on iOS Safari
- Native app integration
- Offline-first with sync support

GPL v3.0 License — Community Owned, Physics Governed
"""

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import hashlib
import time
import os

app = FastAPI(
    title="NexusOS Mobile API",
    description="Mobile access to NexusOS - BHLS, Wallet, Mesh, Health Programs",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

BHLS_MONTHLY_FLOOR = 1150
PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458


class WalletCreate(BaseModel):
    device_id: str
    community_id: Optional[str] = None


class WalletResponse(BaseModel):
    wallet_id: str
    balance_nxt: float
    bhls_eligible: bool
    bhls_amount: float
    last_distribution: Optional[str] = None


class BHLSStatus(BaseModel):
    member_id: str
    eligible: bool
    monthly_amount: float
    last_distribution: Optional[str] = None
    next_distribution: str
    distributions_received: int
    total_received: float


class MeshMessage(BaseModel):
    destination: str
    payload: str
    priority: int = 4
    payload_type: str = "text"


class MeshMessageResponse(BaseModel):
    message_id: str
    status: str
    delivered: bool
    queued: bool
    lambda_mass: float


class DeviceRegister(BaseModel):
    device_id: str
    community_id: str
    latitude: float
    longitude: float


class SyncRequest(BaseModel):
    device_id: str
    last_sync: Optional[str] = None


class HealthProgramEnroll(BaseModel):
    member_id: str
    community_id: str
    program_type: str
    name: str
    age: int


_wallets: Dict[str, Dict] = {}
_members: Dict[str, Dict] = {}
_mesh_nodes: Dict[str, Dict] = {}
_message_queue: Dict[str, List[Dict]] = {}
_bhls_history: Dict[str, List[Dict]] = {}


def generate_wallet_id(device_id: str) -> str:
    """Generate NexusOS wallet address."""
    hash_input = f"{device_id}:{time.time()}".encode()
    return "NXS" + hashlib.sha256(hash_input).hexdigest()[:37].upper()


def calculate_lambda_mass(amount_nxt: float) -> float:
    """Calculate Lambda mass for transaction."""
    frequency = 5e14
    energy = PLANCK_CONSTANT * frequency * amount_nxt
    return energy / (SPEED_OF_LIGHT ** 2)


@app.get("/")
async def root():
    """Serve PWA or API info."""
    return FileResponse("static/pwa.html")


@app.get("/pwa")
async def pwa_app():
    """Serve PWA application."""
    return FileResponse("static/pwa.html")


@app.get("/api")
async def api_info():
    """API health check."""
    return {
        "api": "NexusOS Mobile API",
        "version": "2.0.0",
        "status": "online",
        "bhls_floor": BHLS_MONTHLY_FLOOR,
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "wallet": "/api/wallet/*",
            "bhls": "/api/bhls/*",
            "mesh": "/api/mesh/*",
            "health": "/api/health/*",
            "dex": "/api/dex/*",
            "governance": "/api/governance/*",
            "curriculum": "/api/curriculum/*",
            "sectors": "/api/sectors/*",
            "physics": "/api/physics/*",
            "system": "/api/system/*"
        }
    }


@app.get("/api/status")
async def api_status():
    """Get API and network status."""
    return {
        "status": "online",
        "wallets_registered": len(_wallets),
        "members_enrolled": len(_members),
        "mesh_nodes": len(_mesh_nodes),
        "pending_messages": sum(len(q) for q in _message_queue.values()),
        "bhls_floor_nxt": BHLS_MONTHLY_FLOOR,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/wallet/create", response_model=WalletResponse)
async def create_wallet(request: WalletCreate):
    """Create a new NexusOS wallet."""
    wallet_id = generate_wallet_id(request.device_id)
    
    _wallets[wallet_id] = {
        "wallet_id": wallet_id,
        "device_id": request.device_id,
        "community_id": request.community_id,
        "balance_nxt": 0.0,
        "bhls_eligible": True,
        "bhls_amount": BHLS_MONTHLY_FLOOR,
        "created_at": datetime.now().isoformat(),
        "last_distribution": None
    }
    
    return WalletResponse(
        wallet_id=wallet_id,
        balance_nxt=0.0,
        bhls_eligible=True,
        bhls_amount=BHLS_MONTHLY_FLOOR,
        last_distribution=None
    )


@app.get("/api/wallet/{wallet_id}")
async def get_wallet(wallet_id: str):
    """Get wallet details."""
    if wallet_id not in _wallets:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    return _wallets[wallet_id]


@app.get("/api/wallet/{wallet_id}/balance")
async def get_balance(wallet_id: str):
    """Get wallet balance."""
    if wallet_id not in _wallets:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    wallet = _wallets[wallet_id]
    return {
        "wallet_id": wallet_id,
        "balance_nxt": wallet["balance_nxt"],
        "lambda_mass": calculate_lambda_mass(wallet["balance_nxt"])
    }


@app.post("/api/wallet/{wallet_id}/transfer")
async def transfer(wallet_id: str, to_wallet: str, amount: float):
    """Transfer NXT between wallets."""
    if wallet_id not in _wallets:
        raise HTTPException(status_code=404, detail="Source wallet not found")
    
    if to_wallet not in _wallets:
        raise HTTPException(status_code=404, detail="Destination wallet not found")
    
    source = _wallets[wallet_id]
    if source["balance_nxt"] < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    source["balance_nxt"] -= amount
    _wallets[to_wallet]["balance_nxt"] += amount
    
    return {
        "success": True,
        "from": wallet_id,
        "to": to_wallet,
        "amount": amount,
        "lambda_mass": calculate_lambda_mass(amount),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/bhls/status/{member_id}", response_model=BHLSStatus)
async def bhls_status(member_id: str):
    """Get BHLS distribution status for a member."""
    if member_id not in _members:
        return BHLSStatus(
            member_id=member_id,
            eligible=True,
            monthly_amount=BHLS_MONTHLY_FLOOR,
            last_distribution=None,
            next_distribution=datetime.now().strftime("%Y-%m-01"),
            distributions_received=0,
            total_received=0.0
        )
    
    member = _members[member_id]
    history = _bhls_history.get(member_id, [])
    
    return BHLSStatus(
        member_id=member_id,
        eligible=member.get("bhls_eligible", True),
        monthly_amount=member.get("bhls_amount", BHLS_MONTHLY_FLOOR),
        last_distribution=history[-1]["date"] if history else None,
        next_distribution=datetime.now().strftime("%Y-%m-01"),
        distributions_received=len(history),
        total_received=sum(h["amount"] for h in history)
    )


@app.post("/api/bhls/enroll")
async def bhls_enroll(member_id: str, name: str, age: int, community_id: str):
    """Enroll member for BHLS distribution."""
    bhls_amount = BHLS_MONTHLY_FLOOR
    if age < 18:
        bhls_amount *= 1.25  # Child supplement
    elif age >= 65:
        bhls_amount *= 1.15  # Elder supplement
    
    _members[member_id] = {
        "member_id": member_id,
        "name": name,
        "age": age,
        "community_id": community_id,
        "bhls_eligible": True,
        "bhls_amount": bhls_amount,
        "enrolled_at": datetime.now().isoformat()
    }
    
    _bhls_history[member_id] = []
    
    return {
        "success": True,
        "member_id": member_id,
        "bhls_amount": bhls_amount,
        "supplement": "child" if age < 18 else "elder" if age >= 65 else "none"
    }


@app.post("/api/bhls/distribute/{member_id}")
async def bhls_distribute(member_id: str):
    """Distribute monthly BHLS to member."""
    if member_id not in _members:
        raise HTTPException(status_code=404, detail="Member not enrolled")
    
    member = _members[member_id]
    amount = member["bhls_amount"]
    
    distribution = {
        "date": datetime.now().isoformat(),
        "amount": amount,
        "lambda_mass": calculate_lambda_mass(amount)
    }
    
    if member_id not in _bhls_history:
        _bhls_history[member_id] = []
    _bhls_history[member_id].append(distribution)
    
    return {
        "success": True,
        "member_id": member_id,
        "amount_distributed": amount,
        "lambda_mass": distribution["lambda_mass"],
        "total_distributions": len(_bhls_history[member_id])
    }


@app.post("/api/mesh/register", response_model=Dict)
async def mesh_register(request: DeviceRegister):
    """Register device on mesh network."""
    _mesh_nodes[request.device_id] = {
        "device_id": request.device_id,
        "community_id": request.community_id,
        "location": {
            "lat": request.latitude,
            "lon": request.longitude
        },
        "online": True,
        "last_seen": datetime.now().isoformat(),
        "queued_messages": 0
    }
    
    _message_queue[request.device_id] = []
    
    return {
        "success": True,
        "device_id": request.device_id,
        "registered": True,
        "community_id": request.community_id
    }


@app.post("/api/mesh/send", response_model=MeshMessageResponse)
async def mesh_send(source_device: str, message: MeshMessage):
    """Send message through mesh network."""
    message_id = hashlib.sha256(
        f"{source_device}:{message.destination}:{time.time()}".encode()
    ).hexdigest()[:16]
    
    lambda_mass = calculate_lambda_mass(len(message.payload))
    
    dest_online = message.destination in _mesh_nodes and _mesh_nodes[message.destination].get("online", False)
    
    msg_data = {
        "message_id": message_id,
        "source": source_device,
        "destination": message.destination,
        "payload": message.payload,
        "payload_type": message.payload_type,
        "priority": message.priority,
        "lambda_mass": lambda_mass,
        "created_at": datetime.now().isoformat(),
        "delivered": dest_online
    }
    
    if not dest_online:
        if message.destination not in _message_queue:
            _message_queue[message.destination] = []
        _message_queue[message.destination].append(msg_data)
    
    return MeshMessageResponse(
        message_id=message_id,
        status="delivered" if dest_online else "queued",
        delivered=dest_online,
        queued=not dest_online,
        lambda_mass=lambda_mass
    )


@app.get("/api/mesh/messages/{device_id}")
async def mesh_get_messages(device_id: str):
    """Get pending messages for device."""
    messages = _message_queue.get(device_id, [])
    
    return {
        "device_id": device_id,
        "message_count": len(messages),
        "messages": messages
    }


@app.post("/api/mesh/sync")
async def mesh_sync(request: SyncRequest):
    """Sync device - get pending messages and update status."""
    device_id = request.device_id
    
    if device_id in _mesh_nodes:
        _mesh_nodes[device_id]["online"] = True
        _mesh_nodes[device_id]["last_seen"] = datetime.now().isoformat()
    
    messages = _message_queue.get(device_id, [])
    
    _message_queue[device_id] = []
    
    return {
        "success": True,
        "device_id": device_id,
        "messages_received": len(messages),
        "messages": messages,
        "synced_at": datetime.now().isoformat()
    }


@app.post("/api/mesh/offline/{device_id}")
async def mesh_offline(device_id: str):
    """Mark device as offline."""
    if device_id in _mesh_nodes:
        _mesh_nodes[device_id]["online"] = False
    
    return {"success": True, "device_id": device_id, "status": "offline"}


@app.get("/api/mesh/status/{device_id}")
async def mesh_status(device_id: str):
    """Get mesh node status."""
    if device_id not in _mesh_nodes:
        raise HTTPException(status_code=404, detail="Device not registered")
    
    node = _mesh_nodes[device_id]
    pending = len(_message_queue.get(device_id, []))
    
    return {
        **node,
        "pending_messages": pending
    }


@app.post("/api/health/enroll")
async def health_enroll(request: HealthProgramEnroll):
    """Enroll in health program."""
    enrollment_id = hashlib.sha256(
        f"{request.member_id}:{request.program_type}:{time.time()}".encode()
    ).hexdigest()[:12]
    
    return {
        "success": True,
        "enrollment_id": enrollment_id,
        "member_id": request.member_id,
        "program_type": request.program_type,
        "enrolled_at": datetime.now().isoformat()
    }


@app.get("/api/health/programs")
async def health_programs():
    """Get available health programs."""
    return {
        "programs": [
            {"id": "nutrition", "name": "Nutrition Program", "description": "Food security and nutrition support"},
            {"id": "child_nutrition", "name": "Child Nutrition", "description": "Specialized child nutrition"},
            {"id": "fitness", "name": "Fitness & Wellness", "description": "Community fitness programs"},
            {"id": "health_education", "name": "Health Education", "description": "Health education in local languages"},
            {"id": "medical_devices", "name": "Medical Devices", "description": "Glasses, hearing aids, prosthetics"},
            {"id": "vision_care", "name": "Vision Care", "description": "Eye exams and colorblind glasses"},
            {"id": "maternal_health", "name": "Maternal Health", "description": "Prenatal and postnatal care"},
            {"id": "elder_care", "name": "Elder Care", "description": "Senior health services"}
        ]
    }


@app.get("/api/community/{community_id}")
async def community_info(community_id: str):
    """Get community information."""
    members = [m for m in _members.values() if m.get("community_id") == community_id]
    nodes = [n for n in _mesh_nodes.values() if n.get("community_id") == community_id]
    
    return {
        "community_id": community_id,
        "member_count": len(members),
        "mesh_nodes": len(nodes),
        "online_nodes": sum(1 for n in nodes if n.get("online", False)),
        "total_bhls_monthly": sum(m.get("bhls_amount", BHLS_MONTHLY_FLOOR) for m in members)
    }


# ============================================
# CURRICULUM API ENDPOINTS
# ============================================

@app.get("/api/curriculum/stats")
async def curriculum_stats():
    """Get curriculum statistics."""
    try:
        from wnsp_v7.curriculum import WNSPCurriculum
        curriculum = WNSPCurriculum()
        return curriculum.get_curriculum_stats()
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/curriculum/grades")
async def curriculum_grades():
    """Get all grade levels."""
    try:
        from wnsp_v7.curriculum import WNSPCurriculum, GradeLevel
        curriculum = WNSPCurriculum()
        grades = []
        for grade in GradeLevel:
            path = curriculum.get_curriculum_path(grade)
            if path:
                grades.append(path)
        return {"grades": grades}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/curriculum/lessons/{grade}")
async def curriculum_lessons(grade: str):
    """Get lessons for a grade level."""
    try:
        from wnsp_v7.curriculum import WNSPCurriculum, GradeLevel
        curriculum = WNSPCurriculum()
        grade_level = GradeLevel(grade)
        lessons = curriculum.get_all_lessons(grade_level)
        return {"grade": grade, "lessons": lessons}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/curriculum/enroll")
async def curriculum_enroll(student_id: str, grade: str):
    """Enroll student in curriculum."""
    try:
        from wnsp_v7.curriculum import WNSPCurriculum, GradeLevel
        curriculum = WNSPCurriculum()
        grade_level = GradeLevel(grade)
        student = curriculum.enroll_student(student_id, grade_level)
        return {
            "success": True,
            "student_id": student_id,
            "grade": grade,
            "enrolled_at": student.enrolled_at.isoformat()
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/curriculum/complete-lesson")
async def complete_lesson(student_id: str, lesson_id: str):
    """Mark lesson as complete."""
    try:
        from wnsp_v7.curriculum import WNSPCurriculum
        curriculum = WNSPCurriculum()
        success = curriculum.complete_lesson(student_id, lesson_id)
        if success:
            progress = curriculum.get_student_progress(student_id)
            return {"success": True, "progress": progress}
        return {"success": False, "error": "Could not complete lesson"}
    except Exception as e:
        return {"error": str(e)}


# ============================================
# DEX API ENDPOINTS
# ============================================

_dex_pools: Dict[str, Dict] = {
    "NXT-USDC": {"token_a": "NXT", "token_b": "USDC", "reserve_a": 1000000, "reserve_b": 500000, "fee": 0.003},
    "NXT-ETH": {"token_a": "NXT", "token_b": "ETH", "reserve_a": 500000, "reserve_b": 250, "fee": 0.003}
}


@app.get("/api/dex/pools")
async def dex_pools():
    """Get all liquidity pools."""
    pools = []
    for pool_id, data in _dex_pools.items():
        price = data["reserve_b"] / data["reserve_a"] if data["reserve_a"] > 0 else 0
        pools.append({
            "pool_id": pool_id,
            **data,
            "price": price,
            "tvl_nxt": data["reserve_a"] * 2
        })
    return {"pools": pools}


@app.get("/api/dex/pool/{pool_id}")
async def dex_pool_info(pool_id: str):
    """Get pool information."""
    if pool_id not in _dex_pools:
        raise HTTPException(status_code=404, detail="Pool not found")
    
    data = _dex_pools[pool_id]
    price = data["reserve_b"] / data["reserve_a"] if data["reserve_a"] > 0 else 0
    
    return {
        "pool_id": pool_id,
        **data,
        "price": price,
        "lambda_mass": calculate_lambda_mass(data["reserve_a"])
    }


@app.post("/api/dex/quote")
async def dex_quote(pool_id: str, token_in: str, amount_in: float):
    """Get swap quote using E=hf physics."""
    if pool_id not in _dex_pools:
        raise HTTPException(status_code=404, detail="Pool not found")
    
    pool = _dex_pools[pool_id]
    fee = pool["fee"]
    
    if token_in == pool["token_a"]:
        reserve_in = pool["reserve_a"]
        reserve_out = pool["reserve_b"]
    else:
        reserve_in = pool["reserve_b"]
        reserve_out = pool["reserve_a"]
    
    amount_in_with_fee = amount_in * (1 - fee)
    amount_out = (reserve_out * amount_in_with_fee) / (reserve_in + amount_in_with_fee)
    
    frequency = 5e14
    swap_lambda = PLANCK_CONSTANT * frequency * amount_in / (SPEED_OF_LIGHT ** 2)
    
    return {
        "pool_id": pool_id,
        "token_in": token_in,
        "amount_in": amount_in,
        "amount_out": amount_out,
        "fee": amount_in * fee,
        "price_impact": (amount_in / reserve_in) * 100,
        "lambda_mass": swap_lambda
    }


@app.post("/api/dex/swap")
async def dex_swap(pool_id: str, wallet_id: str, token_in: str, amount_in: float):
    """Execute swap using E=hf physics."""
    if pool_id not in _dex_pools:
        raise HTTPException(status_code=404, detail="Pool not found")
    
    if wallet_id not in _wallets:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    pool = _dex_pools[pool_id]
    fee = pool["fee"]
    
    if token_in == pool["token_a"]:
        reserve_in = pool["reserve_a"]
        reserve_out = pool["reserve_b"]
    else:
        reserve_in = pool["reserve_b"]
        reserve_out = pool["reserve_a"]
    
    amount_in_with_fee = amount_in * (1 - fee)
    amount_out = (reserve_out * amount_in_with_fee) / (reserve_in + amount_in_with_fee)
    
    if token_in == pool["token_a"]:
        pool["reserve_a"] += amount_in
        pool["reserve_b"] -= amount_out
    else:
        pool["reserve_b"] += amount_in
        pool["reserve_a"] -= amount_out
    
    return {
        "success": True,
        "pool_id": pool_id,
        "token_in": token_in,
        "amount_in": amount_in,
        "token_out": pool["token_b"] if token_in == pool["token_a"] else pool["token_a"],
        "amount_out": amount_out,
        "lambda_mass": calculate_lambda_mass(amount_in),
        "timestamp": datetime.now().isoformat()
    }


# ============================================
# GOVERNANCE API ENDPOINTS
# ============================================

_proposals: Dict[str, Dict] = {}
_votes: Dict[str, List[Dict]] = {}


@app.get("/api/governance/constitution")
async def governance_constitution():
    """Get constitutional clauses."""
    return {
        "constitution": {
            "C-0001": {
                "name": "Non-Dominance",
                "text": "No single entity may accumulate more than 5% of total network authority without PLANCK-level consensus.",
                "authority_level": "PLANCK",
                "protected": True
            },
            "C-0002": {
                "name": "Immutable Rights",
                "text": "Fundamental human rights are protected at YOCTO authority level and cannot be revoked by any governance decision below PLANCK.",
                "authority_level": "YOCTO",
                "protected": True
            },
            "C-0003": {
                "name": "Energy-Backed Validity",
                "text": "All system actions must be backed by proportional energy escrow. The laws of physics are the ultimate arbiter.",
                "authority_level": "ALL",
                "protected": True
            }
        },
        "bhls_floor": BHLS_MONTHLY_FLOOR,
        "spectral_bands": ["NANO", "PICO", "FEMTO", "ATTO", "ZEPTO", "YOCTO", "PLANCK"]
    }


@app.get("/api/governance/council")
async def governance_council():
    """Get Developer Council information."""
    return {
        "council": {
            "name": "NexusOS Developer Council",
            "version": "1.0.0",
            "phase": "Genesis",
            "seats": [
                {"role": "Protocol Architect", "authority": "PLANCK", "status": "active"},
                {"role": "Physics Validator", "authority": "YOCTO", "status": "active"},
                {"role": "Constitutional Guardian", "authority": "YOCTO", "status": "active"},
                {"role": "Community Representative", "authority": "ATTO", "status": "open"},
                {"role": "Security Auditor", "authority": "ZEPTO", "status": "active"}
            ]
        },
        "fork_requirements": {
            "preserve_lambda": "Λ = hf/c² must remain unchanged",
            "constitutional_clauses": "All 3 clauses (C-0001, C-0002, C-0003) required",
            "bhls_floor": "Cannot be reduced below 1,150 NXT/month",
            "spectral_bands": "7-band system (NANO → PLANCK) required",
            "license": "GPL v3.0 required"
        },
        "upgrade_authority": {
            "minor": {"level": "ATTO", "examples": ["Bug fixes", "Optimizations"]},
            "standard": {"level": "ZEPTO", "examples": ["New features", "API changes"]},
            "major": {"level": "YOCTO", "examples": ["Spectral changes", "New clauses"]},
            "constitutional": {"level": "PLANCK", "examples": ["Clause mods", "BHLS changes"]}
        },
        "covenant": "By forking NexusOS, developers agree to preserve Lambda physics, enforce constitutional clauses, protect BHLS floor, and maintain GPL v3.0 licensing."
    }


@app.get("/api/governance/proposals")
async def governance_proposals():
    """Get all governance proposals."""
    return {"proposals": list(_proposals.values())}


@app.post("/api/governance/propose")
async def governance_propose(
    proposer_id: str,
    title: str,
    description: str,
    authority_level: str = "ZEPTO"
):
    """Create governance proposal."""
    proposal_id = hashlib.sha256(f"{proposer_id}:{title}:{time.time()}".encode()).hexdigest()[:12]
    
    escrow_required = {
        "NANO": 0.01, "PICO": 0.1, "FEMTO": 1, "ATTO": 10,
        "ZEPTO": 100, "YOCTO": 1000, "PLANCK": 10000
    }.get(authority_level, 100)
    
    _proposals[proposal_id] = {
        "proposal_id": proposal_id,
        "proposer_id": proposer_id,
        "title": title,
        "description": description,
        "authority_level": authority_level,
        "escrow_required": escrow_required,
        "status": "active",
        "votes_for": 0,
        "votes_against": 0,
        "created_at": datetime.now().isoformat(),
        "lambda_mass": calculate_lambda_mass(escrow_required)
    }
    
    _votes[proposal_id] = []
    
    return _proposals[proposal_id]


@app.post("/api/governance/vote")
async def governance_vote(proposal_id: str, voter_id: str, vote: bool, stake: float = 1.0):
    """Vote on proposal."""
    if proposal_id not in _proposals:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = _proposals[proposal_id]
    
    vote_record = {
        "voter_id": voter_id,
        "vote": vote,
        "stake": stake,
        "lambda_mass": calculate_lambda_mass(stake),
        "timestamp": datetime.now().isoformat()
    }
    
    _votes[proposal_id].append(vote_record)
    
    if vote:
        proposal["votes_for"] += stake
    else:
        proposal["votes_against"] += stake
    
    return {
        "success": True,
        "proposal_id": proposal_id,
        "vote": "for" if vote else "against",
        "stake": stake,
        "total_for": proposal["votes_for"],
        "total_against": proposal["votes_against"]
    }


@app.get("/api/governance/framework")
async def governance_framework():
    """Get complete governance framework."""
    return {
        "version": "1.0.0",
        "effective_date": "2025-12-03",
        "status": "MAINNET_CANONICAL",
        "documents": {
            "governance": "/api/governance/framework",
            "developer_council": "/api/governance/council",
            "fork_covenant": "/api/governance/fork-covenant",
            "versioning": "/api/governance/versioning",
            "upgrade_protocol": "/api/governance/upgrade-protocol",
            "constitution": "/api/governance/constitution"
        },
        "physics_foundation": {
            "equation": "Λ = hf/c²",
            "description": "Lambda Boson - mass-equivalent of oscillation",
            "immutable": True,
            "note": "Lambda is an engineered informational mode of EM field, NOT Zero-Point Energy"
        },
        "constitutional_clauses": [
            {"id": "C-0001", "name": "Non-Dominance", "protection": "No entity >5% authority without PLANCK consensus"},
            {"id": "C-0002", "name": "Immutable Rights", "protection": "Basic rights protected at YOCTO level"},
            {"id": "C-0003", "name": "Energy-Backed Validity", "protection": "All actions require proportional energy escrow"}
        ],
        "bhls_floor": {
            "monthly_nxt": BHLS_MONTHLY_FLOOR,
            "immutable_minimum": True,
            "direction_constraint": "upward_only"
        },
        "mainline": {
            "version": "WNSP v7.x",
            "repository": "github.com/nexusosdaily-code/WNSP-P2P-Hub",
            "branch": "main",
            "status": "MAINNET_READY"
        }
    }


@app.get("/api/governance/fork-covenant")
async def fork_covenant():
    """Get fork covenant and compatibility requirements."""
    return {
        "version": "1.0.0",
        "title": "NexusOS Fork Covenant",
        "binding": True,
        "compatible_fork_requirements": [
            {"requirement": "Preserve Lambda Boson physics (Λ = hf/c²)", "mandatory": True},
            {"requirement": "Implement all three constitutional clauses", "mandatory": True},
            {"requirement": "Maintain BHLS floor at or above 1,150 NXT/month", "mandatory": True},
            {"requirement": "Use 7-band spectral authority (NANO → PLANCK)", "mandatory": True},
            {"requirement": "Include GPL v3.0 license", "mandatory": True},
            {"requirement": "Credit original NexusOS project", "mandatory": True},
            {"requirement": "Pass constitutional enforcer tests", "mandatory": True}
        ],
        "fork_naming": {
            "compatible": "May use 'NexusOS-[Name]' or 'NexusOS [Modifier]'",
            "experimental": "Must use 'NexusOS-Experimental-[Name]'",
            "incompatible": "MUST NOT use 'NexusOS' name"
        },
        "derivative_types": [
            {"type": "Geographic", "naming": "NexusOS-[Region]", "example": "NexusOS-Mars"},
            {"type": "Sector", "naming": "NexusOS-[Sector]", "example": "NexusOS-Healthcare"},
            {"type": "Academic", "naming": "NexusOS-Academic", "example": "NexusOS-Academic"},
            {"type": "Community", "naming": "NexusOS-Community-[Name]", "example": "NexusOS-Community-DAO"},
            {"type": "Experimental", "naming": "NexusOS-Experimental-[Name]", "example": "NexusOS-Experimental-v8"}
        ],
        "derivative_requirements": [
            {"requirement": "Track mainline releases (within 2 minor versions)", "mandatory": True},
            {"requirement": "Contribute significant improvements upstream", "mandatory": True},
            {"requirement": "Participate in governance discussions", "mandatory": True},
            {"requirement": "Report security vulnerabilities to mainline first", "mandatory": True},
            {"requirement": "Pass compliance tests regularly", "mandatory": True}
        ],
        "bhls_authority": "PLANCK consensus required for all BHLS changes (increases only)",
        "violations": {
            "first": "Warning + 30-day remedy period",
            "second": "Compatibility revoked",
            "continued": "Community action"
        }
    }


@app.get("/api/governance/versioning")
async def versioning_policy():
    """Get version policy and mainline definition."""
    return {
        "version": "1.0.0",
        "mainline": {
            "name": "WNSP v7.x",
            "repository": "github.com/nexusosdaily-code/WNSP-P2P-Hub",
            "branch": "main",
            "status": "MAINNET_READY",
            "features": [
                "7-band spectral authority (NANO → PLANCK)",
                "Lambda Boson substrate (Λ = hf/c²)",
                "Constitutional enforcement",
                "BHLS floor @ 1,150 NXT/month",
                "Layer 1 blockchain + Layer 2 DEX",
                "Full PWA + Mobile API",
                "GPL v3.0 license"
            ]
        },
        "versioning_scheme": {
            "format": "MAJOR.MINOR.PATCH[-MODIFIER]",
            "major": {"changes": "Spectral band or constitutional changes", "authority": "PLANCK", "category": "Constitutional", "voting_days": 90},
            "minor": {"changes": "New features, API additions", "authority": "ZEPTO", "category": "Standard", "voting_days": 14},
            "patch": {"changes": "Bug fixes, optimizations", "authority": "ATTO", "category": "Minor", "voting_days": 7}
        },
        "modifiers": [
            {"name": "alpha", "meaning": "Experimental, unstable"},
            {"name": "beta", "meaning": "Feature complete, testing"},
            {"name": "rc", "meaning": "Release candidate"},
            {"name": "mainnet", "meaning": "Production ready"}
        ],
        "version_history": [
            {"version": "v7.x", "date": "2025", "status": "MAINLINE", "notes": "Lambda Boson substrate"},
            {"version": "v6.x", "date": "2025", "status": "Archived", "notes": "Constitutional framework"},
            {"version": "v5.x", "date": "2025", "status": "Archived", "notes": "PoSPECTRUM consensus"}
        ],
        "lts_policy": {
            "current_lts": "v7.x",
            "support_until": "Until v9.0 + 12 months",
            "legacy_v6": "December 2025"
        }
    }


@app.get("/api/governance/upgrade-protocol")
async def upgrade_protocol():
    """Get protocol upgrade rules."""
    return {
        "version": "1.0.0",
        "upgrade_categories": [
            {"category": "Micro", "authority": "ATTO", "voting_period_days": 3, "examples": ["Typos", "Documentation"]},
            {"category": "Minor", "authority": "ATTO", "voting_period_days": 7, "examples": ["Bug fixes", "Optimizations"]},
            {"category": "Standard", "authority": "ZEPTO", "voting_period_days": 14, "examples": ["New features", "API changes"]},
            {"category": "Major", "authority": "YOCTO", "voting_period_days": 30, "examples": ["Spectral band changes"]},
            {"category": "Constitutional", "authority": "PLANCK", "voting_period_days": 90, "examples": ["Clause modifications", "BHLS changes"]}
        ],
        "lifecycle": [
            "1. PROPOSAL - Submit with energy escrow",
            "2. VALIDATION - Constitutional Enforcer checks",
            "3. DISCUSSION - Community review period",
            "4. VOTING - Spectral authority weighted",
            "5. APPROVAL - Threshold met",
            "6. IMPLEMENTATION - Developer Council oversees",
            "7. TESTING - Testnet validation",
            "8. DEPLOYMENT - Phased mainnet rollout",
            "9. MONITORING - 30-day observation"
        ],
        "energy_escrow": [
            {"category": "Micro", "amount_nxt": 10},
            {"category": "Minor", "amount_nxt": 100},
            {"category": "Standard", "amount_nxt": 1000},
            {"category": "Major", "amount_nxt": 10000},
            {"category": "Constitutional", "amount_nxt": 100000}
        ],
        "approval_thresholds": [
            {"category": "Micro", "threshold": "51%", "authority": "ATTO minimum"},
            {"category": "Minor", "threshold": "51%", "authority": "ATTO minimum"},
            {"category": "Standard", "threshold": "60%", "authority": "ZEPTO minimum"},
            {"category": "Major", "threshold": "67%", "authority": "YOCTO minimum"},
            {"category": "Constitutional", "threshold": "80%", "authority": "PLANCK minimum"}
        ],
        "emergency_upgrades": {
            "process": "72-hour expedited voting at ZEPTO level",
            "requirements": ["Security Auditor declaration", "Constitutional Guardian verification"],
            "deployment": "Immediate with rollback ready"
        },
        "automatic_rejection": [
            "Violates Lambda physics",
            "Removes constitutional clauses",
            "Lowers BHLS floor",
            "Reduces spectral bands below 7",
            "Changes GPL v3.0 license"
        ]
    }


# ============================================
# SECTOR API ENDPOINTS
# ============================================

@app.get("/api/sectors")
async def list_sectors():
    """List all industry sectors."""
    import os
    import json
    
    sectors = []
    policy_dir = "sector_policies"
    
    if os.path.exists(policy_dir):
        for filename in os.listdir(policy_dir):
            if filename.endswith('.json'):
                try:
                    with open(os.path.join(policy_dir, filename)) as f:
                        policy = json.load(f)
                        sectors.append({
                            "sector_id": policy.get("sector_id"),
                            "sector_name": policy.get("sector_name"),
                            "version": policy.get("version"),
                            "description": policy.get("description", "")[:100]
                        })
                except:
                    pass
    
    return {"sectors": sectors, "total": len(sectors)}


@app.get("/api/sectors/{sector_id}")
async def get_sector(sector_id: str):
    """Get sector policy details."""
    import json
    
    policy_path = f"sector_policies/{sector_id}.json"
    
    try:
        with open(policy_path) as f:
            policy = json.load(f)
            return policy
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Sector not found")


@app.get("/api/sectors/{sector_id}/operations")
async def get_sector_operations(sector_id: str):
    """Get available operations for sector."""
    import json
    
    policy_path = f"sector_policies/{sector_id}.json"
    
    try:
        with open(policy_path) as f:
            policy = json.load(f)
            return {
                "sector_id": sector_id,
                "operations": policy.get("operations", {}),
                "band_mappings": policy.get("band_mappings", {})
            }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Sector not found")


# ============================================
# LAMBDA PHYSICS API ENDPOINTS
# ============================================

@app.get("/api/physics/lambda")
async def physics_lambda_info():
    """Get Lambda Boson physics information."""
    return {
        "lambda_boson": {
            "equation": "Λ = hf/c²",
            "description": "Mass-equivalent of oscillation",
            "derivation": {
                "planck": "E = hf (energy from frequency)",
                "einstein": "E = mc² (mass-energy equivalence)",
                "combined": "hf = mc² → m = hf/c²"
            }
        },
        "constants": {
            "planck_constant": PLANCK_CONSTANT,
            "speed_of_light": SPEED_OF_LIGHT,
            "bhls_floor_nxt": BHLS_MONTHLY_FLOOR
        },
        "spectral_bands": {
            "NANO": {"authority": "Sensor/Micro", "min_escrow": 0.01},
            "PICO": {"authority": "Standard", "min_escrow": 0.1},
            "FEMTO": {"authority": "Contract", "min_escrow": 1},
            "ATTO": {"authority": "Consensus", "min_escrow": 10},
            "ZEPTO": {"authority": "Economic", "min_escrow": 100},
            "YOCTO": {"authority": "Governance", "min_escrow": 1000},
            "PLANCK": {"authority": "Constitutional", "min_escrow": 10000}
        }
    }


@app.post("/api/physics/calculate-lambda")
async def calculate_lambda(frequency: float = 5e14, cycles: int = 1):
    """Calculate Lambda mass for given frequency."""
    energy = PLANCK_CONSTANT * frequency * cycles
    lambda_mass = energy / (SPEED_OF_LIGHT ** 2)
    
    return {
        "frequency_hz": frequency,
        "cycles": cycles,
        "energy_joules": energy,
        "lambda_mass_kg": lambda_mass,
        "equation": f"Λ = ({PLANCK_CONSTANT:.2e} × {frequency:.2e} × {cycles}) / ({SPEED_OF_LIGHT}²)"
    }


# ============================================
# SYSTEM STATUS ENDPOINTS
# ============================================

@app.get("/api/system/readiness")
async def system_readiness():
    """Check system plugin readiness."""
    components = {}
    
    try:
        from wnsp_v7.substrate_coordinator import SubstrateCoordinator
        SubstrateCoordinator()
        components["substrate"] = True
    except:
        components["substrate"] = False
    
    try:
        from wnsp_v7.curriculum import WNSPCurriculum
        WNSPCurriculum()
        components["curriculum"] = True
    except:
        components["curriculum"] = False
    
    try:
        from ghostdag_core import GhostDAGEngine
        GhostDAGEngine()
        components["ghostdag"] = True
    except:
        components["ghostdag"] = False
    
    try:
        from governance.enforcer import ConstitutionalEnforcer
        ConstitutionalEnforcer()
        components["constitution"] = True
    except:
        components["constitution"] = False
    
    try:
        from nexus_ai_governance import NexusAIGovernance
        NexusAIGovernance()
        components["ai_governance"] = True
    except:
        components["ai_governance"] = False
    
    ready_count = sum(1 for v in components.values() if v)
    total_count = len(components)
    
    return {
        "components": components,
        "ready": ready_count,
        "total": total_count,
        "percentage": (ready_count / total_count) * 100,
        "status": "MAINNET_READY" if ready_count >= total_count - 1 else "NEEDS_WORK"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
