# WNSP Unified Mesh Stack - Wavelength-Native Signaling Protocol
# Copyright (C) 2025 WNSP Project Contributors
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

"""
WNSP Media Propagation Engine - Production Implementation
Integrates with actual mesh topology for real media distribution

Features:
1. Mesh-aware routing: Uses actual topology graph for chunk propagation
2. Content-based deduplication: Identical chunks reused across files
3. Real propagation tracking: Tracks which nodes have which chunks
4. Multi-hop energy accounting: Calculates per-hop costs and totals
5. Node-specific caches: Each node maintains its own chunk inventory
"""

import hashlib
import time
import random
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, field
import math
import numpy as np

@dataclass
class MediaChunk:
    """Represents a chunk of a media file for DAG propagation"""
    chunk_id: str
    file_id: str
    chunk_index: int
    total_chunks: int
    data_size: int  # bytes
    content_hash: str  # SHA-256 of actual data (for deduplication)
    wavelength: float  # nm (for energy calculation)
    energy_cost_per_hop: float  # NXT per single hop
    timestamp: float = field(default_factory=time.time)
    
    # Production tracking
    nodes_with_chunk: Set[str] = field(default_factory=set)  # Which nodes have this chunk
    propagation_paths: List[List[str]] = field(default_factory=list)  # All paths taken
    total_hops_traveled: int = 0  # Total hops across all propagations
    
    @property
    def total_energy_spent(self) -> float:
        """Calculate total energy spent across all hops"""
        return self.energy_cost_per_hop * self.total_hops_traveled

@dataclass
class MediaFile:
    """Represents a complete media file in the mesh network"""
    file_id: str
    filename: str
    file_type: str  # mp3, mp4, pdf, jpg, png, etc.
    file_size: int  # bytes
    content_hash: str  # SHA-256 of complete file
    description: str
    category: str  # university, refugee, rural, crisis
    chunks: List[MediaChunk] = field(default_factory=list)
    total_chunks: int = 0
    upload_timestamp: float = field(default_factory=time.time)
    
    @property
    def total_energy_cost_single_hop(self) -> float:
        """Energy cost to transmit file once (single hop)"""
        return sum(chunk.energy_cost_per_hop for chunk in self.chunks)
    
    @property
    def total_energy_spent_all_hops(self) -> float:
        """Total energy actually spent across all propagations"""
        return sum(chunk.total_energy_spent for chunk in self.chunks)
    
    def get_download_progress(self, node_id: str) -> float:
        """Calculate download progress for a specific node (0-100%)"""
        chunks_on_node = sum(1 for chunk in self.chunks if node_id in chunk.nodes_with_chunk)
        return (chunks_on_node / self.total_chunks * 100) if self.total_chunks > 0 else 0

@dataclass
class NodeCache:
    """Cache inventory for a specific mesh node"""
    node_id: str
    cache_capacity_mb: float
    chunks_cached: Dict[str, MediaChunk] = field(default_factory=dict)  # content_hash -> chunk
    
    @property
    def used_capacity_mb(self) -> float:
        """Calculate used cache capacity"""
        return sum(chunk.data_size for chunk in self.chunks_cached.values()) / 1048576
    
    @property
    def available_capacity_mb(self) -> float:
        """Calculate available cache capacity"""
        return self.cache_capacity_mb - self.used_capacity_mb
    
    def can_store_chunk(self, chunk: MediaChunk) -> bool:
        """Check if chunk can fit in cache"""
        chunk_size_mb = chunk.data_size / 1048576
        return chunk_size_mb <= self.available_capacity_mb
    
    def add_chunk(self, chunk: MediaChunk) -> bool:
        """Add chunk to cache (returns False if no space)"""
        if not self.can_store_chunk(chunk):
            return False
        
        self.chunks_cached[chunk.content_hash] = chunk
        chunk.nodes_with_chunk.add(self.node_id)
        return True
    
    def has_chunk(self, content_hash: str) -> bool:
        """Check if chunk is in cache"""
        return content_hash in self.chunks_cached

class WNSPMediaPropagationProduction:
    """
    Production-Ready WNSP Media Propagation Engine
    Integrates with actual mesh topology for realistic simulation
    """
    
    # Physics constants
    PLANCK_CONSTANT = 6.62607015e-34  # J⋅s
    SPEED_OF_LIGHT = 299792458  # m/s
    
    # Network configuration
    CHUNK_SIZE = 65536  # 64 KB per chunk (optimal for BLE/WiFi)
    MIN_WAVELENGTH = 350  # nm (UV limit)
    MAX_WAVELENGTH = 1033  # nm (IR limit)
    
    # Energy pricing calibrated for: 100 MB ≈ 1 NXT across 5 hops
    # 100MB / 64KB = 1562 chunks
    # 1 NXT / 1562 chunks / 5 hops = 0.000128 NXT per chunk per hop
    ENERGY_MULTIPLIER = 1.28e9  # Calibrated multiplier
    
    def __init__(self, mesh_stack=None):
        self.mesh_stack = mesh_stack  # Reference to WNSPUnifiedMeshStack
        self.media_library: Dict[str, MediaFile] = {}
        self.node_caches: Dict[str, NodeCache] = {}  # node_id -> NodeCache
        self.content_index: Dict[str, List[MediaChunk]] = {}  # content_hash -> [chunks with same data]
        
        self.propagation_stats = {
            'total_files': 0,
            'total_chunks_created': 0,
            'total_propagations': 0,
            'total_bytes_transmitted': 0,
            'total_energy_spent': 0.0,
            'total_hops_traveled': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'dedup_chunks_reused': 0
        }
        
        # Initialize node caches from mesh topology
        if mesh_stack and mesh_stack.layer1_mesh_isp:
            for node_id, node in mesh_stack.layer1_mesh_isp.nodes.items():
                self.node_caches[node_id] = NodeCache(
                    node_id=node_id,
                    cache_capacity_mb=node.cache_capacity_mb
                )
        
        # Initialize sample content library
        # DISABLED: Causes hang during server startup - files added via upload API instead
        # self._initialize_content_library()
    
    def _initialize_content_library(self):
        """Create sample media files for different community types"""
        
        # First, create shared content for deduplication testing
        # This simulates two different files with identical bytes (e.g., same lecture under different names)
        shared_safety_video_content = self._generate_unique_file_content("Safety_Lab_Procedures.mp4", 104857600)
        shared_textbook_content = self._generate_unique_file_content("Math_Textbook_Standard.pdf", 15728640)
        
        sample_files = [
            # University Campus
            {
                'filename': 'Quantum_Mechanics_Lecture_01.mp4',
                'file_type': 'mp4',
                'file_size': 524288000,  # 500 MB
                'description': 'Physics lecture on wave-particle duality',
                'category': 'university'
            },
            {
                'filename': 'Calculus_Textbook_Chapter3.pdf',
                'file_type': 'pdf',
                'file_size': 15728640,  # 15 MB
                'description': 'Differential equations and applications',
                'category': 'university'
            },
            {
                'filename': 'Chemistry_Lab_Safety.mp4',
                'file_type': 'mp4',
                'file_size': 104857600,  # 100 MB
                'description': 'Laboratory safety procedures',
                'category': 'university'
            },
            
            # Refugee Populations
            {
                'filename': 'Asylum_Rights_Guide.pdf',
                'file_type': 'pdf',
                'file_size': 5242880,  # 5 MB
                'description': 'Legal rights and asylum procedures',
                'category': 'refugee'
            },
            {
                'filename': 'English_Basics_Audio.mp3',
                'file_type': 'mp3',
                'file_size': 10485760,  # 10 MB
                'description': 'Basic English language lessons',
                'category': 'refugee'
            },
            {
                'filename': 'Safe_Routes_Map.png',
                'file_type': 'png',
                'file_size': 2097152,  # 2 MB
                'description': 'Updated safe passage routes',
                'category': 'refugee'
            },
            
            # Rural Communities
            {
                'filename': 'Crop_Management_Tutorial.mp4',
                'file_type': 'mp4',
                'file_size': 209715200,  # 200 MB
                'description': 'Sustainable farming techniques',
                'category': 'rural'
            },
            {
                'filename': 'Medical_First_Aid.pdf',
                'file_type': 'pdf',
                'file_size': 8388608,  # 8 MB
                'description': 'Emergency medical procedures',
                'category': 'rural'
            },
            {
                'filename': 'Market_Prices_Weekly.mp3',
                'file_type': 'mp3',
                'file_size': 3145728,  # 3 MB
                'description': 'Weekly commodity price updates',
                'category': 'rural'
            },
            
            # Crisis Response
            {
                'filename': 'Evacuation_Instructions.mp4',
                'file_type': 'mp4',
                'file_size': 52428800,  # 50 MB
                'description': 'Hurricane evacuation procedures',
                'category': 'crisis'
            },
            {
                'filename': 'Emergency_Contacts.pdf',
                'file_type': 'pdf',
                'file_size': 1048576,  # 1 MB
                'description': 'Critical contact information',
                'category': 'crisis'
            },
            {
                'filename': 'Rescue_Coordination_Map.jpg',
                'file_type': 'jpg',
                'file_size': 4194304,  # 4 MB
                'description': 'Real-time rescue operation map',
                'category': 'crisis'
            },
            
            # Deduplication Test - Duplicate content files (same type/size, different names)
            {
                'filename': 'Biology_Lab_Safety.mp4',  # Duplicate of Chemistry_Lab_Safety
                'file_type': 'mp4',
                'file_size': 104857600,  # 100 MB (same as Chemistry_Lab_Safety)
                'description': 'Biology laboratory safety - same content as Chemistry version',
                'category': 'university'
            },
            {
                'filename': 'Linear_Algebra_Chapter3.pdf',  # Duplicate of Calculus_Textbook
                'file_type': 'pdf',
                'file_size': 15728640,  # 15 MB (same size)
                'description': 'Linear algebra textbook - demonstrates chunk deduplication',
                'category': 'university'
            }
        ]
        
        for file_data in sample_files:
            # Use shared content for duplicate files to demonstrate real deduplication
            simulated_content = None
            
            if file_data['filename'] in ['Chemistry_Lab_Safety.mp4', 'Biology_Lab_Safety.mp4']:
                simulated_content = shared_safety_video_content  # Same content, different names
            elif file_data['filename'] in ['Calculus_Textbook_Chapter3.pdf', 'Linear_Algebra_Chapter3.pdf']:
                simulated_content = shared_textbook_content  # Same content, different names
            
            self.add_media_file(
                filename=file_data['filename'],
                file_type=file_data['file_type'],
                file_size=file_data['file_size'],
                description=file_data['description'],
                category=file_data['category'],
                simulated_content=simulated_content
            )
    
    def add_media_file(self, filename: str, file_type: str, file_size: int,
                       description: str, category: str, simulated_content: bytes = None) -> MediaFile:
        """Add a new media file to the library
        
        Args:
            filename: Name of the file
            file_type: File extension (mp3, mp4, pdf, etc.)
            file_size: Size in bytes
            description: Human-readable description
            category: Community category (university, refugee, rural, crisis)
            simulated_content: Optional pre-generated content bytes (for testing deduplication)
                             If None, unique content is generated based on filename
        """
        file_id = self._generate_file_id(filename)
        
        # Generate simulated file content if not provided
        if simulated_content is None:
            simulated_content = self._generate_unique_file_content(filename, file_size)
        
        # Hash the actual simulated content bytes (production would hash real file)
        content_hash = hashlib.sha256(simulated_content).hexdigest()
        
        media_file = MediaFile(
            file_id=file_id,
            filename=filename,
            file_type=file_type,
            file_size=file_size,
            content_hash=content_hash,
            description=description,
            category=category
        )
        
        # Create chunks with content-based hashing from actual content
        media_file.total_chunks = math.ceil(file_size / self.CHUNK_SIZE)
        media_file.chunks = self._create_chunks(media_file, simulated_content)
        
        self.media_library[file_id] = media_file
        self.propagation_stats['total_files'] += 1
        self.propagation_stats['total_chunks_created'] += media_file.total_chunks
        
        return media_file
    
    def _generate_file_id(self, filename: str) -> str:
        """Generate unique file ID from filename"""
        return hashlib.sha256(filename.encode()).hexdigest()[:12]
    
    def _generate_unique_file_content(self, filename: str, file_size: int) -> bytes:
        """Generate unique deterministic content for a file based on its filename.
        
        Each unique filename produces unique content. This simulates real files
        where different files have different bytes.
        
        Returns the file's content seed (used for chunk generation).
        """
        # For efficiency, we don't generate full file content upfront
        # Instead, we return a content seed that will be used to generate chunks
        # This seed represents the "identity" of the file's content
        seed_string = f"FILE_CONTENT_{filename}_{file_size}"
        return hashlib.sha256(seed_string.encode()).digest()  # 32 bytes representing file identity
    
    def _create_chunks(self, media_file: MediaFile, file_content_seed: bytes) -> List[MediaChunk]:
        """Split media file into chunks with content-based hashing from actual bytes.
        
        Args:
            media_file: The media file being chunked
            file_content_seed: 32-byte seed representing the file's content identity
        """
        chunks = []
        
        for i in range(media_file.total_chunks):
            # Calculate chunk size (last chunk may be smaller)
            if i == media_file.total_chunks - 1:
                chunk_size = media_file.file_size - (i * self.CHUNK_SIZE)
            else:
                chunk_size = self.CHUNK_SIZE
            
            # Generate deterministic chunk content from file seed + chunk position
            # Files with same seed will produce identical chunks at same positions
            chunk_seed = hashlib.sha256(file_content_seed + f"_chunk_{i}".encode()).digest()
            chunk_random = random.Random(int.from_bytes(chunk_seed[:4], 'big'))
            
            # Generate full chunk content (not just a sample)
            chunk_data = bytes([chunk_random.randint(0, 255) for _ in range(chunk_size)])
            
            # Hash the actual chunk bytes (this is true content-based hashing)
            content_hash = hashlib.sha256(chunk_data).hexdigest()
            
            # Assign wavelength based on chunk index
            wavelength = self._assign_wavelength(i, media_file.total_chunks)
            
            # Calculate per-hop energy cost using E = hf
            energy_cost_per_hop = self._calculate_energy_cost_per_hop(chunk_size, wavelength)
            
            chunk_id = f"{media_file.file_id}_chunk_{i}"
            
            chunk = MediaChunk(
                chunk_id=chunk_id,
                file_id=media_file.file_id,
                chunk_index=i,
                total_chunks=media_file.total_chunks,
                data_size=chunk_size,
                content_hash=content_hash,
                wavelength=wavelength,
                energy_cost_per_hop=energy_cost_per_hop
            )
            
            chunks.append(chunk)
            
            # Index by content hash for deduplication
            if content_hash not in self.content_index:
                self.content_index[content_hash] = []
            self.content_index[content_hash].append(chunk)
        
        return chunks
    
    def _assign_wavelength(self, chunk_index: int, total_chunks: int) -> float:
        """Assign wavelength to chunk (distribute across visible spectrum)"""
        if total_chunks == 1:
            return (self.MIN_WAVELENGTH + self.MAX_WAVELENGTH) / 2
        
        # Linear distribution across spectrum
        wavelength_range = self.MAX_WAVELENGTH - self.MIN_WAVELENGTH
        wavelength = self.MIN_WAVELENGTH + (chunk_index / (total_chunks - 1)) * wavelength_range
        
        return round(wavelength, 2)
    
    def _calculate_energy_cost_per_hop(self, data_size: int, wavelength: float) -> float:
        """Calculate E=hf energy cost per hop in NXT"""
        # Convert wavelength to meters
        wavelength_m = wavelength * 1e-9
        
        # Calculate frequency: f = c/λ
        frequency = self.SPEED_OF_LIGHT / wavelength_m
        
        # Calculate photon energy: E = hf
        photon_energy = self.PLANCK_CONSTANT * frequency
        
        # Scale by data size and multiplier to get NXT cost per hop
        energy_cost = photon_energy * data_size * self.ENERGY_MULTIPLIER
        
        return round(energy_cost, 8)
    
    def propagate_chunk_to_node(self, chunk: MediaChunk, target_node_id: str,
                                source_node_id: Optional[str] = None) -> Dict:
        """
        Propagate chunk to target node using actual mesh topology
        Returns propagation result with path, hops, and energy cost
        """
        if not self.mesh_stack or not self.mesh_stack.layer2_routing:
            return {'success': False, 'error': 'Mesh stack not available'}
        
        # Check if target node exists
        if target_node_id not in self.node_caches:
            return {'success': False, 'error': f'Node {target_node_id} not found'}
        
        target_cache = self.node_caches[target_node_id]
        
        # Check for cache hit (deduplication)
        if target_cache.has_chunk(chunk.content_hash):
            self.propagation_stats['cache_hits'] += 1
            return {
                'success': True,
                'cache_hit': True,
                'node_id': target_node_id,
                'hops': 0,
                'energy_cost': 0,
                'path': [target_node_id]
            }
        
        # Cache miss - need to propagate
        self.propagation_stats['cache_misses'] += 1
        
        # Find source node (node that already has the chunk)
        if not source_node_id:
            # Find closest node that has this chunk
            source_node_id = self._find_closest_source_node(chunk, target_node_id)
            
            if not source_node_id:
                return {'success': False, 'error': 'No source node has this chunk'}
        
        # Compute route through mesh topology
        path = self._compute_propagation_path(source_node_id, target_node_id)
        
        if not path or len(path) < 2:
            return {'success': False, 'error': 'No path found'}
        
        hops = len(path) - 1  # Number of hops is path length minus 1
        
        # Calculate energy cost for this propagation
        energy_cost = chunk.energy_cost_per_hop * hops
        
        # Try to add chunk to target cache
        if not target_cache.add_chunk(chunk):
            return {'success': False, 'error': 'Target cache full'}
        
        # Update chunk propagation tracking
        chunk.propagation_paths.append(path)
        chunk.total_hops_traveled += hops
        
        # Update global stats
        self.propagation_stats['total_propagations'] += 1
        self.propagation_stats['total_bytes_transmitted'] += chunk.data_size
        self.propagation_stats['total_energy_spent'] += energy_cost
        self.propagation_stats['total_hops_traveled'] += hops
        
        # Check if this chunk was reused via deduplication
        if len(self.content_index.get(chunk.content_hash, [])) > 1:
            self.propagation_stats['dedup_chunks_reused'] += 1
        
        return {
            'success': True,
            'cache_hit': False,
            'node_id': target_node_id,
            'hops': hops,
            'energy_cost': energy_cost,
            'path': path
        }
    
    def _find_closest_source_node(self, chunk: MediaChunk, target_node_id: str) -> Optional[str]:
        """Find the closest node that has this chunk"""
        if not chunk.nodes_with_chunk:
            return None
        
        # Simple: return first node that has it
        # TODO: Could use BFS to find truly closest
        return next(iter(chunk.nodes_with_chunk))
    
    def _compute_propagation_path(self, source_id: str, target_id: str) -> List[str]:
        """Compute propagation path using mesh topology (BFS)"""
        if not self.mesh_stack or not self.mesh_stack.layer1_mesh_isp:
            return []
        
        topology = self.mesh_stack.layer1_mesh_isp.topology_graph
        
        if source_id not in topology or target_id not in topology:
            return []
        
        # BFS pathfinding
        visited = set()
        queue = [(source_id, [source_id])]
        
        while queue:
            current, path = queue.pop(0)
            
            if current == target_id:
                return path
            
            if current in visited:
                continue
            visited.add(current)
            
            for neighbor in topology.get(current, []):
                if neighbor not in visited:
                    queue.append((neighbor, path + [neighbor]))
        
        return []
    
    def propagate_file_to_node(self, file_id: str, target_node_id: str,
                               source_node_id: Optional[str] = None) -> Dict:
        """Propagate entire file to target node (all chunks)"""
        if file_id not in self.media_library:
            return {'success': False, 'error': 'File not found'}
        
        media_file = self.media_library[file_id]
        results = []
        total_energy = 0
        total_hops = 0
        cache_hits = 0
        
        for chunk in media_file.chunks:
            result = self.propagate_chunk_to_node(chunk, target_node_id, source_node_id)
            results.append(result)
            
            if result['success']:
                if result['cache_hit']:
                    cache_hits += 1
                else:
                    total_energy += result['energy_cost']
                    total_hops += result['hops']
        
        successful_chunks = sum(1 for r in results if r['success'])
        
        return {
            'success': successful_chunks == len(media_file.chunks),
            'file_id': file_id,
            'filename': media_file.filename,
            'total_chunks': len(media_file.chunks),
            'successful_chunks': successful_chunks,
            'cache_hits': cache_hits,
            'total_energy_cost': total_energy,
            'total_hops': total_hops,
            'avg_hops_per_chunk': total_hops / successful_chunks if successful_chunks > 0 else 0
        }
    
    def get_node_download_status(self, file_id: str, node_id: str) -> Dict:
        """Get download status for a file on a specific node"""
        if file_id not in self.media_library:
            return {'error': 'File not found'}
        
        media_file = self.media_library[file_id]
        progress = media_file.get_download_progress(node_id)
        
        chunks_downloaded = sum(1 for chunk in media_file.chunks 
                               if node_id in chunk.nodes_with_chunk)
        
        # Progressive streaming thresholds
        can_stream = progress >= 10
        has_safe_buffer = progress >= 20
        is_complete = progress >= 100
        
        return {
            'file_id': file_id,
            'filename': media_file.filename,
            'node_id': node_id,
            'progress': progress,
            'chunks_downloaded': chunks_downloaded,
            'total_chunks': media_file.total_chunks,
            'can_stream': can_stream,
            'has_safe_buffer': has_safe_buffer,
            'is_complete': is_complete,
            'buffered_mb': (chunks_downloaded * self.CHUNK_SIZE) / 1048576,
            'total_mb': media_file.file_size / 1048576
        }
    
    def get_files_by_category(self, category: str) -> List[MediaFile]:
        """Get all media files for a specific community category"""
        return [f for f in self.media_library.values() if f.category == category]
    
    def get_file_info(self, file_id: str) -> Optional[Dict]:
        """Get detailed information about a media file"""
        if file_id not in self.media_library:
            return None
        
        media_file = self.media_library[file_id]
        
        return {
            'file_id': media_file.file_id,
            'filename': media_file.filename,
            'file_type': media_file.file_type,
            'file_size': media_file.file_size,
            'file_size_mb': round(media_file.file_size / 1048576, 2),
            'description': media_file.description,
            'category': media_file.category,
            'total_chunks': media_file.total_chunks,
            'energy_cost_single_hop': round(media_file.total_energy_cost_single_hop, 4),
            'energy_spent_all_hops': round(media_file.total_energy_spent_all_hops, 4),
            'avg_chunk_size_kb': round(self.CHUNK_SIZE / 1024, 2),
            'estimated_time': self._estimate_download_time(media_file)
        }
    
    def _estimate_download_time(self, media_file: MediaFile) -> Dict[str, float]:
        """Estimate download time based on network type"""
        file_size_mb = media_file.file_size / 1048576
        
        # Network speeds (Mbps)
        ble_speed = 1  # 1 Mbps
        wifi_speed = 50  # 50 Mbps
        lora_speed = 0.05  # 50 Kbps
        
        return {
            'ble_minutes': round((file_size_mb * 8) / ble_speed / 60, 2),
            'wifi_minutes': round((file_size_mb * 8) / wifi_speed / 60, 2),
            'lora_minutes': round((file_size_mb * 8) / lora_speed / 60, 2)
        }
    
    def get_propagation_statistics(self) -> Dict:
        """Get overall propagation statistics"""
        dedup_rate = 0.0
        if self.propagation_stats['total_propagations'] > 0:
            dedup_rate = (self.propagation_stats['dedup_chunks_reused'] / 
                         self.propagation_stats['total_propagations']) * 100
        
        cache_hit_rate = 0.0
        total_requests = (self.propagation_stats['cache_hits'] + 
                         self.propagation_stats['cache_misses'])
        if total_requests > 0:
            cache_hit_rate = (self.propagation_stats['cache_hits'] / total_requests) * 100
        
        return {
            'total_files': self.propagation_stats['total_files'],
            'total_chunks_created': self.propagation_stats['total_chunks_created'],
            'total_propagations': self.propagation_stats['total_propagations'],
            'total_mb_transmitted': round(self.propagation_stats['total_bytes_transmitted'] / 1048576, 2),
            'total_energy_spent_nxt': round(self.propagation_stats['total_energy_spent'], 4),
            'total_hops_traveled': self.propagation_stats['total_hops_traveled'],
            'avg_hops_per_propagation': (self.propagation_stats['total_hops_traveled'] / 
                                        self.propagation_stats['total_propagations'] 
                                        if self.propagation_stats['total_propagations'] > 0 else 0),
            'cache_hits': self.propagation_stats['cache_hits'],
            'cache_misses': self.propagation_stats['cache_misses'],
            'cache_hit_rate': round(cache_hit_rate, 1),
            'dedup_chunks_reused': self.propagation_stats['dedup_chunks_reused'],
            'dedup_rate': round(dedup_rate, 1)
        }
    
    def get_content_library_summary(self) -> Dict[str, int]:
        """Get summary of content library by category"""
        summary = {'university': 0, 'refugee': 0, 'rural': 0, 'crisis': 0}
        
        for media_file in self.media_library.values():
            if media_file.category in summary:
                summary[media_file.category] += 1
        
        return summary
    
    def get_node_cache_status(self, node_id: str) -> Optional[Dict]:
        """Get cache status for a specific node"""
        if node_id not in self.node_caches:
            return None
        
        cache = self.node_caches[node_id]
        
        return {
            'node_id': node_id,
            'cache_capacity_mb': cache.cache_capacity_mb,
            'used_capacity_mb': round(cache.used_capacity_mb, 2),
            'available_capacity_mb': round(cache.available_capacity_mb, 2),
            'utilization_percent': round((cache.used_capacity_mb / cache.cache_capacity_mb * 100) 
                                        if cache.cache_capacity_mb > 0 else 0, 1),
            'chunks_cached': len(cache.chunks_cached)
        }
