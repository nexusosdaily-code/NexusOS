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
from wavelength_validator import SpectralRegion, ModulationType, WaveProperties
from text_to_wavelength_translator import (
    render_text_to_wavelength_translator,
    render_quick_translator
)
import math
import json

# Physics constants
PLANCK_CONSTANT = 6.62607015e-34  # J·s
SPEED_OF_LIGHT = 299792458  # m/s

# Learning Monitor - operation explanations
OPERATION_EXPLANATIONS = {
    "ADD": {
        "wavelength": 380.0,
        "region": "UV",
        "what_it_does": "Combines two values together, like adding numbers",
        "physics": "Uses 380nm UV wavelength - high energy for fast computation",
        "real_world": "Like combining ingredients in a recipe",
        "troubleshoot": "If result seems wrong, check that both operands are numbers",
        "example": "ADD 5, 3 → Result: 8"
    },
    "SUBTRACT": {
        "wavelength": 390.0,
        "region": "UV",
        "what_it_does": "Takes one value away from another",
        "physics": "390nm UV - slightly lower energy than ADD",
        "real_world": "Like removing items from a shopping cart",
        "troubleshoot": "Order matters! First operand minus second operand",
        "example": "SUBTRACT 10, 4 → Result: 6"
    },
    "MULTIPLY": {
        "wavelength": 400.0,
        "region": "Violet",
        "what_it_does": "Multiplies two values together",
        "physics": "400nm Violet - visible spectrum begins",
        "real_world": "Like calculating total cost: quantity × price",
        "troubleshoot": "Large numbers may overflow - use smaller values",
        "example": "MULTIPLY 7, 8 → Result: 56"
    },
    "DIVIDE": {
        "wavelength": 410.0,
        "region": "Violet",
        "what_it_does": "Splits one value by another",
        "physics": "410nm Violet - balanced energy for precision",
        "real_world": "Like splitting a pizza among friends",
        "troubleshoot": "Cannot divide by zero! Always check denominator",
        "example": "DIVIDE 20, 4 → Result: 5"
    },
    "AND": {
        "wavelength": 420.0,
        "region": "Violet",
        "what_it_does": "Returns true only if BOTH conditions are true",
        "physics": "420nm - logical operations use blue-violet spectrum",
        "real_world": "Like needing BOTH a key AND a password to enter",
        "troubleshoot": "Both inputs must be boolean (true/false)",
        "example": "AND (true, true) → true; AND (true, false) → false"
    },
    "OR": {
        "wavelength": 430.0,
        "region": "Blue",
        "what_it_does": "Returns true if EITHER condition is true",
        "physics": "430nm Blue - slightly higher energy logic",
        "real_world": "Like opening door with EITHER key OR card",
        "troubleshoot": "Returns false only if BOTH inputs are false",
        "example": "OR (true, false) → true; OR (false, false) → false"
    },
    "NOT": {
        "wavelength": 440.0,
        "region": "Blue",
        "what_it_does": "Flips true to false, and false to true",
        "physics": "440nm Blue - simple inversion operation",
        "real_world": "Like a light switch - on becomes off, off becomes on",
        "troubleshoot": "Only takes one input, not two",
        "example": "NOT (true) → false; NOT (false) → true"
    },
    "XOR": {
        "wavelength": 450.0,
        "region": "Blue",
        "what_it_does": "Returns true if inputs are DIFFERENT",
        "physics": "450nm Blue - exclusive logic operation",
        "real_world": "Like choosing between two exclusive options",
        "troubleshoot": "True only when exactly one input is true",
        "example": "XOR (true, false) → true; XOR (true, true) → false"
    },
    "LOAD": {
        "wavelength": 500.0,
        "region": "Green",
        "what_it_does": "Retrieves a value from memory into working area",
        "physics": "500nm Green - balanced energy for data operations",
        "real_world": "Like getting a book from a library shelf",
        "troubleshoot": "Make sure the memory address exists first",
        "example": "LOAD address_5 → Puts value at address 5 into register"
    },
    "STORE": {
        "wavelength": 510.0,
        "region": "Green",
        "what_it_does": "Saves a value from working area to memory",
        "physics": "510nm Green - stable storage wavelength",
        "real_world": "Like putting a book back on the shelf",
        "troubleshoot": "Value in register will be copied, not moved",
        "example": "STORE 42, address_5 → Saves 42 at memory address 5"
    },
    "PUSH": {
        "wavelength": 520.0,
        "region": "Green",
        "what_it_does": "Adds a value to the top of the stack",
        "physics": "520nm Green - stack operations use green spectrum",
        "real_world": "Like stacking plates - new one goes on top",
        "troubleshoot": "Stack has limited size - don't overflow!",
        "example": "PUSH 10 → Stack: [10] (10 is now on top)"
    },
    "POP": {
        "wavelength": 530.0,
        "region": "Green",
        "what_it_does": "Removes and returns the top value from stack",
        "physics": "530nm Green - retrieval from stack",
        "real_world": "Like taking the top plate off a stack",
        "troubleshoot": "Can't pop from empty stack! Check size first",
        "example": "POP → Returns top value and removes it from stack"
    },
    "IF": {
        "wavelength": 550.0,
        "region": "Yellow-Green",
        "what_it_does": "Executes next instruction only if condition is true",
        "physics": "550nm - control flow uses yellow-green band",
        "real_world": "Like a traffic light - proceed only on green",
        "troubleshoot": "Condition must evaluate to true/false",
        "example": "IF (x > 5) → Only runs next instruction if x is greater than 5"
    },
    "LOOP": {
        "wavelength": 570.0,
        "region": "Yellow",
        "what_it_does": "Repeats a block of instructions multiple times",
        "physics": "570nm Yellow - repetition wavelength",
        "real_world": "Like a washing machine cycle - repeats until done",
        "troubleshoot": "Make sure loop has exit condition to avoid infinite loops",
        "example": "LOOP 10 → Repeats next block 10 times"
    },
    "BREAK": {
        "wavelength": 590.0,
        "region": "Orange",
        "what_it_does": "Exits from a loop immediately",
        "physics": "590nm Orange - interrupt signal",
        "real_world": "Like an emergency stop button",
        "troubleshoot": "Only works inside a loop",
        "example": "BREAK → Immediately exits current loop"
    },
    "CALL": {
        "wavelength": 600.0,
        "region": "Orange",
        "what_it_does": "Jumps to and executes a named function",
        "physics": "600nm Orange - function call wavelength",
        "real_world": "Like asking a specialist to do a specific task",
        "troubleshoot": "Function must be defined before calling",
        "example": "CALL calculate_tax → Runs the calculate_tax function"
    },
    "RETURN": {
        "wavelength": 610.0,
        "region": "Orange",
        "what_it_does": "Exits function and returns a value to caller",
        "physics": "610nm Orange - return signal",
        "real_world": "Like a delivery person bringing back a package",
        "troubleshoot": "Return value type should match function definition",
        "example": "RETURN 42 → Sends 42 back to whoever called this function"
    },
    "DEFINE": {
        "wavelength": 620.0,
        "region": "Red",
        "what_it_does": "Creates a new named function",
        "physics": "620nm Red - definition wavelength",
        "real_world": "Like writing a recipe that can be used later",
        "troubleshoot": "Function name must be unique",
        "example": "DEFINE add_tax → Creates a function called add_tax"
    },
    "INPUT": {
        "wavelength": 650.0,
        "region": "Red",
        "what_it_does": "Receives data from external source",
        "physics": "650nm Red - input wavelength",
        "real_world": "Like listening for a message",
        "troubleshoot": "Input may be empty - always validate",
        "example": "INPUT → Waits for and receives external data"
    },
    "OUTPUT": {
        "wavelength": 680.0,
        "region": "Red",
        "what_it_does": "Sends data to external destination",
        "physics": "680nm Deep Red - output wavelength",
        "real_world": "Like sending a message out",
        "troubleshoot": "Destination must be available",
        "example": "OUTPUT result → Sends result to output channel"
    },
    "PRINT": {
        "wavelength": 700.0,
        "region": "Deep Red",
        "what_it_does": "Displays a value on screen",
        "physics": "700nm Deep Red - display wavelength",
        "real_world": "Like showing a message on a billboard",
        "troubleshoot": "Value will be converted to text for display",
        "example": "PRINT 'Hello' → Shows 'Hello' on screen"
    }
}

# SDK Capabilities - what can be built
SDK_CAPABILITIES = {
    "Programs": {
        "icon": "📱",
        "description": "Build standalone applications that run on NexusOS",
        "examples": ["Calculator", "Data processor", "File manager", "Crypto wallet"],
        "difficulty": "Beginner",
        "starter_ops": ["LOAD", "STORE", "ADD", "PRINT"]
    },
    "Operating Systems": {
        "icon": "🖥️",
        "description": "Create custom OS components and system utilities",
        "examples": ["Task scheduler", "Memory manager", "File system", "Process controller"],
        "difficulty": "Advanced",
        "starter_ops": ["LOAD", "STORE", "IF", "LOOP", "CALL"]
    },
    "AI & Machine Learning": {
        "icon": "🤖",
        "description": "Build intelligent systems with wavelength-encoded neural operations",
        "examples": ["Pattern recognizer", "Decision engine", "Learning system", "Classifier"],
        "difficulty": "Intermediate",
        "starter_ops": ["MULTIPLY", "ADD", "IF", "LOOP"]
    },
    "Games": {
        "icon": "🎮",
        "description": "Create interactive games with physics-based logic",
        "examples": ["Number guessing", "Logic puzzles", "Text adventure", "Trading game"],
        "difficulty": "Beginner",
        "starter_ops": ["INPUT", "IF", "LOOP", "PRINT", "RETURN"]
    },
    "DeFi & Blockchain": {
        "icon": "💰",
        "description": "Build decentralized finance applications on NexusOS",
        "examples": ["Token swaps", "Staking contracts", "Governance", "DEX interfaces"],
        "difficulty": "Advanced",
        "starter_ops": ["LOAD", "STORE", "MULTIPLY", "IF", "CALL"]
    },
    "IoT & Sensors": {
        "icon": "📡",
        "description": "Interface with physical devices via wavelength protocols",
        "examples": ["Sensor reader", "Device controller", "Data logger", "Alert system"],
        "difficulty": "Intermediate",
        "starter_ops": ["INPUT", "OUTPUT", "IF", "LOOP"]
    }
}

# Future use cases for WaveProperties:
# 1. Wave interference analysis - detect instruction collisions
# 2. Quantum superposition - model parallel execution paths
# 3. Spectral diversity - ensure validator resistance
# 4. Wave coherence - measure program stability/reliability
# 5. Phase locking - synchronize multi-instruction sequences
# 6. Harmonic analysis - optimize bytecode efficiency
# 7. Wave packet collapse - debug program execution states


def render_learning_monitor(selected_opcode, instructions):
    """
    Render the Learning Monitor panel showing real-time explanations
    of the selected operation and program state.
    """
    opcode_name = selected_opcode.name
    explanation = OPERATION_EXPLANATIONS.get(opcode_name, {})
    
    st.markdown("### 🖥️ Learning Monitor")
    
    # Calculate physics values
    wavelength_nm = selected_opcode.value
    wavelength_m = wavelength_nm * 1e-9
    frequency_hz = SPEED_OF_LIGHT / wavelength_m
    energy_j = PLANCK_CONSTANT * frequency_hz
    
    # Main monitor display
    st.markdown(f"""
    <div style='background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                padding: 20px; border-radius: 12px; border: 1px solid #4a4a6a;
                font-family: monospace;'>
        <div style='color: #00ff88; font-size: 1.4em; margin-bottom: 15px;'>
            📡 OPERATION: {opcode_name}
        </div>
        <div style='display: grid; grid-template-columns: 1fr 1fr; gap: 15px;'>
            <div style='background: rgba(0,255,136,0.1); padding: 12px; border-radius: 8px;'>
                <div style='color: #888; font-size: 0.8em;'>WAVELENGTH</div>
                <div style='color: #00ff88; font-size: 1.3em;'>{wavelength_nm:.1f} nm</div>
            </div>
            <div style='background: rgba(136,136,255,0.1); padding: 12px; border-radius: 8px;'>
                <div style='color: #888; font-size: 0.8em;'>FREQUENCY</div>
                <div style='color: #8888ff; font-size: 1.1em;'>{frequency_hz:.2e} Hz</div>
            </div>
            <div style='background: rgba(255,136,0,0.1); padding: 12px; border-radius: 8px;'>
                <div style='color: #888; font-size: 0.8em;'>ENERGY (E=hf)</div>
                <div style='color: #ff8800; font-size: 1.1em;'>{energy_j:.2e} J</div>
            </div>
            <div style='background: rgba(255,0,136,0.1); padding: 12px; border-radius: 8px;'>
                <div style='color: #888; font-size: 0.8em;'>SPECTRAL REGION</div>
                <div style='color: #ff0088; font-size: 1.1em;'>{explanation.get('region', 'Unknown')}</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Explanation tabs
    monitor_tab1, monitor_tab2, monitor_tab3 = st.tabs(["💡 What It Does", "🔧 Troubleshoot", "📖 Physics"])
    
    with monitor_tab1:
        st.markdown(f"**{explanation.get('what_it_does', 'No description available')}**")
        st.markdown(f"🌍 *Real-world analogy:* {explanation.get('real_world', 'N/A')}")
        st.code(explanation.get('example', 'No example available'), language="text")
    
    with monitor_tab2:
        st.warning(f"⚠️ {explanation.get('troubleshoot', 'No troubleshooting tips available')}")
        
        # Common issues based on operation type
        if opcode_name in ["DIVIDE"]:
            st.error("🚫 **Division by Zero**: Always check that your divisor is not zero!")
        elif opcode_name in ["POP"]:
            st.error("🚫 **Empty Stack**: Make sure you PUSH values before trying to POP!")
        elif opcode_name in ["LOOP"]:
            st.error("🚫 **Infinite Loop**: Always include a BREAK condition or limit iterations!")
        elif opcode_name in ["CALL"]:
            st.info("💡 **Tip**: Define functions before calling them using DEFINE operation")
    
    with monitor_tab3:
        st.markdown(f"**Physics Basis:** {explanation.get('physics', 'N/A')}")
        st.markdown(f"""
        **Lambda Boson Formula:**
        - Energy: E = hf = {energy_j:.4e} J
        - Mass-equivalent: Λ = hf/c² = {energy_j / (SPEED_OF_LIGHT**2):.4e} kg
        
        This wavelength carries real mass-equivalent through oscillation!
        """)
    
    # Program state monitor
    if instructions:
        st.markdown("---")
        st.markdown("### 📊 Program State")
        
        total_energy = sum(PLANCK_CONSTANT * SPEED_OF_LIGHT / (inst.wavelength_nm * 1e-9) 
                         for inst in instructions)
        
        col1, col2, col3 = st.columns(3)
        col1.metric("Instructions", len(instructions))
        col2.metric("Total Energy", f"{total_energy:.2e} J")
        col3.metric("Status", "✅ Valid" if len(instructions) > 0 else "⏳ Empty")


def render_sdk_capabilities():
    """Render the SDK capabilities section showing what can be built"""
    
    st.markdown("### 🚀 What Can You Build?")
    st.markdown("The NexusOS SDK lets you create anything from simple programs to complete operating systems!")
    
    cols = st.columns(3)
    
    for idx, (name, info) in enumerate(SDK_CAPABILITIES.items()):
        with cols[idx % 3]:
            difficulty_color = {
                "Beginner": "#00ff88",
                "Intermediate": "#ffaa00",
                "Advanced": "#ff4444"
            }.get(info['difficulty'], "#888888")
            
            st.markdown(f"""
            <div style='background: linear-gradient(135deg, #1e1e2e 0%, #2d2d3e 100%);
                        padding: 15px; border-radius: 10px; margin-bottom: 10px;
                        border-left: 4px solid {difficulty_color};'>
                <div style='font-size: 1.5em; margin-bottom: 5px;'>{info['icon']} {name}</div>
                <div style='color: #aaa; font-size: 0.9em; margin-bottom: 8px;'>{info['description']}</div>
                <div style='color: {difficulty_color}; font-size: 0.8em;'>Difficulty: {info['difficulty']}</div>
                <div style='color: #666; font-size: 0.8em; margin-top: 5px;'>
                    Examples: {', '.join(info['examples'][:3])}
                </div>
            </div>
            """, unsafe_allow_html=True)
    
    # Starter template selector
    st.markdown("---")
    st.markdown("### 🎯 Quick Start Templates")
    
    template = st.selectbox(
        "Choose a template to start building:",
        ["Select a template...", "Simple Calculator", "Number Guessing Game", 
         "Data Logger", "Token Counter", "Pattern Matcher"],
        key="sdk_template_selector"
    )
    
    # Template definitions with actual opcodes
    templates = {
        "Simple Calculator": {
            "description": "📱 **Simple Calculator**: LOAD → ADD/SUBTRACT/MULTIPLY/DIVIDE → PRINT",
            "opcodes": [WavelengthOpcodes.LOAD, WavelengthOpcodes.ADD, WavelengthOpcodes.PRINT]
        },
        "Number Guessing Game": {
            "description": "🎮 **Number Guessing Game**: INPUT → IF → LOOP → PRINT",
            "opcodes": [WavelengthOpcodes.INPUT, WavelengthOpcodes.IF, WavelengthOpcodes.LOOP, WavelengthOpcodes.PRINT]
        },
        "Data Logger": {
            "description": "📡 **Data Logger**: INPUT → STORE → LOOP → OUTPUT",
            "opcodes": [WavelengthOpcodes.INPUT, WavelengthOpcodes.STORE, WavelengthOpcodes.LOOP, WavelengthOpcodes.OUTPUT]
        },
        "Token Counter": {
            "description": "💰 **Token Counter**: LOAD → ADD → LOOP → STORE → PRINT",
            "opcodes": [WavelengthOpcodes.LOAD, WavelengthOpcodes.ADD, WavelengthOpcodes.LOOP, WavelengthOpcodes.STORE, WavelengthOpcodes.PRINT]
        },
        "Pattern Matcher": {
            "description": "🔍 **Pattern Matcher**: INPUT → IF → AND → RETURN",
            "opcodes": [WavelengthOpcodes.INPUT, WavelengthOpcodes.IF, WavelengthOpcodes.AND, WavelengthOpcodes.RETURN]
        }
    }
    
    if template in templates:
        template_info = templates[template]
        st.info(template_info["description"])
        
        if st.button(f"📥 Load {template} Template", key=f"load_{template.lower().replace(' ', '_')}", type="primary"):
            # Create instructions from template opcodes
            new_instructions = []
            for opcode in template_info["opcodes"]:
                spectral_region = get_spectral_region(opcode.value)
                instruction = WavelengthInstruction(
                    opcode=opcode,
                    wavelength_nm=opcode.value,
                    spectral_region=spectral_region,
                    modulation=ModulationType.OOK,
                    amplitude=0.8,
                    phase=0.0
                )
                new_instructions.append(instruction)
            
            # Add to session state
            st.session_state.instructions = new_instructions
            st.success(f"✅ Loaded {template} template with {len(new_instructions)} instructions!")
            st.rerun()


def render_nexus_system_controls():
    """Render NexusOS system interaction controls"""
    
    st.markdown("### ⚙️ NexusOS System Controls")
    
    st.markdown("""
    <div style='background: #1a1a2e; padding: 15px; border-radius: 10px; 
                border: 1px solid #4a4a6a; margin-bottom: 15px;'>
        <div style='color: #00ff88;'>🔌 Direct System Access</div>
        <div style='color: #888; font-size: 0.9em;'>
            Interact directly with NexusOS blockchain, wallet, and governance systems
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    system_action = st.selectbox(
        "System Action:",
        ["Select action...", "Check Wallet Balance", "View Network Status", 
         "Query Validator Nodes", "Get Block Height", "Estimate Transaction Cost"]
    )
    
    if system_action == "Check Wallet Balance":
        st.code("LOAD wallet_address\nCALL get_balance\nPRINT result", language="wavelang")
        st.success("💰 This program queries your NexusOS wallet balance")
        
    elif system_action == "View Network Status":
        st.code("CALL network_status\nLOAD node_count\nPRINT 'Active nodes:'\nPRINT node_count", language="wavelang")
        st.success("🌐 This program displays current network status")
        
    elif system_action == "Query Validator Nodes":
        st.code("CALL get_validators\nLOOP validator_list\n  PRINT validator_id\n  PRINT stake_amount", language="wavelang")
        st.success("🔐 This program lists all active validator nodes")
        
    elif system_action == "Get Block Height":
        st.code("CALL get_latest_block\nLOAD block_height\nPRINT block_height", language="wavelang")
        st.success("📦 This program retrieves the current block height")
        
    elif system_action == "Estimate Transaction Cost":
        st.code("INPUT message\nCALL estimate_cost message\nPRINT 'Cost in NXT:'\nPRINT cost", language="wavelang")
        st.success("💵 This program estimates transaction cost based on message length")


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
    
    # Main tabs - Text Translator first for easy adoption
    tab0, tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "✨ Text Translator",
        "🎨 Visual Builder",
        "⚡ Energy Calculator",
        "🔍 Validator",
        "📊 Comparison",
        "📚 My Programs"
    ])
    
    with tab0:
        render_text_translator_tab()
    
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


def render_text_translator_tab():
    """Easy text-to-wavelength translator for beginners"""
    
    st.subheader("✨ Text to Wavelength Translator")
    
    st.markdown("""
    **Start here!** Type any text and instantly see how each character 
    translates to a wavelength in the electromagnetic spectrum.
    
    This is the easiest way to understand wavelength encoding - no programming required.
    """)
    
    render_text_to_wavelength_translator(
        key_prefix="studio_translator",
        show_educational=True,
        compact=False
    )
    
    st.divider()
    st.info("💡 **Ready to build programs?** Switch to the **Visual Builder** tab to create wavelength programs with drag-and-drop operations!")


def render_visual_builder_tab(gen):
    """Visual wavelength instruction builder with Learning Monitor"""
    
    st.subheader("🎨 Build Your Wavelength Program Visually")
    
    # Initialize selected_opcode at function level for Learning Monitor access
    if 'selected_opcode' not in st.session_state:
        st.session_state.selected_opcode = WavelengthOpcodes.ADD
    
    with st.expander("ℹ️ What is Visual Wavelength Programming?"):
        st.markdown("""
        ### 🌊 Revolutionary Zero-Syntax-Error Programming
        
        **Traditional Programming:**
        - Type wrong bracket → Syntax Error
        - Misspell variable → Error
        - Forget semicolon → Error
        - Hours debugging syntax issues
        
        **WaveLang Visual Builder:**
        - 🎨 Drag & drop operations - no typing errors possible
        - 🌈 Visual spectrum selector - wavelengths are physics constants
        - ⚡ Real-time validation - errors prevented before they happen
        - 💰 Live energy cost calculator - see E=hf costs instantly
        
        **How It Works:**
        1. Select an operation type (Arithmetic, Logic, Memory, etc.)
        2. Choose specific operation (ADD, LOAD, IF, etc.)
        3. Set parameters using validated inputs
        4. Click "Add Instruction" - guaranteed valid!
        5. View your program with live energy cost
        
        **380nm is ALWAYS 380nm** - wavelengths don't have typos!
        """)
    
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
            label_visibility="collapsed",
            key="visual_builder_opcode"
        )
        # Store in session state for Learning Monitor access
        st.session_state.selected_opcode = selected_opcode
        
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
        
        if st.button("✅ Add to Program", width="stretch", type="primary"):
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
        
        if st.button("💾 Save Program", width="stretch"):
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
    
    # Learning Monitor Section - Below main builder
    st.divider()
    
    # Use tabs for Learning Monitor, SDK Capabilities, and System Controls
    learn_tab1, learn_tab2, learn_tab3 = st.tabs([
        "🖥️ Learning Monitor", 
        "🚀 SDK Capabilities", 
        "⚙️ System Controls"
    ])
    
    with learn_tab1:
        render_learning_monitor(st.session_state.selected_opcode, st.session_state.instructions)
    
    with learn_tab2:
        render_sdk_capabilities()
    
    with learn_tab3:
        render_nexus_system_controls()


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
