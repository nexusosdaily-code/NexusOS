"""
DAG Domain Modules

This package contains specialized DAG implementations for different domains.
Each domain module provides:
- Pre-built workflow templates
- Domain-specific task handlers
- Configuration schemas
- Documentation and examples

Available Domains:
- data_processing: ETL, ML pipelines, report generation
- devops: CI/CD, infrastructure automation
- content: Media processing, publishing workflows
- More coming soon!
"""

from typing import Dict, List, Type
from task_orchestration import TaskOrchestrationDAG


class DomainModule:
    """Base class for domain-specific DAG modules"""
    
    def __init__(self):
        self.name = "generic"
        self.description = "Generic domain module"
        self.workflows = {}
        self.handlers = {}
    
    def get_workflow_templates(self) -> Dict[str, callable]:
        """Return available workflow templates for this domain"""
        return self.workflows
    
    def get_handlers(self) -> Dict[str, callable]:
        """Return task handlers for this domain"""
        return self.handlers
    
    def register_handlers(self, dag: TaskOrchestrationDAG):
        """Register all handlers with a DAG instance"""
        for key, handler in self.handlers.items():
            task_type, operation = key.split('.')
            dag.register_task_handler(task_type, operation, handler)


class DomainRegistry:
    """Central registry for all domain modules"""
    
    _domains: Dict[str, Type[DomainModule]] = {}
    
    @classmethod
    def register(cls, name: str, domain_class: Type[DomainModule]):
        """Register a new domain module"""
        cls._domains[name] = domain_class
    
    @classmethod
    def get_domain(cls, name: str) -> DomainModule:
        """Get a domain module by name"""
        if name not in cls._domains:
            raise ValueError(f"Domain '{name}' not registered")
        return cls._domains[name]()
    
    @classmethod
    def list_domains(cls) -> List[str]:
        """List all registered domains"""
        return list(cls._domains.keys())
    
    @classmethod
    def get_all_workflows(cls) -> Dict[str, Dict[str, callable]]:
        """Get workflows from all domains"""
        all_workflows = {}
        for domain_name in cls._domains:
            domain = cls.get_domain(domain_name)
            all_workflows[domain_name] = domain.get_workflow_templates()
        return all_workflows
