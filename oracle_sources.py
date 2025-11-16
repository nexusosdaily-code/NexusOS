from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
import requests
import json


class OracleDataPoint:
    def __init__(self, timestamp: datetime, variable: str, value: float, metadata: Optional[Dict] = None):
        self.timestamp = timestamp
        self.variable = variable
        self.value = value
        self.metadata = metadata or {}
    
    def to_dict(self):
        return {
            'timestamp': self.timestamp.isoformat(),
            'variable': self.variable,
            'value': self.value,
            'metadata': self.metadata
        }


class OracleDataSource(ABC):
    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
        self.is_connected = False
        self.last_update = None
        self.error_message = None
    
    @abstractmethod
    def connect(self) -> bool:
        pass
    
    @abstractmethod
    def disconnect(self):
        pass
    
    @abstractmethod
    def fetch_data(self, variable: str) -> Optional[OracleDataPoint]:
        pass
    
    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        pass


class RestAPIOracle(OracleDataSource):
    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        self.base_url = config.get('base_url', '')
        self.headers = config.get('headers', {})
        self.timeout = config.get('timeout', 10)
        self.variable_endpoints = config.get('variable_endpoints', {})
        self.health_check_endpoint = config.get('health_check_endpoint', '')
    
    def connect(self) -> bool:
        try:
            if not self.base_url:
                self.error_message = "No base URL provided"
                return False
            
            check_url = self.health_check_endpoint or self.base_url
            if not check_url.startswith('http'):
                check_url = f"{self.base_url.rstrip('/')}/{check_url.lstrip('/')}"
            
            response = requests.get(
                check_url,
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200 or response.status_code == 401:
                self.is_connected = True
                self.error_message = None
                return True
            else:
                self.error_message = f"HTTP {response.status_code}"
                return False
        except Exception as e:
            self.error_message = str(e)
            self.is_connected = False
            return False
    
    def disconnect(self):
        self.is_connected = False
    
    def fetch_data(self, variable: str) -> Optional[OracleDataPoint]:
        if not self.is_connected:
            return None
        
        try:
            endpoint = self.variable_endpoints.get(variable, '')
            if not endpoint:
                return None
            
            url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
            
            response = requests.get(
                url,
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                
                value = data.get('value', 0.0)
                if isinstance(value, (int, float)):
                    value = float(value)
                else:
                    value = 0.0
                
                self.last_update = datetime.now()
                
                data_point = OracleDataPoint(
                    timestamp=datetime.now(),
                    variable=variable,
                    value=value,
                    metadata={'source': self.name, 'url': url}
                )
                
                return data_point
            else:
                self.error_message = f"HTTP {response.status_code} for {variable}"
                return None
        
        except Exception as e:
            self.error_message = f"Error fetching {variable}: {str(e)}"
            return None
    
    def get_status(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'type': 'REST API',
            'connected': self.is_connected,
            'base_url': self.base_url,
            'last_update': self.last_update.isoformat() if self.last_update else None,
            'error': self.error_message,
            'endpoints': list(self.variable_endpoints.keys())
        }


class StaticDataOracle(OracleDataSource):
    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        self.data_values = config.get('data_values', {})
    
    def connect(self) -> bool:
        self.is_connected = True
        self.error_message = None
        return True
    
    def disconnect(self):
        self.is_connected = False
    
    def fetch_data(self, variable: str) -> Optional[OracleDataPoint]:
        if not self.is_connected:
            return None
        
        value = self.data_values.get(variable)
        if value is None:
            return None
        
        self.last_update = datetime.now()
        
        return OracleDataPoint(
            timestamp=datetime.now(),
            variable=variable,
            value=float(value),
            metadata={'source': self.name, 'type': 'static'}
        )
    
    def get_status(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'type': 'Static Data',
            'connected': self.is_connected,
            'last_update': self.last_update.isoformat() if self.last_update else None,
            'error': self.error_message,
            'variables': list(self.data_values.keys())
        }


class MockEnvironmentalOracle(OracleDataSource):
    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        self.base_values = {
            'E': 0.75,
            'H': 100.0,
            'M': 100.0,
            'D': 50.0,
            'C_cons': 20.0,
            'C_disp': 10.0
        }
        self.variation = config.get('variation', 0.1)
    
    def connect(self) -> bool:
        self.is_connected = True
        self.error_message = None
        return True
    
    def disconnect(self):
        self.is_connected = False
    
    def fetch_data(self, variable: str) -> Optional[OracleDataPoint]:
        if not self.is_connected:
            return None
        
        if variable not in self.base_values:
            return None
        
        import numpy as np
        base = self.base_values[variable]
        noise = np.random.uniform(-self.variation, self.variation) * base
        value = max(0.0, base + noise)
        
        if variable == 'E':
            value = min(1.0, value)
        
        self.last_update = datetime.now()
        
        return OracleDataPoint(
            timestamp=datetime.now(),
            variable=variable,
            value=value,
            metadata={'source': self.name, 'type': 'mock', 'base': base}
        )
    
    def get_status(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'type': 'Mock Environmental',
            'connected': self.is_connected,
            'last_update': self.last_update.isoformat() if self.last_update else None,
            'error': self.error_message,
            'variables': list(self.base_values.keys()),
            'variation': self.variation
        }


class OracleManager:
    def __init__(self):
        self.sources: Dict[str, OracleDataSource] = {}
    
    def add_source(self, source: OracleDataSource):
        self.sources[source.name] = source
    
    def remove_source(self, name: str):
        if name in self.sources:
            self.sources[name].disconnect()
            del self.sources[name]
    
    def get_source(self, name: str) -> Optional[OracleDataSource]:
        return self.sources.get(name)
    
    def get_all_sources(self) -> List[OracleDataSource]:
        return list(self.sources.values())
    
    def connect_all(self) -> Dict[str, bool]:
        results = {}
        for name, source in self.sources.items():
            results[name] = source.connect()
        return results
    
    def disconnect_all(self):
        for source in self.sources.values():
            source.disconnect()
    
    def fetch_variable(self, variable: str, source_name: Optional[str] = None) -> Optional[OracleDataPoint]:
        if source_name:
            source = self.sources.get(source_name)
            if source:
                return source.fetch_data(variable)
            return None
        
        for source in self.sources.values():
            if source.is_connected:
                data = source.fetch_data(variable)
                if data is not None:
                    return data
        
        return None
    
    def get_status_all(self) -> List[Dict[str, Any]]:
        return [source.get_status() for source in self.sources.values()]
    
    def create_source(self, oracle_type: str, name: str, config: Dict[str, Any]) -> OracleDataSource:
        if oracle_type == 'rest_api':
            return RestAPIOracle(name, config)
        elif oracle_type == 'static':
            return StaticDataOracle(name, config)
        elif oracle_type == 'mock_environmental':
            return MockEnvironmentalOracle(name, config)
        else:
            raise ValueError(f"Unknown oracle type: {oracle_type}")


def get_default_oracle_configs() -> List[Dict[str, Any]]:
    return [
        {
            'type': 'mock_environmental',
            'name': 'Mock Environmental Sensor',
            'config': {
                'variation': 0.15
            }
        },
        {
            'type': 'static',
            'name': 'Baseline Data',
            'config': {
                'data_values': {
                    'E': 0.8,
                    'H': 100.0,
                    'M': 100.0,
                    'D': 50.0,
                    'C_cons': 15.0,
                    'C_disp': 8.0
                }
            }
        }
    ]
