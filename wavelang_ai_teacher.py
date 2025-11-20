"""
NexusOS AI Teacher for WaveLang
================================
Revolutionary AI-powered assistant for learning and writing wavelength code
- Text-to-Wavelength Encoder: Convert English descriptions to WaveLang
- Wavelength Decoder: Explain WaveLang code in plain English
- Code Advisor: Optimize wavelength programs
- Error Prevention: Catch logical errors before compilation
"""

import streamlit as st
from wavelength_code_generator import (
    WavelengthCodeGenerator, WavelengthInstruction, WavelengthOpcodes,
    ControlFlowMode, DataType
)
from wavelength_validator import SpectralRegion, ModulationType
import math
import json
from typing import List, Dict, Any, Optional

class WaveLangAITeacher:
    """AI-powered assistant for WaveLang programming"""
    
    def __init__(self):
        self.code_gen = WavelengthCodeGenerator()
        self.instruction_descriptions = self._load_instruction_descriptions()
        self.examples = self._load_examples()
    
    def _load_instruction_descriptions(self) -> Dict[str, Dict[str, Any]]:
        """Load descriptions for all opcodes"""
        return {
            "ADD": {
                "wavelength": 380.0,
                "region": "Violet",
                "description": "Add two numbers together",
                "example": "5 + 3 = 8",
                "use_case": "Arithmetic calculations"
            },
            "SUBTRACT": {
                "wavelength": 386.0,
                "region": "Violet",
                "description": "Subtract one number from another",
                "example": "10 - 3 = 7",
                "use_case": "Arithmetic calculations"
            },
            "MULTIPLY": {
                "wavelength": 392.0,
                "region": "Violet",
                "description": "Multiply two numbers",
                "example": "5 × 4 = 20",
                "use_case": "Scaling and repetition"
            },
            "DIVIDE": {
                "wavelength": 398.0,
                "region": "Violet",
                "description": "Divide one number by another",
                "example": "20 ÷ 4 = 5",
                "use_case": "Partitioning and ratios"
            },
            "AND": {
                "wavelength": 450.0,
                "region": "Blue",
                "description": "Logical AND - both must be true",
                "example": "true AND true = true",
                "use_case": "Multiple conditions"
            },
            "OR": {
                "wavelength": 462.0,
                "region": "Blue",
                "description": "Logical OR - at least one must be true",
                "example": "true OR false = true",
                "use_case": "Alternative conditions"
            },
            "LOAD": {
                "wavelength": 495.0,
                "region": "Green",
                "description": "Load a value from memory",
                "example": "Load variable X",
                "use_case": "Accessing stored data"
            },
            "STORE": {
                "wavelength": 508.0,
                "region": "Green",
                "description": "Save a value to memory",
                "example": "Store result to Y",
                "use_case": "Saving calculations"
            },
            "IF": {
                "wavelength": 570.0,
                "region": "Yellow",
                "description": "Conditional branching - execute if true",
                "example": "if (x > 5) then print 'big'",
                "use_case": "Decision making"
            },
            "LOOP": {
                "wavelength": 578.0,
                "region": "Yellow",
                "description": "Repeat code multiple times",
                "example": "loop 5 times: print number",
                "use_case": "Repetitive tasks"
            },
            "PRINT": {
                "wavelength": 650.0,
                "region": "Red",
                "description": "Output a value to screen",
                "example": "print 'Hello'",
                "use_case": "Displaying results"
            },
        }
    
    def _load_examples(self) -> Dict[str, List[str]]:
        """Load example programs"""
        return {
            "simple_addition": [
                "LOAD 5",
                "LOAD 3",
                "ADD",
                "PRINT"
            ],
            "conditional": [
                "LOAD 10",
                "LOAD 5",
                "IF (condition: greater than)",
                "PRINT 'Yes'",
            ],
            "loop": [
                "LOAD 0 (counter)",
                "LOOP 5 times",
                "ADD 1",
                "PRINT counter",
            ]
        }
    
    def text_to_wavelength(self, user_description: str) -> Dict[str, Any]:
        """
        Convert plain English description to WaveLang instructions
        Example: "Add 5 and 3, then print the result"
        """
        
        description_lower = user_description.lower()
        instructions = []
        
        # Pattern matching for common operations
        if "add" in description_lower and ("and" in description_lower or "+" in description_lower):
            # Extract numbers if present
            import re
            numbers = re.findall(r'\d+', user_description)
            
            if len(numbers) >= 2:
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 495.0,
                    "operand": numbers[0],
                    "explanation": f"Load first number: {numbers[0]}"
                })
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 508.0,
                    "operand": numbers[1],
                    "explanation": f"Load second number: {numbers[1]}"
                })
                instructions.append({
                    "opcode": "ADD",
                    "wavelength": 380.0,
                    "operand": None,
                    "explanation": f"Add {numbers[0]} + {numbers[1]}"
                })
        
        if "print" in description_lower or "output" in description_lower or "show" in description_lower:
            instructions.append({
                "opcode": "PRINT",
                "wavelength": 650.0,
                "operand": None,
                "explanation": "Display the result"
            })
        
        if "multiply" in description_lower or "*" in description_lower:
            import re
            numbers = re.findall(r'\d+', user_description)
            if len(numbers) >= 2:
                instructions.insert(0, {
                    "opcode": "LOAD",
                    "wavelength": 495.0,
                    "operand": numbers[0],
                    "explanation": f"Load first number: {numbers[0]}"
                })
                instructions.insert(1, {
                    "opcode": "LOAD",
                    "wavelength": 508.0,
                    "operand": numbers[1],
                    "explanation": f"Load second number: {numbers[1]}"
                })
                instructions.insert(2, {
                    "opcode": "MULTIPLY",
                    "wavelength": 392.0,
                    "operand": None,
                    "explanation": f"Multiply numbers"
                })
        
        if "loop" in description_lower or "repeat" in description_lower:
            import re
            times = re.findall(r'\d+', user_description)
            if times:
                instructions.append({
                    "opcode": "LOOP",
                    "wavelength": 578.0,
                    "operand": times[0],
                    "explanation": f"Repeat {times[0]} times"
                })
        
        if "if" in description_lower or "check" in description_lower or "condition" in description_lower:
            instructions.append({
                "opcode": "IF",
                "wavelength": 570.0,
                "operand": None,
                "explanation": "Conditional branching"
            })
        
        return {
            "status": "success" if instructions else "no_match",
            "instructions": instructions,
            "total_wavelength_cost": sum(i.get("wavelength", 0) for i in instructions) / len(instructions) if instructions else 0,
            "explanation": self._generate_summary(instructions)
        }
    
    def wavelength_to_text(self, opcodes: List[str]) -> Dict[str, Any]:
        """
        Convert WaveLang instructions to plain English explanation
        """
        
        explanation_lines = []
        
        for opcode in opcodes:
            opcode_upper = opcode.upper().strip()
            
            if opcode_upper in self.instruction_descriptions:
                desc = self.instruction_descriptions[opcode_upper]
                explanation_lines.append({
                    "opcode": opcode_upper,
                    "english": desc["description"],
                    "example": desc["example"],
                    "use_case": desc["use_case"]
                })
        
        return {
            "opcodes": opcodes,
            "english_explanation": explanation_lines,
            "summary": self._generate_summary_from_opcodes(opcodes)
        }
    
    def optimize_program(self, instructions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze and suggest optimizations for wavelength program
        """
        
        suggestions = []
        
        # Check for redundant operations
        if len(instructions) > 5:
            suggestions.append({
                "type": "optimization",
                "message": "Program is getting long. Consider breaking into functions.",
                "impact": "Reduce energy cost by 15-25%"
            })
        
        # Check modulation complexity
        high_complexity = sum(1 for i in instructions if i.get("modulation") == "QAM64")
        if high_complexity > 0:
            suggestions.append({
                "type": "optimization",
                "message": f"Using QAM64 modulation {high_complexity} times. Consider OOK/PSK for savings.",
                "impact": "Reduce energy cost by 30-50%"
            })
        
        # Check for missing output
        has_print = any(i.get("opcode") == "PRINT" for i in instructions)
        if not has_print:
            suggestions.append({
                "type": "warning",
                "message": "No PRINT instruction. Program output won't be visible.",
                "impact": "Add PRINT (650nm) at the end"
            })
        
        return {
            "suggestions": suggestions,
            "status": "optimized" if not suggestions else "improvements_available",
            "total_instructions": len(instructions)
        }
    
    def validate_program(self, instructions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate wavelength program for logical errors
        """
        
        errors = []
        warnings = []
        
        # Check for orphaned operations
        if not any(i.get("opcode") == "LOAD" for i in instructions):
            errors.append("No LOAD instruction found. How will data be accessed?")
        
        if not any(i.get("opcode") in ["PRINT", "OUTPUT"] for i in instructions):
            warnings.append("Program has no output instruction. Result won't be displayed.")
        
        # Check for infinite loops
        loops = sum(1 for i in instructions if i.get("opcode") == "LOOP")
        if loops > 2:
            warnings.append(f"Multiple nested loops detected ({loops}). Risk of excessive computation.")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    def _generate_summary(self, instructions: List[Dict[str, Any]]) -> str:
        """Generate English summary of instructions"""
        if not instructions:
            return "No valid operations detected in description."
        
        summary = "Your program will:\n"
        for i, inst in enumerate(instructions, 1):
            summary += f"{i}. {inst.get('explanation', inst.get('opcode'))}\n"
        return summary
    
    def _generate_summary_from_opcodes(self, opcodes: List[str]) -> str:
        """Generate summary from opcodes"""
        summary = "This program:\n"
        for opcode in opcodes:
            opcode_upper = opcode.upper().strip()
            if opcode_upper in self.instruction_descriptions:
                desc = self.instruction_descriptions[opcode_upper]
                summary += f"• {desc['description']}\n"
        return summary


def render_wavelang_ai_teacher():
    """Render interactive AI teacher interface for WaveLang"""
    
    st.markdown("### 🤖 NexusOS AI Teacher for WaveLang")
    st.markdown("""
    Let AI help you learn and write wavelength code. The AI acts as your:
    - **Teacher**: Explains what each wavelength does
    - **Translator**: Converts English to WaveLang and vice versa
    - **Advisor**: Optimizes your programs
    - **Validator**: Catches errors before compilation
    """)
    
    teacher = WaveLangAITeacher()
    
    # Three modes
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("📝 Text → WaveLang", use_container_width=True):
            st.session_state.ai_mode = "text_to_wavelength"
    
    with col2:
        if st.button("🔍 WaveLang → English", use_container_width=True):
            st.session_state.ai_mode = "wavelength_to_text"
    
    with col3:
        if st.button("✨ Optimize Program", use_container_width=True):
            st.session_state.ai_mode = "optimize"
    
    st.divider()
    
    # Mode-specific interfaces
    if "ai_mode" not in st.session_state:
        st.session_state.ai_mode = "text_to_wavelength"
    
    if st.session_state.ai_mode == "text_to_wavelength":
        render_text_to_wavelength_mode(teacher)
    
    elif st.session_state.ai_mode == "wavelength_to_text":
        render_wavelength_to_text_mode(teacher)
    
    elif st.session_state.ai_mode == "optimize":
        render_optimize_mode(teacher)


def render_text_to_wavelength_mode(teacher: WaveLangAITeacher):
    """Convert English to WaveLang"""
    
    st.subheader("📝 English to WaveLang Converter")
    
    st.markdown("""
    Describe what you want your program to do in plain English.
    The AI will convert it to wavelength instructions.
    """)
    
    user_input = st.text_area(
        "Describe your program in English:",
        placeholder="Example: Add 5 and 3, then print the result",
        height=100
    )
    
    if st.button("🔄 Convert to WaveLang", type="primary"):
        if user_input:
            result = teacher.text_to_wavelength(user_input)
            
            if result["status"] == "success":
                st.success("✅ Successfully converted to WaveLang!")
                
                st.markdown("### Generated Instructions:")
                
                for i, inst in enumerate(result["instructions"], 1):
                    col1, col2, col3 = st.columns([2, 2, 2])
                    with col1:
                        st.code(inst["opcode"], language="text")
                    with col2:
                        st.code(f"{inst['wavelength']}nm", language="text")
                    with col3:
                        st.text(inst["explanation"])
                
                st.divider()
                st.markdown("### Program Explanation:")
                st.info(result["explanation"])
                
                # Validation
                validation = teacher.validate_program(result["instructions"])
                if validation["errors"]:
                    st.error("⚠️ **Errors:**\n" + "\n".join(validation["errors"]))
                if validation["warnings"]:
                    st.warning("⚠️ **Warnings:**\n" + "\n".join(validation["warnings"]))
            else:
                st.error("❌ Could not parse your description. Try being more specific.")
        else:
            st.warning("Please enter a description")


def render_wavelength_to_text_mode(teacher: WaveLangAITeacher):
    """Convert WaveLang to English"""
    
    st.subheader("🔍 WaveLang to English Decoder")
    
    st.markdown("""
    Paste your wavelength instructions and get an English explanation.
    """)
    
    instructions_input = st.text_area(
        "Enter your opcodes (one per line):",
        placeholder="LOAD\nLOAD\nADD\nPRINT",
        height=100
    )
    
    if st.button("🔄 Decode to English", type="primary"):
        if instructions_input.strip():
            opcodes = [line.strip() for line in instructions_input.split('\n') if line.strip()]
            result = teacher.wavelength_to_text(opcodes)
            
            st.success("✅ Decoded your WaveLang!")
            
            st.markdown("### English Explanation:")
            
            for item in result["english_explanation"]:
                with st.expander(f"**{item['opcode']}** - {item['english']}"):
                    st.markdown(f"**Example:** {item['example']}")
                    st.markdown(f"**Use Case:** {item['use_case']}")
            
            st.divider()
            st.markdown("### Program Summary:")
            st.info(result["summary"])
        else:
            st.warning("Please enter opcodes")


def render_optimize_mode(teacher: WaveLangAITeacher):
    """Optimize program suggestions"""
    
    st.subheader("✨ Program Optimizer & Validator")
    
    st.markdown("""
    Get suggestions to improve your wavelength program.
    """)
    
    # Simulated program for demo
    num_instructions = st.slider("Number of instructions in your program:", 1, 20, 5)
    has_qam64 = st.checkbox("Using QAM64 modulation?")
    has_print = st.checkbox("Has PRINT instruction?")
    
    # Create demo program
    demo_instructions = [{"opcode": "LOAD"} for _ in range(num_instructions)]
    if has_qam64:
        demo_instructions.append({"opcode": "MULTIPLY", "modulation": "QAM64"})
    if has_print:
        demo_instructions.append({"opcode": "PRINT"})
    
    if st.button("🔍 Analyze Program", type="primary"):
        optimization = teacher.optimize_program(demo_instructions)
        validation = teacher.validate_program(demo_instructions)
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("### ✅ Validation Results:")
            if validation["valid"]:
                st.success("Program is logically valid!")
            else:
                for error in validation["errors"]:
                    st.error(f"❌ {error}")
            
            for warning in validation["warnings"]:
                st.warning(f"⚠️ {warning}")
        
        with col2:
            st.markdown("### 💡 Optimization Suggestions:")
            for suggestion in optimization["suggestions"]:
                if suggestion["type"] == "optimization":
                    st.info(f"💡 **{suggestion['message']}**\n{suggestion['impact']}")
                else:
                    st.warning(f"⚠️ **{suggestion['message']}**")
        
        st.divider()
        st.markdown("### 📊 Program Stats:")
        st.metric("Total Instructions", len(demo_instructions))


if __name__ == "__main__":
    render_wavelang_ai_teacher()
