"""
Wavelength Cryptography Workflows - DAG Integration

Defines task orchestration workflows for wavelength-based encryption/decryption.
"""

from typing import Dict, Any, List, Callable
from dag_domains.wavelength_crypto import (
    WavelengthCryptoHandler,
    WavelengthCryptoEngine,
    EncryptedWavelengthMessage
)
from wnsp_frames import WnspEncoder, WnspDecoder
import json


class TaskNode:
    """Simple task node for workflow execution."""
    def __init__(self, task_id: str, name: str, handler: Callable, description: str = "", dependencies: List[str] = None):
        self.task_id = task_id
        self.name = name
        self.handler = handler
        self.description = description
        self.dependencies = dependencies or []


class WorkflowDAG:
    """Simple DAG for workflow execution."""
    def __init__(self, name: str, description: str = ""):
        self.name = name
        self.description = description
        self.nodes = {}
    
    def add_node(self, node: TaskNode):
        """Add a node to the workflow."""
        self.nodes[node.task_id] = node


class TaskOrchestrator:
    """Executes workflows by running nodes in dependency order."""
    
    def execute_workflow(self, workflow: WorkflowDAG) -> Dict[str, Any]:
        """
        Execute workflow by running nodes in topological order.
        
        Args:
            workflow: WorkflowDAG to execute
            
        Returns:
            Dictionary mapping task_id to execution results
        """
        results = {}
        context = {}
        executed = set()
        
        def can_execute(node: TaskNode) -> bool:
            """Check if all dependencies are satisfied."""
            return all(dep in executed for dep in node.dependencies)
        
        def execute_node(node: TaskNode):
            """Execute a single node."""
            # Build context from previous results
            for dep in node.dependencies:
                if dep in results:
                    context[dep] = results[dep]
            
            # Execute handler
            result = node.handler(context)
            results[node.task_id] = result
            executed.add(node.task_id)
        
        # Execute nodes in topological order
        while len(executed) < len(workflow.nodes):
            made_progress = False
            
            for task_id, node in workflow.nodes.items():
                if task_id not in executed and can_execute(node):
                    execute_node(node)
                    made_progress = True
            
            if not made_progress and len(executed) < len(workflow.nodes):
                # Circular dependency or missing nodes
                remaining = set(workflow.nodes.keys()) - executed
                raise ValueError(f"Cannot execute workflow: circular dependency or missing nodes: {remaining}")
        
        return results


def create_encrypt_workflow(
    message_text: str,
    encryption_key: str,
    method: str = 'qiml'
) -> WorkflowDAG:
    """
    Create DAG workflow for encrypting a wavelength message.
    
    Workflow steps:
    1. Encode text to WNSP frames
    2. Apply wavelength encryption
    3. Package encrypted message
    4. Generate summary report
    
    Args:
        message_text: Text to encrypt
        encryption_key: Encryption passphrase
        method: Encryption method (fse, ame, pme, qiml)
        
    Returns:
        WorkflowDAG for encryption
    """
    workflow = WorkflowDAG(
        name=f"encrypt_wavelength_{method}",
        description=f"Encrypt message using {method.upper()}"
    )
    
    # Step 1: Encode to WNSP
    def encode_step(context: Dict[str, Any]) -> Dict[str, Any]:
        encoder = WnspEncoder()
        message = encoder.encode_message(message_text)
        return {
            'status': 'success',
            'wnsp_message': message,
            'frame_count': len(message.frames),
            'message_text': message_text
        }
    
    encode_node = TaskNode(
        task_id='encode_wnsp',
        name='Encode to WNSP',
        handler=encode_step,
        description='Convert text to wavelength frames'
    )
    
    # Step 2: Encrypt
    def encrypt_step(context: Dict[str, Any]) -> Dict[str, Any]:
        wnsp_message = context['encode_wnsp']['wnsp_message']
        encrypted = WavelengthCryptoHandler.encrypt_message(
            wnsp_message,
            encryption_key,
            method
        )
        return {
            'status': 'success',
            'encrypted_message': encrypted,
            'method': method,
            'key_hash': encrypted.key_hash[:16] + '...'  # Truncated for display
        }
    
    encrypt_node = TaskNode(
        task_id='encrypt_wavelength',
        name=f'Apply {method.upper()} Encryption',
        handler=encrypt_step,
        description=f'Encrypt using {WavelengthCryptoHandler.METHODS[method]}',
        dependencies=['encode_wnsp']
    )
    
    # Step 3: Package
    def package_step(context: Dict[str, Any]) -> Dict[str, Any]:
        encrypted = context['encrypt_wavelength']['encrypted_message']
        return {
            'status': 'success',
            'package_size': len(encrypted.encrypted_frames),
            'ready_for_transmission': True
        }
    
    package_node = TaskNode(
        task_id='package_encrypted',
        name='Package Encrypted Message',
        handler=package_step,
        description='Prepare encrypted message for transmission',
        dependencies=['encrypt_wavelength']
    )
    
    # Step 4: Generate report
    def report_step(context: Dict[str, Any]) -> Dict[str, Any]:
        encrypted = context['encrypt_wavelength']['encrypted_message']
        original_text = context['encode_wnsp']['message_text']
        
        # Calculate wavelength statistics
        wavelengths = [f['wavelength_nm'] for f in encrypted.encrypted_frames]
        avg_wavelength = sum(wavelengths) / len(wavelengths) if wavelengths else 0
        
        return {
            'status': 'success',
            'summary': {
                'original_text': original_text,
                'original_length': len(original_text),
                'encrypted_frames': len(encrypted.encrypted_frames),
                'encryption_method': encrypted.metadata['method_name'],
                'key_hash_prefix': encrypted.key_hash[:16],
                'avg_wavelength_nm': round(avg_wavelength, 2),
                'wavelength_range': f"{min(wavelengths):.0f}-{max(wavelengths):.0f} nm"
            }
        }
    
    report_node = TaskNode(
        task_id='generate_report',
        name='Generate Encryption Report',
        handler=report_step,
        description='Create summary of encryption process',
        dependencies=['package_encrypted']
    )
    
    # Add nodes to workflow
    workflow.add_node(encode_node)
    workflow.add_node(encrypt_node)
    workflow.add_node(package_node)
    workflow.add_node(report_node)
    
    return workflow


def create_decrypt_workflow(
    encrypted_message: EncryptedWavelengthMessage,
    decryption_key: str
) -> WorkflowDAG:
    """
    Create DAG workflow for decrypting a wavelength message.
    
    Workflow steps:
    1. Verify encryption key
    2. Decrypt wavelength frames
    3. Decode WNSP to text
    4. Validate decryption success
    
    Args:
        encrypted_message: Encrypted wavelength message
        decryption_key: Decryption passphrase
        
    Returns:
        WorkflowDAG for decryption
    """
    workflow = WorkflowDAG(
        name="decrypt_wavelength",
        description="Decrypt wavelength-encrypted message"
    )
    
    # Step 1: Verify key
    def verify_key_step(context: Dict[str, Any]) -> Dict[str, Any]:
        engine = WavelengthCryptoEngine(decryption_key)
        key_valid = engine.key_hash == encrypted_message.key_hash
        
        if not key_valid:
            return {
                'status': 'failed',
                'error': 'Invalid decryption key',
                'key_match': False
            }
        
        return {
            'status': 'success',
            'key_match': True,
            'encryption_method': encrypted_message.encryption_method
        }
    
    verify_node = TaskNode(
        task_id='verify_key',
        name='Verify Decryption Key',
        handler=verify_key_step,
        description='Validate encryption key matches'
    )
    
    # Step 2: Decrypt
    def decrypt_step(context: Dict[str, Any]) -> Dict[str, Any]:
        if not context['verify_key']['key_match']:
            return {
                'status': 'failed',
                'error': 'Cannot decrypt with invalid key'
            }
        
        try:
            decrypted_message = WavelengthCryptoHandler.decrypt_message(
                encrypted_message,
                decryption_key
            )
            return {
                'status': 'success',
                'decrypted_message': decrypted_message,
                'frame_count': len(decrypted_message.frames)
            }
        except Exception as e:
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    decrypt_node = TaskNode(
        task_id='decrypt_wavelength',
        name='Decrypt Wavelength Frames',
        handler=decrypt_step,
        description='Apply inverse encryption to recover original frames',
        dependencies=['verify_key']
    )
    
    # Step 3: Decode to text
    def decode_step(context: Dict[str, Any]) -> Dict[str, Any]:
        if context['decrypt_wavelength']['status'] == 'failed':
            return {
                'status': 'failed',
                'error': 'Decryption failed'
            }
        
        decrypted_message = context['decrypt_wavelength']['decrypted_message']
        decoder = WnspDecoder()
        
        try:
            decoded_text = decoder.decode_message(decrypted_message)
            return {
                'status': 'success',
                'decoded_text': decoded_text,
                'text_length': len(decoded_text)
            }
        except Exception as e:
            return {
                'status': 'failed',
                'error': f'Decode failed: {str(e)}'
            }
    
    decode_node = TaskNode(
        task_id='decode_wnsp',
        name='Decode WNSP to Text',
        handler=decode_step,
        description='Convert wavelength frames back to text',
        dependencies=['decrypt_wavelength']
    )
    
    # Step 4: Validate
    def validate_step(context: Dict[str, Any]) -> Dict[str, Any]:
        if context['decode_wnsp']['status'] == 'failed':
            return {
                'status': 'failed',
                'error': 'Decoding failed',
                'decryption_successful': False
            }
        
        decoded_text = context['decode_wnsp']['decoded_text']
        
        return {
            'status': 'success',
            'decryption_successful': True,
            'summary': {
                'decrypted_text': decoded_text,
                'text_length': len(decoded_text),
                'encryption_method': encrypted_message.metadata['method_name'],
                'original_sender': encrypted_message.metadata.get('sender_id', 'unknown')
            }
        }
    
    validate_node = TaskNode(
        task_id='validate_decryption',
        name='Validate Decryption',
        handler=validate_step,
        description='Confirm successful decryption and decoding',
        dependencies=['decode_wnsp']
    )
    
    # Add nodes to workflow
    workflow.add_node(verify_node)
    workflow.add_node(decrypt_node)
    workflow.add_node(decode_node)
    workflow.add_node(validate_node)
    
    return workflow


def create_theory_demo_workflow() -> WorkflowDAG:
    """
    Create demo workflow showing electromagnetic theory in action.
    
    Demonstrates:
    1. Energy level calculations
    2. Photon emission simulation
    3. Wavelength-frequency relationships
    4. Encryption theory validation
    
    Returns:
        WorkflowDAG for theory demonstration
    """
    workflow = WorkflowDAG(
        name="em_theory_demo",
        description="Demonstrate electromagnetic theory concepts"
    )
    
    # Step 1: Calculate photon energies
    def calculate_energies_step(context: Dict[str, Any]) -> Dict[str, Any]:
        engine = WavelengthCryptoEngine("demo_key")
        
        test_wavelengths = [400, 500, 600, 700]  # nm (violet to red)
        energies = []
        
        for wl in test_wavelengths:
            energy_ev = engine._calculate_photon_energy(wl)
            energies.append({
                'wavelength_nm': wl,
                'energy_ev': round(energy_ev, 4),
                'color': 'violet' if wl < 450 else 'blue' if wl < 495 else 'green' if wl < 570 else 'red'
            })
        
        return {
            'status': 'success',
            'photon_energies': energies,
            'theory': 'E = hc/λ (Planck-Einstein relation)'
        }
    
    energy_node = TaskNode(
        task_id='calculate_photon_energies',
        name='Calculate Photon Energies',
        handler=calculate_energies_step,
        description='Demonstrate E = hc/λ relationship'
    )
    
    # Step 2: Simulate electron transitions
    def electron_transition_step(context: Dict[str, Any]) -> Dict[str, Any]:
        energies = context['calculate_photon_energies']['photon_energies']
        
        transitions = []
        for i in range(len(energies) - 1):
            e1 = energies[i]['energy_ev']
            e2 = energies[i + 1]['energy_ev']
            delta_e = e1 - e2
            
            transitions.append({
                'from_wavelength': energies[i]['wavelength_nm'],
                'to_wavelength': energies[i + 1]['wavelength_nm'],
                'energy_absorbed': round(delta_e, 4),
                'transition_type': 'absorption' if delta_e > 0 else 'emission'
            })
        
        return {
            'status': 'success',
            'electron_transitions': transitions,
            'theory': 'Electrons absorb energy to jump orbits, emit photons when falling back'
        }
    
    transition_node = TaskNode(
        task_id='simulate_transitions',
        name='Simulate Electron Transitions',
        handler=electron_transition_step,
        description='Show energy absorption/emission',
        dependencies=['calculate_photon_energies']
    )
    
    # Step 3: Demonstrate encryption theory
    def encryption_theory_step(context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            'status': 'success',
            'theory_summary': {
                'fse': 'Shifts wavelength by modulating electron energy levels',
                'ame': 'Varies photon intensity (amplitude) to encode information',
                'pme': 'Uses wave phase (payload bits) for additional encoding',
                'qiml': 'Combines all three methods for maximum security',
                'physics_basis': 'Based on quantum mechanics and electromagnetic wave theory'
            }
        }
    
    theory_node = TaskNode(
        task_id='explain_encryption',
        name='Explain Encryption Theory',
        handler=encryption_theory_step,
        description='Connect physics to cryptography',
        dependencies=['simulate_transitions']
    )
    
    # Add nodes
    workflow.add_node(energy_node)
    workflow.add_node(transition_node)
    workflow.add_node(theory_node)
    
    return workflow
