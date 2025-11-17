"""
Tests for DAG Domain Modules

Tests the modular domain system and data processing domain.
"""

import pytest
from dag_domains import DomainModule, DomainRegistry
from dag_domains.data_processing import DataProcessingDomain, DataProcessingHandlers
from task_orchestration import TaskOrchestrationDAG, TaskStatus


class TestDomainRegistry:
    """Test the domain registry system"""
    
    def test_register_and_get_domain(self):
        """Test registering and retrieving a domain"""
        # Data processing domain should be auto-registered
        domain = DomainRegistry.get_domain('data_processing')
        
        assert domain is not None
        assert domain.name == 'data_processing'
        assert isinstance(domain, DataProcessingDomain)
    
    def test_list_domains(self):
        """Test listing all registered domains"""
        domains = DomainRegistry.list_domains()
        
        assert 'data_processing' in domains
        assert len(domains) >= 1
    
    def test_get_all_workflows(self):
        """Test retrieving workflows from all domains"""
        all_workflows = DomainRegistry.get_all_workflows()
        
        assert 'data_processing' in all_workflows
        assert 'etl_pipeline' in all_workflows['data_processing']


class TestDataProcessingHandlers:
    """Test data processing task handlers"""
    
    def test_extract_data_handler(self):
        """Test data extraction handler"""
        result = DataProcessingHandlers.extract_data({
            'source_type': 'database',
            'query': 'SELECT * FROM test'
        })
        
        assert result['success'] is True
        assert result['records_extracted'] > 0
        assert 'data' in result
    
    def test_transform_data_handler(self):
        """Test data transformation handler"""
        input_data = [{'id': 1, 'value': 100}]
        
        result = DataProcessingHandlers.transform_data({
            'data': input_data,
            'transformations': ['clean', 'normalize']
        })
        
        assert result['success'] is True
        assert result['records_transformed'] == 1
        assert 'data' in result
    
    def test_load_data_handler(self):
        """Test data loading handler"""
        data = [{'id': 1, 'value': 100}]
        
        result = DataProcessingHandlers.load_data({
            'data': data,
            'destination': 'warehouse'
        })
        
        assert result['success'] is True
        assert result['records_loaded'] == 1
        assert result['destination'] == 'warehouse'
    
    def test_validate_data_handler(self):
        """Test data validation handler"""
        data = [{'id': 1, 'value': 100}]
        
        result = DataProcessingHandlers.validate_data({
            'data': data,
            'validation_rules': ['not_null', 'type_check']
        })
        
        assert result['success'] is True
        assert 'validation_results' in result
    
    def test_aggregate_data_handler(self):
        """Test data aggregation handler"""
        data = [
            {'category': 'A', 'value': 100},
            {'category': 'B', 'value': 200}
        ]
        
        result = DataProcessingHandlers.aggregate_data({
            'data': data,
            'group_by': ['category']
        })
        
        assert result['success'] is True
        assert 'summary' in result
    
    def test_train_model_handler(self):
        """Test ML model training handler"""
        data = [{'features': [1, 2, 3], 'label': 1}]
        
        result = DataProcessingHandlers.train_model({
            'data': data,
            'model_type': 'linear'
        })
        
        assert result['success'] is True
        assert 'model_id' in result
        assert 'accuracy' in result
    
    def test_evaluate_model_handler(self):
        """Test model evaluation handler"""
        result = DataProcessingHandlers.evaluate_model({
            'model_id': 'test_model_123',
            'test_data': [{'features': [1, 2], 'label': 1}]
        })
        
        assert result['success'] is True
        assert 'metrics' in result
        assert 'accuracy' in result['metrics']


class TestDataProcessingDomain:
    """Test the data processing domain module"""
    
    def test_domain_initialization(self):
        """Test domain module initialization"""
        domain = DataProcessingDomain()
        
        assert domain.name == 'data_processing'
        assert len(domain.handlers) > 0
        assert len(domain.workflows) > 0
    
    def test_get_workflow_templates(self):
        """Test retrieving workflow templates"""
        domain = DataProcessingDomain()
        workflows = domain.get_workflow_templates()
        
        assert 'etl_pipeline' in workflows
        assert 'ml_training_pipeline' in workflows
        assert 'data_quality_check' in workflows
    
    def test_get_handlers(self):
        """Test retrieving task handlers"""
        domain = DataProcessingDomain()
        handlers = domain.get_handlers()
        
        assert 'data.extract' in handlers
        assert 'data.transform' in handlers
        assert 'data.load' in handlers
        assert 'data.validate' in handlers
    
    def test_register_handlers(self):
        """Test registering handlers with DAG"""
        domain = DataProcessingDomain()
        dag = TaskOrchestrationDAG()
        
        domain.register_handlers(dag)
        
        # Check that handlers are registered
        assert 'data.extract' in dag.task_handlers
        assert 'data.transform' in dag.task_handlers


class TestETLPipeline:
    """Test ETL pipeline workflow"""
    
    def test_create_etl_pipeline(self):
        """Test creating ETL pipeline DAG"""
        domain = DataProcessingDomain()
        dag = domain.create_etl_pipeline()
        
        assert len(dag.tasks) == 4
        assert 'extract-data' in dag.tasks
        assert 'validate-data' in dag.tasks
        assert 'transform-data' in dag.tasks
        assert 'load-data' in dag.tasks
    
    def test_execute_etl_pipeline(self):
        """Test executing ETL pipeline"""
        domain = DataProcessingDomain()
        dag = domain.create_etl_pipeline()
        
        results = dag.execute_all()
        
        assert len(results) == 4
        assert all(r.status == TaskStatus.COMPLETED for r in results.values())
    
    def test_etl_dependencies(self):
        """Test ETL task dependencies"""
        domain = DataProcessingDomain()
        dag = domain.create_etl_pipeline()
        
        levels = dag.topological_sort()
        
        # Should have 4 levels (sequential pipeline)
        assert len(levels) == 4
        assert levels[0] == ['extract-data']
        assert levels[1] == ['validate-data']
        assert levels[2] == ['transform-data']
        assert levels[3] == ['load-data']


class TestMLPipeline:
    """Test ML training pipeline workflow"""
    
    def test_create_ml_pipeline(self):
        """Test creating ML pipeline DAG"""
        domain = DataProcessingDomain()
        dag = domain.create_ml_pipeline()
        
        assert len(dag.tasks) == 4
        assert 'extract-training-data' in dag.tasks
        assert 'preprocess-data' in dag.tasks
        assert 'train-model' in dag.tasks
        assert 'evaluate-model' in dag.tasks
    
    def test_execute_ml_pipeline(self):
        """Test executing ML pipeline"""
        domain = DataProcessingDomain()
        dag = domain.create_ml_pipeline()
        
        results = dag.execute_all()
        
        assert len(results) == 4
        assert all(r.status == TaskStatus.COMPLETED for r in results.values())
        
        # Check that model was trained and evaluated
        train_result = results['train-model']
        assert 'model_id' in train_result.output
        
        eval_result = results['evaluate-model']
        assert 'metrics' in eval_result.output


class TestDataQualityCheck:
    """Test data quality check workflow"""
    
    def test_create_quality_check(self):
        """Test creating quality check DAG"""
        domain = DataProcessingDomain()
        dag = domain.create_quality_check()
        
        assert len(dag.tasks) == 2
        assert 'extract-for-validation' in dag.tasks
        assert 'run-quality-checks' in dag.tasks
    
    def test_execute_quality_check(self):
        """Test executing quality check"""
        domain = DataProcessingDomain()
        dag = domain.create_quality_check()
        
        results = dag.execute_all()
        
        assert len(results) == 2
        assert all(r.status == TaskStatus.COMPLETED for r in results.values())
        
        validate_result = results['run-quality-checks']
        assert 'validation_results' in validate_result.output
