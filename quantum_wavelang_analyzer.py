"""
Quantum-Level WaveLang Analysis Engine
=======================================
Applies WaveProperties for advanced quantum analysis of wavelength programs:
- Wave Interference Analysis: Detect instruction collisions in wavelength space
- Quantum Superposition: Model parallel execution paths
- Wave Coherence Metrics: Measure program stability and reliability
- Phase Locking: Synchronize multi-instruction sequences
- Harmonic Analysis: Optimize bytecode through frequency domain
- Wave Packet Collapse: Debug execution states at quantum level
"""

import streamlit as st
import plotly.graph_objects as go
import numpy as np
from typing import List, Dict, Tuple, Any
import math
from wavelength_code_generator import WavelengthInstruction, WavelengthOpcodes
from wavelength_validator import WaveProperties, SpectralRegion, ModulationType

PLANCK_CONSTANT = 6.626e-34
SPEED_OF_LIGHT = 3e8

class QuantumWaveLangAnalyzer:
    """Quantum-level analysis of WaveLang programs using wave mechanics"""
    
    def __init__(self):
        # Wave properties will be initialized per analysis
        pass
    
    def analyze_wave_interference(self, instructions: List[WavelengthInstruction]) -> Dict[str, Any]:
        """
        Wave Interference Analysis: Detect instruction collisions in wavelength space
        
        Key insight: When two wavelengths are too similar, they interfere constructively
        or destructively, causing performance issues (like resonance).
        """
        
        wavelengths = [inst.wavelength_nm for inst in instructions]
        interference_patterns = []
        collision_alerts = []
        
        # Check for constructive/destructive interference between adjacent instructions
        for i in range(len(wavelengths) - 1):
            wl1 = wavelengths[i]
            wl2 = wavelengths[i + 1]
            
            # Calculate phase difference
            phase_diff = abs(wl2 - wl1) / wl1  # Relative difference
            
            # Constructive interference (amplification): similar wavelengths
            if phase_diff < 0.02:  # Within 2%
                collision_alerts.append({
                    "type": "constructive_interference",
                    "instructions": [i, i + 1],
                    "opcodes": [instructions[i].opcode.name, instructions[i + 1].opcode.name],
                    "wavelengths": [wl1, wl2],
                    "phase_difference": phase_diff,
                    "risk_level": "HIGH",
                    "recommendation": "Instructions are too similar. Consider adding delay or modulation."
                })
            
            # Destructive interference (cancellation): opposing phases
            elif phase_diff > 0.5:  # Far apart
                interference_patterns.append({
                    "pattern": "destructive_interference",
                    "instructions": [i, i + 1],
                    "wavelengths": [wl1, wl2],
                    "cancellation_ratio": phase_diff,
                    "effect": "Opposing phases may cancel execution. Consider reordering."
                })
        
        return {
            "total_instructions": len(instructions),
            "collision_alerts": collision_alerts,
            "interference_patterns": interference_patterns,
            "program_risk": "HIGH" if collision_alerts else "NORMAL"
        }
    
    def quantum_superposition_analysis(self, instructions: List[WavelengthInstruction]) -> Dict[str, Any]:
        """
        Quantum Superposition: Model parallel execution paths
        
        Key insight: Instructions exist in superposition - they can execute in multiple
        orders simultaneously until "observed" (finalized). Map all possible paths.
        """
        
        # Build superposition matrix: which instructions can execute in parallel?
        num_insts = len(instructions)
        parallel_paths = []
        
        for i in range(num_insts):
            inst_i = instructions[i]
            
            # Check which other instructions can run simultaneously
            compatible_instructions = []
            for j in range(num_insts):
                if i == j:
                    continue
                    
                inst_j = instructions[j]
                
                # Same spectral region = likely dependency
                if inst_i.spectral_region == inst_j.spectral_region:
                    continue
                
                # Check phase compatibility (no conflicts)
                phase_diff = abs(inst_i.phase - inst_j.phase)
                if phase_diff < math.pi / 4:  # Within 45 degrees
                    continue
                
                compatible_instructions.append(j)
            
            if compatible_instructions:
                parallel_paths.append({
                    "instruction_index": i,
                    "opcode": inst_i.opcode.name,
                    "wavelength": inst_i.wavelength_nm,
                    "can_run_parallel_with": compatible_instructions,
                    "parallel_opcodes": [instructions[j].opcode.name for j in compatible_instructions],
                    "speedup_potential": f"{len(compatible_instructions) + 1}x"
                })
        
        return {
            "superposition_paths": parallel_paths,
            "potential_parallelism": len(parallel_paths),
            "max_speedup": f"{min(4, len(instructions))}x" if parallel_paths else "1x (sequential)",
            "analysis": "These instructions can execute in quantum superposition (parallel paths)"
        }
    
    def wave_coherence_metrics(self, instructions: List[WavelengthInstruction]) -> Dict[str, Any]:
        """
        Wave Coherence Metrics: Measure program stability and reliability
        
        Key insight: Coherence measures how well-aligned instructions are. High coherence
        = stable program. Low coherence = unpredictable behavior.
        """
        
        wavelengths = [inst.wavelength_nm for inst in instructions]
        phases = [inst.phase for inst in instructions]
        amplitudes = [inst.amplitude for inst in instructions]
        
        # Calculate coherence score: how aligned are the wavelengths?
        wavelength_std = float(np.std(wavelengths)) if len(wavelengths) > 1 else 0.0
        wavelength_coherence = 1.0 / (1.0 + wavelength_std / np.mean(wavelengths)) if wavelengths else 1.0
        
        # Phase coherence: how synchronized are instructions?
        phase_coherence = 1 - (np.std(phases) / math.pi) if phases else 1.0
        
        # Amplitude coherence: priority alignment
        amplitude_mean = np.mean(amplitudes) if amplitudes else 0
        amplitude_coherence = 1 - np.std(amplitudes) if amplitudes else 1.0
        
        # Overall coherence
        overall_coherence = (wavelength_coherence + phase_coherence + amplitude_coherence) / 3
        
        stability_score = overall_coherence * 100
        
        if stability_score > 80:
            stability_rating = "EXCELLENT - Program is highly stable"
        elif stability_score > 60:
            stability_rating = "GOOD - Program is reliable"
        elif stability_score > 40:
            stability_rating = "FAIR - Program may have issues"
        else:
            stability_rating = "POOR - Program is unstable"
        
        return {
            "wavelength_coherence": wavelength_coherence,
            "phase_coherence": max(0, phase_coherence),
            "amplitude_coherence": amplitude_coherence,
            "overall_coherence_score": overall_coherence,
            "stability_percentage": stability_score,
            "stability_rating": stability_rating,
            "recommendation": "Increase coherence by aligning wavelengths and phases"
        }
    
    def phase_locking_analysis(self, instructions: List[WavelengthInstruction]) -> Dict[str, Any]:
        """
        Phase Locking: Synchronize multi-instruction sequences for atomic operations
        
        Key insight: Instructions can be "phase-locked" to execute as atomic blocks.
        Detect which instructions are already synchronized.
        """
        
        phase_groups = {}
        
        # Group instructions by phase (0, 90, 180, 270 degrees)
        for i, inst in enumerate(instructions):
            phase_degrees = math.degrees(inst.phase) % 360
            
            # Quantize to nearest 90 degrees
            if phase_degrees < 45:
                phase_key = 0
                phase_name = "Sequential"
            elif phase_degrees < 135:
                phase_key = 90
                phase_name = "If-True"
            elif phase_degrees < 225:
                phase_key = 180
                phase_name = "If-False"
            else:
                phase_key = 270
                phase_name = "Loop"
            
            if phase_key not in phase_groups:
                phase_groups[phase_key] = {"name": phase_name, "instructions": []}
            
            phase_groups[phase_key]["instructions"].append({
                "index": i,
                "opcode": inst.opcode.name,
                "wavelength": inst.wavelength_nm
            })
        
        # Calculate atomicity (how synchronized are they?)
        atomic_blocks = []
        for phase_key, group in phase_groups.items():
            if len(group["instructions"]) > 1:
                atomic_blocks.append({
                    "phase": phase_key,
                    "phase_name": group["name"],
                    "instruction_count": len(group["instructions"]),
                    "instructions": group["instructions"],
                    "atomicity": "LOCKED" if len(group["instructions"]) > 2 else "PARTIAL"
                })
        
        return {
            "atomic_blocks": atomic_blocks,
            "total_blocks": len(atomic_blocks),
            "phase_distribution": {k: len(v["instructions"]) for k, v in phase_groups.items()},
            "synchronization_quality": "HIGH" if atomic_blocks else "NEEDS_SYNCHRONIZATION"
        }
    
    def harmonic_analysis(self, instructions: List[WavelengthInstruction]) -> Dict[str, Any]:
        """
        Harmonic Analysis: Optimize bytecode through frequency domain
        
        Key insight: Treat instruction sequences as harmonic series. Find resonance
        frequencies for optimization opportunities.
        """
        
        wavelengths = [inst.wavelength_nm for inst in instructions]
        modulations = [inst.modulation.bits_per_symbol for inst in instructions]
        
        if not wavelengths:
            return {"error": "No instructions to analyze"}
        
        # Find fundamental frequency (lowest wavelength = highest frequency)
        fundamental_wavelength = min(wavelengths)
        fundamental_frequency = SPEED_OF_LIGHT / (fundamental_wavelength * 1e-9)
        
        # Find harmonics (wavelengths that are integer multiples)
        harmonics = []
        for i, wl in enumerate(wavelengths):
            harmonic_ratio = wl / fundamental_wavelength
            if abs(harmonic_ratio - round(harmonic_ratio)) < 0.05:  # Within 5%
                harmonics.append({
                    "instruction_index": i,
                    "opcode": instructions[i].opcode.name,
                    "wavelength": wl,
                    "harmonic_number": round(harmonic_ratio),
                    "is_resonant": True
                })
        
        # Calculate frequency spectrum efficiency
        efficiency = len(harmonics) / len(wavelengths) * 100 if wavelengths else 0
        
        return {
            "fundamental_wavelength_nm": fundamental_wavelength,
            "fundamental_frequency_hz": fundamental_frequency,
            "harmonic_instructions": harmonics,
            "frequency_alignment_efficiency": efficiency,
            "optimization_potential": "HIGH" if efficiency > 50 else "MEDIUM",
            "recommendation": "Use harmonic wavelengths for better resonance and efficiency"
        }
    
    def wave_packet_collapse(self, instructions: List[WavelengthInstruction], 
                            execution_index: int = 0) -> Dict[str, Any]:
        """
        Wave Packet Collapse: Debug program execution states at quantum level
        
        Key insight: Program exists in superposition until execution collapses it to
        a single state. Trace the collapse process step-by-step.
        """
        
        if execution_index >= len(instructions):
            return {"error": "Execution index out of range"}
        
        collapsed_instruction = instructions[execution_index]
        
        # Reconstruct execution history
        execution_history = []
        for i in range(execution_index + 1):
            inst = instructions[i]
            execution_history.append({
                "step": i + 1,
                "opcode": inst.opcode.name,
                "wavelength": inst.wavelength_nm,
                "phase_degrees": math.degrees(inst.phase) % 360,
                "amplitude": inst.amplitude,
                "state": "COLLAPSED" if i == execution_index else "DETERMINED"
            })
        
        # Calculate state entropy (how much information was lost in collapse?)
        entropy = 0
        if len(instructions) > 1:
            entropy = math.log2(len(instructions) - execution_index)
        
        return {
            "current_execution_step": execution_index + 1,
            "total_steps": len(instructions),
            "collapsed_instruction": {
                "opcode": collapsed_instruction.opcode.name,
                "wavelength": collapsed_instruction.wavelength_nm,
                "spectral_region": collapsed_instruction.spectral_region.name
            },
            "execution_history": execution_history,
            "state_entropy_bits": entropy,
            "superposition_remaining": len(instructions) - execution_index - 1,
            "debug_info": "Wave packet has collapsed to single state at step " + str(execution_index + 1)
        }


def render_quantum_wavelang_analyzer():
    """Interactive quantum analysis dashboard for WaveLang"""
    
    st.markdown("### ⚛️ Quantum-Level WaveLang Analysis")
    
    st.markdown("""
    Analyze your wavelength programs at the quantum level using wave mechanics:
    - **Wave Interference**: Detect collisions and resonance
    - **Quantum Superposition**: Find parallel execution paths
    - **Wave Coherence**: Measure program stability
    - **Phase Locking**: Synchronize instruction sequences
    - **Harmonic Analysis**: Optimize through frequency domain
    - **Wave Packet Collapse**: Debug execution step-by-step
    """)
    
    # Get instructions from session state or demo
    if 'instructions' in st.session_state and st.session_state.instructions:
        instructions = st.session_state.instructions
    else:
        # Demo program: Add 5 + 3
        from wavelength_code_generator import WavelengthInstruction, WavelengthOpcodes
        from wavelength_validator import SpectralRegion, ModulationType
        
        instructions = [
            WavelengthInstruction(
                opcode=WavelengthOpcodes.LOAD,
                wavelength_nm=495.0,
                spectral_region=SpectralRegion.GREEN,
                modulation=ModulationType.OOK,
                amplitude=0.8,
                phase=0.0
            ),
            WavelengthInstruction(
                opcode=WavelengthOpcodes.LOAD,
                wavelength_nm=508.0,
                spectral_region=SpectralRegion.GREEN,
                modulation=ModulationType.OOK,
                amplitude=0.8,
                phase=0.0
            ),
            WavelengthInstruction(
                opcode=WavelengthOpcodes.ADD,
                wavelength_nm=380.0,
                spectral_region=SpectralRegion.VIOLET,
                modulation=ModulationType.OOK,
                amplitude=0.9,
                phase=0.0
            ),
            WavelengthInstruction(
                opcode=WavelengthOpcodes.PRINT,
                wavelength_nm=650.0,
                spectral_region=SpectralRegion.RED,
                modulation=ModulationType.OOK,
                amplitude=0.8,
                phase=0.0
            ),
        ]
    
    analyzer = QuantumWaveLangAnalyzer()
    
    # Five quantum analysis tabs
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "🌊 Wave Interference",
        "🔀 Superposition",
        "📊 Coherence",
        "🔒 Phase Lock",
        "📈 Harmonics",
        "⚛️ Collapse"
    ])
    
    with tab1:
        st.markdown("#### 🌊 Wave Interference Analysis")
        result = analyzer.analyze_wave_interference(instructions)
        
        st.metric("Program Risk Level", result['program_risk'])
        st.metric("Collision Alerts", len(result['collision_alerts']))
        
        if result['collision_alerts']:
            st.warning("⚠️ **Interference Detected**")
            for alert in result['collision_alerts']:
                st.write(f"- {alert['opcodes'][0]} → {alert['opcodes'][1]}")
                st.write(f"  Wavelengths: {alert['wavelengths'][0]:.1f}nm, {alert['wavelengths'][1]:.1f}nm")
                st.write(f"  Recommendation: {alert['recommendation']}")
        else:
            st.success("✅ No harmful interference detected")
    
    with tab2:
        st.markdown("#### 🔀 Quantum Superposition")
        result = analyzer.quantum_superposition_analysis(instructions)
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Parallel Paths", result['potential_parallelism'])
        with col2:
            st.metric("Max Speedup", result['max_speedup'])
        with col3:
            st.metric("Total Instructions", len(instructions))
        
        st.markdown("**Superposition Paths:**")
        for path in result['superposition_paths']:
            st.write(f"- {path['opcode']} can run parallel with: {', '.join(path['parallel_opcodes'])}")
            st.write(f"  Potential speedup: {path['speedup_potential']}")
    
    with tab3:
        st.markdown("#### 📊 Wave Coherence Metrics")
        result = analyzer.wave_coherence_metrics(instructions)
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Wavelength Coherence", f"{result['wavelength_coherence']:.2f}")
        with col2:
            st.metric("Phase Coherence", f"{result['phase_coherence']:.2f}")
        with col3:
            st.metric("Amplitude Coherence", f"{result['amplitude_coherence']:.2f}")
        with col4:
            st.metric("Overall Score", f"{result['stability_percentage']:.1f}%")
        
        st.success(f"**Stability Rating:** {result['stability_rating']}")
        st.info(result['recommendation'])
    
    with tab4:
        st.markdown("#### 🔒 Phase Locking Analysis")
        result = analyzer.phase_locking_analysis(instructions)
        
        st.metric("Atomic Blocks", result['total_blocks'])
        st.metric("Synchronization", result['synchronization_quality'])
        
        st.markdown("**Phase-Locked Groups:**")
        for block in result['atomic_blocks']:
            st.write(f"- **{block['phase_name']}** (Phase {block['phase']}°)")
            st.write(f"  Instructions: {len(block['instructions'])} | Status: {block['atomicity']}")
    
    with tab5:
        st.markdown("#### 📈 Harmonic Analysis")
        result = analyzer.harmonic_analysis(instructions)
        
        st.metric("Fundamental Wavelength", f"{result['fundamental_wavelength_nm']:.1f}nm")
        st.metric("Frequency Alignment", f"{result['frequency_alignment_efficiency']:.1f}%")
        st.metric("Optimization Potential", result['optimization_potential'])
        
        if result['harmonic_instructions']:
            st.markdown("**Resonant Instructions:**")
            for harmonic in result['harmonic_instructions']:
                st.write(f"- {harmonic['opcode']} (Harmonic #{harmonic['harmonic_number']})")
    
    with tab6:
        st.markdown("#### ⚛️ Wave Packet Collapse")
        
        step = st.slider("Execution Step", 0, len(instructions) - 1, 0)
        
        result = analyzer.wave_packet_collapse(instructions, step)
        
        st.metric("State Entropy", f"{result['state_entropy_bits']:.2f} bits")
        st.metric("Superposition Remaining", result['superposition_remaining'])
        
        st.markdown("**Execution History:**")
        for hist in result['execution_history']:
            status_icon = "✅" if hist['state'] == "COLLAPSED" else "📦"
            st.write(f"{status_icon} Step {hist['step']}: {hist['opcode']} @ {hist['wavelength']:.1f}nm")


if __name__ == "__main__":
    render_quantum_wavelang_analyzer()
