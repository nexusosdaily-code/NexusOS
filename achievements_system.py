"""
NexusOS Achievements & Badges System
=====================================
Gamification layer for user engagement with physics-themed badges.

Badge Categories:
- Genesis: First-time actions (wallet, transaction, stake)
- Quantum: Advanced features (trading, LP farming, governance)
- Spectrum: Community engagement (P2P, friends, broadcasts)
- Orbital: Economic milestones (balance, earnings, burns)
- Cosmic: Rare achievements (whale protection, validator, etc.)
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import psycopg2
from psycopg2.extras import RealDictCursor

# Badge definitions with physics-themed naming
BADGE_DEFINITIONS = {
    # ===== GENESIS BADGES (First-time actions) =====
    "genesis_wallet": {
        "id": "genesis_wallet",
        "name": "Genesis Block",
        "description": "Created your first wallet",
        "icon": "🌟",
        "category": "genesis",
        "points": 10,
        "rarity": "common",
        "requirement": {"type": "wallet_created", "count": 1}
    },
    "first_transaction": {
        "id": "first_transaction",
        "name": "First Photon",
        "description": "Sent your first transaction",
        "icon": "💫",
        "category": "genesis",
        "points": 15,
        "rarity": "common",
        "requirement": {"type": "transactions_sent", "count": 1}
    },
    "first_receive": {
        "id": "first_receive",
        "name": "Energy Receiver",
        "description": "Received your first NXT",
        "icon": "📥",
        "category": "genesis",
        "points": 10,
        "rarity": "common",
        "requirement": {"type": "transactions_received", "count": 1}
    },
    "first_stake": {
        "id": "first_stake",
        "name": "Orbital Lock",
        "description": "Staked NXT for the first time",
        "icon": "🔒",
        "category": "genesis",
        "points": 20,
        "rarity": "common",
        "requirement": {"type": "stakes_created", "count": 1}
    },
    "first_message": {
        "id": "first_message",
        "name": "Wave Transmitter",
        "description": "Sent your first DAG message",
        "icon": "📡",
        "category": "genesis",
        "points": 15,
        "rarity": "common",
        "requirement": {"type": "messages_sent", "count": 1}
    },
    
    # ===== QUANTUM BADGES (Advanced features) =====
    "first_swap": {
        "id": "first_swap",
        "name": "Quantum Tunneler",
        "description": "Completed your first DEX swap",
        "icon": "🔄",
        "category": "quantum",
        "points": 25,
        "rarity": "uncommon",
        "requirement": {"type": "swaps_completed", "count": 1}
    },
    "lp_provider": {
        "id": "lp_provider",
        "name": "Liquidity Wave",
        "description": "Added liquidity to a DEX pool",
        "icon": "🌊",
        "category": "quantum",
        "points": 30,
        "rarity": "uncommon",
        "requirement": {"type": "liquidity_added", "count": 1}
    },
    "farmer": {
        "id": "farmer",
        "name": "Energy Harvester",
        "description": "Started LP farming",
        "icon": "🌾",
        "category": "quantum",
        "points": 35,
        "rarity": "uncommon",
        "requirement": {"type": "farms_started", "count": 1}
    },
    "first_vote": {
        "id": "first_vote",
        "name": "Civic Particle",
        "description": "Cast your first governance vote",
        "icon": "🗳️",
        "category": "quantum",
        "points": 25,
        "rarity": "uncommon",
        "requirement": {"type": "votes_cast", "count": 1}
    },
    "campaign_creator": {
        "id": "campaign_creator",
        "name": "Innovation Catalyst",
        "description": "Created a governance campaign",
        "icon": "💡",
        "category": "quantum",
        "points": 50,
        "rarity": "rare",
        "requirement": {"type": "campaigns_created", "count": 1}
    },
    
    # ===== SPECTRUM BADGES (Community engagement) =====
    "first_friend": {
        "id": "first_friend",
        "name": "Mesh Node",
        "description": "Added your first friend",
        "icon": "🤝",
        "category": "spectrum",
        "points": 15,
        "rarity": "common",
        "requirement": {"type": "friends_added", "count": 1}
    },
    "social_butterfly": {
        "id": "social_butterfly",
        "name": "Network Hub",
        "description": "Added 10 friends to your mesh",
        "icon": "🦋",
        "category": "spectrum",
        "points": 50,
        "rarity": "uncommon",
        "requirement": {"type": "friends_added", "count": 10}
    },
    "broadcaster": {
        "id": "broadcaster",
        "name": "Signal Tower",
        "description": "Started your first broadcast",
        "icon": "📻",
        "category": "spectrum",
        "points": 30,
        "rarity": "uncommon",
        "requirement": {"type": "broadcasts_started", "count": 1}
    },
    "media_sharer": {
        "id": "media_sharer",
        "name": "Content Propagator",
        "description": "Shared media on the mesh network",
        "icon": "🎬",
        "category": "spectrum",
        "points": 25,
        "rarity": "uncommon",
        "requirement": {"type": "media_shared", "count": 1}
    },
    "verified_user": {
        "id": "verified_user",
        "name": "Identity Confirmed",
        "description": "Verified your phone number",
        "icon": "✅",
        "category": "spectrum",
        "points": 20,
        "rarity": "common",
        "requirement": {"type": "phone_verified", "count": 1}
    },
    
    # ===== ORBITAL BADGES (Economic milestones) =====
    "micro_holder": {
        "id": "micro_holder",
        "name": "Photon Collector",
        "description": "Hold 0.1 NXT or more",
        "icon": "✨",
        "category": "orbital",
        "points": 10,
        "rarity": "common",
        "requirement": {"type": "balance_nxt", "min": 0.1}
    },
    "milli_holder": {
        "id": "milli_holder",
        "name": "Energy Accumulator",
        "description": "Hold 1 NXT or more",
        "icon": "⚡",
        "category": "orbital",
        "points": 25,
        "rarity": "uncommon",
        "requirement": {"type": "balance_nxt", "min": 1.0}
    },
    "holder": {
        "id": "holder",
        "name": "Quantum Saver",
        "description": "Hold 10 NXT or more",
        "icon": "💎",
        "category": "orbital",
        "points": 50,
        "rarity": "rare",
        "requirement": {"type": "balance_nxt", "min": 10.0}
    },
    "whale_guardian": {
        "id": "whale_guardian",
        "name": "Whale Guardian",
        "description": "Hold 100 NXT or more",
        "icon": "🐋",
        "category": "orbital",
        "points": 100,
        "rarity": "epic",
        "requirement": {"type": "balance_nxt", "min": 100.0}
    },
    "staking_master": {
        "id": "staking_master",
        "name": "Orbital Master",
        "description": "Earned 1 NXT from staking rewards",
        "icon": "🎯",
        "category": "orbital",
        "points": 75,
        "rarity": "rare",
        "requirement": {"type": "staking_rewards_earned", "min": 1.0}
    },
    "burn_participant": {
        "id": "burn_participant",
        "name": "Orbital Transition",
        "description": "Participated in a token burn/transition",
        "icon": "🔥",
        "category": "orbital",
        "points": 40,
        "rarity": "uncommon",
        "requirement": {"type": "burns_participated", "count": 1}
    },
    
    # ===== COSMIC BADGES (Rare achievements) =====
    "validator": {
        "id": "validator",
        "name": "Spectrum Validator",
        "description": "Became a network validator",
        "icon": "🛡️",
        "category": "cosmic",
        "points": 200,
        "rarity": "legendary",
        "requirement": {"type": "is_validator", "value": True}
    },
    "early_adopter": {
        "id": "early_adopter",
        "name": "Genesis Pioneer",
        "description": "Joined during genesis phase",
        "icon": "🚀",
        "category": "cosmic",
        "points": 150,
        "rarity": "legendary",
        "requirement": {"type": "joined_before", "date": "2025-12-31"}
    },
    "transaction_veteran": {
        "id": "transaction_veteran",
        "name": "Photon Storm",
        "description": "Completed 100 transactions",
        "icon": "⚡",
        "category": "cosmic",
        "points": 100,
        "rarity": "epic",
        "requirement": {"type": "transactions_sent", "count": 100}
    },
    "lottery_winner": {
        "id": "lottery_winner",
        "name": "Quantum Lucky",
        "description": "Won the NexusOS lottery",
        "icon": "🎰",
        "category": "cosmic",
        "points": 150,
        "rarity": "legendary",
        "requirement": {"type": "lottery_wins", "count": 1}
    },
    "floor_supported": {
        "id": "floor_supported",
        "name": "BHLS Supporter",
        "description": "Contributed to the F_floor fund",
        "icon": "🏠",
        "category": "cosmic",
        "points": 100,
        "rarity": "epic",
        "requirement": {"type": "floor_contributions", "count": 1}
    },
    "perfect_week": {
        "id": "perfect_week",
        "name": "Consistent Energy",
        "description": "Active for 7 consecutive days",
        "icon": "📅",
        "category": "cosmic",
        "points": 75,
        "rarity": "rare",
        "requirement": {"type": "consecutive_days", "count": 7}
    }
}

# Rarity colors for display
RARITY_COLORS = {
    "common": "#9ca3af",      # Gray
    "uncommon": "#22c55e",    # Green
    "rare": "#3b82f6",        # Blue
    "epic": "#a855f7",        # Purple
    "legendary": "#f59e0b"    # Gold/Orange
}

CATEGORY_INFO = {
    "genesis": {"name": "Genesis", "icon": "🌟", "description": "First-time achievements"},
    "quantum": {"name": "Quantum", "icon": "⚛️", "description": "Advanced feature usage"},
    "spectrum": {"name": "Spectrum", "icon": "🌈", "description": "Community engagement"},
    "orbital": {"name": "Orbital", "icon": "🪐", "description": "Economic milestones"},
    "cosmic": {"name": "Cosmic", "icon": "🌌", "description": "Rare achievements"}
}


def get_db_connection():
    """Get database connection."""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return None
    return psycopg2.connect(database_url)


def init_achievements_table():
    """Initialize the achievements database table."""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_achievements (
                    id SERIAL PRIMARY KEY,
                    wallet_address VARCHAR(64) NOT NULL,
                    badge_id VARCHAR(64) NOT NULL,
                    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    progress JSONB DEFAULT '{}',
                    notified BOOLEAN DEFAULT FALSE,
                    UNIQUE(wallet_address, badge_id)
                );
                
                CREATE INDEX IF NOT EXISTS idx_achievements_wallet 
                ON user_achievements(wallet_address);
                
                CREATE TABLE IF NOT EXISTS user_stats (
                    id SERIAL PRIMARY KEY,
                    wallet_address VARCHAR(64) UNIQUE NOT NULL,
                    stats JSONB DEFAULT '{}',
                    total_points INTEGER DEFAULT 0,
                    level INTEGER DEFAULT 1,
                    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    consecutive_days INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_stats_wallet 
                ON user_stats(wallet_address);
            """)
            conn.commit()
            return True
    except Exception as e:
        print(f"Error initializing achievements table: {e}")
        return False
    finally:
        conn.close()


class AchievementsManager:
    """Manages user achievements and badge tracking."""
    
    def __init__(self, wallet_address: str):
        self.wallet_address = wallet_address
        self.badges = BADGE_DEFINITIONS
        init_achievements_table()
    
    def get_user_stats(self) -> Dict[str, Any]:
        """Get user statistics for achievement tracking."""
        conn = get_db_connection()
        if not conn:
            return {"stats": {}, "total_points": 0, "level": 1}
        
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT stats, total_points, level, consecutive_days, last_active
                    FROM user_stats WHERE wallet_address = %s
                """, (self.wallet_address,))
                result = cur.fetchone()
                
                if result:
                    return dict(result)
                else:
                    # Create new user stats
                    cur.execute("""
                        INSERT INTO user_stats (wallet_address, stats, total_points, level)
                        VALUES (%s, '{}', 0, 1)
                        RETURNING stats, total_points, level, consecutive_days
                    """, (self.wallet_address,))
                    conn.commit()
                    return dict(cur.fetchone())
        except Exception as e:
            print(f"Error getting user stats: {e}")
            return {"stats": {}, "total_points": 0, "level": 1}
        finally:
            conn.close()
    
    def update_stat(self, stat_name: str, value: Any = None, increment: int = 1):
        """Update a user statistic and check for new badges."""
        conn = get_db_connection()
        if not conn:
            return []
        
        new_badges = []
        
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get current stats
                cur.execute("""
                    SELECT stats FROM user_stats WHERE wallet_address = %s
                """, (self.wallet_address,))
                result = cur.fetchone()
                
                if result:
                    stats = result['stats'] or {}
                else:
                    stats = {}
                    cur.execute("""
                        INSERT INTO user_stats (wallet_address, stats)
                        VALUES (%s, '{}')
                    """, (self.wallet_address,))
                
                # Update the stat
                if value is not None:
                    stats[stat_name] = value
                else:
                    stats[stat_name] = stats.get(stat_name, 0) + increment
                
                # Update consecutive days tracking
                cur.execute("""
                    UPDATE user_stats 
                    SET stats = %s,
                        last_active = CURRENT_TIMESTAMP,
                        consecutive_days = CASE 
                            WHEN last_active::date = CURRENT_DATE - INTERVAL '1 day' 
                            THEN consecutive_days + 1
                            WHEN last_active::date = CURRENT_DATE 
                            THEN consecutive_days
                            ELSE 1
                        END
                    WHERE wallet_address = %s
                    RETURNING consecutive_days
                """, (json.dumps(stats), self.wallet_address))
                
                conn.commit()
                
                # Check for newly earned badges
                new_badges = self._check_badges(stats)
                
        except Exception as e:
            print(f"Error updating stat: {e}")
            conn.rollback()
        finally:
            conn.close()
        
        return new_badges
    
    def _check_badges(self, stats: Dict) -> List[Dict]:
        """Check if user has earned any new badges."""
        new_badges = []
        conn = get_db_connection()
        if not conn:
            return new_badges
        
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get already earned badges
                cur.execute("""
                    SELECT badge_id FROM user_achievements WHERE wallet_address = %s
                """, (self.wallet_address,))
                earned = {row['badge_id'] for row in cur.fetchall()}
                
                for badge_id, badge in self.badges.items():
                    if badge_id in earned:
                        continue
                    
                    req = badge['requirement']
                    earned_badge = False
                    
                    # Check different requirement types
                    if req['type'] in stats:
                        if 'count' in req:
                            if stats.get(req['type'], 0) >= req['count']:
                                earned_badge = True
                        elif 'min' in req:
                            if stats.get(req['type'], 0) >= req['min']:
                                earned_badge = True
                        elif 'value' in req:
                            if stats.get(req['type']) == req['value']:
                                earned_badge = True
                    
                    # Special case for Early Adopter (joined_before) - check if current date is before cutoff
                    if req['type'] == 'joined_before':
                        cutoff_date = datetime.strptime(req['date'], "%Y-%m-%d")
                        # Award if user has a wallet and we're still in early adopter period
                        if datetime.now() <= cutoff_date and stats.get('wallet_created', 0) > 0:
                            earned_badge = True
                    
                    if earned_badge:
                        # Award the badge
                        cur.execute("""
                            INSERT INTO user_achievements (wallet_address, badge_id)
                            VALUES (%s, %s)
                            ON CONFLICT (wallet_address, badge_id) DO NOTHING
                            RETURNING id
                        """, (self.wallet_address, badge_id))
                        
                        if cur.fetchone():
                            # Update total points
                            cur.execute("""
                                UPDATE user_stats 
                                SET total_points = total_points + %s,
                                    level = GREATEST(1, (total_points + %s) / 100 + 1)
                                WHERE wallet_address = %s
                            """, (badge['points'], badge['points'], self.wallet_address))
                            
                            new_badges.append(badge)
                
                conn.commit()
                
        except Exception as e:
            print(f"Error checking badges: {e}")
            conn.rollback()
        finally:
            conn.close()
        
        return new_badges
    
    def get_earned_badges(self) -> List[Dict]:
        """Get all badges earned by the user."""
        conn = get_db_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT badge_id, earned_at, notified
                    FROM user_achievements 
                    WHERE wallet_address = %s
                    ORDER BY earned_at DESC
                """, (self.wallet_address,))
                
                earned = []
                for row in cur.fetchall():
                    badge = self.badges.get(row['badge_id'])
                    if badge:
                        badge_copy = badge.copy()
                        badge_copy['earned_at'] = row['earned_at']
                        badge_copy['notified'] = row['notified']
                        earned.append(badge_copy)
                
                return earned
        except Exception as e:
            print(f"Error getting earned badges: {e}")
            return []
        finally:
            conn.close()
    
    def get_available_badges(self) -> List[Dict]:
        """Get badges not yet earned by the user."""
        earned_ids = {b['id'] for b in self.get_earned_badges()}
        return [b for b in self.badges.values() if b['id'] not in earned_ids]
    
    def get_progress_summary(self) -> Dict:
        """Get user's achievement progress summary."""
        earned = self.get_earned_badges()
        total = len(self.badges)
        stats = self.get_user_stats()
        
        # Count by category
        category_progress = {}
        for cat_id, cat_info in CATEGORY_INFO.items():
            cat_badges = [b for b in self.badges.values() if b['category'] == cat_id]
            cat_earned = [b for b in earned if b['category'] == cat_id]
            category_progress[cat_id] = {
                "name": cat_info['name'],
                "icon": cat_info['icon'],
                "earned": len(cat_earned),
                "total": len(cat_badges),
                "percentage": int(len(cat_earned) / len(cat_badges) * 100) if cat_badges else 0
            }
        
        # Count by rarity
        rarity_counts = {}
        for rarity in RARITY_COLORS.keys():
            rarity_counts[rarity] = len([b for b in earned if b['rarity'] == rarity])
        
        return {
            "earned_count": len(earned),
            "total_count": total,
            "completion_percentage": int(len(earned) / total * 100) if total else 0,
            "total_points": stats.get('total_points', 0),
            "level": stats.get('level', 1),
            "categories": category_progress,
            "rarities": rarity_counts,
            "recent_badges": earned[:5] if earned else []
        }
    
    def mark_notified(self, badge_id: str):
        """Mark a badge notification as shown."""
        conn = get_db_connection()
        if not conn:
            return
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE user_achievements 
                    SET notified = TRUE 
                    WHERE wallet_address = %s AND badge_id = %s
                """, (self.wallet_address, badge_id))
                conn.commit()
        except Exception:
            pass
        finally:
            conn.close()
    
    def get_unnotified_badges(self) -> List[Dict]:
        """Get badges that haven't been shown to the user yet."""
        conn = get_db_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT badge_id FROM user_achievements 
                    WHERE wallet_address = %s AND notified = FALSE
                """, (self.wallet_address,))
                
                unnotified = []
                for row in cur.fetchall():
                    badge = self.badges.get(row['badge_id'])
                    if badge:
                        unnotified.append(badge)
                
                return unnotified
        except Exception:
            return []
        finally:
            conn.close()


# Convenience functions for triggering achievements from other modules
def trigger_achievement(wallet_address: str, stat_name: str, value: Any = None, increment: int = 1) -> List[Dict]:
    """Trigger an achievement check for a user action."""
    if not wallet_address:
        return []
    
    manager = AchievementsManager(wallet_address)
    return manager.update_stat(stat_name, value, increment)


def get_user_badges(wallet_address: str) -> List[Dict]:
    """Get all badges for a user."""
    if not wallet_address:
        return []
    
    manager = AchievementsManager(wallet_address)
    return manager.get_earned_badges()


def get_user_progress(wallet_address: str) -> Dict:
    """Get achievement progress for a user."""
    if not wallet_address:
        return {}
    
    manager = AchievementsManager(wallet_address)
    return manager.get_progress_summary()


def check_balance_badges(wallet_address: str, balance_nxt: float) -> List[Dict]:
    """Check and award balance-based badges."""
    if not wallet_address or balance_nxt <= 0:
        return []
    
    manager = AchievementsManager(wallet_address)
    return manager.update_stat('balance_nxt', balance_nxt)
