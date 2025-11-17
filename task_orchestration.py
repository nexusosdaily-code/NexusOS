"""
Generalized DAG Task Orchestration Framework for NexusOS

This module extends the transaction DAG concept to handle various OS-level operations:
- Administration tasks (user management, system configuration, logging)
- Communications (email, SMS, notifications)
- Social media integrations (posting, scheduling)
- Data processing workflows
- API integrations

Key Features:
1. Task Registry: Pluggable task handlers for different operation types
2. Dependency Management: Automatic dependency resolution and execution ordering
3. Error Handling: Retry logic, fallback strategies, error propagation
4. Monitoring: Task status tracking, execution metrics, audit logging
5. Async Support: Background task execution for long-running operations
"""

from typing import Dict, List, Any, Optional, Callable, Set
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
from collections import defaultdict, deque
import json


class TaskStatus(Enum):
    """Task execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class TaskPriority(Enum):
    """Task execution priority"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class TaskResult:
    """Result of task execution"""
    status: TaskStatus
    output: Any = None
    error: Optional[str] = None
    execution_time: float = 0.0
    retry_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Task:
    """
    Represents a single executable task in the orchestration system
    
    Attributes:
        task_id: Unique identifier
        task_type: Type of task (admin, communication, integration, etc.)
        operation: Specific operation to perform
        parameters: Operation parameters
        dependencies: Task IDs that must complete before this task
        priority: Execution priority
        max_retries: Maximum retry attempts on failure
        timeout: Task timeout in seconds
        handler: Function to execute the task
    """
    task_id: str
    task_type: str
    operation: str
    parameters: Dict[str, Any]
    dependencies: List[str] = field(default_factory=list)
    priority: TaskPriority = TaskPriority.NORMAL
    max_retries: int = 3
    timeout: Optional[float] = None
    handler: Optional[Callable] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)


class TaskOrchestrationDAG:
    """
    DAG-based task orchestration engine
    
    Builds dependency graphs, performs topological sorting, and executes
    tasks in optimal order with error handling and monitoring.
    """
    
    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self.task_results: Dict[str, TaskResult] = {}
        self.dependencies: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_dependencies: Dict[str, Set[str]] = defaultdict(set)
        self.task_handlers: Dict[str, Callable] = {}
    
    def register_task_handler(self, task_type: str, operation: str, handler: Callable):
        """
        Register a handler function for a specific task type and operation
        
        Args:
            task_type: Type of task (e.g., 'admin', 'communication')
            operation: Specific operation (e.g., 'send_email', 'create_user')
            handler: Callable function to execute the task
        """
        key = f"{task_type}.{operation}"
        self.task_handlers[key] = handler
    
    def add_task(self, task: Task) -> str:
        """
        Add a task to the orchestration DAG
        
        Args:
            task: Task to add
            
        Returns:
            Task ID
        """
        if task.handler:
            key = f"{task.task_type}.{task.operation}"
            self.task_handlers[key] = task.handler
        
        self.tasks[task.task_id] = task
        
        for dep_id in task.dependencies:
            self.dependencies[task.task_id].add(dep_id)
            self.reverse_dependencies[dep_id].add(task.task_id)
        
        return task.task_id
    
    def remove_task(self, task_id: str):
        """Remove a task from the DAG"""
        if task_id in self.tasks:
            for dep_id in self.dependencies[task_id]:
                self.reverse_dependencies[dep_id].discard(task_id)
            
            for dependent_id in self.reverse_dependencies[task_id]:
                self.dependencies[dependent_id].discard(task_id)
            
            del self.tasks[task_id]
            del self.dependencies[task_id]
            del self.reverse_dependencies[task_id]
    
    def topological_sort(self) -> List[List[str]]:
        """
        Perform topological sort with level grouping using Kahn's algorithm
        
        Returns:
            List of levels, where each level contains task IDs that can execute in parallel
        """
        in_degree = {task_id: len(self.dependencies[task_id]) for task_id in self.tasks}
        
        queue = deque([tid for tid, degree in in_degree.items() if degree == 0])
        
        levels = []
        
        while queue:
            current_level = list(queue)
            current_level.sort(key=lambda tid: self.tasks[tid].priority.value, reverse=True)
            levels.append(current_level)
            
            next_level = []
            for task_id in current_level:
                for dependent_id in self.reverse_dependencies[task_id]:
                    in_degree[dependent_id] -= 1
                    if in_degree[dependent_id] == 0:
                        next_level.append(dependent_id)
            
            queue = deque(next_level)
        
        if sum(in_degree.values()) > 0:
            cycle_tasks = [tid for tid, degree in in_degree.items() if degree > 0]
            raise ValueError(f"Cycle detected in task DAG involving tasks: {cycle_tasks}")
        
        return levels
    
    def _execute_task(self, task: Task) -> TaskResult:
        """
        Execute a single task with error handling and retry logic
        
        Args:
            task: Task to execute
            
        Returns:
            TaskResult with execution outcome
        """
        key = f"{task.task_type}.{task.operation}"
        handler = self.task_handlers.get(key)
        
        if not handler:
            return TaskResult(
                status=TaskStatus.FAILED,
                error=f"No handler registered for {key}"
            )
        
        retry_count = 0
        start_time = datetime.utcnow()
        
        while retry_count <= task.max_retries:
            try:
                output = handler(task.parameters)
                
                execution_time = (datetime.utcnow() - start_time).total_seconds()
                
                return TaskResult(
                    status=TaskStatus.COMPLETED,
                    output=output,
                    execution_time=execution_time,
                    retry_count=retry_count
                )
            
            except Exception as e:
                retry_count += 1
                
                if retry_count > task.max_retries:
                    execution_time = (datetime.utcnow() - start_time).total_seconds()
                    return TaskResult(
                        status=TaskStatus.FAILED,
                        error=str(e),
                        execution_time=execution_time,
                        retry_count=retry_count - 1
                    )
        
        return TaskResult(status=TaskStatus.FAILED, error="Max retries exceeded")
    
    def execute_all(self) -> Dict[str, TaskResult]:
        """
        Execute all tasks in the DAG in dependency order
        
        Returns:
            Dictionary mapping task IDs to execution results
        """
        levels = self.topological_sort()
        
        for level in levels:
            for task_id in level:
                task = self.tasks[task_id]
                
                should_execute = True
                for dep_id in task.dependencies:
                    if dep_id in self.task_results:
                        if self.task_results[dep_id].status != TaskStatus.COMPLETED:
                            should_execute = False
                            self.task_results[task_id] = TaskResult(
                                status=TaskStatus.CANCELLED,
                                error=f"Dependency {dep_id} failed"
                            )
                            break
                
                if should_execute:
                    result = self._execute_task(task)
                    self.task_results[task_id] = result
        
        return self.task_results
    
    def get_execution_plan(self) -> Dict[str, Any]:
        """
        Get detailed execution plan with statistics
        
        Returns:
            Dictionary with execution metadata
        """
        levels = self.topological_sort()
        
        return {
            'total_tasks': len(self.tasks),
            'execution_levels': len(levels),
            'max_parallelism': max(len(level) for level in levels) if levels else 0,
            'task_breakdown': {
                task_type: sum(1 for t in self.tasks.values() if t.task_type == task_type)
                for task_type in set(t.task_type for t in self.tasks.values())
            },
            'priority_breakdown': {
                priority.name: sum(1 for t in self.tasks.values() if t.priority == priority)
                for priority in TaskPriority
            },
            'levels': [[self.tasks[tid].task_type for tid in level] for level in levels]
        }
    
    def get_task_status(self, task_id: str) -> Optional[TaskResult]:
        """Get execution status of a specific task"""
        return self.task_results.get(task_id)
    
    def clear_results(self):
        """Clear all task execution results"""
        self.task_results.clear()


class TaskBuilder:
    """
    Fluent builder for creating tasks
    
    Example:
        task = TaskBuilder('send-welcome-email') \\
            .type('communication') \\
            .operation('send_email') \\
            .params({'to': 'user@example.com', 'template': 'welcome'}) \\
            .depends_on('create-user') \\
            .priority(TaskPriority.HIGH) \\
            .build()
    """
    
    def __init__(self, task_id: str):
        self._task_id = task_id
        self._task_type = 'generic'
        self._operation = 'execute'
        self._parameters = {}
        self._dependencies = []
        self._priority = TaskPriority.NORMAL
        self._max_retries = 3
        self._timeout = None
        self._handler = None
        self._metadata = {}
    
    def type(self, task_type: str):
        """Set task type"""
        self._task_type = task_type
        return self
    
    def operation(self, operation: str):
        """Set operation"""
        self._operation = operation
        return self
    
    def params(self, parameters: Dict[str, Any]):
        """Set parameters"""
        self._parameters = parameters
        return self
    
    def depends_on(self, *task_ids: str):
        """Add dependencies"""
        self._dependencies.extend(task_ids)
        return self
    
    def priority(self, priority: TaskPriority):
        """Set priority"""
        self._priority = priority
        return self
    
    def retries(self, max_retries: int):
        """Set max retries"""
        self._max_retries = max_retries
        return self
    
    def timeout(self, timeout: float):
        """Set timeout"""
        self._timeout = timeout
        return self
    
    def handler(self, handler: Callable):
        """Set custom handler"""
        self._handler = handler
        return self
    
    def meta(self, key: str, value: Any):
        """Add metadata"""
        self._metadata[key] = value
        return self
    
    def build(self) -> Task:
        """Build the task"""
        return Task(
            task_id=self._task_id,
            task_type=self._task_type,
            operation=self._operation,
            parameters=self._parameters,
            dependencies=self._dependencies,
            priority=self._priority,
            max_retries=self._max_retries,
            timeout=self._timeout,
            handler=self._handler,
            metadata=self._metadata
        )
