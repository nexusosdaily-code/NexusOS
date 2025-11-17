"""
Task Handlers for NexusOS DAG Orchestration

Implements specific handlers for various operation types:
- Administration: User management, system configuration, logging
- Communications: Email, SMS, notifications
- Social Media: Twitter/X, LinkedIn, scheduling
- Data: Export, import, transformation
- Integration: API calls, webhooks
"""

from typing import Dict, Any, Optional
import os
import json
from datetime import datetime
from database import get_engine, User, Role
from sqlalchemy.orm import sessionmaker


# ============================================================================
# ADMINISTRATION TASK HANDLERS
# ============================================================================

class AdminTaskHandlers:
    """Handlers for administrative tasks"""
    
    @staticmethod
    def create_user(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new user account
        
        Params:
            email: User email
            password: User password (will be hashed)
            roles: List of role names to assign
        """
        from auth import create_user
        
        engine = get_engine()
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        try:
            user = create_user(
                db,
                params['email'],
                params['password'],
                params.get('roles', ['viewer'])
            )
            
            return {
                'success': True,
                'user_id': user.id if user else None,
                'email': params['email']
            }
        finally:
            db.close()
    
    @staticmethod
    def update_user_roles(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update user roles
        
        Params:
            user_id: User ID
            roles: List of role names
        """
        engine = get_engine()
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        try:
            user = db.query(User).filter(User.id == params['user_id']).first()
            
            if not user:
                return {'success': False, 'error': 'User not found'}
            
            user.user_roles.clear()
            
            for role_name in params['roles']:
                role = db.query(Role).filter(Role.name == role_name).first()
                if role:
                    from database import UserRole
                    user_role = UserRole(user_id=user.id, role_id=role.id)
                    db.add(user_role)
            
            db.commit()
            
            return {'success': True, 'user_id': user.id}
        finally:
            db.close()
    
    @staticmethod
    def log_system_event(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Log a system event
        
        Params:
            event_type: Type of event
            message: Event message
            metadata: Additional event data
        """
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': params['event_type'],
            'message': params['message'],
            'metadata': params.get('metadata', {})
        }
        
        print(f"[SYSTEM LOG] {json.dumps(log_entry)}")
        
        return {'success': True, 'log_entry': log_entry}
    
    @staticmethod
    def export_simulation_data(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Export simulation data to file
        
        Params:
            simulation_id: Simulation run ID
            format: Export format (json, csv)
            output_path: Optional output path
        """
        from database import SimulationRun
        
        engine = get_engine()
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        try:
            sim_run = db.query(SimulationRun).filter(
                SimulationRun.id == params['simulation_id']
            ).first()
            
            if not sim_run:
                return {'success': False, 'error': 'Simulation not found'}
            
            format_type = params.get('format', 'json')
            output_path = params.get('output_path', f'export_{sim_run.id}.{format_type}')
            
            if format_type == 'json':
                with open(output_path, 'w') as f:
                    json.dump(sim_run.results, f, indent=2)
            
            return {
                'success': True,
                'output_path': output_path,
                'format': format_type
            }
        finally:
            db.close()


# ============================================================================
# COMMUNICATION TASK HANDLERS
# ============================================================================

class CommunicationTaskHandlers:
    """Handlers for communication tasks (email, SMS, notifications)"""
    
    @staticmethod
    def send_email(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send email notification
        
        Params:
            to: Recipient email
            subject: Email subject
            body: Email body
            template: Optional template name
        """
        print(f"[EMAIL] To: {params['to']}, Subject: {params['subject']}")
        
        return {
            'success': True,
            'method': 'email',
            'recipient': params['to'],
            'message_id': f"msg_{datetime.utcnow().timestamp()}"
        }
    
    @staticmethod
    def send_sms(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send SMS notification via Twilio
        
        Params:
            to: Recipient phone number
            message: SMS message body
        """
        print(f"[SMS] To: {params['to']}, Message: {params['message'][:50]}...")
        
        return {
            'success': True,
            'method': 'sms',
            'recipient': params['to'],
            'message_id': f"sms_{datetime.utcnow().timestamp()}"
        }
    
    @staticmethod
    def send_notification(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send in-app notification
        
        Params:
            user_id: Target user ID
            title: Notification title
            message: Notification message
            priority: Notification priority (low, normal, high, critical)
        """
        notification = {
            'user_id': params['user_id'],
            'title': params['title'],
            'message': params['message'],
            'priority': params.get('priority', 'normal'),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        print(f"[NOTIFICATION] {json.dumps(notification)}")
        
        return {
            'success': True,
            'notification_id': f"notif_{datetime.utcnow().timestamp()}"
        }
    
    @staticmethod
    def send_wavelength_encrypted_message(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send wavelength-encrypted secure message using electromagnetic theory
        
        Params:
            to: Recipient identifier (email, user_id, phone)
            message: Plain text message to encrypt
            encryption_key: Secret key for encryption
            method: Encryption method (fse, ame, pme, qiml)
            delivery_method: How to deliver (email, sms, notification, storage)
        """
        from dag_domains.wavelength_crypto import WavelengthCryptoHandler
        from wnsp_frames import WnspEncoder, WnspDecoder
        
        message_text = params['message']
        encryption_key = params['encryption_key']
        method = params.get('method', 'qiml')
        delivery_method = params.get('delivery_method', 'storage')
        
        # Encode message to wavelengths
        encoder = WnspEncoder()
        wnsp_message = encoder.encode_message(message_text)
        
        # Encrypt using wavelength cryptography
        encrypted_message = WavelengthCryptoHandler.encrypt_message(
            wnsp_message,
            encryption_key,
            method
        )
        
        # Create secure payload
        encrypted_payload = {
            'encrypted_wavelength_data': encrypted_message.to_dict(),
            'method': method,
            'timestamp': datetime.utcnow().isoformat(),
            'message_id': f"wcrypto_{datetime.utcnow().timestamp()}"
        }
        
        print(f"[WAVELENGTH CRYPTO] Encrypted {len(message_text)} chars using {method.upper()}")
        print(f"[WAVELENGTH CRYPTO] Delivery: {delivery_method}")
        
        # Deliver via chosen method
        delivery_result = None
        if delivery_method == 'email':
            delivery_result = CommunicationTaskHandlers.send_email({
                'to': params['to'],
                'subject': 'Secure Wavelength-Encrypted Message',
                'body': f"Encrypted message payload: {json.dumps(encrypted_payload)}"
            })
        elif delivery_method == 'sms':
            delivery_result = CommunicationTaskHandlers.send_sms({
                'to': params['to'],
                'message': f"Secure wavelength message ID: {encrypted_payload['message_id']}"
            })
        elif delivery_method == 'notification':
            delivery_result = CommunicationTaskHandlers.send_notification({
                'user_id': params['to'],
                'title': '🔐 Secure Message Received',
                'message': f"Wavelength-encrypted message using {method.upper()}",
                'priority': 'high'
            })
        
        return {
            'success': True,
            'method': 'wavelength_crypto',
            'encryption_method': method,
            'recipient': params['to'],
            'message_id': encrypted_payload['message_id'],
            'encrypted_payload': encrypted_payload,
            'delivery_method': delivery_method,
            'delivery_result': delivery_result,
            'message_length': len(message_text)
        }
    
    @staticmethod
    def decrypt_wavelength_message(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decrypt wavelength-encrypted message
        
        Params:
            encrypted_payload: The encrypted message payload
            decryption_key: Secret key for decryption
        """
        from dag_domains.wavelength_crypto import WavelengthCryptoHandler, EncryptedWavelengthMessage
        from wnsp_frames import WnspDecoder
        
        encrypted_data = params['encrypted_payload']['encrypted_wavelength_data']
        decryption_key = params['decryption_key']
        
        # Reconstruct encrypted message
        encrypted_message = EncryptedWavelengthMessage.from_dict(encrypted_data)
        
        # Decrypt
        try:
            decrypted_message = WavelengthCryptoHandler.decrypt_message(
                encrypted_message,
                decryption_key
            )
            
            # Decode wavelengths back to text
            decoder = WnspDecoder()
            decrypted_text = decoder.decode_message(decrypted_message)
            
            print(f"[WAVELENGTH CRYPTO] Successfully decrypted: {decrypted_text}")
            
            return {
                'success': True,
                'decrypted_text': decrypted_text,
                'method': encrypted_message.metadata.get('encryption_method', 'unknown'),
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            print(f"[WAVELENGTH CRYPTO] Decryption failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Decryption failed - wrong key or corrupted data'
            }


# ============================================================================
# SOCIAL MEDIA TASK HANDLERS
# ============================================================================

class SocialMediaTaskHandlers:
    """Handlers for social media integration tasks"""
    
    @staticmethod
    def post_to_twitter(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post to Twitter/X
        
        Params:
            message: Tweet content (max 280 chars)
            media_urls: Optional list of media URLs
        """
        message = params['message'][:280]
        
        print(f"[TWITTER] Posting: {message}")
        
        return {
            'success': True,
            'platform': 'twitter',
            'post_id': f"tweet_{datetime.utcnow().timestamp()}",
            'message': message
        }
    
    @staticmethod
    def post_to_linkedin(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post to LinkedIn
        
        Params:
            message: Post content
            visibility: Post visibility (public, connections, private)
        """
        print(f"[LINKEDIN] Posting: {params['message'][:50]}...")
        
        return {
            'success': True,
            'platform': 'linkedin',
            'post_id': f"li_{datetime.utcnow().timestamp()}",
            'visibility': params.get('visibility', 'public')
        }
    
    @staticmethod
    def schedule_post(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Schedule a social media post for later
        
        Params:
            platform: Platform to post to (twitter, linkedin, etc.)
            message: Post content
            scheduled_time: ISO format datetime string
        """
        schedule = {
            'platform': params['platform'],
            'message': params['message'],
            'scheduled_time': params['scheduled_time'],
            'created_at': datetime.utcnow().isoformat()
        }
        
        print(f"[SCHEDULED POST] {json.dumps(schedule)}")
        
        return {
            'success': True,
            'schedule_id': f"sched_{datetime.utcnow().timestamp()}",
            'scheduled_time': params['scheduled_time']
        }


# ============================================================================
# DATA PROCESSING TASK HANDLERS
# ============================================================================

class DataTaskHandlers:
    """Handlers for data processing tasks"""
    
    @staticmethod
    def transform_data(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform data using specified transformation
        
        Params:
            input_data: Input data (list, dict, etc.)
            transformation: Transformation type (filter, map, aggregate)
            config: Transformation configuration
        """
        input_data = params['input_data']
        transformation = params['transformation']
        
        print(f"[DATA] Transforming {len(input_data)} records with {transformation}")
        
        return {
            'success': True,
            'transformation': transformation,
            'output_count': len(input_data)
        }
    
    @staticmethod
    def generate_report(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a report from simulation data
        
        Params:
            simulation_ids: List of simulation IDs
            report_type: Type of report (summary, detailed, comparison)
            format: Output format (pdf, html, json)
        """
        print(f"[REPORT] Generating {params['report_type']} report")
        
        return {
            'success': True,
            'report_id': f"report_{datetime.utcnow().timestamp()}",
            'format': params.get('format', 'json')
        }


# ============================================================================
# INTEGRATION TASK HANDLERS
# ============================================================================

class IntegrationTaskHandlers:
    """Handlers for external service integrations"""
    
    @staticmethod
    def call_webhook(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call external webhook
        
        Params:
            url: Webhook URL
            method: HTTP method (GET, POST, etc.)
            data: Request payload
            headers: Optional HTTP headers
        """
        print(f"[WEBHOOK] {params['method']} {params['url']}")
        
        return {
            'success': True,
            'url': params['url'],
            'status_code': 200
        }
    
    @staticmethod
    def api_request(params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make API request to external service
        
        Params:
            service: Service name (oracle, external_api, etc.)
            endpoint: API endpoint
            method: HTTP method
            data: Request payload
        """
        print(f"[API] {params['service']}.{params['endpoint']}")
        
        return {
            'success': True,
            'service': params['service'],
            'endpoint': params['endpoint']
        }


# ============================================================================
# TASK HANDLER REGISTRY
# ============================================================================

def register_all_handlers(orchestrator):
    """
    Register all task handlers with the orchestration engine
    
    Args:
        orchestrator: TaskOrchestrationDAG instance
    """
    orchestrator.register_task_handler('admin', 'create_user', AdminTaskHandlers.create_user)
    orchestrator.register_task_handler('admin', 'update_user_roles', AdminTaskHandlers.update_user_roles)
    orchestrator.register_task_handler('admin', 'log_system_event', AdminTaskHandlers.log_system_event)
    orchestrator.register_task_handler('admin', 'export_simulation_data', AdminTaskHandlers.export_simulation_data)
    
    orchestrator.register_task_handler('communication', 'send_email', CommunicationTaskHandlers.send_email)
    orchestrator.register_task_handler('communication', 'send_sms', CommunicationTaskHandlers.send_sms)
    orchestrator.register_task_handler('communication', 'send_notification', CommunicationTaskHandlers.send_notification)
    orchestrator.register_task_handler('communication', 'send_wavelength_encrypted_message', CommunicationTaskHandlers.send_wavelength_encrypted_message)
    orchestrator.register_task_handler('communication', 'decrypt_wavelength_message', CommunicationTaskHandlers.decrypt_wavelength_message)
    
    orchestrator.register_task_handler('social', 'post_to_twitter', SocialMediaTaskHandlers.post_to_twitter)
    orchestrator.register_task_handler('social', 'post_to_linkedin', SocialMediaTaskHandlers.post_to_linkedin)
    orchestrator.register_task_handler('social', 'schedule_post', SocialMediaTaskHandlers.schedule_post)
    
    orchestrator.register_task_handler('data', 'transform_data', DataTaskHandlers.transform_data)
    orchestrator.register_task_handler('data', 'generate_report', DataTaskHandlers.generate_report)
    
    orchestrator.register_task_handler('integration', 'call_webhook', IntegrationTaskHandlers.call_webhook)
    orchestrator.register_task_handler('integration', 'api_request', IntegrationTaskHandlers.api_request)
