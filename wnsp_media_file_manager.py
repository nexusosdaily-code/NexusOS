#!/usr/bin/env python3
"""
WNSP Media File Manager - Production File Ingestion & Streaming
GPL v3.0 License

Handles real file I/O, chunking, SHA-256 hashing, and streaming
"""

import os
import hashlib
import mimetypes
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Optional, BinaryIO
import json

@dataclass
class MediaChunk:
    """Represents a 64KB chunk of a media file"""
    chunk_id: str
    chunk_index: int
    chunk_size: int
    chunk_hash: str
    wavelength_nm: float
    energy_nxt: float

@dataclass
class MediaFile:
    """Represents a complete media file"""
    file_id: str
    filename: str
    filepath: str
    file_type: str  # video, audio, document
    mime_type: str
    file_size: int
    content_hash: str
    chunks: List[MediaChunk]
    category: str
    title: str
    artist: str
    description: str
    duration: str
    cached: bool = True
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.file_id,
            'filename': self.filename,
            'type': self.file_type,
            'mime_type': self.mime_type,
            'size': self.file_size,
            'content_hash': self.content_hash,
            'chunks': len(self.chunks),
            'category': self.category,
            'title': self.title,
            'artist': self.artist,
            'description': self.description,
            'duration': self.duration,
            'cached': self.cached,
            'energyCost': sum(c.energy_nxt for c in self.chunks),
            'url': f'/media/{self.file_id}/stream'
        }

class WNSPMediaFileManager:
    """Manages real media files with chunk-based storage"""
    
    CHUNK_SIZE = 64 * 1024  # 64KB chunks
    MEDIA_BASE_PATH = Path('static/media')
    
    def __init__(self):
        self.media_library: Dict[str, MediaFile] = {}
        self.chunk_cache: Dict[str, bytes] = {}  # In-memory chunk cache
        
        # Ensure media directories exist
        for subdir in ['video', 'audio', 'docs']:
            (self.MEDIA_BASE_PATH / subdir).mkdir(parents=True, exist_ok=True)
    
    def ingest_file(self, filepath: str, category: str = "university", 
                    title: Optional[str] = None, artist: str = "Unknown", 
                    description: str = "", duration: str = "Unknown") -> str:
        """
        Ingest a real media file from disk
        
        Args:
            filepath: Path to the media file
            category: Content category (university, refugee, rural, crisis)
            title: Display title (defaults to filename if not provided)
            artist: Creator/author
            description: File description
            duration: Playback duration (for audio/video)
        
        Returns:
            File ID string if successful, raises exception if ingestion fails
        """
        path = Path(filepath)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {filepath}")
        
        # Auto-generate title from filename if not provided
        if title is None:
            title = path.stem.replace('_', ' ').title()
        
        try:
            # Determine file type
            mime_type, _ = mimetypes.guess_type(str(path))
            file_type = self._determine_file_type(mime_type, path.suffix)
            
            # Read file and compute hash
            file_size = path.stat().st_size
            content_hash = self._compute_file_hash(path)
            
            # Generate file ID
            file_id = f"{category}_{hashlib.sha256(path.name.encode()).hexdigest()[:8]}"
            
            # Split into chunks
            chunks = self._create_chunks(path, file_id, content_hash)
            
            # Auto-generate description if not provided
            if not description:
                description = f"{file_type.title()} file"
            
            # Create MediaFile object
            media_file = MediaFile(
                file_id=file_id,
                filename=path.name,
                filepath=str(path),
                file_type=file_type,
                mime_type=mime_type or 'application/octet-stream',
                file_size=file_size,
                content_hash=content_hash,
                chunks=chunks,
                category=category,
                title=title,
                artist=artist,
                description=description,
                duration=duration,
                cached=True
            )
            
            # Add to library
            self.media_library[file_id] = media_file
            
            print(f"✅ Ingested: {title} ({file_size / 1048576:.2f} MB, {len(chunks)} chunks)")
            
            return file_id
            
        except Exception as e:
            print(f"❌ Ingestion failed for {filepath}: {e}")
            raise
    
    def _determine_file_type(self, mime_type: Optional[str], extension: str) -> str:
        """Determine media type from MIME type and extension"""
        if mime_type:
            if mime_type.startswith('video/'):
                return 'video'
            elif mime_type.startswith('audio/'):
                return 'audio'
            elif mime_type == 'application/pdf':
                return 'document'
        
        # Fallback to extension
        ext = extension.lower()
        if ext in ['.mp4', '.webm', '.mov', '.avi', '.mkv']:
            return 'video'
        elif ext in ['.mp3', '.wav', '.ogg', '.m4a', '.aac']:
            return 'audio'
        elif ext in ['.pdf', '.txt', '.md', '.doc', '.docx']:
            return 'document'
        
        return 'document'
    
    def _compute_file_hash(self, filepath: Path) -> str:
        """Compute SHA-256 hash of entire file"""
        sha256 = hashlib.sha256()
        
        with open(filepath, 'rb') as f:
            while chunk := f.read(self.CHUNK_SIZE):
                sha256.update(chunk)
        
        return sha256.hexdigest()
    
    def _create_chunks(self, filepath: Path, file_id: str, content_hash: str) -> List[MediaChunk]:
        """Split file into 64KB chunks with wavelength mapping"""
        chunks = []
        chunk_index = 0
        
        with open(filepath, 'rb') as f:
            while True:
                chunk_data = f.read(self.CHUNK_SIZE)
                if not chunk_data:
                    break
                
                # Compute chunk hash
                chunk_hash = hashlib.sha256(chunk_data).hexdigest()
                
                # Generate chunk ID
                chunk_id = f"{file_id}_chunk_{chunk_index}_{chunk_hash[:8]}"
                
                # Map to wavelength (350-1033 nm)
                wavelength_nm = 350 + (chunk_index % 683)
                
                # Calculate energy cost (E=hf)
                h = 6.62607015e-34  # Planck constant
                c = 299792458  # Speed of light
                frequency = c / (wavelength_nm * 1e-9)
                energy_joules = h * frequency
                energy_nxt = energy_joules * 1e18  # Convert to NXT units
                
                # Create chunk
                chunk = MediaChunk(
                    chunk_id=chunk_id,
                    chunk_index=chunk_index,
                    chunk_size=len(chunk_data),
                    chunk_hash=chunk_hash,
                    wavelength_nm=wavelength_nm,
                    energy_nxt=energy_nxt
                )
                
                chunks.append(chunk)
                
                # Cache chunk in memory
                self.chunk_cache[chunk_id] = chunk_data
                
                chunk_index += 1
        
        return chunks
    
    def get_file_stream(self, file_id: str) -> Optional[BinaryIO]:
        """Get file stream for direct streaming"""
        if file_id not in self.media_library:
            return None
        
        media_file = self.media_library[file_id]
        
        try:
            return open(media_file.filepath, 'rb')
        except Exception as e:
            print(f"❌ Failed to open file stream: {e}")
            return None
    
    def get_chunk_data(self, chunk_id: str) -> Optional[bytes]:
        """Retrieve chunk data from cache"""
        return self.chunk_cache.get(chunk_id)
    
    def get_file_bytes(self, file_id: str, start: int = 0, end: Optional[int] = None) -> Optional[bytes]:
        """
        Get file bytes for range requests
        
        Args:
            file_id: Media file ID
            start: Starting byte position
            end: Ending byte position (None = end of file)
        
        Returns:
            Bytes in range or None if not found
        """
        if file_id not in self.media_library:
            return None
        
        media_file = self.media_library[file_id]
        
        try:
            with open(media_file.filepath, 'rb') as f:
                f.seek(start)
                
                if end is None:
                    return f.read()
                else:
                    return f.read(end - start + 1)
        except Exception as e:
            print(f"❌ Failed to read file bytes: {e}")
            return None
    
    def get_library_summary(self) -> Dict[str, List[Dict]]:
        """Get media library organized by category"""
        library = {
            'university': [],
            'refugee': [],
            'rural': [],
            'crisis': []
        }
        
        for media_file in self.media_library.values():
            if media_file.category in library:
                library[media_file.category].append(media_file.to_dict())
        
        return library
    
    def scan_media_directory(self):
        """Scan media directory for files and auto-ingest"""
        print("🔍 Scanning media directory...")
        
        # Define metadata for demo files
        demo_metadata = {
            'audio/sample_lecture.mp3': {
                'category': 'university',
                'title': 'Physics of Blockchain',
                'artist': 'Dr. James Liu',
                'description': 'Audio lecture on thermodynamics applied to distributed systems',
                'duration': '45:20'
            },
            'video/quantum_lecture.mp4': {
                'category': 'university',
                'title': 'Quantum Mechanics Lecture 1',
                'artist': 'Prof. Sarah Chen',
                'description': 'Introduction to wave-particle duality and the foundations of quantum mechanics',
                'duration': '01:32:15'
            },
            'docs/math_textbook.pdf': {
                'category': 'university',
                'title': 'Advanced Mathematics Textbook',
                'artist': 'MIT OpenCourseWare',
                'description': 'Complete calculus and linear algebra reference',
                'duration': 'PDF'
            }
        }
        
        # Scan all media subdirectories
        for media_type in ['audio', 'video', 'docs']:
            media_dir = self.MEDIA_BASE_PATH / media_type
            
            if not media_dir.exists():
                continue
            
            for filepath in media_dir.glob('*'):
                if filepath.is_file() and not filepath.name.startswith('.'):
                    # Get metadata
                    rel_path = f"{media_type}/{filepath.name}"
                    metadata = demo_metadata.get(rel_path, {
                        'category': 'university',
                        'title': filepath.stem,
                        'artist': 'Unknown',
                        'description': f'{media_type.capitalize()} file',
                        'duration': 'Unknown'
                    })
                    
                    # Ingest file
                    self.ingest_file(
                        str(filepath),
                        **metadata
                    )
        
        print(f"✅ Scan complete: {len(self.media_library)} files in library")

# Global instance
media_manager = WNSPMediaFileManager()
