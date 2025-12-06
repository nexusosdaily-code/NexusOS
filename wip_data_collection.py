"""
WIP Data Collection System
===========================

Data collection infrastructure for Wavelength Information Physics experiments.
Provides sensors, collectors, and measurement recording for Lambda Boson research.

Core Physics: Λ = hf/c² (Lambda Boson - mass-equivalent of oscillation)

Author: NexusOS / WNSP Protocol
License: GNU GPLv3
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field, asdict
from enum import Enum
import json
import hashlib
import uuid
import threading
import time
from collections import deque


# =============================================================================
# PHYSICAL CONSTANTS
# =============================================================================

PLANCK_CONSTANT = 6.62607015e-34  # J·s (exact, SI 2019)
SPEED_OF_LIGHT = 299792458  # m/s (exact)
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K (exact)


# =============================================================================
# DATA STRUCTURES
# =============================================================================

class SensorType(Enum):
    """Types of sensors for WIP experiments."""
    FREQUENCY = "frequency"
    WAVELENGTH = "wavelength"
    ENERGY = "energy"
    INTENSITY = "intensity"
    TEMPERATURE = "temperature"
    POWER = "power"
    PHASE = "phase"
    POLARIZATION = "polarization"
    LAMBDA_MASS = "lambda_mass"
    CUSTOM = "custom"


class DataQuality(Enum):
    """Data quality levels."""
    EXCELLENT = ("excellent", 1.0, "< 0.1% error")
    GOOD = ("good", 0.9, "0.1-1% error")
    ACCEPTABLE = ("acceptable", 0.7, "1-5% error")
    POOR = ("poor", 0.4, "> 5% error")
    INVALID = ("invalid", 0.0, "Data unusable")
    
    def __init__(self, name: str, score: float, description: str):
        self._name = name
        self.score = score
        self.description = description


class CollectionMode(Enum):
    """Data collection modes."""
    CONTINUOUS = "continuous"
    TRIGGERED = "triggered"
    SCHEDULED = "scheduled"
    BURST = "burst"
    SINGLE = "single"


@dataclass
class Measurement:
    """A single measurement reading."""
    id: str
    sensor_id: str
    timestamp: str
    value: float
    unit: str
    quality: DataQuality
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['quality'] = self.quality.name
        return result


@dataclass
class SensorConfig:
    """Configuration for a sensor."""
    sensor_id: str
    sensor_type: SensorType
    name: str
    unit: str
    sampling_rate_hz: float = 1.0
    min_value: float = 0.0
    max_value: float = float('inf')
    resolution: float = 0.001
    noise_level: float = 0.01
    calibration_date: str = ""
    calibration_factor: float = 1.0
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['sensor_type'] = self.sensor_type.name
        return result


@dataclass
class CollectionSession:
    """A data collection session."""
    session_id: str
    experiment_id: str
    start_time: str
    end_time: Optional[str] = None
    sensors: List[str] = field(default_factory=list)
    measurement_count: int = 0
    status: str = "active"
    notes: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# =============================================================================
# SENSOR CLASSES
# =============================================================================

class BaseSensor:
    """Base class for all sensors."""
    
    def __init__(self, config: SensorConfig):
        self.config = config
        self.is_active = False
        self.last_reading: Optional[Measurement] = None
        self.readings: List[Measurement] = []
        self._callbacks: List[Callable] = []
    
    def activate(self):
        """Activate the sensor."""
        self.is_active = True
    
    def deactivate(self):
        """Deactivate the sensor."""
        self.is_active = False
    
    def read(self) -> Measurement:
        """Take a single reading."""
        if not self.is_active:
            raise RuntimeError(f"Sensor {self.config.sensor_id} is not active")
        
        raw_value = self._acquire_raw()
        calibrated = self._apply_calibration(raw_value)
        quality = self._assess_quality(calibrated)
        
        measurement = Measurement(
            id=str(uuid.uuid4())[:8],
            sensor_id=self.config.sensor_id,
            timestamp=datetime.utcnow().isoformat(),
            value=calibrated,
            unit=self.config.unit,
            quality=quality,
            metadata={
                "raw_value": raw_value,
                "calibration_factor": self.config.calibration_factor
            }
        )
        
        self.last_reading = measurement
        self.readings.append(measurement)
        
        for callback in self._callbacks:
            callback(measurement)
        
        return measurement
    
    def _acquire_raw(self) -> float:
        """Acquire raw sensor value (override in subclasses)."""
        raise NotImplementedError
    
    def _apply_calibration(self, raw: float) -> float:
        """Apply calibration to raw value."""
        return raw * self.config.calibration_factor
    
    def _assess_quality(self, value: float) -> DataQuality:
        """Assess data quality based on value bounds."""
        if value < self.config.min_value or value > self.config.max_value:
            return DataQuality.INVALID
        
        noise_ratio = self.config.noise_level / max(abs(value), 1e-30)
        
        if noise_ratio < 0.001:
            return DataQuality.EXCELLENT
        elif noise_ratio < 0.01:
            return DataQuality.GOOD
        elif noise_ratio < 0.05:
            return DataQuality.ACCEPTABLE
        else:
            return DataQuality.POOR
    
    def on_reading(self, callback: Callable):
        """Register callback for new readings."""
        self._callbacks.append(callback)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics from collected readings."""
        if not self.readings:
            return {"error": "No readings available"}
        
        values = [r.value for r in self.readings]
        return {
            "sensor_id": self.config.sensor_id,
            "reading_count": len(values),
            "mean": float(np.mean(values)),
            "std": float(np.std(values)),
            "min": float(np.min(values)),
            "max": float(np.max(values)),
            "median": float(np.median(values))
        }


class FrequencySensor(BaseSensor):
    """Sensor for measuring frequencies."""
    
    def __init__(self, config: SensorConfig, base_frequency: float = 5e14):
        super().__init__(config)
        self.base_frequency = base_frequency
    
    def _acquire_raw(self) -> float:
        noise = np.random.normal(0, self.config.noise_level * self.base_frequency)
        return self.base_frequency + noise


class WavelengthSensor(BaseSensor):
    """Sensor for measuring wavelengths."""
    
    def __init__(self, config: SensorConfig, base_wavelength_nm: float = 550):
        super().__init__(config)
        self.base_wavelength = base_wavelength_nm * 1e-9
    
    def _acquire_raw(self) -> float:
        noise = np.random.normal(0, self.config.noise_level * self.base_wavelength)
        return (self.base_wavelength + noise) * 1e9  # Return in nm


class EnergySensor(BaseSensor):
    """Sensor for measuring energy levels."""
    
    def __init__(self, config: SensorConfig, base_energy: float = 3.6e-19):
        super().__init__(config)
        self.base_energy = base_energy  # ~2 eV (visible light)
    
    def _acquire_raw(self) -> float:
        noise = np.random.normal(0, self.config.noise_level * self.base_energy)
        return self.base_energy + noise


class LambdaMassSensor(BaseSensor):
    """
    Sensor for Lambda Boson mass measurements.
    Calculates Λ = hf/c² from frequency input.
    """
    
    def __init__(self, config: SensorConfig, frequency_source: Optional[FrequencySensor] = None):
        super().__init__(config)
        self.frequency_source = frequency_source
        self.base_frequency = 5e14
    
    def _acquire_raw(self) -> float:
        if self.frequency_source and self.frequency_source.last_reading:
            frequency = self.frequency_source.last_reading.value
        else:
            noise = np.random.normal(0, self.config.noise_level * self.base_frequency)
            frequency = self.base_frequency + noise
        
        lambda_mass = (PLANCK_CONSTANT * frequency) / (SPEED_OF_LIGHT ** 2)
        return lambda_mass


class TemperatureSensor(BaseSensor):
    """Sensor for temperature measurements."""
    
    def __init__(self, config: SensorConfig, base_temp_k: float = 300):
        super().__init__(config)
        self.base_temp = base_temp_k
    
    def _acquire_raw(self) -> float:
        noise = np.random.normal(0, self.config.noise_level * self.base_temp)
        return self.base_temp + noise


class IntensitySensor(BaseSensor):
    """Sensor for light intensity measurements."""
    
    def __init__(self, config: SensorConfig, base_intensity: float = 1.0):
        super().__init__(config)
        self.base_intensity = base_intensity
    
    def _acquire_raw(self) -> float:
        noise = np.random.normal(0, self.config.noise_level * self.base_intensity)
        return max(0, self.base_intensity + noise)


# =============================================================================
# DATA COLLECTOR
# =============================================================================

class DataCollector:
    """
    Main data collection system for WIP experiments.
    
    Manages multiple sensors, collection sessions, and data storage.
    
    Example:
        collector = DataCollector()
        
        # Add sensors
        collector.add_frequency_sensor("freq_1", base_frequency=5e14)
        collector.add_lambda_sensor("lambda_1")
        
        # Start collection
        session = collector.start_session("exp_001")
        
        # Collect data
        for _ in range(100):
            collector.collect_all()
        
        # Get results
        df = collector.to_dataframe()
    """
    
    def __init__(self, experiment_id: str = "default"):
        self.experiment_id = experiment_id
        self.sensors: Dict[str, BaseSensor] = {}
        self.sessions: List[CollectionSession] = []
        self.current_session: Optional[CollectionSession] = None
        self.data_buffer: deque = deque(maxlen=100000)
        self._collection_thread: Optional[threading.Thread] = None
        self._stop_collection = threading.Event()
    
    # =========================================================================
    # SENSOR MANAGEMENT
    # =========================================================================
    
    def add_sensor(self, sensor: BaseSensor):
        """Add a sensor to the collector."""
        self.sensors[sensor.config.sensor_id] = sensor
    
    def add_frequency_sensor(
        self, 
        sensor_id: str, 
        base_frequency: float = 5e14,
        sampling_rate: float = 10.0,
        noise_level: float = 0.01
    ) -> FrequencySensor:
        """Add a frequency sensor."""
        config = SensorConfig(
            sensor_id=sensor_id,
            sensor_type=SensorType.FREQUENCY,
            name=f"Frequency Sensor {sensor_id}",
            unit="Hz",
            sampling_rate_hz=sampling_rate,
            min_value=1e10,
            max_value=1e18,
            noise_level=noise_level
        )
        sensor = FrequencySensor(config, base_frequency)
        self.add_sensor(sensor)
        return sensor
    
    def add_wavelength_sensor(
        self,
        sensor_id: str,
        base_wavelength_nm: float = 550,
        sampling_rate: float = 10.0,
        noise_level: float = 0.01
    ) -> WavelengthSensor:
        """Add a wavelength sensor."""
        config = SensorConfig(
            sensor_id=sensor_id,
            sensor_type=SensorType.WAVELENGTH,
            name=f"Wavelength Sensor {sensor_id}",
            unit="nm",
            sampling_rate_hz=sampling_rate,
            min_value=10,
            max_value=100000,
            noise_level=noise_level
        )
        sensor = WavelengthSensor(config, base_wavelength_nm)
        self.add_sensor(sensor)
        return sensor
    
    def add_energy_sensor(
        self,
        sensor_id: str,
        base_energy: float = 3.6e-19,
        sampling_rate: float = 10.0,
        noise_level: float = 0.01
    ) -> EnergySensor:
        """Add an energy sensor."""
        config = SensorConfig(
            sensor_id=sensor_id,
            sensor_type=SensorType.ENERGY,
            name=f"Energy Sensor {sensor_id}",
            unit="J",
            sampling_rate_hz=sampling_rate,
            min_value=0,
            max_value=1e-15,
            noise_level=noise_level
        )
        sensor = EnergySensor(config, base_energy)
        self.add_sensor(sensor)
        return sensor
    
    def add_lambda_sensor(
        self,
        sensor_id: str,
        frequency_source: Optional[FrequencySensor] = None,
        sampling_rate: float = 10.0,
        noise_level: float = 0.01
    ) -> LambdaMassSensor:
        """Add a Lambda Boson mass sensor."""
        config = SensorConfig(
            sensor_id=sensor_id,
            sensor_type=SensorType.LAMBDA_MASS,
            name=f"Lambda Mass Sensor {sensor_id}",
            unit="kg",
            sampling_rate_hz=sampling_rate,
            min_value=0,
            max_value=1e-30,
            noise_level=noise_level
        )
        sensor = LambdaMassSensor(config, frequency_source)
        self.add_sensor(sensor)
        return sensor
    
    def add_temperature_sensor(
        self,
        sensor_id: str,
        base_temp_k: float = 300,
        sampling_rate: float = 1.0,
        noise_level: float = 0.005
    ) -> TemperatureSensor:
        """Add a temperature sensor."""
        config = SensorConfig(
            sensor_id=sensor_id,
            sensor_type=SensorType.TEMPERATURE,
            name=f"Temperature Sensor {sensor_id}",
            unit="K",
            sampling_rate_hz=sampling_rate,
            min_value=0,
            max_value=10000,
            noise_level=noise_level
        )
        sensor = TemperatureSensor(config, base_temp_k)
        self.add_sensor(sensor)
        return sensor
    
    def add_intensity_sensor(
        self,
        sensor_id: str,
        base_intensity: float = 1.0,
        sampling_rate: float = 100.0,
        noise_level: float = 0.02
    ) -> IntensitySensor:
        """Add an intensity sensor."""
        config = SensorConfig(
            sensor_id=sensor_id,
            sensor_type=SensorType.INTENSITY,
            name=f"Intensity Sensor {sensor_id}",
            unit="W/m²",
            sampling_rate_hz=sampling_rate,
            min_value=0,
            max_value=1e6,
            noise_level=noise_level
        )
        sensor = IntensitySensor(config, base_intensity)
        self.add_sensor(sensor)
        return sensor
    
    def remove_sensor(self, sensor_id: str):
        """Remove a sensor from the collector."""
        if sensor_id in self.sensors:
            self.sensors[sensor_id].deactivate()
            del self.sensors[sensor_id]
    
    def list_sensors(self) -> List[Dict[str, Any]]:
        """List all sensors and their status."""
        return [
            {
                "sensor_id": s.config.sensor_id,
                "type": s.config.sensor_type.name,
                "name": s.config.name,
                "unit": s.config.unit,
                "is_active": s.is_active,
                "reading_count": len(s.readings)
            }
            for s in self.sensors.values()
        ]
    
    # =========================================================================
    # SESSION MANAGEMENT
    # =========================================================================
    
    def start_session(self, experiment_id: Optional[str] = None, notes: str = "") -> CollectionSession:
        """Start a new data collection session."""
        if self.current_session and self.current_session.status == "active":
            self.end_session()
        
        session = CollectionSession(
            session_id=str(uuid.uuid4())[:8],
            experiment_id=experiment_id or self.experiment_id,
            start_time=datetime.utcnow().isoformat(),
            sensors=list(self.sensors.keys()),
            notes=notes
        )
        
        self.current_session = session
        self.sessions.append(session)
        
        for sensor in self.sensors.values():
            sensor.activate()
        
        return session
    
    def end_session(self) -> Optional[CollectionSession]:
        """End the current collection session."""
        if not self.current_session:
            return None
        
        self.current_session.end_time = datetime.utcnow().isoformat()
        self.current_session.status = "completed"
        self.current_session.measurement_count = len(self.data_buffer)
        
        for sensor in self.sensors.values():
            sensor.deactivate()
        
        ended = self.current_session
        self.current_session = None
        return ended
    
    # =========================================================================
    # DATA COLLECTION
    # =========================================================================
    
    def collect_single(self, sensor_id: str) -> Measurement:
        """Collect a single reading from a specific sensor."""
        if sensor_id not in self.sensors:
            raise ValueError(f"Sensor {sensor_id} not found")
        
        sensor = self.sensors[sensor_id]
        measurement = sensor.read()
        self.data_buffer.append(measurement)
        return measurement
    
    def collect_all(self) -> List[Measurement]:
        """Collect readings from all active sensors."""
        measurements = []
        for sensor in self.sensors.values():
            if sensor.is_active:
                try:
                    measurement = sensor.read()
                    self.data_buffer.append(measurement)
                    measurements.append(measurement)
                except Exception as e:
                    print(f"Error reading sensor {sensor.config.sensor_id}: {e}")
        return measurements
    
    def start_continuous_collection(self, interval_seconds: float = 0.1):
        """Start continuous data collection in background."""
        if self._collection_thread and self._collection_thread.is_alive():
            return
        
        self._stop_collection.clear()
        
        def collection_loop():
            while not self._stop_collection.is_set():
                self.collect_all()
                time.sleep(interval_seconds)
        
        self._collection_thread = threading.Thread(target=collection_loop, daemon=True)
        self._collection_thread.start()
    
    def stop_continuous_collection(self):
        """Stop continuous data collection."""
        self._stop_collection.set()
        if self._collection_thread:
            self._collection_thread.join(timeout=2.0)
    
    def collect_burst(self, n_samples: int, sensor_id: Optional[str] = None) -> List[Measurement]:
        """Collect a burst of samples."""
        measurements = []
        for _ in range(n_samples):
            if sensor_id:
                measurements.append(self.collect_single(sensor_id))
            else:
                measurements.extend(self.collect_all())
        return measurements
    
    # =========================================================================
    # DATA EXPORT
    # =========================================================================
    
    def to_dataframe(self) -> pd.DataFrame:
        """Convert collected data to pandas DataFrame."""
        if not self.data_buffer:
            return pd.DataFrame()
        
        records = []
        for m in self.data_buffer:
            record = {
                "id": m.id,
                "sensor_id": m.sensor_id,
                "timestamp": m.timestamp,
                "value": m.value,
                "unit": m.unit,
                "quality": m.quality.name
            }
            records.append(record)
        
        return pd.DataFrame(records)
    
    def to_pivot_dataframe(self) -> pd.DataFrame:
        """Convert to pivoted DataFrame with sensors as columns."""
        df = self.to_dataframe()
        if df.empty:
            return df
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        pivot = df.pivot_table(
            values='value',
            index='timestamp',
            columns='sensor_id',
            aggfunc='mean'
        )
        return pivot
    
    def export_json(self, filepath: str):
        """Export data to JSON file."""
        data = {
            "experiment_id": self.experiment_id,
            "sensors": self.list_sensors(),
            "sessions": [s.to_dict() for s in self.sessions],
            "measurements": [m.to_dict() for m in self.data_buffer]
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        return filepath
    
    def export_csv(self, filepath: str):
        """Export data to CSV file."""
        df = self.to_dataframe()
        df.to_csv(filepath, index=False)
        return filepath
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary of collected data."""
        return {
            "experiment_id": self.experiment_id,
            "total_sensors": len(self.sensors),
            "active_sensors": sum(1 for s in self.sensors.values() if s.is_active),
            "total_sessions": len(self.sessions),
            "total_measurements": len(self.data_buffer),
            "current_session": self.current_session.to_dict() if self.current_session else None,
            "sensor_statistics": {
                sid: s.get_statistics() for sid, s in self.sensors.items()
            }
        }
    
    def clear_buffer(self):
        """Clear the data buffer."""
        self.data_buffer.clear()
        for sensor in self.sensors.values():
            sensor.readings.clear()


# =============================================================================
# LAMBDA BOSON DATA COLLECTOR
# =============================================================================

class LambdaBosonCollector(DataCollector):
    """
    Specialized data collector for Lambda Boson experiments.
    
    Pre-configured with frequency, wavelength, energy, and lambda mass sensors.
    Automatically calculates derived quantities.
    
    Example:
        collector = LambdaBosonCollector("experiment_001")
        session = collector.start_session()
        
        # Collect 1000 measurements
        collector.collect_burst(1000)
        
        # Get physics-enriched dataframe
        df = collector.get_physics_dataframe()
        
        # Includes: frequency, wavelength, energy, lambda_mass, momentum
    """
    
    def __init__(self, experiment_id: str, base_frequency: float = 5.45e14):
        super().__init__(experiment_id)
        self.base_frequency = base_frequency
        
        self.freq_sensor = self.add_frequency_sensor(
            "frequency", base_frequency, sampling_rate=100
        )
        self.wavelength_sensor = self.add_wavelength_sensor(
            "wavelength", 
            base_wavelength_nm=SPEED_OF_LIGHT / base_frequency * 1e9
        )
        self.energy_sensor = self.add_energy_sensor(
            "energy",
            base_energy=PLANCK_CONSTANT * base_frequency
        )
        self.lambda_sensor = self.add_lambda_sensor(
            "lambda_mass",
            frequency_source=self.freq_sensor
        )
        self.temp_sensor = self.add_temperature_sensor("temperature", 300)
    
    def get_physics_dataframe(self) -> pd.DataFrame:
        """
        Get DataFrame with calculated physics quantities.
        
        Includes:
            - frequency (Hz)
            - wavelength (nm)
            - energy (J)
            - lambda_mass (kg)
            - momentum (kg·m/s)
            - energy_ev (eV)
        """
        df = self.to_pivot_dataframe()
        
        if 'frequency' in df.columns:
            df['momentum'] = (PLANCK_CONSTANT * df['frequency']) / SPEED_OF_LIGHT
            df['energy_calculated'] = PLANCK_CONSTANT * df['frequency']
            df['lambda_calculated'] = (PLANCK_CONSTANT * df['frequency']) / (SPEED_OF_LIGHT ** 2)
            df['wavelength_calculated'] = (SPEED_OF_LIGHT / df['frequency']) * 1e9
            df['energy_ev'] = df['energy_calculated'] / 1.602176634e-19
        
        return df
    
    def validate_physics(self) -> Dict[str, Any]:
        """
        Validate that collected data follows physics laws.
        
        Checks:
            - E = hf relationship
            - λ = c/f relationship
            - Λ = hf/c² relationship
        """
        df = self.get_physics_dataframe()
        
        if df.empty:
            return {"error": "No data collected"}
        
        validations = {}
        
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
        
        if 'frequency' in df.columns and 'wavelength' in df.columns:
            expected_lambda = (SPEED_OF_LIGHT / df['frequency']) * 1e9
            actual_lambda = df['wavelength']
            deviation = np.abs(expected_lambda - actual_lambda) / expected_lambda
            validations['lambda_c_f'] = {
                "equation": "λ = c/f",
                "mean_deviation": float(deviation.mean()),
                "max_deviation": float(deviation.max()),
                "valid": float(deviation.mean()) < 0.05
            }
        
        if 'frequency' in df.columns and 'lambda_mass' in df.columns:
            expected_mass = (PLANCK_CONSTANT * df['frequency']) / (SPEED_OF_LIGHT ** 2)
            actual_mass = df['lambda_mass']
            deviation = np.abs(expected_mass - actual_mass) / expected_mass
            validations['Lambda_hf_c2'] = {
                "equation": "Λ = hf/c²",
                "mean_deviation": float(deviation.mean()),
                "max_deviation": float(deviation.max()),
                "valid": float(deviation.mean()) < 0.05
            }
        
        return validations


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def create_collector(experiment_id: str = "default") -> DataCollector:
    """Create a basic data collector."""
    return DataCollector(experiment_id)


def create_lambda_collector(experiment_id: str, base_frequency: float = 5.45e14) -> LambdaBosonCollector:
    """Create a Lambda Boson specialized collector."""
    return LambdaBosonCollector(experiment_id, base_frequency)


def quick_collection(n_samples: int = 100, base_frequency: float = 5.45e14) -> pd.DataFrame:
    """Quick collection of Lambda Boson data."""
    collector = LambdaBosonCollector("quick_experiment", base_frequency)
    session = collector.start_session()
    collector.collect_burst(n_samples)
    collector.end_session()
    return collector.get_physics_dataframe()


# =============================================================================
# DEMONSTRATION
# =============================================================================

if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║            WIP DATA COLLECTION SYSTEM - Lambda Boson Experiments             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Wavelength Information Physics (WIP) Data Collection                        ║
║  Based on Lambda Boson Physics: Λ = hf/c²                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    print("\n📡 CREATING LAMBDA BOSON COLLECTOR")
    print("-" * 40)
    collector = LambdaBosonCollector("demo_experiment", base_frequency=5.45e14)
    print(f"Sensors: {[s['name'] for s in collector.list_sensors()]}")
    
    print("\n🎬 STARTING COLLECTION SESSION")
    print("-" * 40)
    session = collector.start_session(notes="Demo collection")
    print(f"Session ID: {session.session_id}")
    
    print("\n📊 COLLECTING 100 SAMPLES")
    print("-" * 40)
    collector.collect_burst(100)
    
    print("\n📈 DATA SUMMARY")
    print("-" * 40)
    summary = collector.get_summary()
    print(f"Total measurements: {summary['total_measurements']}")
    
    print("\n🔬 PHYSICS VALIDATION")
    print("-" * 40)
    validation = collector.validate_physics()
    for eq, result in validation.items():
        status = "✅" if result['valid'] else "❌"
        print(f"{status} {result['equation']}: deviation = {result['mean_deviation']:.4%}")
    
    print("\n📋 SAMPLE DATA")
    print("-" * 40)
    df = collector.get_physics_dataframe()
    print(df.head())
    
    collector.end_session()
    print("\n✅ Collection complete!")
