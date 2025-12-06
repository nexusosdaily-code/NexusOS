"""
Unit tests for WNSP (Wavelength-Native Signaling Protocol)

Tests wavelength mapping, letter-to-wavelength conversion,
frame encoding/decoding, and WNSP message handling.
"""

import pytest
from wavelength_map import (
    get_letter_info, get_wavelength_for_letter, get_letter_for_wavelength,
    ALPHABET_MAP, LETTER_TO_SYMBOL
)
from wnsp_frames import WnspFrame, WnspFrameMessage, WnspEncoder, WnspDecoder


class TestWavelengthMapping:
    """Tests for wavelength-to-letter mapping"""
    
    def test_alphabet_map_length(self):
        """Test that alphabet map has 26 letters"""
        assert len(ALPHABET_MAP) == 26
    
    def test_wavelength_range(self):
        """Test that wavelengths span visible spectrum"""
        wavelengths = [s.wavelength_nm for s in ALPHABET_MAP]
        assert min(wavelengths) >= 380  # Violet
        assert max(wavelengths) <= 740  # Red
    
    def test_get_letter_info(self):
        """Test getting letter information"""
        info_a = get_letter_info('A')
        assert info_a is not None
        assert info_a.letter == 'A'
        assert info_a.wavelength_nm >= 380
        
        info_z = get_letter_info('Z')
        assert info_z is not None
        assert info_z.letter == 'Z'
        assert info_z.wavelength_nm <= 740
    
    def test_get_letter_info_case_insensitive(self):
        """Test that letter lookup is case insensitive"""
        info_upper = get_letter_info('M')
        info_lower = get_letter_info('m')
        
        assert info_upper is not None
        assert info_lower is not None
        assert info_upper.wavelength_nm == info_lower.wavelength_nm
    
    def test_get_wavelength_for_letter(self):
        """Test wavelength lookup"""
        wl_a = get_wavelength_for_letter('A')
        wl_z = get_wavelength_for_letter('Z')
        
        assert wl_a is not None
        assert wl_z is not None
        assert wl_a < wl_z  # A is violet (shorter), Z is red (longer)
    
    def test_get_letter_for_wavelength(self):
        """Test finding nearest letter for wavelength"""
        # Test with exact wavelength
        exact_wl = get_wavelength_for_letter('M')
        if exact_wl:
            letter = get_letter_for_wavelength(exact_wl)
            assert letter == 'M'
    
    def test_invalid_letter_returns_none(self):
        """Test that invalid letters return None"""
        assert get_letter_info('1') is None
        assert get_letter_info('!') is None
        assert get_wavelength_for_letter('$') is None
    
    def test_all_letters_have_unique_wavelengths(self):
        """Test that each letter has a unique wavelength"""
        wavelengths = [s.wavelength_nm for s in ALPHABET_MAP]
        assert len(wavelengths) == len(set(wavelengths))
    
    def test_hex_colors_defined(self):
        """Test that all letters have hex colors"""
        for symbol in ALPHABET_MAP:
            assert symbol.hex_color.startswith('#')
            assert len(symbol.hex_color) == 7  # #RRGGBB format


class TestWnspFrame:
    """Tests for WNSP frame structure"""
    
    def test_create_valid_frame(self):
        """Test creating a valid WNSP frame"""
        frame = WnspFrame(
            sync=0xAA,
            wavelength_nm=500.0,
            intensity_level=7,
            checksum=123,
            payload_bit=1,
            timestamp_ms=1000.0
        )
        
        assert frame.sync == 0xAA
        assert frame.wavelength_nm == 500.0
        assert frame.intensity_level == 7
    
    def test_frame_payload_bit_validation(self):
        """Test that payload_bit must be 0 or 1"""
        with pytest.raises(ValueError):
            WnspFrame(
                sync=0xAA, wavelength_nm=500.0, intensity_level=7,
                checksum=0, payload_bit=2, timestamp_ms=1000.0
            )
    
    def test_frame_intensity_validation(self):
        """Test that intensity_level must be 0-7"""
        with pytest.raises(ValueError):
            WnspFrame(
                sync=0xAA, wavelength_nm=500.0, intensity_level=8,
                checksum=0, payload_bit=0, timestamp_ms=1000.0
            )


class TestWnspFrameMessage:
    """Tests for WNSP frame message"""
    
    def test_create_empty_message(self):
        """Test creating an empty message"""
        msg = WnspFrameMessage()
        assert len(msg.frames) == 0
    
    def test_add_frame_to_message(self):
        """Test adding frames to message"""
        msg = WnspFrameMessage()
        frame = WnspFrame(
            sync=0xAA, wavelength_nm=500.0, intensity_level=7,
            checksum=0, payload_bit=1, timestamp_ms=1000.0
        )
        
        msg.add_frame(frame)
        assert len(msg.frames) == 1
    
    def test_message_duration(self):
        """Test calculating message duration"""
        msg = WnspFrameMessage()
        
        frame1 = WnspFrame(
            sync=0xAA, wavelength_nm=500.0, intensity_level=7,
            checksum=0, payload_bit=1, timestamp_ms=1000.0
        )
        frame2 = WnspFrame(
            sync=0xAA, wavelength_nm=600.0, intensity_level=7,
            checksum=0, payload_bit=0, timestamp_ms=1500.0
        )
        
        msg.add_frame(frame1)
        msg.add_frame(frame2)
        
        assert msg.get_duration_ms() == 500.0
    
    def test_message_to_dict(self):
        """Test converting message to dictionary"""
        msg = WnspFrameMessage(message_id='test123', sender_id='sender1')
        frame = WnspFrame(
            sync=0xAA, wavelength_nm=500.0, intensity_level=7,
            checksum=0, payload_bit=1, timestamp_ms=1000.0
        )
        msg.add_frame(frame)
        
        msg_dict = msg.to_dict()
        assert msg_dict['message_id'] == 'test123'
        assert msg_dict['sender_id'] == 'sender1'
        assert msg_dict['frame_count'] == 1


class TestWnspEncoder:
    """Tests for WNSP encoder"""
    
    def test_create_encoder(self):
        """Test creating WNSP encoder"""
        encoder = WnspEncoder()
        assert encoder.frame_duration_ms == WnspEncoder.FRAME_DURATION_MS
    
    def test_encode_simple_message(self):
        """Test encoding a simple message"""
        encoder = WnspEncoder()
        message = encoder.encode_message("HELLO")
        
        assert message is not None
        assert len(message.frames) == 5  # H-E-L-L-O
    
    def test_encode_filters_non_alphabetic(self):
        """Test that non-alphabetic characters are filtered"""
        encoder = WnspEncoder()
        message = encoder.encode_message("HELLO123WORLD")
        
        # Should only encode letters, not numbers
        assert len(message.frames) == 10  # HELLOWORLD
    
    def test_encode_converts_to_uppercase(self):
        """Test that lowercase is converted to uppercase"""
        encoder = WnspEncoder()
        msg_lower = encoder.encode_message("hello")
        msg_upper = encoder.encode_message("HELLO")
        
        # Should produce same frames
        assert len(msg_lower.frames) == len(msg_upper.frames) == 5
    
    def test_encode_empty_string(self):
        """Test encoding empty string"""
        encoder = WnspEncoder()
        message = encoder.encode_message("")
        
        assert len(message.frames) == 0


class TestWnspDecoder:
    """Tests for WNSP decoder"""
    
    def test_create_decoder(self):
        """Test creating WNSP decoder"""
        decoder = WnspDecoder()
        assert decoder is not None
    
    def test_encode_decode_round_trip(self):
        """Test encoding and decoding round trip"""
        encoder = WnspEncoder()
        decoder = WnspDecoder()
        
        original_text = "NEXUS"
        encoded_msg = encoder.encode_message(original_text)
        decoded_text = decoder.decode_message(encoded_msg)
        
        assert decoded_text == original_text
    
    def test_decode_with_errors(self):
        """Test decoding with checksum errors"""
        encoder = WnspEncoder()
        decoder = WnspDecoder()
        
        message = encoder.encode_message("TEST")
        
        # Corrupt a checksum
        if len(message.frames) > 0:
            message.frames[0].checksum = 9999
        
        # Decoder should handle errors gracefully
        decoded = decoder.decode_message(message)
        # May differ from original or return error indicator


class TestWnspProtocol:
    """Integration tests for WNSP protocol"""
    
    def test_full_message_transmission(self):
        """Test full message encoding and transmission"""
        encoder = WnspEncoder(frame_duration_ms=50)
        message_text = "WNSP"
        
        message = encoder.encode_message(message_text, intensity=7)
        
        assert len(message.frames) == 4
        assert all(f.intensity_level == 7 for f in message.frames)
        assert all(f.sync == WnspEncoder.SYNC_PATTERN for f in message.frames)
    
    def test_wavelength_consistency(self):
        """Test that encoded wavelengths match letter mapping"""
        encoder = WnspEncoder()
        message = encoder.encode_message("ABC")
        
        # Check that wavelengths correspond to letters
        wl_a = get_wavelength_for_letter('A')
        wl_b = get_wavelength_for_letter('B')
        wl_c = get_wavelength_for_letter('C')
        
        assert message.frames[0].wavelength_nm == wl_a
        assert message.frames[1].wavelength_nm == wl_b
        assert message.frames[2].wavelength_nm == wl_c


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
