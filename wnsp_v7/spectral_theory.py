"""
WNSP v7.0 — Spectral Theory Module
===================================

Mathematical foundations for the Lambda Boson substrate using spectral theory.

Core Components:
1. Resolution of Identity - Decomposition via orthonormal basis
2. Resolvent Operator - R(λ) = (λI - L)⁻¹
3. Green's Function - Kernel for operator equations
4. Rayleigh Quotient - Eigenvalue optimization

Physics Connection:
- Spectral bands ARE eigenvalue domains
- Lambda mass eigenvalues determine authority levels
- Green's functions propagate oscillation states
- Rayleigh quotient optimizes energy distribution

Author: NexusOS / WNSP Protocol
License: GPL v3.0
"""

import math
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Callable, Any
from enum import Enum

try:
    from .protocol import PLANCK_CONSTANT, SPEED_OF_LIGHT
except ImportError:
    PLANCK_CONSTANT = 6.62607015e-34
    SPEED_OF_LIGHT = 299792458


@dataclass
class BasisFunction:
    """
    A basis function in the spectral decomposition.
    
    In WNSP context, each basis function corresponds to a wavelength mode.
    """
    index: int
    frequency: float
    amplitude: float = 1.0
    phase: float = 0.0
    label: str = ""
    
    def __post_init__(self):
        if not self.label:
            self.label = f"e_{self.index}"
    
    @property
    def wavelength(self) -> float:
        """λ = c/f"""
        return SPEED_OF_LIGHT / self.frequency if self.frequency > 0 else float('inf')
    
    @property
    def energy(self) -> float:
        """E = hf"""
        return PLANCK_CONSTANT * self.frequency
    
    @property
    def lambda_mass(self) -> float:
        """Λ = hf/c²"""
        return self.energy / (SPEED_OF_LIGHT ** 2)
    
    def evaluate(self, x: float) -> complex:
        """Evaluate basis function at point x."""
        return self.amplitude * np.exp(1j * (2 * np.pi * self.frequency * x + self.phase))
    
    def inner_product(self, other: 'BasisFunction', domain: Tuple[float, float] = (0, 1)) -> complex:
        """
        Compute inner product <self|other>.
        
        For orthonormal basis: <e_i|e_j> = δ_ij
        """
        if self.index == other.index:
            return complex(1.0, 0.0)
        return complex(0.0, 0.0)


@dataclass
class SpectralBasis:
    """
    A complete spectral basis for the Lambda Boson substrate.
    
    Resolution of Identity:
    I = Σ |e_i><e_i|
    
    Any function ψ can be expanded:
    ψ = Σ c_i |e_i>  where c_i = <e_i|ψ>
    """
    functions: List[BasisFunction] = field(default_factory=list)
    dimension: int = 0
    
    def __post_init__(self):
        if not self.dimension:
            self.dimension = len(self.functions)
    
    @classmethod
    def from_frequency_range(cls, f_min: float, f_max: float, n_modes: int) -> 'SpectralBasis':
        """Create basis spanning a frequency range."""
        functions = []
        freq_step = (f_max - f_min) / max(n_modes - 1, 1)
        
        for i in range(n_modes):
            freq = f_min + i * freq_step
            functions.append(BasisFunction(
                index=i,
                frequency=freq,
                label=f"λ_{i}"
            ))
        
        return cls(functions=functions, dimension=n_modes)
    
    @classmethod
    def from_wavelength_range(cls, lambda_min_nm: float, lambda_max_nm: float, n_modes: int) -> 'SpectralBasis':
        """Create basis spanning a wavelength range (visible spectrum)."""
        f_min = SPEED_OF_LIGHT / (lambda_max_nm * 1e-9)
        f_max = SPEED_OF_LIGHT / (lambda_min_nm * 1e-9)
        return cls.from_frequency_range(f_min, f_max, n_modes)
    
    def resolve_identity(self) -> np.ndarray:
        """
        Compute resolution of identity matrix.
        
        I = Σ |e_i><e_i| = identity matrix for orthonormal basis
        """
        return np.eye(self.dimension)
    
    def project(self, coefficients: np.ndarray) -> np.ndarray:
        """
        Project coefficients onto the basis.
        
        ψ = Σ c_i |e_i>
        """
        if len(coefficients) != self.dimension:
            raise ValueError(f"Coefficient dimension {len(coefficients)} != basis dimension {self.dimension}")
        return coefficients
    
    def expand(self, signal_values: np.ndarray) -> np.ndarray:
        """
        Expand a signal in terms of basis coefficients.
        
        c_i = <e_i|ψ> (generalized Fourier coefficients)
        """
        return signal_values
    
    def total_lambda_mass(self) -> float:
        """Total Lambda mass across all basis functions."""
        return sum(bf.lambda_mass for bf in self.functions)


@dataclass
class LinearOperator:
    """
    A linear operator on the spectral space.
    
    Represented by its matrix elements O_ij = <e_i|O|e_j>
    """
    matrix: np.ndarray
    basis: SpectralBasis
    name: str = "O"
    
    @property
    def dimension(self) -> int:
        return self.matrix.shape[0]
    
    @property
    def eigenvalues(self) -> np.ndarray:
        """Compute eigenvalues of the operator."""
        return np.linalg.eigvals(self.matrix)
    
    @property
    def eigenpairs(self) -> Tuple[np.ndarray, np.ndarray]:
        """Compute eigenvalues and eigenvectors."""
        return np.linalg.eig(self.matrix)
    
    def apply(self, state: np.ndarray) -> np.ndarray:
        """Apply operator to a state: O|ψ>"""
        return self.matrix @ state
    
    def expectation_value(self, state: np.ndarray) -> complex:
        """Compute <ψ|O|ψ>"""
        return np.conj(state) @ self.matrix @ state
    
    def commutator(self, other: 'LinearOperator') -> 'LinearOperator':
        """Compute [A, B] = AB - BA"""
        comm_matrix = self.matrix @ other.matrix - other.matrix @ self.matrix
        return LinearOperator(
            matrix=comm_matrix,
            basis=self.basis,
            name=f"[{self.name}, {other.name}]"
        )
    
    def dyad_expansion(self) -> List[Tuple[complex, np.ndarray]]:
        """
        Dyad expansion of operator using eigenvectors.
        
        L = Σ λ_i |ψ_i><ψ_i|
        """
        eigenvalues, eigenvectors = self.eigenpairs
        return [(eigenvalues[i], eigenvectors[:, i]) for i in range(len(eigenvalues))]


class ResolventOperator:
    """
    The resolvent operator R(λ) = (λI - L)⁻¹
    
    Key properties:
    - Poles at eigenvalues of L
    - Used to construct Green's functions
    - Enables solution of operator equations
    """
    
    def __init__(self, operator: LinearOperator):
        self.operator = operator
        self.L = operator.matrix
        self.n = operator.dimension
    
    def evaluate(self, lambda_val: complex) -> np.ndarray:
        """
        Compute R(λ) = (λI - L)⁻¹
        
        Warning: Singular at eigenvalues of L
        """
        lambda_I = lambda_val * np.eye(self.n)
        try:
            return np.linalg.inv(lambda_I - self.L)
        except np.linalg.LinAlgError:
            return np.full((self.n, self.n), np.inf)
    
    def apply(self, state: np.ndarray, lambda_val: complex) -> np.ndarray:
        """
        Apply resolvent to a state: R(λ)|φ>
        
        Using eigendecomposition:
        R(λ)|φ> = Σ <ψ_i|φ> / (λ - λ_i) |ψ_i>
        """
        eigenvalues, eigenvectors = self.operator.eigenpairs
        result = np.zeros(self.n, dtype=complex)
        
        for i in range(self.n):
            ev = eigenvectors[:, i]
            proj = np.conj(ev) @ state
            denom = lambda_val - eigenvalues[i]
            
            if abs(denom) > 1e-10:
                result += (proj / denom) * ev
            else:
                result += proj * 1e10 * ev
        
        return result
    
    def poles(self) -> np.ndarray:
        """Return the poles (eigenvalues of L)."""
        return self.operator.eigenvalues
    
    def residue(self, eigenvalue_index: int) -> Tuple[complex, np.ndarray]:
        """
        Compute residue at a pole.
        
        Res(R, λ_i) = |ψ_i><ψ_i|
        """
        eigenvalues, eigenvectors = self.operator.eigenpairs
        ev = eigenvalues[eigenvalue_index]
        evec = eigenvectors[:, eigenvalue_index]
        return (ev, np.outer(evec, np.conj(evec)))


class GreensFunction:
    """
    Green's function for operator L.
    
    G(x, y; λ) satisfies: (L - λ)G(x, y; λ) = δ(x - y)
    
    In spectral representation:
    G = Σ ψ_i(x) ψ_i*(y) / (λ_i - λ)
    """
    
    def __init__(self, operator: LinearOperator):
        self.operator = operator
        self.resolvent = ResolventOperator(operator)
        self._eigenvalues, self._eigenvectors = operator.eigenpairs
    
    def evaluate(self, x_index: int, y_index: int, lambda_val: complex) -> complex:
        """
        Compute G(x, y; λ) = Σ ψ_i(x) ψ_i*(y) / (λ_i - λ)
        
        x_index, y_index are discrete positions in the spectral basis.
        """
        result = complex(0, 0)
        
        for i in range(len(self._eigenvalues)):
            ev = self._eigenvalues[i]
            evec = self._eigenvectors[:, i]
            
            denom = ev - lambda_val
            if abs(denom) > 1e-10:
                result += evec[x_index] * np.conj(evec[y_index]) / denom
        
        return result
    
    def matrix_form(self, lambda_val: complex) -> np.ndarray:
        """
        Compute full Green's function matrix G_xy(λ).
        """
        n = self.operator.dimension
        G = np.zeros((n, n), dtype=complex)
        
        for i in range(n):
            for j in range(n):
                G[i, j] = self.evaluate(i, j, lambda_val)
        
        return G
    
    def solve_inhomogeneous(self, source: np.ndarray, lambda_val: complex = 0) -> np.ndarray:
        """
        Solve (L - λ)ψ = h
        
        Solution: ψ = Σ G(x, y; λ) h(y) = G × h
        """
        G = self.matrix_form(lambda_val)
        return G @ source


class RayleighQuotient:
    """
    Rayleigh quotient optimization for finding eigenvalues.
    
    R(x) = <x|M|x> / <x|x>
    
    Theorem: Maximum of R(x) equals largest eigenvalue of M,
    achieved by the corresponding eigenvector.
    """
    
    def __init__(self, matrix: np.ndarray):
        if not np.allclose(matrix, matrix.T):
            raise ValueError("Rayleigh quotient requires symmetric matrix")
        self.matrix = matrix
        self.n = matrix.shape[0]
    
    def evaluate(self, x: np.ndarray) -> float:
        """
        Compute Rayleigh quotient: R(x) = <x|M|x> / <x|x>
        """
        if np.linalg.norm(x) < 1e-10:
            return 0.0
        
        numerator = np.conj(x) @ self.matrix @ x
        denominator = np.conj(x) @ x
        
        return float(np.real(numerator / denominator))
    
    def gradient(self, x: np.ndarray) -> np.ndarray:
        """
        Compute gradient of Rayleigh quotient.
        
        ∇R = 2(M - R(x)I)x / <x|x>
        """
        norm_sq = np.conj(x) @ x
        if abs(norm_sq) < 1e-10:
            return np.zeros(self.n)
        
        R = self.evaluate(x)
        return 2 * (self.matrix @ x - R * x) / norm_sq
    
    def find_maximum(self, max_iterations: int = 100, tolerance: float = 1e-8) -> Tuple[float, np.ndarray]:
        """
        Find maximum eigenvalue via power iteration.
        
        Returns: (eigenvalue, eigenvector)
        """
        x = np.random.randn(self.n)
        x = x / np.linalg.norm(x)
        
        for _ in range(max_iterations):
            y = self.matrix @ x
            y_norm = np.linalg.norm(y)
            
            if y_norm < 1e-10:
                break
            
            x_new = y / y_norm
            
            if np.linalg.norm(x_new - x) < tolerance:
                break
            
            x = x_new
        
        eigenvalue = self.evaluate(x)
        return (eigenvalue, x)
    
    def find_minimum(self, max_iterations: int = 100, tolerance: float = 1e-8) -> Tuple[float, np.ndarray]:
        """
        Find minimum eigenvalue via inverse power iteration.
        
        Returns: (eigenvalue, eigenvector)
        """
        x = np.random.randn(self.n)
        x = x / np.linalg.norm(x)
        
        try:
            M_inv = np.linalg.inv(self.matrix)
        except np.linalg.LinAlgError:
            M_inv = np.linalg.pinv(self.matrix)
        
        for _ in range(max_iterations):
            y = M_inv @ x
            y_norm = np.linalg.norm(y)
            
            if y_norm < 1e-10:
                break
            
            x_new = y / y_norm
            
            if np.linalg.norm(x_new - x) < tolerance:
                break
            
            x = x_new
        
        eigenvalue = self.evaluate(x)
        return (eigenvalue, x)
    
    def parseval_bound(self, x: np.ndarray) -> Tuple[float, float]:
        """
        Use Parseval's identity to bound eigenvalues.
        
        For normalized eigenvector expansion: Σ|a_i|² = 1
        R(x) = Σ λ_i |a_i|² ≤ λ_max
        """
        eigenvalues = np.linalg.eigvalsh(self.matrix)
        return (float(np.min(eigenvalues)), float(np.max(eigenvalues)))


@dataclass
class SpectralDecomposition:
    """
    Complete spectral decomposition of an operator.
    
    Combines all spectral theory components for the Lambda Boson substrate.
    """
    operator: LinearOperator
    
    def __post_init__(self):
        self.resolvent = ResolventOperator(self.operator)
        self.greens_function = GreensFunction(self.operator)
        
        if np.allclose(self.operator.matrix, self.operator.matrix.T):
            self.rayleigh = RayleighQuotient(self.operator.matrix)
        else:
            self.rayleigh = None
    
    def spectrum(self) -> Dict[str, Any]:
        """Return full spectral information."""
        eigenvalues, eigenvectors = self.operator.eigenpairs
        
        result = {
            "eigenvalues": eigenvalues.tolist(),
            "eigenvector_norms": [np.linalg.norm(eigenvectors[:, i]) for i in range(len(eigenvalues))],
            "spectral_radius": float(np.max(np.abs(eigenvalues))),
            "trace": float(np.sum(eigenvalues)),
            "determinant": float(np.prod(eigenvalues)),
            "is_hermitian": np.allclose(self.operator.matrix, self.operator.matrix.conj().T)
        }
        
        if self.rayleigh:
            bounds = self.rayleigh.parseval_bound(np.ones(self.operator.dimension))
            result["eigenvalue_bounds"] = {"min": bounds[0], "max": bounds[1]}
        
        return result
    
    def lambda_mass_spectrum(self) -> List[Dict[str, float]]:
        """
        Map eigenvalues to Lambda mass equivalents.
        
        Each eigenvalue λ_i corresponds to a frequency f_i,
        giving Lambda mass Λ_i = hf_i/c²
        """
        eigenvalues = self.operator.eigenvalues
        spectrum = []
        
        for i, ev in enumerate(eigenvalues):
            freq = float(np.abs(ev))
            energy = PLANCK_CONSTANT * freq
            lambda_mass = energy / (SPEED_OF_LIGHT ** 2)
            
            spectrum.append({
                "mode": i,
                "eigenvalue": complex(ev),
                "frequency_hz": freq,
                "energy_j": energy,
                "lambda_mass_kg": lambda_mass,
                "wavelength_m": SPEED_OF_LIGHT / freq if freq > 0 else float('inf')
            })
        
        return spectrum
    
    def solve_operator_equation(self, source: np.ndarray, lambda_val: complex = 0) -> np.ndarray:
        """
        Solve (L - λ)ψ = h using Green's function.
        """
        return self.greens_function.solve_inhomogeneous(source, lambda_val)
    
    def to_dict(self) -> Dict[str, Any]:
        """Export spectral decomposition as dictionary."""
        return {
            "operator_name": self.operator.name,
            "dimension": self.operator.dimension,
            "spectrum": self.spectrum(),
            "lambda_mass_spectrum": self.lambda_mass_spectrum(),
            "resolvent_poles": self.resolvent.poles().tolist()
        }


def create_lambda_operator(basis: SpectralBasis) -> LinearOperator:
    """
    Create the Lambda mass operator for a spectral basis.
    
    Diagonal in the frequency basis:
    L_ij = δ_ij × Λ_i = δ_ij × hf_i/c²
    """
    n = basis.dimension
    matrix = np.zeros((n, n))
    
    for i, bf in enumerate(basis.functions):
        matrix[i, i] = bf.lambda_mass
    
    return LinearOperator(
        matrix=matrix,
        basis=basis,
        name="Λ"
    )


def create_energy_operator(basis: SpectralBasis) -> LinearOperator:
    """
    Create the energy operator H = hf (Planck relation).
    
    Diagonal in frequency basis: H_ij = δ_ij × hf_i
    """
    n = basis.dimension
    matrix = np.zeros((n, n))
    
    for i, bf in enumerate(basis.functions):
        matrix[i, i] = bf.energy
    
    return LinearOperator(
        matrix=matrix,
        basis=basis,
        name="H"
    )


def create_coupling_operator(basis: SpectralBasis, coupling_strength: float = 0.1) -> LinearOperator:
    """
    Create a coupling operator between adjacent modes.
    
    Models resonance between neighboring frequencies.
    """
    n = basis.dimension
    matrix = np.zeros((n, n))
    
    for i in range(n):
        matrix[i, i] = basis.functions[i].energy
        
        if i > 0:
            matrix[i, i-1] = coupling_strength * np.sqrt(basis.functions[i].energy * basis.functions[i-1].energy)
            matrix[i-1, i] = matrix[i, i-1]
    
    return LinearOperator(
        matrix=matrix,
        basis=basis,
        name="H_coupled"
    )
