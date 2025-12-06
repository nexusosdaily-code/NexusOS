"""
WIP Research API Endpoints
==========================

RESTful API for programmatic access to the Scientific Research Platform.
Provides endpoints for experiments, analysis, reports, and data collection.

Core Physics: Λ = hf/c² (Lambda Boson - mass-equivalent of oscillation)

Author: NexusOS / WNSP Protocol
License: GNU GPLv3
"""

from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum
import numpy as np
import pandas as pd
import json
import uuid


# =============================================================================
# PHYSICAL CONSTANTS
# =============================================================================

PLANCK_CONSTANT = 6.62607015e-34  # J·s
SPEED_OF_LIGHT = 299792458  # m/s
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K


# =============================================================================
# API ROUTER
# =============================================================================

router = APIRouter(prefix="/api/research", tags=["Research Platform"])


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class ExperimentCategory(str, Enum):
    SPECTRAL = "spectral"
    ECONOMIC = "economic"
    NETWORK = "network"
    CRYPTOGRAPHIC = "cryptographic"
    THERMAL = "thermal"
    QUANTUM = "quantum"


class ReportFormat(str, Enum):
    EXECUTIVE = "executive"
    TECHNICAL = "technical"
    ACADEMIC = "academic"
    PATENT = "patent"
    INVESTOR = "investor"


class PhysicsCalculationRequest(BaseModel):
    """Request for physics calculations."""
    frequency: Optional[float] = Field(None, description="Frequency in Hz")
    wavelength: Optional[float] = Field(None, description="Wavelength in meters")
    energy: Optional[float] = Field(None, description="Energy in Joules")
    temperature: Optional[float] = Field(None, description="Temperature in Kelvin")


class PhysicsCalculationResponse(BaseModel):
    """Response with calculated physics values."""
    frequency: float
    wavelength: float
    energy: float
    lambda_mass: float
    momentum: float
    energy_ev: float
    color_hex: Optional[str]
    spectral_region: str


class ExperimentDesignRequest(BaseModel):
    """Request to create experiment design."""
    name: str
    category: ExperimentCategory
    hypothesis: str
    description: str = ""
    iterations: int = Field(default=1000, ge=10, le=100000)
    variables: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    parameters: Dict[str, float] = Field(default_factory=dict)


class ExperimentDesignResponse(BaseModel):
    """Response with experiment design."""
    experiment_id: str
    name: str
    category: str
    hypothesis: str
    description: str
    iterations: int
    variables: Dict[str, Dict[str, Any]]
    parameters: Dict[str, float]
    created_at: str
    status: str


class SimulationRequest(BaseModel):
    """Request to run simulation."""
    experiment_id: str
    parameters: Dict[str, float] = Field(default_factory=dict)
    seed: Optional[int] = None


class SimulationResult(BaseModel):
    """Single simulation result."""
    iteration: int
    frequency: float
    energy: float
    lambda_mass: float
    wavelength: float
    momentum: float
    anomaly_detected: bool
    outputs: Dict[str, float]


class SimulationResponse(BaseModel):
    """Response with simulation results."""
    experiment_id: str
    run_id: str
    iterations: int
    results: List[SimulationResult]
    anomalies_detected: int
    execution_time_ms: float


class AnalysisRequest(BaseModel):
    """Request for statistical analysis."""
    data: List[Dict[str, float]]
    variables: List[str] = Field(default_factory=list)
    confidence_level: float = Field(default=0.95, ge=0.8, le=0.99)


class AnalysisResponse(BaseModel):
    """Response with statistical analysis."""
    sample_size: int
    mean: Dict[str, float]
    std_dev: Dict[str, float]
    variance: Dict[str, float]
    min_values: Dict[str, float]
    max_values: Dict[str, float]
    confidence_intervals: Dict[str, List[float]]
    correlation_matrix: Dict[str, Dict[str, float]]
    hypothesis_result: str
    p_value: float
    t_statistic: float
    effect_size: float


class ReportRequest(BaseModel):
    """Request to generate report."""
    experiment_id: str
    format: ReportFormat
    include_visualizations: bool = False


class ReportResponse(BaseModel):
    """Response with generated report."""
    report_id: str
    experiment_id: str
    format: str
    generated_at: str
    content: str
    sections: Dict[str, str]


class DataCollectionRequest(BaseModel):
    """Request for data collection session."""
    experiment_id: str
    sensors: List[str] = Field(default_factory=lambda: ["frequency", "energy", "lambda_mass"])
    sample_count: int = Field(default=100, ge=1, le=10000)
    base_frequency: float = Field(default=5.45e14)


class DataCollectionResponse(BaseModel):
    """Response with collected data."""
    session_id: str
    experiment_id: str
    sample_count: int
    sensors: List[str]
    data: List[Dict[str, Any]]
    physics_validation: Dict[str, Any]


# =============================================================================
# IN-MEMORY STORAGE (For demo - replace with DB in production)
# =============================================================================

experiments_db: Dict[str, Dict] = {}
simulations_db: Dict[str, Dict] = {}
sessions_db: Dict[str, Dict] = {}


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def wavelength_to_rgb(wavelength_nm: float) -> str:
    """Convert wavelength to hex color."""
    wavelength = wavelength_nm
    
    if wavelength < 380:
        r, g, b = 0.5, 0, 0.5
    elif wavelength < 440:
        r = -(wavelength - 440) / (440 - 380)
        g = 0
        b = 1
    elif wavelength < 490:
        r = 0
        g = (wavelength - 440) / (490 - 440)
        b = 1
    elif wavelength < 510:
        r = 0
        g = 1
        b = -(wavelength - 510) / (510 - 490)
    elif wavelength < 580:
        r = (wavelength - 510) / (580 - 510)
        g = 1
        b = 0
    elif wavelength < 645:
        r = 1
        g = -(wavelength - 645) / (645 - 580)
        b = 0
    elif wavelength <= 780:
        r = 1
        g = 0
        b = 0
    else:
        r, g, b = 0.5, 0, 0
    
    r = int(255 * min(1, max(0, r)))
    g = int(255 * min(1, max(0, g)))
    b = int(255 * min(1, max(0, b)))
    
    return f'#{r:02x}{g:02x}{b:02x}'


def get_spectral_region(wavelength_nm: float) -> str:
    """Get spectral region name from wavelength."""
    if wavelength_nm < 380:
        return "Ultraviolet"
    elif wavelength_nm < 450:
        return "Violet"
    elif wavelength_nm < 495:
        return "Blue"
    elif wavelength_nm < 570:
        return "Green"
    elif wavelength_nm < 590:
        return "Yellow"
    elif wavelength_nm < 620:
        return "Orange"
    elif wavelength_nm < 780:
        return "Red"
    else:
        return "Infrared"


# =============================================================================
# PHYSICS ENDPOINTS
# =============================================================================

@router.post("/physics/calculate", response_model=PhysicsCalculationResponse)
async def calculate_physics(request: PhysicsCalculationRequest):
    """
    Calculate physics values from any input parameter.
    
    Provide frequency, wavelength, or energy to calculate all related values
    using Lambda Boson physics (Λ = hf/c²).
    """
    if request.frequency:
        frequency = request.frequency
    elif request.wavelength:
        frequency = SPEED_OF_LIGHT / request.wavelength
    elif request.energy:
        frequency = request.energy / PLANCK_CONSTANT
    else:
        raise HTTPException(400, "Must provide frequency, wavelength, or energy")
    
    energy = PLANCK_CONSTANT * frequency
    wavelength = SPEED_OF_LIGHT / frequency
    lambda_mass = energy / (SPEED_OF_LIGHT ** 2)
    momentum = energy / SPEED_OF_LIGHT
    energy_ev = energy / 1.602176634e-19
    
    wavelength_nm = wavelength * 1e9
    color_hex = wavelength_to_rgb(wavelength_nm) if 380 <= wavelength_nm <= 780 else None
    spectral_region = get_spectral_region(wavelength_nm)
    
    return PhysicsCalculationResponse(
        frequency=frequency,
        wavelength=wavelength,
        energy=energy,
        lambda_mass=lambda_mass,
        momentum=momentum,
        energy_ev=energy_ev,
        color_hex=color_hex,
        spectral_region=spectral_region
    )


@router.get("/physics/constants")
async def get_physics_constants():
    """Get fundamental physics constants used in the system."""
    return {
        "planck_constant": {
            "value": PLANCK_CONSTANT,
            "unit": "J·s",
            "symbol": "h",
            "description": "Planck's constant"
        },
        "speed_of_light": {
            "value": SPEED_OF_LIGHT,
            "unit": "m/s",
            "symbol": "c",
            "description": "Speed of light in vacuum"
        },
        "boltzmann_constant": {
            "value": BOLTZMANN_CONSTANT,
            "unit": "J/K",
            "symbol": "k",
            "description": "Boltzmann constant"
        },
        "lambda_boson_equation": "Λ = hf/c²",
        "energy_equation": "E = hf",
        "wavelength_equation": "λ = c/f"
    }


@router.get("/physics/spectrum")
async def get_spectrum_data(
    min_wavelength: float = Query(380, description="Minimum wavelength in nm"),
    max_wavelength: float = Query(780, description="Maximum wavelength in nm"),
    points: int = Query(50, ge=10, le=500, description="Number of data points")
):
    """Get electromagnetic spectrum data with calculated physics values."""
    wavelengths = np.linspace(min_wavelength, max_wavelength, points)
    
    data = []
    for wl in wavelengths:
        frequency = SPEED_OF_LIGHT / (wl * 1e-9)
        energy = PLANCK_CONSTANT * frequency
        lambda_mass = energy / (SPEED_OF_LIGHT ** 2)
        
        data.append({
            "wavelength_nm": float(wl),
            "frequency_hz": float(frequency),
            "energy_j": float(energy),
            "energy_ev": float(energy / 1.602176634e-19),
            "lambda_mass_kg": float(lambda_mass),
            "color_hex": wavelength_to_rgb(wl),
            "region": get_spectral_region(wl)
        })
    
    return {"spectrum": data, "count": len(data)}


# =============================================================================
# EXPERIMENT ENDPOINTS
# =============================================================================

@router.post("/experiments", response_model=ExperimentDesignResponse)
async def create_experiment(request: ExperimentDesignRequest):
    """Create a new experiment design."""
    experiment_id = f"EXP-{uuid.uuid4().hex[:8].upper()}"
    
    experiment = {
        "experiment_id": experiment_id,
        "name": request.name,
        "category": request.category.value,
        "hypothesis": request.hypothesis,
        "description": request.description,
        "iterations": request.iterations,
        "variables": request.variables,
        "parameters": request.parameters,
        "created_at": datetime.utcnow().isoformat(),
        "status": "created"
    }
    
    experiments_db[experiment_id] = experiment
    
    return ExperimentDesignResponse(**experiment)


@router.get("/experiments")
async def list_experiments(
    category: Optional[ExperimentCategory] = None,
    limit: int = Query(20, ge=1, le=100)
):
    """List all experiments, optionally filtered by category."""
    experiments = list(experiments_db.values())
    
    if category:
        experiments = [e for e in experiments if e["category"] == category.value]
    
    return {"experiments": experiments[:limit], "total": len(experiments)}


@router.get("/experiments/{experiment_id}", response_model=ExperimentDesignResponse)
async def get_experiment(experiment_id: str):
    """Get experiment by ID."""
    if experiment_id not in experiments_db:
        raise HTTPException(404, f"Experiment {experiment_id} not found")
    
    return ExperimentDesignResponse(**experiments_db[experiment_id])


@router.delete("/experiments/{experiment_id}")
async def delete_experiment(experiment_id: str):
    """Delete experiment by ID."""
    if experiment_id not in experiments_db:
        raise HTTPException(404, f"Experiment {experiment_id} not found")
    
    del experiments_db[experiment_id]
    return {"message": f"Experiment {experiment_id} deleted"}


# =============================================================================
# SIMULATION ENDPOINTS
# =============================================================================

@router.post("/simulations/run", response_model=SimulationResponse)
async def run_simulation(request: SimulationRequest):
    """Run Monte Carlo simulation for an experiment."""
    import time
    start_time = time.time()
    
    if request.experiment_id not in experiments_db:
        raise HTTPException(404, f"Experiment {request.experiment_id} not found")
    
    experiment = experiments_db[request.experiment_id]
    iterations = experiment["iterations"]
    
    if request.seed:
        np.random.seed(request.seed)
    
    base_freq = request.parameters.get("frequency", 5e14)
    
    results = []
    anomalies = 0
    
    for i in range(iterations):
        noise = np.random.normal(1.0, 0.05)
        frequency = base_freq * noise
        
        energy = PLANCK_CONSTANT * frequency
        lambda_mass = energy / (SPEED_OF_LIGHT ** 2)
        wavelength = SPEED_OF_LIGHT / frequency
        momentum = energy / SPEED_OF_LIGHT
        
        anomaly = abs(noise - 1.0) > 0.15
        if anomaly:
            anomalies += 1
        
        results.append(SimulationResult(
            iteration=i,
            frequency=frequency,
            energy=energy,
            lambda_mass=lambda_mass,
            wavelength=wavelength,
            momentum=momentum,
            anomaly_detected=anomaly,
            outputs={
                "thermal_energy": BOLTZMANN_CONSTANT * 300 * noise,
                "spectral_density": energy * frequency
            }
        ))
    
    run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
    execution_time = (time.time() - start_time) * 1000
    
    simulations_db[run_id] = {
        "experiment_id": request.experiment_id,
        "run_id": run_id,
        "iterations": iterations,
        "anomalies": anomalies,
        "execution_time_ms": execution_time
    }
    
    experiments_db[request.experiment_id]["status"] = "simulated"
    
    return SimulationResponse(
        experiment_id=request.experiment_id,
        run_id=run_id,
        iterations=iterations,
        results=results[:100],  # Return first 100 for API response
        anomalies_detected=anomalies,
        execution_time_ms=execution_time
    )


@router.get("/simulations/{run_id}")
async def get_simulation(run_id: str):
    """Get simulation run details."""
    if run_id not in simulations_db:
        raise HTTPException(404, f"Simulation run {run_id} not found")
    
    return simulations_db[run_id]


# =============================================================================
# ANALYSIS ENDPOINTS
# =============================================================================

@router.post("/analysis/statistical", response_model=AnalysisResponse)
async def perform_analysis(request: AnalysisRequest):
    """Perform statistical analysis on provided data."""
    if not request.data:
        raise HTTPException(400, "No data provided")
    
    df = pd.DataFrame(request.data)
    
    if request.variables:
        variables = [v for v in request.variables if v in df.columns]
    else:
        variables = list(df.select_dtypes(include=[np.number]).columns)
    
    if not variables:
        raise HTTPException(400, "No numeric variables found")
    
    # Calculate statistics
    mean = {v: float(df[v].mean()) for v in variables}
    std_dev = {v: float(df[v].std()) for v in variables}
    variance = {v: float(df[v].var()) for v in variables}
    min_vals = {v: float(df[v].min()) for v in variables}
    max_vals = {v: float(df[v].max()) for v in variables}
    
    # Confidence intervals
    from scipy import stats
    n = len(df)
    alpha = 1 - request.confidence_level
    
    ci = {}
    for v in variables:
        se = std_dev[v] / np.sqrt(n)
        t_crit = stats.t.ppf(1 - alpha/2, n-1)
        ci[v] = [mean[v] - t_crit * se, mean[v] + t_crit * se]
    
    # Correlation matrix
    corr_df = df[variables].corr()
    correlation = {v: {v2: float(corr_df.loc[v, v2]) for v2 in variables} for v in variables}
    
    # Hypothesis test (one-sample t-test against 0)
    first_var = variables[0]
    t_stat, p_value = stats.ttest_1samp(df[first_var], 0)
    
    # Effect size (Cohen's d)
    effect_size = mean[first_var] / std_dev[first_var] if std_dev[first_var] > 0 else 0
    
    hypothesis_result = "Reject null hypothesis" if p_value < 0.05 else "Fail to reject null hypothesis"
    
    return AnalysisResponse(
        sample_size=n,
        mean=mean,
        std_dev=std_dev,
        variance=variance,
        min_values=min_vals,
        max_values=max_vals,
        confidence_intervals=ci,
        correlation_matrix=correlation,
        hypothesis_result=hypothesis_result,
        p_value=float(p_value),
        t_statistic=float(t_stat),
        effect_size=float(effect_size)
    )


@router.post("/analysis/lambda-validation")
async def validate_lambda_physics(request: AnalysisRequest):
    """Validate that data follows Lambda Boson physics (Λ = hf/c²)."""
    df = pd.DataFrame(request.data)
    
    validations = {}
    
    # Check E = hf
    if 'frequency' in df.columns and 'energy' in df.columns:
        expected_E = PLANCK_CONSTANT * df['frequency']
        actual_E = df['energy']
        deviation = np.abs(expected_E - actual_E) / expected_E
        validations['E_hf'] = {
            "equation": "E = hf",
            "mean_deviation": float(deviation.mean()),
            "max_deviation": float(deviation.max()),
            "valid": float(deviation.mean()) < 0.05
        }
    
    # Check Λ = hf/c²
    if 'frequency' in df.columns and 'lambda_mass' in df.columns:
        expected_L = (PLANCK_CONSTANT * df['frequency']) / (SPEED_OF_LIGHT ** 2)
        actual_L = df['lambda_mass']
        deviation = np.abs(expected_L - actual_L) / expected_L
        validations['Lambda_hf_c2'] = {
            "equation": "Λ = hf/c²",
            "mean_deviation": float(deviation.mean()),
            "max_deviation": float(deviation.max()),
            "valid": float(deviation.mean()) < 0.05
        }
    
    # Check λ = c/f
    if 'frequency' in df.columns and 'wavelength' in df.columns:
        expected_w = SPEED_OF_LIGHT / df['frequency']
        actual_w = df['wavelength']
        deviation = np.abs(expected_w - actual_w) / expected_w
        validations['wavelength_c_f'] = {
            "equation": "λ = c/f",
            "mean_deviation": float(deviation.mean()),
            "max_deviation": float(deviation.max()),
            "valid": float(deviation.mean()) < 0.05
        }
    
    all_valid = all(v.get('valid', False) for v in validations.values())
    
    return {
        "validations": validations,
        "all_valid": all_valid,
        "sample_size": len(df)
    }


# =============================================================================
# REPORT ENDPOINTS
# =============================================================================

@router.post("/reports/generate", response_model=ReportResponse)
async def generate_report(request: ReportRequest):
    """Generate report for an experiment."""
    if request.experiment_id not in experiments_db:
        raise HTTPException(404, f"Experiment {request.experiment_id} not found")
    
    experiment = experiments_db[request.experiment_id]
    report_id = f"RPT-{uuid.uuid4().hex[:8].upper()}"
    
    # Generate report content based on format
    if request.format == ReportFormat.EXECUTIVE:
        content = f"""
# Executive Summary: {experiment['name']}

## Key Findings
- Hypothesis: {experiment['hypothesis']}
- Category: {experiment['category']}
- Iterations: {experiment['iterations']}

## Bottom Line
Experiment designed and ready for simulation.

## Recommendations
- Run simulation to generate results
- Analyze data for statistical significance
"""
        sections = {
            "summary": "Executive overview",
            "findings": "Key results",
            "recommendations": "Next steps"
        }
    
    elif request.format == ReportFormat.TECHNICAL:
        content = f"""
# Technical Report: {experiment['name']}

## Methodology
- Category: {experiment['category']}
- Physics Basis: Lambda Boson (Λ = hf/c²)
- Iterations: {experiment['iterations']}

## Configuration
Variables: {json.dumps(experiment['variables'], indent=2)}
Parameters: {json.dumps(experiment['parameters'], indent=2)}

## Technical Details
Monte Carlo simulation with Gaussian noise (μ=1.0, σ=0.05)
"""
        sections = {
            "methodology": "Experimental methods",
            "configuration": "Setup details",
            "technical": "Implementation notes"
        }
    
    elif request.format == ReportFormat.ACADEMIC:
        content = f"""
## Abstract

This study investigates {experiment['hypothesis'].lower()} using the Lambda Boson 
physics framework (Λ = hf/c²). Through Monte Carlo simulations, we examine 
frequency-dependent parameters in {experiment['category']} domain.

## 1. Introduction

The Lambda Boson framework provides a novel approach to understanding the 
mass-equivalent of oscillation.

## 2. Methods

{experiment['iterations']} iterations using NexusOS Lambda Boson Physics Engine.

## 3. Results

[Pending simulation]

## 4. Discussion

[Pending analysis]

## References

1. Lambda Boson Theory (2025)
2. NexusOS Physics Framework
"""
        sections = {
            "abstract": "Summary",
            "introduction": "Background",
            "methods": "Methodology",
            "results": "Findings",
            "discussion": "Analysis",
            "references": "Citations"
        }
    
    elif request.format == ReportFormat.PATENT:
        content = f"""
# Patent Application: {experiment['name']}

## Technical Field
This invention relates to {experiment['category']} systems utilizing 
Lambda Boson physics (Λ = hf/c²).

## Claims

### Claim 1
A method for {experiment['category']} optimization comprising:
a) Calculating Lambda mass-equivalent (Λ = hf/c²)
b) Simulating outcomes using physics-based models
c) Analyzing results for statistical significance

### Claim 2
The method of Claim 1, wherein the physics basis includes:
- Planck's relation (E = hf)
- Einstein's mass-energy equivalence (E = mc²)
- Lambda Boson unification (Λ = hf/c²)
"""
        sections = {
            "field": "Technical domain",
            "claims": "Patent claims",
            "description": "Detailed description"
        }
    
    else:  # INVESTOR
        content = f"""
# Investment Brief: {experiment['name']}

## Executive Overview
**Technology**: Lambda Boson Physics Platform
**Application**: {experiment['category'].capitalize()}
**Status**: Ready for Simulation

## Key Metrics
| Metric | Value |
|--------|-------|
| Iterations | {experiment['iterations']} |
| Category | {experiment['category']} |
| Status | {experiment['status']} |

## Competitive Advantage
1. First-mover in Lambda Boson technology
2. Physics-based approach
3. Scalable platform
"""
        sections = {
            "overview": "Executive summary",
            "metrics": "Key numbers",
            "advantage": "Competitive position"
        }
    
    return ReportResponse(
        report_id=report_id,
        experiment_id=request.experiment_id,
        format=request.format.value,
        generated_at=datetime.utcnow().isoformat(),
        content=content,
        sections=sections
    )


# =============================================================================
# DATA COLLECTION ENDPOINTS
# =============================================================================

@router.post("/data/collect", response_model=DataCollectionResponse)
async def collect_data(request: DataCollectionRequest):
    """Collect simulated sensor data for an experiment."""
    session_id = f"SES-{uuid.uuid4().hex[:8].upper()}"
    
    base_freq = request.base_frequency
    data = []
    
    for i in range(request.sample_count):
        noise = np.random.normal(1.0, 0.01)
        frequency = base_freq * noise
        
        sample = {
            "id": i,
            "timestamp": datetime.utcnow().isoformat(),
            "frequency": frequency,
            "energy": PLANCK_CONSTANT * frequency,
            "lambda_mass": (PLANCK_CONSTANT * frequency) / (SPEED_OF_LIGHT ** 2),
            "wavelength": SPEED_OF_LIGHT / frequency,
            "momentum": (PLANCK_CONSTANT * frequency) / SPEED_OF_LIGHT
        }
        
        # Filter to requested sensors
        if request.sensors:
            sample = {k: v for k, v in sample.items() 
                     if k in request.sensors or k in ['id', 'timestamp']}
        
        data.append(sample)
    
    # Physics validation
    df = pd.DataFrame(data)
    validation = {}
    
    if 'frequency' in df.columns and 'energy' in df.columns:
        expected = PLANCK_CONSTANT * df['frequency']
        deviation = np.abs(expected - df['energy']) / expected
        validation['E_hf'] = {
            "valid": float(deviation.mean()) < 0.05,
            "mean_deviation": float(deviation.mean())
        }
    
    sessions_db[session_id] = {
        "session_id": session_id,
        "experiment_id": request.experiment_id,
        "sample_count": request.sample_count,
        "sensors": request.sensors
    }
    
    return DataCollectionResponse(
        session_id=session_id,
        experiment_id=request.experiment_id,
        sample_count=request.sample_count,
        sensors=request.sensors,
        data=data,
        physics_validation=validation
    )


@router.get("/data/sessions")
async def list_data_sessions():
    """List all data collection sessions."""
    return {"sessions": list(sessions_db.values()), "total": len(sessions_db)}


# =============================================================================
# HEALTH & INFO ENDPOINTS
# =============================================================================

@router.get("/health")
async def health_check():
    """API health check."""
    return {
        "status": "healthy",
        "service": "WIP Research API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/info")
async def api_info():
    """Get API information and available endpoints."""
    return {
        "name": "WIP Research API",
        "version": "1.0.0",
        "description": "RESTful API for Wavelength Information Physics research platform",
        "physics_basis": "Lambda Boson (Λ = hf/c²)",
        "endpoints": {
            "physics": [
                "POST /api/research/physics/calculate",
                "GET /api/research/physics/constants",
                "GET /api/research/physics/spectrum"
            ],
            "experiments": [
                "POST /api/research/experiments",
                "GET /api/research/experiments",
                "GET /api/research/experiments/{id}",
                "DELETE /api/research/experiments/{id}"
            ],
            "simulations": [
                "POST /api/research/simulations/run",
                "GET /api/research/simulations/{run_id}"
            ],
            "analysis": [
                "POST /api/research/analysis/statistical",
                "POST /api/research/analysis/lambda-validation"
            ],
            "reports": [
                "POST /api/research/reports/generate"
            ],
            "data": [
                "POST /api/research/data/collect",
                "GET /api/research/data/sessions"
            ]
        },
        "documentation": "/docs"
    }


# =============================================================================
# INTEGRATION WITH MAIN API
# =============================================================================

def include_research_router(app):
    """Include research router in main FastAPI app."""
    app.include_router(router)
    return app
