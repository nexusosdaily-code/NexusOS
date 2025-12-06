"""
Tests for Task Orchestration Framework

Tests cover:
1. Task creation and DAG construction
2. Topological sorting with dependencies
3. Task execution with error handling
4. Priority-based execution ordering
5. Task handlers for different operation types
6. End-to-end workflow scenarios
"""

import pytest
from task_orchestration import (
    Task, TaskOrchestrationDAG, TaskBuilder, TaskStatus, TaskPriority
)
from task_handlers import (
    AdminTaskHandlers, CommunicationTaskHandlers, SocialMediaTaskHandlers,
    DataTaskHandlers, IntegrationTaskHandlers, register_all_handlers
)


class TestTaskOrchestrationDAG:
    """Test DAG orchestration engine"""
    
    def test_empty_dag(self):
        """Test empty DAG"""
        dag = TaskOrchestrationDAG()
        assert len(dag.tasks) == 0
        levels = dag.topological_sort()
        assert levels == []
    
    def test_single_task(self):
        """Test DAG with single task"""
        dag = TaskOrchestrationDAG()
        
        task = Task(
            task_id='task1',
            task_type='admin',
            operation='log_event',
            parameters={'message': 'test'}
        )
        
        dag.add_task(task)
        assert len(dag.tasks) == 1
        
        levels = dag.topological_sort()
        assert len(levels) == 1
        assert levels[0] == ['task1']
    
    def test_task_dependencies(self):
        """Test tasks with dependencies"""
        dag = TaskOrchestrationDAG()
        
        task1 = Task('task1', 'admin', 'op1', {})
        task2 = Task('task2', 'admin', 'op2', {}, dependencies=['task1'])
        task3 = Task('task3', 'admin', 'op3', {}, dependencies=['task2'])
        
        dag.add_task(task1)
        dag.add_task(task2)
        dag.add_task(task3)
        
        levels = dag.topological_sort()
        
        assert len(levels) == 3
        assert levels[0] == ['task1']
        assert levels[1] == ['task2']
        assert levels[2] == ['task3']
    
    def test_parallel_tasks(self):
        """Test independent tasks can run in parallel"""
        dag = TaskOrchestrationDAG()
        
        task1 = Task('task1', 'admin', 'op1', {})
        task2 = Task('task2', 'admin', 'op2', {})
        task3 = Task('task3', 'admin', 'op3', {})
        
        dag.add_task(task1)
        dag.add_task(task2)
        dag.add_task(task3)
        
        levels = dag.topological_sort()
        
        assert len(levels) == 1
        assert set(levels[0]) == {'task1', 'task2', 'task3'}
    
    def test_priority_ordering(self):
        """Test priority affects execution order within level"""
        dag = TaskOrchestrationDAG()
        
        task_low = Task('task_low', 'admin', 'op', {}, priority=TaskPriority.LOW)
        task_high = Task('task_high', 'admin', 'op', {}, priority=TaskPriority.HIGH)
        task_critical = Task('task_critical', 'admin', 'op', {}, priority=TaskPriority.CRITICAL)
        
        dag.add_task(task_low)
        dag.add_task(task_high)
        dag.add_task(task_critical)
        
        levels = dag.topological_sort()
        
        assert len(levels) == 1
        assert levels[0][0] == 'task_critical'
        assert levels[0][2] == 'task_low'
    
    def test_cycle_detection(self):
        """Test cycle detection in DAG"""
        dag = TaskOrchestrationDAG()
        
        task1 = Task('task1', 'admin', 'op1', {}, dependencies=['task2'])
        task2 = Task('task2', 'admin', 'op2', {}, dependencies=['task1'])
        
        dag.add_task(task1)
        dag.add_task(task2)
        
        with pytest.raises(ValueError, match="Cycle detected"):
            dag.topological_sort()
    
    def test_task_removal(self):
        """Test removing tasks from DAG"""
        dag = TaskOrchestrationDAG()
        
        task1 = Task('task1', 'admin', 'op1', {})
        task2 = Task('task2', 'admin', 'op2', {}, dependencies=['task1'])
        
        dag.add_task(task1)
        dag.add_task(task2)
        
        dag.remove_task('task1')
        
        assert 'task1' not in dag.tasks
        assert len(dag.tasks) == 1


class TestTaskBuilder:
    """Test fluent task builder"""
    
    def test_basic_task_build(self):
        """Test building a basic task"""
        task = (TaskBuilder('test-task')
            .type('admin')
            .operation('create_user')
            .params({'email': 'test@example.com'})
            .build())
        
        assert task.task_id == 'test-task'
        assert task.task_type == 'admin'
        assert task.operation == 'create_user'
        assert task.parameters['email'] == 'test@example.com'
    
    def test_task_with_dependencies(self):
        """Test building task with dependencies"""
        task = (TaskBuilder('task2')
            .type('communication')
            .operation('send_email')
            .depends_on('task1')
            .priority(TaskPriority.HIGH)
            .retries(5)
            .build())
        
        assert task.dependencies == ['task1']
        assert task.priority == TaskPriority.HIGH
        assert task.max_retries == 5
    
    def test_task_with_metadata(self):
        """Test building task with metadata"""
        task = (TaskBuilder('task-meta')
            .type('data')
            .operation('transform')
            .meta('source', 'simulation')
            .meta('version', '1.0')
            .build())
        
        assert task.metadata['source'] == 'simulation'
        assert task.metadata['version'] == '1.0'


class TestTaskHandlers:
    """Test task handler implementations"""
    
    def test_log_system_event(self):
        """Test logging system events"""
        result = AdminTaskHandlers.log_system_event({
            'event_type': 'simulation_completed',
            'message': 'Simulation #123 completed successfully',
            'metadata': {'duration': 45.2}
        })
        
        assert result['success'] is True
        assert 'log_entry' in result
    
    def test_send_email_handler(self):
        """Test email sending handler"""
        result = CommunicationTaskHandlers.send_email({
            'to': 'user@example.com',
            'subject': 'Test Email',
            'body': 'This is a test'
        })
        
        assert result['success'] is True
        assert result['method'] == 'email'
        assert result['recipient'] == 'user@example.com'
        assert 'message_id' in result
    
    def test_send_sms_handler(self):
        """Test SMS sending handler"""
        result = CommunicationTaskHandlers.send_sms({
            'to': '+1234567890',
            'message': 'Test SMS'
        })
        
        assert result['success'] is True
        assert result['method'] == 'sms'
        assert 'message_id' in result
    
    def test_post_to_twitter_handler(self):
        """Test Twitter posting handler"""
        result = SocialMediaTaskHandlers.post_to_twitter({
            'message': 'Testing NexusOS task orchestration! #automation'
        })
        
        assert result['success'] is True
        assert result['platform'] == 'twitter'
        assert 'post_id' in result
    
    def test_post_to_linkedin_handler(self):
        """Test LinkedIn posting handler"""
        result = SocialMediaTaskHandlers.post_to_linkedin({
            'message': 'Excited to share our NexusOS automation framework!',
            'visibility': 'public'
        })
        
        assert result['success'] is True
        assert result['platform'] == 'linkedin'
        assert result['visibility'] == 'public'
    
    def test_schedule_post_handler(self):
        """Test post scheduling handler"""
        result = SocialMediaTaskHandlers.schedule_post({
            'platform': 'twitter',
            'message': 'Scheduled post content',
            'scheduled_time': '2025-12-01T12:00:00Z'
        })
        
        assert result['success'] is True
        assert 'schedule_id' in result
        assert result['scheduled_time'] == '2025-12-01T12:00:00Z'
    
    def test_transform_data_handler(self):
        """Test data transformation handler"""
        result = DataTaskHandlers.transform_data({
            'input_data': [1, 2, 3, 4, 5],
            'transformation': 'filter',
            'config': {'condition': 'value > 2'}
        })
        
        assert result['success'] is True
        assert result['transformation'] == 'filter'
    
    def test_generate_report_handler(self):
        """Test report generation handler"""
        result = DataTaskHandlers.generate_report({
            'simulation_ids': [1, 2, 3],
            'report_type': 'summary',
            'format': 'pdf'
        })
        
        assert result['success'] is True
        assert result['format'] == 'pdf'
        assert 'report_id' in result
    
    def test_call_webhook_handler(self):
        """Test webhook calling handler"""
        result = IntegrationTaskHandlers.call_webhook({
            'url': 'https://api.example.com/webhook',
            'method': 'POST',
            'data': {'event': 'simulation_complete'}
        })
        
        assert result['success'] is True
        assert result['url'] == 'https://api.example.com/webhook'


class TestTaskExecution:
    """Test task execution with handlers"""
    
    def test_execute_single_task(self):
        """Test executing a single task"""
        dag = TaskOrchestrationDAG()
        register_all_handlers(dag)
        
        task = (TaskBuilder('log-event')
            .type('admin')
            .operation('log_system_event')
            .params({
                'event_type': 'test',
                'message': 'Test event'
            })
            .build())
        
        dag.add_task(task)
        results = dag.execute_all()
        
        assert 'log-event' in results
        assert results['log-event'].status == TaskStatus.COMPLETED
    
    def test_execute_dependent_tasks(self):
        """Test executing tasks with dependencies"""
        dag = TaskOrchestrationDAG()
        register_all_handlers(dag)
        
        task1 = (TaskBuilder('send-email')
            .type('communication')
            .operation('send_email')
            .params({
                'to': 'user@example.com',
                'subject': 'Test',
                'body': 'Hello'
            })
            .build())
        
        task2 = (TaskBuilder('log-email-sent')
            .type('admin')
            .operation('log_system_event')
            .params({
                'event_type': 'email_sent',
                'message': 'Email sent to user@example.com'
            })
            .depends_on('send-email')
            .build())
        
        dag.add_task(task1)
        dag.add_task(task2)
        
        results = dag.execute_all()
        
        assert results['send-email'].status == TaskStatus.COMPLETED
        assert results['log-email-sent'].status == TaskStatus.COMPLETED
    
    def test_failed_task_cancels_dependents(self):
        """Test that failed task cancels dependent tasks"""
        dag = TaskOrchestrationDAG()
        
        def failing_handler(params):
            raise Exception("Intentional failure")
        
        dag.register_task_handler('test', 'fail', failing_handler)
        
        task1 = Task('task1', 'test', 'fail', {})
        task2 = Task('task2', 'admin', 'log_system_event', 
                    {'event_type': 'test', 'message': 'test'},
                    dependencies=['task1'])
        
        register_all_handlers(dag)
        dag.add_task(task1)
        dag.add_task(task2)
        
        results = dag.execute_all()
        
        assert results['task1'].status == TaskStatus.FAILED
        assert results['task2'].status == TaskStatus.CANCELLED


class TestWorkflowScenarios:
    """Test complete workflow scenarios"""
    
    def test_user_onboarding_workflow(self):
        """Test complete user onboarding workflow"""
        dag = TaskOrchestrationDAG()
        register_all_handlers(dag)
        
        create_user = (TaskBuilder('create-user')
            .type('admin')
            .operation('log_system_event')
            .params({
                'event_type': 'user_created',
                'message': 'New user created'
            })
            .priority(TaskPriority.HIGH)
            .build())
        
        send_welcome = (TaskBuilder('send-welcome-email')
            .type('communication')
            .operation('send_email')
            .params({
                'to': 'newuser@example.com',
                'subject': 'Welcome to NexusOS!',
                'body': 'Welcome message'
            })
            .depends_on('create-user')
            .build())
        
        log_completion = (TaskBuilder('log-onboarding')
            .type('admin')
            .operation('log_system_event')
            .params({
                'event_type': 'onboarding_complete',
                'message': 'User onboarding completed'
            })
            .depends_on('send-welcome-email')
            .build())
        
        dag.add_task(create_user)
        dag.add_task(send_welcome)
        dag.add_task(log_completion)
        
        plan = dag.get_execution_plan()
        assert plan['total_tasks'] == 3
        assert plan['execution_levels'] == 3
        
        results = dag.execute_all()
        assert all(r.status == TaskStatus.COMPLETED for r in results.values())
    
    def test_simulation_notification_workflow(self):
        """Test simulation completion notification workflow"""
        dag = TaskOrchestrationDAG()
        register_all_handlers(dag)
        
        email_task = (TaskBuilder('email-notification')
            .type('communication')
            .operation('send_email')
            .params({
                'to': 'researcher@example.com',
                'subject': 'Simulation Complete',
                'body': 'Your simulation has completed successfully'
            })
            .build())
        
        sms_task = (TaskBuilder('sms-notification')
            .type('communication')
            .operation('send_sms')
            .params({
                'to': '+1234567890',
                'message': 'Simulation complete! Check your email for details.'
            })
            .build())
        
        twitter_task = (TaskBuilder('twitter-post')
            .type('social')
            .operation('post_to_twitter')
            .params({
                'message': 'Just completed a major NexusOS simulation! #DataScience #Economics'
            })
            .build())
        
        dag.add_task(email_task)
        dag.add_task(sms_task)
        dag.add_task(twitter_task)
        
        plan = dag.get_execution_plan()
        assert plan['max_parallelism'] == 3
        
        results = dag.execute_all()
        assert len(results) == 3
        assert all(r.status == TaskStatus.COMPLETED for r in results.values())
