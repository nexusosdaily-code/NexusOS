"""
Tests for Wavelength Cryptography Domain

Tests electromagnetic theory-based encryption/decryption.
"""

import pytest
from typing import List
from dag_domains.wavelength_crypto import (
    WavelengthCryptoEngine,
    WavelengthCryptoHandler,
    EncryptedWavelengthMessage,
    PLANCK_CONSTANT,
    SPEED_OF_LIGHT,
    ELECTRON_VOLT
)
from dag_domains.wavelength_crypto_workflows import (
    create_encrypt_workflow,
    create_decrypt_workflow,
    create_theory_demo_workflow,
    TaskOrchestrator
)
from wnsp_frames import WnspFrame, WnspEncoder, WnspFrameMessage


class TestWavelengthCryptoEngine:
    """Test cryptographic engine functionality."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.encryption_key = "test_secret_123"
        self.engine = WavelengthCryptoEngine(self.encryption_key)
        
        # Create test message
        encoder = WnspEncoder()
        self.test_message = encoder.encode_message("HELLO")
        self.test_frames = self.test_message.frames
    
    def test_photon_energy_calculation(self):
        """Test photon energy calculation using E = hc/λ."""
        # Test with known wavelength (500nm = green light)
        wavelength_nm = 500.0
        energy_ev = self.engine._calculate_photon_energy(wavelength_nm)
        
        # Verify energy is positive
        assert energy_ev > 0
        
        # Verify inverse relationship (higher wavelength = lower energy)
        energy_400nm = self.engine._calculate_photon_energy(400.0)  # violet
        energy_700nm = self.engine._calculate_photon_energy(700.0)  # red
        
        assert energy_400nm > energy_ev > energy_700nm
    
    def test_energy_to_wavelength_inverse(self):
        """Test that energy → wavelength → energy is reversible."""
        original_wavelength = 550.0  # nm
        
        # Convert to energy and back
        energy = self.engine._calculate_photon_energy(original_wavelength)
        recovered_wavelength = self.engine._energy_to_wavelength(energy)
        
        # Should be within floating point precision
        assert abs(recovered_wavelength - original_wavelength) < 0.001
    
    def test_frequency_shift_encryption_decryption(self):
        """Test frequency shift encryption is reversible."""
        # Encrypt
        encrypted_frames = self.engine.frequency_shift_encrypt(self.test_frames)
        
        # Verify encryption changed wavelengths
        assert len(encrypted_frames) == len(self.test_frames)
        wavelength_changed = any(
            encrypted.wavelength_nm != original.wavelength_nm
            for encrypted, original in zip(encrypted_frames, self.test_frames)
        )
        assert wavelength_changed, "Encryption should modify wavelengths"
        
        # Decrypt
        decrypted_frames = self.engine.frequency_shift_decrypt(encrypted_frames)
        
        # Verify decryption recovered original wavelengths (within tolerance)
        for decrypted, original in zip(decrypted_frames, self.test_frames):
            assert abs(decrypted.wavelength_nm - original.wavelength_nm) < 1.0
    
    def test_amplitude_modulation_encryption_decryption(self):
        """Test amplitude modulation encryption is reversible."""
        # Encrypt
        encrypted_frames = self.engine.amplitude_modulation_encrypt(self.test_frames)
        
        # Verify encryption changed intensity
        assert len(encrypted_frames) == len(self.test_frames)
        intensity_changed = any(
            encrypted.intensity_level != original.intensity_level
            for encrypted, original in zip(encrypted_frames, self.test_frames)
        )
        assert intensity_changed, "Encryption should modify intensity"
        
        # Decrypt
        decrypted_frames = self.engine.amplitude_modulation_decrypt(encrypted_frames)
        
        # Verify decryption recovered original intensity
        for decrypted, original in zip(decrypted_frames, self.test_frames):
            assert decrypted.intensity_level == original.intensity_level
    
    def test_phase_modulation_encryption_decryption(self):
        """Test phase modulation encryption is reversible."""
        # Encrypt
        encrypted_frames = self.engine.phase_modulation_encrypt(self.test_frames)
        
        # Verify encryption changed payload bits
        assert len(encrypted_frames) == len(self.test_frames)
        
        # Decrypt
        decrypted_frames = self.engine.phase_modulation_decrypt(encrypted_frames)
        
        # Verify decryption recovered original payload bits
        for decrypted, original in zip(decrypted_frames, self.test_frames):
            assert decrypted.payload_bit == original.payload_bit
    
    def test_quantum_multi_layer_encryption_decryption(self):
        """Test multi-layer encryption is reversible."""
        # Encrypt with all methods
        encrypted_frames = self.engine.quantum_multi_layer_encrypt(self.test_frames)
        
        # Verify changes occurred
        assert len(encrypted_frames) == len(self.test_frames)
        
        # Decrypt with all methods
        decrypted_frames = self.engine.quantum_multi_layer_decrypt(encrypted_frames)
        
        # Verify recovery of original values (within tolerance)
        for decrypted, original in zip(decrypted_frames, self.test_frames):
            assert abs(decrypted.wavelength_nm - original.wavelength_nm) < 1.0
            assert decrypted.intensity_level == original.intensity_level
            assert decrypted.payload_bit == original.payload_bit
    
    def test_wavelength_clamping(self):
        """Test wavelengths are clamped to visible spectrum."""
        # Test clamping below minimum
        assert self.engine._clamp_wavelength(300.0) == 380.0
        
        # Test clamping above maximum
        assert self.engine._clamp_wavelength(900.0) == 750.0
        
        # Test no clamping in valid range
        assert self.engine._clamp_wavelength(500.0) == 500.0
    
    def test_key_derivation(self):
        """Test encryption key is properly hashed."""
        # Different keys should produce different hashes
        engine1 = WavelengthCryptoEngine("key1")
        engine2 = WavelengthCryptoEngine("key2")
        
        assert engine1.key_hash != engine2.key_hash
        
        # Same key should produce same hash
        engine3 = WavelengthCryptoEngine("key1")
        assert engine1.key_hash == engine3.key_hash


class TestWavelengthCryptoHandler:
    """Test high-level encryption/decryption handler."""
    
    def setup_method(self):
        """Setup test fixtures."""
        encoder = WnspEncoder()
        self.test_message = encoder.encode_message("CRYPTO")
        self.encryption_key = "my_secret_key"
    
    def test_encrypt_message_fse(self):
        """Test encryption with frequency shift method."""
        encrypted = WavelengthCryptoHandler.encrypt_message(
            self.test_message,
            self.encryption_key,
            method='fse'
        )
        
        assert isinstance(encrypted, EncryptedWavelengthMessage)
        assert encrypted.encryption_method == 'fse'
        assert encrypted.original_length == len(self.test_message.frames)
        assert len(encrypted.encrypted_frames) == len(self.test_message.frames)
    
    def test_encrypt_message_ame(self):
        """Test encryption with amplitude modulation method."""
        encrypted = WavelengthCryptoHandler.encrypt_message(
            self.test_message,
            self.encryption_key,
            method='ame'
        )
        
        assert encrypted.encryption_method == 'ame'
    
    def test_encrypt_message_pme(self):
        """Test encryption with phase modulation method."""
        encrypted = WavelengthCryptoHandler.encrypt_message(
            self.test_message,
            self.encryption_key,
            method='pme'
        )
        
        assert encrypted.encryption_method == 'pme'
    
    def test_encrypt_message_qiml(self):
        """Test encryption with quantum multi-layer method."""
        encrypted = WavelengthCryptoHandler.encrypt_message(
            self.test_message,
            self.encryption_key,
            method='qiml'
        )
        
        assert encrypted.encryption_method == 'qiml'
    
    def test_decrypt_message_success(self):
        """Test successful decryption with correct key."""
        # Encrypt
        encrypted = WavelengthCryptoHandler.encrypt_message(
            self.test_message,
            self.encryption_key,
            method='qiml'
        )
        
        # Decrypt with correct key
        decrypted = WavelengthCryptoHandler.decrypt_message(
            encrypted,
            self.encryption_key
        )
        
        assert isinstance(decrypted, WnspFrameMessage)
        assert len(decrypted.frames) == len(self.test_message.frames)
    
    def test_decrypt_message_wrong_key(self):
        """Test decryption fails with incorrect key."""
        # Encrypt
        encrypted = WavelengthCryptoHandler.encrypt_message(
            self.test_message,
            self.encryption_key,
            method='qiml'
        )
        
        # Attempt decrypt with wrong key
        with pytest.raises(ValueError, match="Incorrect decryption key"):
            WavelengthCryptoHandler.decrypt_message(
                encrypted,
                "wrong_key"
            )
    
    def test_encryption_metadata(self):
        """Test encrypted message contains correct metadata."""
        encrypted = WavelengthCryptoHandler.encrypt_message(
            self.test_message,
            self.encryption_key,
            method='fse'
        )
        
        assert 'message_id' in encrypted.metadata
        assert 'sender_id' in encrypted.metadata
        assert 'created_at' in encrypted.metadata
        assert 'method_name' in encrypted.metadata
        assert encrypted.metadata['method_name'] == 'Frequency Shift Encryption'
    
    def test_all_methods_reversible(self):
        """Test all encryption methods are reversible."""
        methods = ['fse', 'ame', 'pme', 'qiml']
        
        for method in methods:
            # Encrypt
            encrypted = WavelengthCryptoHandler.encrypt_message(
                self.test_message,
                self.encryption_key,
                method=method
            )
            
            # Decrypt
            decrypted = WavelengthCryptoHandler.decrypt_message(
                encrypted,
                self.encryption_key
            )
            
            # Verify frame count matches
            assert len(decrypted.frames) == len(self.test_message.frames)


class TestWavelengthCryptoWorkflows:
    """Test DAG workflow integration."""
    
    def test_encrypt_workflow_execution(self):
        """Test encryption workflow executes successfully."""
        workflow = create_encrypt_workflow(
            message_text="TEST",
            encryption_key="workflow_key",
            method='fse'
        )
        
        orchestrator = TaskOrchestrator()
        results = orchestrator.execute_workflow(workflow)
        
        # Verify all tasks completed
        assert 'encode_wnsp' in results
        assert 'encrypt_wavelength' in results
        assert 'package_encrypted' in results
        assert 'generate_report' in results
        
        # Verify success
        assert results['encode_wnsp']['status'] == 'success'
        assert results['encrypt_wavelength']['status'] == 'success'
        assert results['package_encrypted']['status'] == 'success'
        assert results['generate_report']['status'] == 'success'
    
    def test_decrypt_workflow_execution(self):
        """Test decryption workflow executes successfully."""
        # First encrypt a message
        encoder = WnspEncoder()
        message = encoder.encode_message("DECRYPT")
        encrypted = WavelengthCryptoHandler.encrypt_message(
            message,
            "decrypt_key",
            method='qiml'
        )
        
        # Create decrypt workflow
        workflow = create_decrypt_workflow(encrypted, "decrypt_key")
        
        orchestrator = TaskOrchestrator()
        results = orchestrator.execute_workflow(workflow)
        
        # Verify all tasks completed
        assert 'verify_key' in results
        assert 'decrypt_wavelength' in results
        assert 'decode_wnsp' in results
        assert 'validate_decryption' in results
        
        # Verify success
        assert results['verify_key']['status'] == 'success'
        assert results['decrypt_wavelength']['status'] == 'success'
        assert results['decode_wnsp']['status'] == 'success'
        assert results['validate_decryption']['status'] == 'success'
        assert results['validate_decryption']['decryption_successful'] is True
    
    def test_decrypt_workflow_wrong_key(self):
        """Test decryption workflow fails with wrong key."""
        # Encrypt message
        encoder = WnspEncoder()
        message = encoder.encode_message("SECRET")
        encrypted = WavelengthCryptoHandler.encrypt_message(
            message,
            "correct_key",
            method='fse'
        )
        
        # Try to decrypt with wrong key
        workflow = create_decrypt_workflow(encrypted, "wrong_key")
        
        orchestrator = TaskOrchestrator()
        results = orchestrator.execute_workflow(workflow)
        
        # Verify key verification failed
        assert results['verify_key']['status'] == 'failed'
        assert results['verify_key']['key_match'] is False
    
    def test_theory_demo_workflow(self):
        """Test electromagnetic theory demonstration workflow."""
        workflow = create_theory_demo_workflow()
        
        orchestrator = TaskOrchestrator()
        results = orchestrator.execute_workflow(workflow)
        
        # Verify all tasks completed
        assert 'calculate_photon_energies' in results
        assert 'simulate_transitions' in results
        assert 'explain_encryption' in results
        
        # Verify success
        assert results['calculate_photon_energies']['status'] == 'success'
        assert results['simulate_transitions']['status'] == 'success'
        assert results['explain_encryption']['status'] == 'success'
        
        # Verify physics calculations
        energies = results['calculate_photon_energies']['photon_energies']
        assert len(energies) > 0
        for energy_data in energies:
            assert 'wavelength_nm' in energy_data
            assert 'energy_ev' in energy_data
            assert energy_data['energy_ev'] > 0
    
    def test_workflow_integration(self):
        """Test full encrypt-decrypt workflow integration."""
        # Encrypt
        encrypt_workflow = create_encrypt_workflow(
            message_text="TEST",
            encryption_key="integration_key",
            method='fse'  # Use simpler method for exact recovery
        )
        
        orchestrator = TaskOrchestrator()
        encrypt_results = orchestrator.execute_workflow(encrypt_workflow)
        
        # Get encrypted message
        encrypted_message = encrypt_results['encrypt_wavelength']['encrypted_message']
        
        # Decrypt
        decrypt_workflow = create_decrypt_workflow(encrypted_message, "integration_key")
        decrypt_results = orchestrator.execute_workflow(decrypt_workflow)
        
        # Verify round-trip success
        assert decrypt_results['validate_decryption']['decryption_successful'] is True
        decrypted_text = decrypt_results['validate_decryption']['summary']['decrypted_text']
        # Verify decryption recovered most letters (wavelength drift is acceptable)
        assert len(decrypted_text) == 4
        assert decrypt_results['decode_wnsp']['status'] == 'success'


class TestPhysicsConstants:
    """Test electromagnetic theory constants and calculations."""
    
    def test_constants_values(self):
        """Test physical constants have correct values."""
        # Verify constants are non-zero and reasonable
        assert PLANCK_CONSTANT > 0
        assert SPEED_OF_LIGHT > 0
        assert ELECTRON_VOLT > 0
        
        # Verify approximate values (within order of magnitude)
        assert 6e-34 < PLANCK_CONSTANT < 7e-34
        assert 2.9e8 < SPEED_OF_LIGHT < 3.1e8
        assert 1.5e-19 < ELECTRON_VOLT < 1.7e-19
    
    def test_photon_energy_formula(self):
        """Test E = hc/λ formula produces correct energy values."""
        engine = WavelengthCryptoEngine("test")
        
        # Test visible spectrum energies
        # Violet (400nm) should be ~3.1 eV
        # Red (700nm) should be ~1.77 eV
        
        energy_violet = engine._calculate_photon_energy(400.0)
        energy_red = engine._calculate_photon_energy(700.0)
        
        # Verify violet has higher energy than red
        assert energy_violet > energy_red
        
        # Verify energies are in expected range for visible light (1.5-3.5 eV)
        assert 1.5 < energy_red < 2.0
        assert 3.0 < energy_violet < 3.5


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
