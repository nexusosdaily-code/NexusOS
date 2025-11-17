"""
Wavelength Cryptography Domain Handler

Provides UI interface for wavelength-based encryption/decryption workflows.
"""

import streamlit as st
from typing import Dict, Any
from dag_domains.wavelength_crypto_workflows import (
    create_encrypt_workflow,
    create_decrypt_workflow,
    create_theory_demo_workflow,
    TaskOrchestrator
)
from dag_domains.wavelength_crypto import (
    WavelengthCryptoHandler,
    EncryptedWavelengthMessage
)
from wnsp_frames import WnspEncoder, WnspDecoder
import json


class WavelengthCryptoDomain:
    """Handler for wavelength cryptography domain workflows."""
    
    @staticmethod
    def render_workflows():
        """Render wavelength cryptography workflow buttons and execution."""
        
        st.markdown("""
        **Electromagnetic Theory-Based Encryption/Decryption**
        
        Transform text into wavelength-encoded signals, then encrypt using principles from 
        quantum mechanics and electromagnetic wave theory:
        - 🌊 **Frequency Shift** (FSE): Simulates electron energy level transitions
        - 📡 **Amplitude Modulation** (AME): Varies photon intensity 
        - ⚛️ **Phase Modulation** (PME): Uses wave interference patterns
        - 🔐 **Quantum Multi-Layer** (QIML): Combines all three for maximum security
        """)
        
        # Create tabs for different operations
        tab1, tab2, tab3 = st.tabs(["🔐 Encrypt", "🔓 Decrypt", "⚛️ Theory Demo"])
        
        with tab1:
            WavelengthCryptoDomain._render_encrypt_tab()
        
        with tab2:
            WavelengthCryptoDomain._render_decrypt_tab()
        
        with tab3:
            WavelengthCryptoDomain._render_theory_tab()
    
    @staticmethod
    def _render_encrypt_tab():
        """Render encryption interface."""
        
        st.subheader("🔐 Wavelength Encryption")
        
        col1, col2 = st.columns(2)
        
        with col1:
            message_text = st.text_input(
                "Message to Encrypt",
                value="HELLO",
                max_chars=100,
                help="Enter text (A-Z only)"
            )
        
        with col2:
            encryption_key = st.text_input(
                "Encryption Key",
                value="secret123",
                type="password",
                help="Passphrase for encryption"
            )
        
        method = st.selectbox(
            "Encryption Method",
            options=['qiml', 'fse', 'ame', 'pme'],
            format_func=lambda x: WavelengthCryptoHandler.METHODS[x],
            help="Choose encryption strength"
        )
        
        if st.button("🚀 Encrypt Message", key="encrypt_btn", use_container_width=True):
            if not message_text or not encryption_key:
                st.error("Please provide both message and encryption key")
                return
            
            with st.spinner("Encrypting using electromagnetic theory..."):
                # Create and execute workflow
                workflow = create_encrypt_workflow(message_text, encryption_key, method)
                orchestrator = TaskOrchestrator()
                results = orchestrator.execute_workflow(workflow)
                
                # Store encrypted message in session state
                if 'encrypt_wavelength' in results and results['encrypt_wavelength']['status'] == 'success':
                    st.session_state['encrypted_wavelength_message'] = results['encrypt_wavelength']['encrypted_message']
                
                # Display results
                WavelengthCryptoDomain._display_workflow_results(
                    results,
                    "Encryption Complete"
                )
                
                # Display encryption summary
                if 'generate_report' in results and results['generate_report']['status'] == 'success':
                    summary = results['generate_report']['summary']
                    
                    st.success("✅ Encryption Successful!")
                    
                    with st.expander("📊 Encryption Summary"):
                        col1, col2 = st.columns(2)
                        with col1:
                            st.metric("Original Text", summary['original_text'])
                            st.metric("Encrypted Frames", summary['encrypted_frames'])
                            st.metric("Method", summary['encryption_method'])
                        with col2:
                            st.metric("Average Wavelength", f"{summary['avg_wavelength_nm']} nm")
                            st.metric("Wavelength Range", summary['wavelength_range'])
                            st.metric("Key Hash", summary['key_hash_prefix'] + "...")
    
    @staticmethod
    def _render_decrypt_tab():
        """Render decryption interface."""
        
        st.subheader("🔓 Wavelength Decryption")
        
        # Check if there's an encrypted message in session
        if 'encrypted_wavelength_message' not in st.session_state:
            st.info("No encrypted message available. Please encrypt a message first in the Encrypt tab.")
            return
        
        encrypted_msg = st.session_state['encrypted_wavelength_message']
        
        st.write(f"**Encrypted Message Ready**")
        st.write(f"- Method: {encrypted_msg.metadata['method_name']}")
        st.write(f"- Frames: {len(encrypted_msg.encrypted_frames)}")
        st.write(f"- Key Hash: {encrypted_msg.key_hash[:16]}...")
        
        decryption_key = st.text_input(
            "Decryption Key",
            value="",
            type="password",
            help="Enter the encryption key to decrypt"
        )
        
        if st.button("🔓 Decrypt Message", key="decrypt_btn", use_container_width=True):
            if not decryption_key:
                st.error("Please provide the decryption key")
                return
            
            with st.spinner("Decrypting wavelength-encrypted message..."):
                # Create and execute workflow
                workflow = create_decrypt_workflow(encrypted_msg, decryption_key)
                orchestrator = TaskOrchestrator()
                results = orchestrator.execute_workflow(workflow)
                
                # Display results
                WavelengthCryptoDomain._display_workflow_results(
                    results,
                    "Decryption Process"
                )
                
                # Check if decryption was successful
                if 'validate_decryption' in results:
                    validation = results['validate_decryption']
                    
                    if validation['status'] == 'success' and validation['decryption_successful']:
                        summary = validation['summary']
                        st.success(f"✅ Decrypted Text: **{summary['decrypted_text']}**")
                        
                        with st.expander("📊 Decryption Summary"):
                            col1, col2 = st.columns(2)
                            with col1:
                                st.metric("Decrypted Text", summary['decrypted_text'])
                                st.metric("Text Length", summary['text_length'])
                            with col2:
                                st.metric("Encryption Method", summary['encryption_method'])
                                st.metric("Sender", summary['original_sender'])
                    else:
                        st.error("❌ Decryption failed. Check your key and try again.")
    
    @staticmethod
    def _render_theory_tab():
        """Render electromagnetic theory demonstration."""
        
        st.subheader("⚛️ Electromagnetic Theory Demonstration")
        
        st.markdown("""
        This demonstration shows how electromagnetic theory principles are applied
        in wavelength-based cryptography.
        
        **Key Concepts:**
        1. **Photon Energy**: E = hc/λ (Planck-Einstein relation)
        2. **Electron Transitions**: Electrons absorb energy to jump orbits
        3. **Photon Emission**: Electrons emit photons when falling back to lower orbits
        4. **Wave Properties**: Frequency, amplitude, and phase encode information
        """)
        
        if st.button("🔬 Run Theory Demo", use_container_width=True):
            with st.spinner("Calculating electromagnetic properties..."):
                # Create and execute workflow
                workflow = create_theory_demo_workflow()
                orchestrator = TaskOrchestrator()
                results = orchestrator.execute_workflow(workflow)
                
                # Display results
                WavelengthCryptoDomain._display_workflow_results(
                    results,
                    "Electromagnetic Theory Demo"
                )
                
                # Display photon energies
                if 'calculate_photon_energies' in results:
                    energies = results['calculate_photon_energies']['photon_energies']
                    theory = results['calculate_photon_energies']['theory']
                    
                    st.write(f"**Theory:** {theory}")
                    
                    cols = st.columns(len(energies))
                    for col, energy_data in zip(cols, energies):
                        with col:
                            st.metric(
                                f"{energy_data['color'].title()}",
                                f"{energy_data['wavelength_nm']} nm",
                                f"{energy_data['energy_ev']} eV"
                            )
                
                # Display electron transitions
                if 'simulate_transitions' in results:
                    transitions = results['simulate_transitions']['electron_transitions']
                    
                    st.write("**Electron Transitions:**")
                    for trans in transitions:
                        direction = "⬆️" if trans['transition_type'] == 'absorption' else "⬇️"
                        st.write(f"{direction} {trans['from_wavelength']} nm → {trans['to_wavelength']} nm "
                               f"(ΔE = {trans['energy_absorbed']} eV)")
                
                # Display encryption theory
                if 'explain_encryption' in results:
                    theory_summary = results['explain_encryption']['theory_summary']
                    
                    st.write("**Encryption Methods:**")
                    for method, explanation in theory_summary.items():
                        if method != 'physics_basis':
                            st.write(f"- **{method.upper()}**: {explanation}")
                    
                    st.info(f"🔬 {theory_summary['physics_basis']}")
    
    @staticmethod
    def _display_workflow_results(results: Dict[str, Any], title: str):
        """Display workflow execution results."""
        
        with st.expander(f"📋 {title} - Task Execution Details"):
            for task_id, result in results.items():
                status_icon = "✅" if result['status'] == 'success' else "❌"
                st.write(f"{status_icon} **{task_id}**")
                
                # Display result details
                for key, value in result.items():
                    if key not in ['status', 'wnsp_message', 'encrypted_message', 'decrypted_message']:
                        if isinstance(value, (dict, list)):
                            st.json(value)
                        else:
                            st.write(f"  - {key}: {value}")
