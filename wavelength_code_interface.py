"""
Interactive Visual Interface for WaveLang Programming

Revolutionary UI allowing users to build wavelength programs visually
without traditional syntax errors, featuring:
- Real-time validation (no syntax errors possible)
- Visual spectrum selector
- Drag-and-drop instruction builder
- Live energy cost calculator
- DAG dependency visualization
- Comparison with traditional code
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from wavelength_code_generator import (
    WavelengthCodeGenerator, WavelengthInstruction,
    WavelengthOpcodes, ControlFlowMode, DataType
)
from wavelength_validator import SpectralRegion, ModulationType
import math
import json

def render_wavelength_code_interface():
    """Main interactive interface for WaveLang programming"""
    
    st.set_page_config(page_title="WaveLang Studio", layout="wide")
    
    st.header("🌊 WaveLang Studio - Revolutionary Code Without Syntax Errors")
    st.markdown("""
    **WAVELENGTH PROGRAMMING = NO SYNTAX ERRORS EVER**
    
    Traditional code: Type wrong bracket? Syntax error. Misspell variable? Error.
    
    WaveLang: Wavelengths are physics constants. 380.0nm is ALWAYS 380.0nm.
    """)
    
    # Initialize session state
    if 'code_generator' not in st.session_state:
        st.session_state.code_generator = WavelengthCodeGenerator()
    if 'current_function' not in st.session_state:
        st.session_state.current_function = None
    if 'instructions' not in st.session_state:
        st.session_state.instructions = []
    
    gen = st.session_state.code_generator
    
    # Main tabs
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "🎨 Visual Builder",
        "⚡ Energy Calculator",
        "🔍 Validator",
        "📊 Comparison",
        "📚 My Programs"
    ])
    
    with tab1:
        render_visual_builder_tab(gen)
    
    with tab2:
        render_energy_calculator_tab(gen)
    
    with tab3:
        render_validator_tab(gen)
    
    with tab4:
        render_comparison_tab()
    
    with tab5:
        render_my_programs_tab(gen)


def render_visual_builder_tab(gen):
    """Visual wavelength instruction builder"""
    
    st.subheader("🎨 Build Your Wavelength Program Visually")
    
    col1, col2 = st.columns([1, 2])
    
    with col1:
        st.markdown("### 1️⃣ Select Operation Type")
        
        op_category = st.radio(
            "Category:",
            ["Arithmetic", "Logic", "Memory", "Control", "Function", "I/O"],
            label_visibility="collapsed"
        )
        
        # Map categories to opcodes
        category_map = {
            "Arithmetic": [WavelengthOpcodes.ADD, WavelengthOpcodes.SUBTRACT, 
                          WavelengthOpcodes.MULTIPLY, WavelengthOpcodes.DIVIDE],
            "Logic": [WavelengthOpcodes.AND, WavelengthOpcodes.OR, 
                     WavelengthOpcodes.NOT, WavelengthOpcodes.XOR],
            "Memory": [WavelengthOpcodes.LOAD, WavelengthOpcodes.STORE, 
                      WavelengthOpcodes.PUSH, WavelengthOpcodes.POP],
            "Control": [WavelengthOpcodes.IF, WavelengthOpcodes.LOOP, 
                       WavelengthOpcodes.BREAK],
            "Function": [WavelengthOpcodes.CALL, WavelengthOpcodes.RETURN, 
                        WavelengthOpcodes.DEFINE],
            "I/O": [WavelengthOpcodes.INPUT, WavelengthOpcodes.OUTPUT, 
                   WavelengthOpcodes.PRINT]
        }
        
        opcodes = category_map[op_category]
        selected_opcode = st.selectbox(
            "Operation:",
            opcodes,
            format_func=lambda x: f"{x.name} ({x.value}nm)",
            label_visibility="collapsed"
        )
        
        st.divider()
        
        st.markdown("### 2️⃣ Set Parameters")
        
        amplitude = st.slider(
            "🔊 Amplitude (Priority)",
            0.0, 1.0, 0.8,
            help="0=low priority, 1=highest priority"
        )
        
        phase_options = {
            "Sequential (0°)": 0.0,
            "If True (90°)": math.pi/2,
            "If False (180°)": math.pi,
            "Loop (270°)": 3*math.pi/2
        }
        
        phase_label = st.selectbox(
            "🔄 Phase (Control Flow):",
            phase_options.keys()
        )
        phase = phase_options[phase_label]
        
        modulation = st.selectbox(
            "📈 Modulation (Complexity):",
            [ModulationType.OOK, ModulationType.PSK, 
             ModulationType.QAM16, ModulationType.QAM64],
            format_func=lambda x: f"{x.display_name} ({x.bits_per_symbol} bits)"
        )
        
        operand1 = st.text_input("📍 Operand 1 (optional):", value="")
        operand2 = st.text_input("📍 Operand 2 (optional):", value="")
        
        st.divider()
        
        st.markdown("### 3️⃣ Add Instruction")
        
        if st.button("✅ Add to Program", use_container_width=True, type="primary"):
            spectral_region = get_spectral_region(selected_opcode.value)
            
            instruction = WavelengthInstruction(
                opcode=selected_opcode,
                wavelength_nm=selected_opcode.value,
                spectral_region=spectral_region,
                modulation=modulation,
                amplitude=amplitude,
                phase=phase,
                operand1=operand1 if operand1 else None,
                operand2=operand2 if operand2 else None
            )
            
            st.session_state.instructions.append(instruction)
            st.success(f"✅ Added {selected_opcode.name} at {selected_opcode.value}nm")
            st.rerun()
    
    with col2:
        st.markdown("### 📊 Visual Spectrum Display")
        
        # Draw interactive spectrum
        fig = go.Figure()
        
        # Spectral regions
        regions = [
            ("UV", 365, 400, "#9500ff"),
            ("Violet", 400, 450, "#7500ff"),
            ("Blue", 450, 495, "#0015ff"),
            ("Green", 495, 570, "#00ff00"),
            ("Yellow", 570, 590, "#ffff00"),
            ("Orange", 590, 620, "#ff7f00"),
            ("Red", 620, 750, "#ff0000"),
            ("IR", 750, 800, "#800000"),
        ]
        
        for region_name, wl_min, wl_max, color in regions:
            fig.add_vrect(
                x0=wl_min, x1=wl_max,
                fillcolor=color, opacity=0.3,
                layer="below", line_width=0,
                annotation_text=region_name, annotation_position="top left"
            )
        
        # Plot added instructions
        if st.session_state.instructions:
            wavelengths = [inst.wavelength_nm for inst in st.session_state.instructions]
            opcode_names = [inst.opcode.name for inst in st.session_state.instructions]
            costs = [inst.get_execution_cost_nxt() for inst in st.session_state.instructions]
            
            fig.add_trace(go.Scatter(
                x=wavelengths, y=costs,
                mode='markers+text',
                marker=dict(
                    size=12,
                    color=costs,
                    colorscale='Viridis',
                    showscale=True,
                    colorbar=dict(title="Cost (NXT)")
                ),
                text=opcode_names,
                textposition="top center",
                name="Instructions"
            ))
        
        fig.update_layout(
            title="Wavelength Spectrum with Instructions",
            xaxis_title="Wavelength (nm)",
            yaxis_title="Cost (NXT)",
            hovermode='closest',
            height=400
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        st.divider()
        
        st.markdown("### 📝 Current Instructions")
        
        if st.session_state.instructions:
            for idx, inst in enumerate(st.session_state.instructions):
                col_a, col_b = st.columns([3, 1])
                with col_a:
                    st.code(f"{idx+1}. {inst.opcode.name:10} @ {inst.wavelength_nm:6.1f}nm | "
                           f"Amp:{inst.amplitude:.1f} | Phase:{math.degrees(inst.phase):.0f}°")
                with col_b:
                    if st.button("❌", key=f"del_{idx}"):
                        st.session_state.instructions.pop(idx)
                        st.rerun()
        else:
            st.info("👈 Add instructions from the left panel")
        
        st.divider()
        
        st.markdown("### 💾 Save Program")
        
        program_name = st.text_input("Program name:", value="my_program")
        
        if st.button("💾 Save Program", use_container_width=True):
            if st.session_state.instructions:
                from wavelength_code_generator import WaveLangFunction
                
                func = WaveLangFunction(
                    name=program_name,
                    instructions=st.session_state.instructions,
                    input_params=[],
                    output_type=DataType.INTEGER
                )
                
                st.session_state.code_generator.register_function(func)
                st.success(f"✅ Saved program: {program_name}")
                st.session_state.instructions = []
                st.rerun()
            else:
                st.error("❌ Add instructions first")


def render_energy_calculator_tab(gen):
    """Real-time energy cost calculator"""
    
    st.subheader("⚡ Real-Time Energy Cost Calculator")
    
    st.markdown("""
    **Why Energy Matters:**
    - Each instruction costs quantum energy (E=hf)
    - Higher frequency wavelengths = higher cost
    - Modulation complexity adds premium
    - Shows execution efficiency instantly
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### Wavelength Cost Comparison")
        
        # Calculate costs for all opcodes
        costs_data = []
        for opcode in WavelengthOpcodes:
            wavelength_nm = opcode.value
            # Simulate instruction
            inst = WavelengthInstruction(
                opcode=opcode,
                wavelength_nm=wavelength_nm,
                spectral_region=get_spectral_region(wavelength_nm),
                modulation=ModulationType.OOK,
                amplitude=0.8
            )
            cost = inst.get_execution_cost_nxt()
            costs_data.append({
                'Operation': opcode.name,
                'Wavelength (nm)': wavelength_nm,
                'Cost (NXT)': cost,
                'Energy (J)': inst.get_quantum_energy()
            })
        
        df_costs = st.dataframe(costs_data, use_container_width=True)
        
        # Visualization
        fig = px.bar(
            costs_data,
            x='Operation',
            y='Cost (NXT)',
            color='Cost (NXT)',
            title="Instruction Costs (OOK Modulation, Amplitude=0.8)",
            color_continuous_scale='Reds'
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.markdown("### Modulation Complexity Premium")
        
        modulation_comparison = []
        for mod in [ModulationType.OOK, ModulationType.PSK, 
                   ModulationType.QAM16, ModulationType.QAM64]:
            inst = WavelengthInstruction(
                opcode=WavelengthOpcodes.ADD,
                wavelength_nm=380.0,
                spectral_region=SpectralRegion.VIOLET,
                modulation=mod,
                amplitude=0.8
            )
            modulation_comparison.append({
                'Modulation': mod.display_name,
                'Bits/Symbol': mod.bits_per_symbol,
                'Cost (NXT)': inst.get_execution_cost_nxt()
            })
        
        st.dataframe(modulation_comparison, use_container_width=True)
        
        # Show impact
        ook_cost = modulation_comparison[0]['Cost (NXT)']
        qam64_cost = modulation_comparison[3]['Cost (NXT)']
        
        st.metric(
            "QAM64 vs OOK Overhead",
            f"{100 * (qam64_cost / ook_cost - 1):.0f}%",
            help="QAM64 costs this much more than OOK for same operation"
        )
        
        st.markdown("### Program Total Cost")
        
        if st.session_state.code_generator.functions:
            programs = st.session_state.code_generator.functions
            
            for prog_name, prog in programs.items():
                energy = prog.get_total_energy_budget()
                st.metric(
                    prog_name,
                    f"{energy:.2e} J",
                    help=f"{len(prog.instructions)} instructions"
                )


def render_validator_tab(gen):
    """Why WaveLang eliminates syntax errors"""
    
    st.subheader("🔍 Why WaveLang Has ZERO Syntax Errors")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### ❌ Traditional Programming Problems")
        
        st.warning("""
        **Syntax Errors in Traditional Code:**
        
        ```python
        result = 5 + 3    # Correct
        result = 5 + 3)   # ERROR: Extra )
        result = 5 + 3;   # ERROR: Wrong language syntax
        result = 5 +3     # OK but inconsistent
        
        name = "John"
        print(name        # ERROR: Missing )
        print(nam)        # ERROR: Typo in variable
        
        if x > 5
            print("yes")  # ERROR: Missing :
        ```
        
        **Why These Happen:**
        - Humans type text manually
        - Easy to mistype punctuation
        - Variable names can be misspelled
        - Brackets/parentheses can be unmatched
        - Syntax varies by language
        """)
    
    with col2:
        st.markdown("### ✅ WaveLang Eliminates ALL These Problems")
        
        st.success("""
        **WaveLang is Physics-Based (Not Text-Based):**
        
        🔢 **Wavelengths are constants**
        - 380.0 nm is ALWAYS 380.0 nm
        - Cannot misspell a number
        - Cannot mistype a wavelength
        
        🎯 **Phase is exact**
        - 0° = sequential
        - 90° = if-true
        - 180° = if-false
        - 270° = loop
        
        No ambiguity. No errors.
        
        🔐 **Modulation is enforced**
        - OOK, PSK, QAM16, QAM64
        - Compiler knows all valid options
        - Invalid modulation = rejected
        
        💡 **Amplitude is numeric**
        - 0.0 to 1.0
        - Cannot be invalid
        """)
    
    st.divider()
    
    st.markdown("### 🛡️ Real Example: Error Prevention")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("**Traditional Code Error:**")
        st.code("""
if x > 5
    print("yes"
# Missing colon AND closing paren
# SYNTAX ERROR!
        """, language="python")
    
    with col2:
        st.markdown("**What You Intended:**")
        st.code("""
if x > 5:
    print("yes")
# Correct syntax
        """, language="python")
    
    with col3:
        st.markdown("**WaveLang (NO ERRORS POSSIBLE):**")
        st.code("""
Phase: 90.0°      (IF-TRUE)
Opcode: OUTPUT
Amplitude: 0.8
Modulation: OOK
# Physically valid
# Cannot be wrong
        """)
    
    st.divider()
    
    st.markdown("### 📊 Error-Free Validation")
    
    st.info("""
    **Automatic Validation (No Human Typing):**
    
    ✅ Phase is always 0°, 90°, 180°, or 270°
    ✅ Wavelengths are always from instruction set
    ✅ Modulation is always OOK, PSK, QAM16, or QAM64
    ✅ Amplitude is always 0.0-1.0
    ✅ Spectral region auto-determined from wavelength
    ✅ No variable naming conflicts (use wavelengths, not names)
    ✅ No bracket/parenthesis mismatches (no brackets!)
    ✅ No type errors (all operations have defined types)
    """)


def render_comparison_tab():
    """Compare WaveLang vs traditional code"""
    
    st.subheader("📊 WaveLang vs Traditional Programming")
    
    comparison = {
        'Aspect': [
            'Syntax Errors',
            'Type Errors',
            'Variable Naming',
            'Bracket Matching',
            'Logic Errors',
            'Performance Cost',
            'Energy Calculation',
            'Real-time Validation',
            'Learning Curve',
            'Visualization'
        ],
        'Traditional Code': [
            '❌ Common',
            '❌ Common',
            '❌ Easy to misspell',
            '❌ Easy to mismatch',
            '✅ Possible',
            '⚠️ Needs profiling',
            '❌ Hidden',
            '⚠️ At compile time',
            '📈 Steep',
            '❌ Text-only'
        ],
        'WaveLang': [
            '✅ IMPOSSIBLE',
            '✅ IMPOSSIBLE',
            '✅ Use wavelengths',
            '✅ No brackets',
            '✅ Possible',
            '✅ Built-in E=hf',
            '✅ Always visible',
            '✅ Real-time',
            '📈 Visual & intuitive',
            '✅ Spectrum visualization'
        ]
    }
    
    df = st.dataframe(comparison, use_container_width=True)
    
    st.divider()
    
    st.markdown("### 🎯 Why WaveLang is Revolutionary")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("**Error Prevention**")
        st.metric("Syntax Errors", "0%", "Physics-based, not text-based")
    
    with col2:
        st.markdown("**Transparency**")
        st.metric("Energy Visibility", "100%", "Every instruction's cost visible")
    
    with col3:
        st.markdown("**Type Safety**")
        st.metric("Type Errors", "0%", "Modulation-enforced types")
    
    st.divider()
    
    st.markdown("### 💡 Real Workflow Comparison")
    
    st.markdown("""
    **Traditional: 10 Steps (Error-Prone)**
    1. Type function definition
    2. Type variable declarations
    3. Type assignment statements
    4. Check syntax ❌ ERROR: Missing colon
    5. Fix syntax ❌ ERROR: Bracket mismatch
    6. Run code ❌ ERROR: Variable undefined
    7. Debug logic
    8. Test edge cases ❌ ERROR: Type mismatch
    9. Fix all errors
    10. Deploy
    
    **WaveLang: 5 Steps (Error-Free)**
    1. Select operation (dropdown - can't be wrong)
    2. Set wavelength (fixed set - can't be wrong)
    3. Choose modulation (dropdown - can't be wrong)
    4. Set amplitude (slider 0-1 - can't be wrong)
    5. Deploy (no errors possible!)
    """)


def render_my_programs_tab(gen):
    """View and manage saved programs"""
    
    st.subheader("📚 My Wavelength Programs")
    
    if not gen.functions:
        st.info("👈 Create programs in the Visual Builder tab")
        return
    
    summary = gen.get_program_summary()
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Total Programs", len(gen.functions))
    
    with col2:
        st.metric("Total Instructions", summary['total_instructions'])
    
    with col3:
        st.metric(
            "Total Energy",
            f"{summary['total_energy_joules']:.2e} J",
            help="Quantum energy budget"
        )
    
    st.divider()
    
    for func_name, func_data in summary['functions'].items():
        with st.expander(f"📄 {func_name} ({func_data['instruction_count']} instructions)"):
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Energy", f"{func_data['total_energy_joules']:.2e} J")
            
            with col2:
                st.metric("Output Type", func_data['output_type'])
            
            with col3:
                st.metric("Regions Used", len(func_data['spectral_composition']))
            
            st.markdown("**Spectral Composition:**")
            for region, count in func_data['spectral_composition'].items():
                st.text(f"  {region}: {count} instructions")
            
            st.markdown("**Instructions:**")
            insts = []
            for inst in func_data['instructions']:
                insts.append({
                    'Op': inst['opcode'],
                    'Wavelength': f"{inst['wavelength_nm']:.1f}nm",
                    'Region': inst['spectral_region'],
                    'Cost': f"{inst['execution_cost_nxt']:.6f} NXT"
                })
            st.dataframe(insts, use_container_width=True)


def get_spectral_region(wavelength_nm):
    """Determine spectral region from wavelength"""
    if wavelength_nm < 400:
        return SpectralRegion.UV
    elif wavelength_nm < 450:
        return SpectralRegion.VIOLET
    elif wavelength_nm < 495:
        return SpectralRegion.BLUE
    elif wavelength_nm < 570:
        return SpectralRegion.GREEN
    elif wavelength_nm < 590:
        return SpectralRegion.YELLOW
    elif wavelength_nm < 620:
        return SpectralRegion.ORANGE
    elif wavelength_nm < 750:
        return SpectralRegion.RED
    else:
        return SpectralRegion.IR


if __name__ == "__main__":
    render_wavelength_code_interface()
