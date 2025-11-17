"""
Unit tests for Oracle Integration

Tests oracle data sources, REST API oracle, mock oracle,
static oracle, and oracle manager functionality.
"""

import pytest
from datetime import datetime
from oracle_sources import (
    OracleDataPoint, OracleDataSource, RestAPIOracle,
    StaticDataOracle, MockEnvironmentalOracle, OracleManager
)


class TestOracleDataPoint:
    """Tests for OracleDataPoint data structure"""
    
    def test_create_data_point(self):
        """Test creating an oracle data point"""
        point = OracleDataPoint(
            timestamp=datetime.now(),
            variable='H',
            value=120.5,
            metadata={'source': 'test', 'quality': 'high'}
        )
        
        assert point.variable == 'H'
        assert point.value == 120.5
        assert point.metadata['source'] == 'test'
    
    def test_data_point_without_metadata(self):
        """Test creating data point without metadata"""
        point = OracleDataPoint(
            timestamp=datetime.now(),
            variable='E',
            value=0.8
        )
        
        assert point.variable == 'E'
        assert point.value == 0.8
        assert point.metadata == {}  # Defaults to empty dict


class TestStaticDataOracle:
    """Tests for StaticDataOracle"""
    
    def test_create_static_oracle(self):
        """Test creating a static oracle"""
        config = {
            'data_values': {
                'H': 100.0,
                'M': 80.0,
                'E': 0.75
            }
        }
        
        oracle = StaticDataOracle('test_static', config)
        assert oracle.name == 'test_static'
        assert oracle.is_connected is False
    
    def test_connect_static_oracle(self):
        """Test connecting to static oracle"""
        config = {'data_values': {'H': 100.0}}
        oracle = StaticDataOracle('static', config)
        
        result = oracle.connect()
        assert result is True
        assert oracle.is_connected is True
    
    def test_fetch_static_data(self):
        """Test fetching data from static oracle"""
        config = {
            'data_values': {
                'H': 100.0,
                'M': 80.0,
                'E': 0.75
            }
        }
        
        oracle = StaticDataOracle('static', config)
        oracle.connect()
        
        point_h = oracle.fetch_data('H')
        assert point_h is not None
        assert point_h.value == 100.0
        assert point_h.variable == 'H'
        
        point_m = oracle.fetch_data('M')
        assert point_m.value == 80.0
    
    def test_fetch_undefined_variable(self):
        """Test fetching undefined variable returns None"""
        config = {'data_values': {'H': 100.0}}
        oracle = StaticDataOracle('static', config)
        oracle.connect()
        
        point = oracle.fetch_data('UNDEFINED')
        assert point is None
    
    def test_static_oracle_status(self):
        """Test getting static oracle status"""
        config = {'data_values': {'H': 100.0, 'M': 80.0}}
        oracle = StaticDataOracle('static', config)
        oracle.connect()
        
        status = oracle.get_status()
        assert status['name'] == 'static'
        assert status['type'] == 'Static Data'
        assert status['connected'] is True
        assert 'H' in status['variables']
        assert 'M' in status['variables']


class TestMockEnvironmentalOracle:
    """Tests for MockEnvironmentalOracle"""
    
    def test_create_mock_oracle(self):
        """Test creating a mock environmental oracle"""
        config = {'variation': 0.1}
        oracle = MockEnvironmentalOracle('mock_env', config)
        
        assert oracle.name == 'mock_env'
        assert oracle.variation == 0.1
    
    def test_mock_oracle_connect(self):
        """Test connecting mock oracle"""
        oracle = MockEnvironmentalOracle('mock', {})
        
        result = oracle.connect()
        assert result is True
        assert oracle.is_connected is True
    
    def test_fetch_mock_data(self):
        """Test fetching data from mock oracle"""
        oracle = MockEnvironmentalOracle('mock', {'variation': 0.1})
        oracle.connect()
        
        point_h = oracle.fetch_data('H')
        assert point_h is not None
        assert point_h.variable == 'H'
        assert point_h.value > 0
        
        # Test that it varies around base value (100.0)
        point_m = oracle.fetch_data('M')
        assert 80.0 <= point_m.value <= 120.0
    
    def test_mock_environmental_factor_clamped(self):
        """Test that E (environmental factor) is clamped to [0, 1]"""
        oracle = MockEnvironmentalOracle('mock', {'variation': 0.5})
        oracle.connect()
        
        # Fetch many times to ensure it stays in range
        for _ in range(20):
            point_e = oracle.fetch_data('E')
            assert 0.0 <= point_e.value <= 1.0
    
    def test_mock_oracle_metadata(self):
        """Test that mock oracle includes metadata"""
        oracle = MockEnvironmentalOracle('mock', {'variation': 0.1})
        oracle.connect()
        
        point = oracle.fetch_data('H')
        assert point.metadata is not None
        assert point.metadata['source'] == 'mock'
        assert point.metadata['type'] == 'mock'
        assert 'base' in point.metadata


class TestRestAPIOracle:
    """Tests for RestAPIOracle"""
    
    def test_create_rest_oracle(self):
        """Test creating a REST API oracle"""
        config = {
            'base_url': 'https://api.example.com',
            'headers': {'Authorization': 'Bearer token123'},
            'timeout': 15,
            'variable_endpoints': {
                'price': '/v1/price',
                'volume': '/v1/volume'
            }
        }
        
        oracle = RestAPIOracle('rest_api', config)
        assert oracle.name == 'rest_api'
        assert oracle.base_url == 'https://api.example.com'
        assert oracle.timeout == 15
    
    def test_rest_oracle_no_base_url(self):
        """Test that connect fails without base URL"""
        oracle = RestAPIOracle('rest', {})
        
        result = oracle.connect()
        assert result is False
        assert oracle.error_message == "No base URL provided"
    
    def test_rest_oracle_status(self):
        """Test getting REST oracle status"""
        config = {
            'base_url': 'https://api.example.com',
            'variable_endpoints': {'price': '/price', 'volume': '/volume'}
        }
        
        oracle = RestAPIOracle('rest', config)
        status = oracle.get_status()
        
        assert status['name'] == 'rest'
        assert status['type'] == 'REST API'
        assert 'price' in status['endpoints']
        assert 'volume' in status['endpoints']


class TestOracleManager:
    """Tests for OracleManager"""
    
    def test_create_oracle_manager(self):
        """Test creating an oracle manager"""
        manager = OracleManager()
        assert len(manager.sources) == 0
    
    def test_add_oracle_source(self):
        """Test adding oracle sources"""
        manager = OracleManager()
        
        static_oracle = StaticDataOracle('static', {'values': {'H': 100.0}})
        mock_oracle = MockEnvironmentalOracle('mock', {})
        
        manager.add_source(static_oracle)
        manager.add_source(mock_oracle)
        
        assert len(manager.sources) == 2
        assert 'static' in manager.sources
        assert 'mock' in manager.sources
    
    def test_remove_oracle_source(self):
        """Test removing an oracle source"""
        manager = OracleManager()
        oracle = StaticDataOracle('static', {'values': {'H': 100.0}})
        
        manager.add_source(oracle)
        assert 'static' in manager.sources
        
        manager.remove_source('static')
        assert 'static' not in manager.sources
    
    def test_get_oracle_source(self):
        """Test retrieving specific oracle source"""
        manager = OracleManager()
        oracle = StaticDataOracle('test', {'values': {'H': 100.0}})
        
        manager.add_source(oracle)
        retrieved = manager.get_source('test')
        
        assert retrieved is not None
        assert retrieved.name == 'test'
    
    def test_connect_all_sources(self):
        """Test connecting all oracle sources"""
        manager = OracleManager()
        
        oracle1 = StaticDataOracle('static', {'values': {'H': 100.0}})
        oracle2 = MockEnvironmentalOracle('mock', {})
        
        manager.add_source(oracle1)
        manager.add_source(oracle2)
        
        manager.connect_all()
        
        assert oracle1.is_connected is True
        assert oracle2.is_connected is True
    
    def test_fetch_variable_from_source(self):
        """Test fetching data from specific source"""
        manager = OracleManager()
        oracle = StaticDataOracle('static', {'data_values': {'H': 100.0, 'M': 80.0}})
        
        manager.add_source(oracle)
        manager.connect_all()
        
        point_h = manager.fetch_variable('H', source_name='static')
        assert point_h is not None
        assert point_h.value == 100.0
    
    def test_fetch_variable_from_any_source(self):
        """Test fetching variable from any connected source"""
        manager = OracleManager()
        
        oracle1 = StaticDataOracle('static', {'data_values': {'H': 100.0}})
        oracle2 = MockEnvironmentalOracle('mock', {})
        
        manager.add_source(oracle1)
        manager.add_source(oracle2)
        manager.connect_all()
        
        # Fetch without specifying source - uses first available
        point_h = manager.fetch_variable('H')
        assert point_h is not None
        
        point_m = manager.fetch_variable('M')
        assert point_m is not None
    
    def test_get_status_all(self):
        """Test getting status of all oracle sources"""
        manager = OracleManager()
        
        oracle1 = StaticDataOracle('static', {'data_values': {'H': 100.0}})
        oracle2 = MockEnvironmentalOracle('mock', {})
        
        manager.add_source(oracle1)
        manager.add_source(oracle2)
        
        statuses = manager.get_status_all()
        assert len(statuses) == 2


class TestOracleErrorHandling:
    """Tests for oracle error handling"""
    
    def test_fetch_without_connect(self):
        """Test that fetching without connecting returns None"""
        oracle = StaticDataOracle('static', {'data_values': {'H': 100.0}})
        
        # Don't connect
        point = oracle.fetch_data('H')
        assert point is None
    
    def test_disconnect_oracle(self):
        """Test disconnecting an oracle"""
        oracle = StaticDataOracle('static', {'data_values': {'H': 100.0}})
        oracle.connect()
        
        assert oracle.is_connected is True
        
        oracle.disconnect()
        assert oracle.is_connected is False


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
