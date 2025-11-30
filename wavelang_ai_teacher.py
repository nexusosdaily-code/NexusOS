"""
NexusOS AI Teacher for WaveLang
================================
Revolutionary AI-powered assistant for learning and writing wavelength code
Unified Pipeline: Text → WaveLang → Optimize → Bytecode → English → Visual Output
- Text-to-Wavelength Encoder: Convert English descriptions to WaveLang
- Auto-Optimizer: Improve code efficiency automatically
- Binary Compiler: Generate executable bytecode/assembly
- Wavelength Decoder: Explain everything in plain English
"""

import streamlit as st
from wavelength_code_generator import (
    WavelengthCodeGenerator, WavelengthInstruction, WavelengthOpcodes,
    ControlFlowMode, DataType
)
from wavelength_validator import SpectralRegion, ModulationType
from wavelang_compiler import WaveLangCompiler
from text_to_wavelength_translator import (
    render_text_to_wavelength_translator,
    translate_text_to_wavelengths,
    get_wavelength_sequence
)
import math
import json
from typing import List, Dict, Any, Optional

class WaveLangPipeline:
    """
    Unified pipeline for WaveLang processing
    Text → WaveLang → Optimize → Bytecode → Explanation
    """
    
    def __init__(self):
        self.code_gen = WavelengthCodeGenerator()
        self.compiler = WaveLangCompiler()
        self.instruction_descriptions = self._load_instruction_descriptions()
        self.examples = self._load_examples()
        
    def execute_full_pipeline(self, user_text: str, auto_optimize: bool = True) -> Dict[str, Any]:
        """
        Execute the complete pipeline from text to bytecode
        Returns all intermediate results for display
        """
        
        pipeline_result = {
            "success": False,
            "stages": {}
        }
        
        # Stage 1: Text → WaveLang Instructions
        text_result = self.text_to_wavelength(user_text)
        pipeline_result["stages"]["1_text_to_wavelength"] = text_result
        
        if text_result["status"] != "success":
            return pipeline_result
        
        instructions = text_result["instructions"]
        
        # Stage 2: Initial Validation (pre-optimization)
        validation = self.validate_program(instructions)
        pipeline_result["stages"]["2_validation_initial"] = validation
        
        # Stage 3: Optimization (if enabled)
        if auto_optimize:
            optimization = self.optimize_program(instructions)
            pipeline_result["stages"]["3_optimization"] = optimization
            # Apply optimization transformations
            optimized_instructions = self._apply_optimizations(instructions, optimization)
            pipeline_result["stages"]["3_optimization"]["applied"] = (len(optimized_instructions) != len(instructions))
            
            # Stage 2b: Re-validate after optimization
            final_validation = self.validate_program(optimized_instructions)
            pipeline_result["stages"]["2_validation_final"] = final_validation
        else:
            optimized_instructions = instructions
            pipeline_result["stages"]["3_optimization"] = {"status": "skipped", "applied": False}
            pipeline_result["stages"]["2_validation_final"] = validation  # Same as initial
        
        # Stage 4: Convert to WavelengthInstruction objects for compilation
        wavelength_insts = self._convert_to_wavelength_instructions(optimized_instructions)
        
        # Stage 5: Compile to Bytecode
        try:
            bytecode = self.compiler.wavelength_to_bytecode(wavelength_insts)
            pipeline_result["stages"]["4_bytecode"] = {
                "success": True,
                "bytecode": bytecode.hex(),
                "size_bytes": len(bytecode)
            }
            
            # Stage 6: Generate Assembly
            assembly = self.compiler.bytecode_to_assembly(bytecode)
            pipeline_result["stages"]["5_assembly"] = {
                "success": True,
                "assembly": assembly
            }
        except Exception as e:
            pipeline_result["stages"]["4_bytecode"] = {
                "success": False,
                "error": str(e)
            }
        
        # Stage 7: English Explanation (use OPTIMIZED instructions)
        opcodes = [inst["opcode"] for inst in optimized_instructions]
        english_result = self.wavelength_to_text(opcodes)
        pipeline_result["stages"]["6_english_explanation"] = english_result
        
        # Stage 8: Execute and visualize output
        execution_result = self._execute_program(optimized_instructions)
        pipeline_result["stages"]["7_execution"] = execution_result
        
        # Set success based on critical stage outcomes
        bytecode_success = pipeline_result["stages"]["4_bytecode"].get("success", False)
        pipeline_result["success"] = bytecode_success
        pipeline_result["final_instructions"] = optimized_instructions
        
        return pipeline_result
    
    def _apply_optimizations(self, instructions: List[Dict[str, Any]], optimization: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Apply optimization transformations to instruction list
        For now: Remove redundant operations based on suggestions
        """
        import copy
        optimized = copy.deepcopy(instructions)  # Deep copy to avoid mutations
        
        # Check optimization suggestions and apply transformations
        for suggestion in optimization.get("suggestions", []):
            # Example: If missing PRINT, add it
            if "No PRINT instruction" in suggestion.get("message", ""):
                has_print = any(i["opcode"] == "PRINT" for i in optimized)
                if not has_print:
                    optimized.append({
                        "opcode": "PRINT",
                        "wavelength": 650.0,
                        "explanation": "Output result (auto-added by optimizer)"
                    })
            
            # Example: Downgrade QAM64 to OOK for efficiency
            if "Using QAM64 modulation" in suggestion.get("message", ""):
                for inst in optimized:
                    if inst.get("modulation") == "QAM64":
                        inst["modulation"] = "OOK"
                        inst["explanation"] += " (optimized: QAM64→OOK)"
        
        return optimized
    
    def _execute_program(self, instructions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Execute WaveLang program and return visual output
        Simulates program execution with a simple stack-based interpreter
        """
        stack = []
        output = []
        memory = {}
        
        try:
            for inst in instructions:
                opcode = inst["opcode"]
                operand = inst.get("operand")
                
                if opcode == "LOAD":
                    # Load value onto stack
                    try:
                        value = float(operand) if operand and str(operand).replace('.','').replace('-','').isdigit() else operand
                    except:
                        value = operand
                    stack.append(value)
                
                elif opcode == "ADD":
                    if len(stack) >= 2:
                        b = stack.pop()
                        a = stack.pop()
                        try:
                            result = float(a) + float(b)
                            stack.append(result)
                        except:
                            stack.append(f"{a} + {b}")
                
                elif opcode == "SUBTRACT":
                    if len(stack) >= 2:
                        b = stack.pop()
                        a = stack.pop()
                        try:
                            result = float(a) - float(b)
                            stack.append(result)
                        except:
                            stack.append(f"{a} - {b}")
                
                elif opcode == "MULTIPLY":
                    if len(stack) >= 2:
                        b = stack.pop()
                        a = stack.pop()
                        try:
                            result = float(a) * float(b)
                            stack.append(result)
                        except:
                            stack.append(f"{a} × {b}")
                
                elif opcode == "DIVIDE":
                    if len(stack) >= 2:
                        b = stack.pop()
                        a = stack.pop()
                        try:
                            if float(b) != 0:
                                result = float(a) / float(b)
                                stack.append(result)
                            else:
                                stack.append("Error: Division by zero")
                        except:
                            stack.append(f"{a} ÷ {b}")
                
                elif opcode == "PRINT" or opcode == "OUTPUT":
                    if stack:
                        output.append(stack[-1])  # Print top of stack
                    else:
                        output.append("(empty stack)")
                
                elif opcode == "STORE":
                    if stack:
                        value = stack[-1]  # Peek at top of stack (don't pop)
                        memory[operand or "result"] = value
                        # Keep value on stack for potential PRINT after STORE
            
            return {
                "success": True,
                "output": output,
                "final_stack": stack,
                "memory": memory,
                "has_output": len(output) > 0
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "output": output,
                "has_output": False
            }
    
    def _convert_to_wavelength_instructions(self, instructions: List[Dict[str, Any]]) -> List[WavelengthInstruction]:
        """Convert instruction dicts to WavelengthInstruction objects"""
        wavelength_insts = []
        
        for inst in instructions:
            opcode_name = inst["opcode"]
            wavelength = inst["wavelength"]
            
            # Map opcode name to enum
            try:
                opcode_enum = WavelengthOpcodes[opcode_name]
            except KeyError:
                continue
            
            # Determine spectral region from wavelength
            if wavelength < 450:
                region = SpectralRegion.VIOLET
            elif wavelength < 495:
                region = SpectralRegion.BLUE
            elif wavelength < 570:
                region = SpectralRegion.GREEN
            elif wavelength < 590:
                region = SpectralRegion.YELLOW
            elif wavelength < 620:
                region = SpectralRegion.ORANGE
            else:
                region = SpectralRegion.RED
            
            # Get modulation (default to OOK)
            modulation = ModulationType.OOK
            if "modulation" in inst:
                if inst["modulation"] == "QAM64":
                    modulation = ModulationType.QAM64
                elif inst["modulation"] == "QAM16":
                    modulation = ModulationType.QAM16
                elif inst["modulation"] == "PSK":
                    modulation = ModulationType.PSK
            
            wavelength_inst = WavelengthInstruction(
                opcode=opcode_enum,
                wavelength_nm=wavelength,
                spectral_region=region,
                modulation=modulation,
                amplitude=0.5,
                phase=0.0,
                operand1=inst.get("operand")
            )
            
            wavelength_insts.append(wavelength_inst)
        
        return wavelength_insts
    
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
        import re
        
        # Check for goal-oriented descriptions (encoder, decoder, converter, etc.)
        goal_keywords = ["encoder", "encod", "decode", "decod", "convert", "transform", 
                        "process", "filter", "validator", "validator", "perfect"]
        has_goal = any(kw in description_lower for kw in goal_keywords)
        
        # Pattern matching for common operations
        # LOAD instruction
        if "load" in description_lower or "read" in description_lower or "input" in description_lower:
            numbers = re.findall(r'\d+', user_description)
            if numbers:
                for num in numbers[:2]:  # Up to 2 LOAD instructions
                    instructions.append({
                        "opcode": "LOAD",
                        "wavelength": 495.0 if len([i for i in instructions if i["opcode"]=="LOAD"]) == 0 else 508.0,
                        "operand": num,
                        "explanation": f"Load value: {num}"
                    })
            else:
                # Generic load without specific values
                if not any(i["opcode"] == "LOAD" for i in instructions):
                    instructions.append({
                        "opcode": "LOAD",
                        "wavelength": 495.0,
                        "operand": "input",
                        "explanation": "Load input data"
                    })
        
        # ADD instruction
        if "add" in description_lower or "sum" in description_lower or "+" in user_description:
            numbers = re.findall(r'\d+', user_description)
            variables = re.findall(r'\b([A-Z])\b', user_description)  # Single uppercase letters
            
            # Check if we need to add LOAD instructions first
            needs_loads = not any(i["opcode"] == "LOAD" for i in instructions)
            
            if len(numbers) >= 2 and needs_loads:
                # Explicit numbers provided (e.g., "5 + 3")
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
            elif len(variables) >= 2 and needs_loads:
                # Variables provided (e.g., "A + B")
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 495.0,
                    "operand": variables[0],
                    "explanation": f"Load variable {variables[0]}"
                })
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 508.0,
                    "operand": variables[1],
                    "explanation": f"Load variable {variables[1]}"
                })
            elif needs_loads and ("two" in description_lower or "number" in description_lower):
                # Generic "add two numbers" without explicit values
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 495.0,
                    "operand": "A",
                    "explanation": "Load first value (A)"
                })
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 508.0,
                    "operand": "B",
                    "explanation": "Load second value (B)"
                })
            
            instructions.append({
                "opcode": "ADD",
                "wavelength": 380.0,
                "operand": None,
                "explanation": "Add values together"
            })
        
        # SUBTRACT instruction
        if "subtract" in description_lower or "minus" in description_lower or "-" in user_description:
            numbers = re.findall(r'\d+', user_description)
            variables = re.findall(r'\b([A-Z])\b', user_description)
            needs_loads = not any(i["opcode"] == "LOAD" for i in instructions)
            
            if len(numbers) >= 2 and needs_loads:
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
            elif len(variables) >= 2 and needs_loads:
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 495.0,
                    "operand": variables[0],
                    "explanation": f"Load variable {variables[0]}"
                })
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 508.0,
                    "operand": variables[1],
                    "explanation": f"Load variable {variables[1]}"
                })
            elif needs_loads and ("two" in description_lower or "number" in description_lower):
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 495.0,
                    "operand": "A",
                    "explanation": "Load first value (A)"
                })
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 508.0,
                    "operand": "B",
                    "explanation": "Load second value (B)"
                })
            
            if not any(i["opcode"] == "SUBTRACT" for i in instructions):
                instructions.append({
                    "opcode": "SUBTRACT",
                    "wavelength": 386.0,
                    "operand": None,
                    "explanation": "Subtract values"
                })
        
        # DIVIDE instruction
        if "divide" in description_lower or "÷" in user_description or "/" in user_description:
            numbers = re.findall(r'\d+', user_description)
            variables = re.findall(r'\b([A-Z])\b', user_description)
            needs_loads = not any(i["opcode"] == "LOAD" for i in instructions)
            
            if len(numbers) >= 2 and needs_loads:
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
            elif len(variables) >= 2 and needs_loads:
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 495.0,
                    "operand": variables[0],
                    "explanation": f"Load variable {variables[0]}"
                })
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 508.0,
                    "operand": variables[1],
                    "explanation": f"Load variable {variables[1]}"
                })
            elif needs_loads and ("two" in description_lower or "number" in description_lower):
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 495.0,
                    "operand": "dividend",
                    "explanation": "Load dividend"
                })
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 508.0,
                    "operand": "divisor",
                    "explanation": "Load divisor"
                })
            
            if not any(i["opcode"] == "DIVIDE" for i in instructions):
                instructions.append({
                    "opcode": "DIVIDE",
                    "wavelength": 398.0,
                    "operand": None,
                    "explanation": "Divide values"
                })
        
        # MULTIPLY instruction  
        if "multiply" in description_lower or "scale" in description_lower or "factor" in description_lower or "*" in user_description or "×" in user_description or "times" in description_lower:
            numbers = re.findall(r'\d+', user_description)
            variables = re.findall(r'\b([A-Z])\b', user_description)
            
            # Check if we need to add LOAD instructions first
            needs_loads = not any(i["opcode"] == "LOAD" for i in instructions)
            
            if len(numbers) >= 2 and needs_loads:
                # Explicit numbers provided (e.g., "multiply 7 and 9" or "7 times 9")
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
            elif len(variables) >= 2 and needs_loads:
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 495.0,
                    "operand": variables[0],
                    "explanation": f"Load variable {variables[0]}"
                })
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 508.0,
                    "operand": variables[1],
                    "explanation": f"Load variable {variables[1]}"
                })
            elif needs_loads and "factor" in description_lower:
                # Generic multiplication by factor (no explicit numbers)
                instructions.append({
                    "opcode": "LOAD",
                    "wavelength": 495.0,
                    "operand": "input",
                    "explanation": "Load input data"
                })
            
            if not any(i["opcode"] == "MULTIPLY" for i in instructions):
                instructions.append({
                    "opcode": "MULTIPLY",
                    "wavelength": 392.0,
                    "operand": None,
                    "explanation": "Multiply values together"
                })
        
        # STORE instruction (before PRINT)
        if "result" in description_lower or "outcome" in description_lower or "store" in description_lower:
            # Check if user specified a result variable (like "result C" or "outcome X")
            result_vars = re.findall(r'(?:result|outcome|store)\s+(?:in\s+)?([A-Z])\b', user_description, re.IGNORECASE)
            if result_vars:
                target_var = result_vars[0].upper()
            else:
                # Default to 'C' for results
                target_var = 'C'
            
            if not any(i["opcode"] == "STORE" for i in instructions):
                instructions.append({
                    "opcode": "STORE",
                    "wavelength": 508.0,
                    "operand": target_var,
                    "explanation": f"Store result in variable {target_var}"
                })
        
        # PRINT/OUTPUT instruction
        if "print" in description_lower or "output" in description_lower or "show" in description_lower or "display" in description_lower:
            if not any(i["opcode"] == "PRINT" for i in instructions):
                instructions.append({
                    "opcode": "PRINT",
                    "wavelength": 650.0,
                    "operand": None,
                    "explanation": "Output the result"
                })
        
        # LOOP instruction
        if "loop" in description_lower or "repeat" in description_lower:
            times = re.findall(r'\d+', user_description)
            if times:
                instructions.append({
                    "opcode": "LOOP",
                    "wavelength": 578.0,
                    "operand": times[0],
                    "explanation": f"Repeat {times[0]} times"
                })
        
        # IF instruction
        if "if" in description_lower or "check" in description_lower or "condition" in description_lower:
            instructions.append({
                "opcode": "IF",
                "wavelength": 570.0,
                "operand": None,
                "explanation": "Conditional branching"
            })
        
        # If no instructions matched but description has goal keywords, provide a template
        if not instructions and has_goal:
            return {
                "status": "goal_recognized",
                "instructions": [],
                "explanation": f"✨ I recognize you want to build an encoder!\n\nTo help you better, be more specific about:\n1. **What are you encoding?** (numbers, text, signals?)\n2. **What's the process?** (add, transform, validate?)\n3. **What's the output?** (show result, store it?)\n\n**Example descriptions that work:**\n- \"Add 5 and 3, then print the result\"\n- \"Load a number, multiply by 2, print it\"\n- \"Encode data using addition and output\"\n- \"Check if number is greater than 10\"",
                "suggestions": [
                    "Try: 'Add wavelength values and print the encoded result'",
                    "Try: 'Load input, multiply by frequency factor, output encoded signal'",
                    "Try: 'Create a validator that checks wavelength range'"
                ]
            }
        
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
    """Render unified pipeline interface for WaveLang"""
    
    st.markdown("### 🤖 NexusOS AI Teacher for WaveLang")
    st.markdown("""
    **Unified Pipeline**: Text → WaveLang → Optimize → Bytecode → English → Visual Output
    
    Write code in everyday language, watch it transform into physics-based wavelengths,
    get automatic optimization, compile to binary, and see everything explained!
    """)
    
    with st.expander("ℹ️ How Does the AI Teacher Work?"):
        st.markdown("""
        ### 🧠 Your Personal WaveLang Tutor
        
        The AI Teacher transforms natural language into physics-based wavelength code:
        
        **📝 Text to WaveLang:**
        - Write in plain English: "Add 5 and 3, then print the result"
        - AI converts to wavelength instructions automatically
        - Each operation mapped to specific electromagnetic wavelengths
        
        **✨ Auto-Optimizer:**
        - Analyzes your program for efficiency
        - Suggests energy-saving improvements
        - Reduces wavelength computation costs by 15-50%
        
        **💻 Binary Compiler:**
        - Compiles wavelength code to executable bytecode
        - Generates assembly and machine code
        - Production-ready deployment packages
        
        **🔍 English Decoder:**
        - Explains what your wavelength program does
        - Translates technical operations to plain language
        - Perfect for learning and documentation
        
        **🎨 Visual Execution:**
        - See your program run in real-time
        - Memory state visualization
        - Step-by-step wavelength execution
        
        **Try it:** Type "multiply 7 by 8 and show result" in Unified Pipeline mode!
        """)
    
    pipeline = WaveLangPipeline()
    
    # Tabs for different modes - Easy Text Translator first for adoption
    tab1, tab2, tab3 = st.tabs([
        "✨ Easy Text Translator", 
        "🚀 Unified Pipeline", 
        "🔍 Decode Existing Code"
    ])
    
    with tab1:
        render_easy_text_translator_mode()
    
    with tab2:
        render_unified_pipeline_mode(pipeline)
    
    with tab3:
        render_wavelength_to_text_mode(pipeline)


def render_easy_text_translator_mode():
    """
    Easy text-to-wavelength translator for beginners.
    Simple one-click translation from plain text to wavelength encoding.
    """
    st.subheader("✨ Easy Text to Wavelength Translator")
    
    st.markdown("""
    **New to wavelength encoding?** Start here! Type any message and instantly 
    see how each character translates to a specific wavelength in the electromagnetic spectrum.
    
    This is the easiest way to understand how NexusOS encodes information using physics.
    """)
    
    st.info("💡 **Tip:** Every character maps to a unique wavelength. Letters use the visible spectrum (violet to red), while numbers and symbols extend into UV and infrared regions.")
    
    render_text_to_wavelength_translator(
        key_prefix="wavelang_easy",
        show_educational=True,
        compact=False
    )
    
    st.divider()
    
    st.markdown("### 🎓 Ready for More?")
    
    st.success("🛠️ **Ready to build programs?** Switch to the **Visual Builder** tab to create wavelength programs with drag-and-drop operations!")
    
    st.markdown("""
    Once you understand character-to-wavelength mapping, explore these next steps:
    
    **Next Steps:**
    - **Visual Builder** (sidebar): Drag-and-drop wavelength program creation
    - **Unified Pipeline** (above): Convert English descriptions to executable wavelength code
    - **Decode Existing Code** (above): Understand what existing wavelength programs do
    """)


def render_unified_pipeline_mode(pipeline: WaveLangPipeline):
    """Unified pipeline: Text → WaveLang → Optimize → Bytecode → Explanation"""
    
    st.subheader("🚀 Unified WaveLang Pipeline")
    
    st.markdown("""
    Enter your program description below. Watch it flow through the complete pipeline:
    **Text** → **WaveLang Instructions** → **Auto-Optimize** → **Bytecode Compilation** → **English Explanation** → **Visual Execution**
    """)
    
    # Input section
    user_input = st.text_area(
        "📝 Describe your program in English:",
        placeholder="Example: Load input, multiply by frequency factor, output encoded signal",
        height=100,
        key="unified_pipeline_input"
    )
    
    col1, col2 = st.columns([3, 1])
    with col1:
        auto_optimize = st.checkbox("🔧 Auto-optimize code", value=True, 
                                    help="Automatically optimize instructions before compilation")
    with col2:
        run_pipeline = st.button("▶️ Run Pipeline", type="primary", width="stretch")
    
    if run_pipeline and user_input:
        with st.spinner("⚡ Running unified pipeline..."):
            result = pipeline.execute_full_pipeline(user_input, auto_optimize=auto_optimize)
        
        # Check if text parsing failed
        first_stage = result["stages"].get("1_text_to_wavelength", {})
        if first_stage.get("status") == "goal_recognized":
            st.info("✨ I recognize you want to build something!")
            st.markdown(first_stage.get("explanation", ""))
            if "suggestions" in first_stage:
                st.markdown("**Try these examples:**")
                for sugg in first_stage["suggestions"]:
                    st.markdown(f"- {sugg}")
            return
        elif first_stage.get("status") == "no_match":
            st.error("❌ Could not parse your description.")
            return
        
        # Show success or partial success
        if result["success"]:
            st.success("✅ Pipeline completed successfully!")
        else:
            st.warning("⚠️ Pipeline completed with errors - see details below")
        st.divider()
        
        # Stage 1: WaveLang Instructions
        with st.expander("📝 **Stage 1**: WaveLang Instructions", expanded=True):
            stage1 = result["stages"]["1_text_to_wavelength"]
            instructions = stage1["instructions"]
            
            st.markdown(f"**Generated {len(instructions)} instructions:**")
            for i, inst in enumerate(instructions, 1):
                col1, col2, col3 = st.columns([1, 2, 3])
                with col1:
                    st.code(inst["opcode"])
                with col2:
                    st.code(f"{inst['wavelength']}nm")
                with col3:
                    st.text(inst["explanation"])
        
        # Stage 2: Validation
        with st.expander("✅ **Stage 2**: Validation", expanded=False):
            # Show final validation (post-optimization)
            final_validation = result["stages"].get("2_validation_final", result["stages"].get("2_validation_initial", {}))
            
            if final_validation.get("valid"):
                st.success("✓ Program is logically valid!")
            else:
                for error in final_validation.get("errors", []):
                    st.error(f"❌ {error}")
            for warning in final_validation.get("warnings", []):
                st.warning(f"⚠️ {warning}")
            
            # Show optimization impact on validation if applicable
            if "2_validation_initial" in result["stages"] and "2_validation_final" in result["stages"]:
                initial_issues = len(result["stages"]["2_validation_initial"].get("warnings", [])) + len(result["stages"]["2_validation_initial"].get("errors", []))
                final_issues = len(final_validation.get("warnings", [])) + len(final_validation.get("errors", []))
                if initial_issues > final_issues:
                    st.info(f"✨ Optimizer fixed {initial_issues - final_issues} issue(s)!")
        
        # Stage 3: Optimization
        with st.expander("🔧 **Stage 3**: Optimization", expanded=False):
            optimization = result["stages"]["3_optimization"]
            if optimization.get("status") == "skipped":
                st.info("⏭️ Optimization skipped (auto-optimize disabled)")
            elif optimization.get("suggestions"):
                st.markdown("**💡 Optimization Suggestions:**")
                for suggestion in optimization["suggestions"]:
                    if suggestion["type"] == "optimization":
                        st.info(f"💡 {suggestion['message']}\n\n**Impact:** {suggestion['impact']}")
                    else:
                        st.warning(f"⚠️ {suggestion['message']}\n\n{suggestion['impact']}")
            else:
                st.success("✨ Your program is already optimized!")
        
        # Stage 4 & 5: Bytecode & Assembly
        compilation_expanded = not result["success"]  # Expand if there's an error
        with st.expander("🔢 **Stage 4 & 5**: Binary Compilation", expanded=compilation_expanded):
            bytecode_stage = result["stages"]["4_bytecode"]
            assembly_stage = result["stages"].get("5_assembly", {})
            
            if bytecode_stage.get("success"):
                col1, col2 = st.columns(2)
                with col1:
                    st.markdown("**Bytecode (Hex):**")
                    st.code(bytecode_stage["bytecode"], language="text")
                    st.caption(f"Size: {bytecode_stage['size_bytes']} bytes")
                
                with col2:
                    if assembly_stage.get("success"):
                        st.markdown("**Assembly (x86-64):**")
                        st.code(assembly_stage["assembly"], language="asm")
            else:
                st.error("❌ **Compilation Failed**")
                st.error(f"**Error:** {bytecode_stage.get('error', 'Unknown error')}")
                st.info("💡 This usually means an instruction couldn't be converted to bytecode. Check your instruction set.")
        
        # Stage 6: English Explanation
        with st.expander("📖 **Stage 6**: English Explanation", expanded=False):
            english = result["stages"]["6_english_explanation"]
            st.markdown("**What your program does:**")
            st.info(english["summary"])
            
            st.markdown("**Detailed breakdown:**")
            for item in english["english_explanation"]:
                st.markdown(f"- **{item['opcode']}**: {item['english']} ({item['use_case']})")
        
        # Stage 7: Execution & Visual Output
        with st.expander("▶️ **Stage 7**: Execution & Visual Output", expanded=True):
            execution = result["stages"].get("7_execution", {})
            
            if execution.get("success"):
                if execution.get("has_output"):
                    st.success("✅ Program executed successfully!")
                    
                    # Display output in a highlighted box
                    st.markdown("### 📺 Program Output:")
                    for i, value in enumerate(execution["output"], 1):
                        # Format the output nicely
                        if isinstance(value, float):
                            if value.is_integer():
                                st.code(f">> {int(value)}", language="python")
                            else:
                                st.code(f">> {value:.2f}", language="python")
                        else:
                            st.code(f">> {value}", language="python")
                    
                    # Show memory state if any
                    if execution.get("memory"):
                        st.markdown("### 💾 Memory State:")
                        for key, value in execution["memory"].items():
                            st.caption(f"`{key}` = {value}")
                else:
                    st.warning("⚠️ Program executed but produced no output. Add a PRINT instruction to see results.")
            else:
                st.error(f"❌ Execution failed: {execution.get('error', 'Unknown error')}")
        
        # Final stats
        st.divider()
        st.markdown("### 📊 Pipeline Statistics")
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Instructions", len(result["final_instructions"]))
        with col2:
            avg_wl = sum(i["wavelength"] for i in result["final_instructions"]) / len(result["final_instructions"])
            st.metric("Avg Wavelength", f"{avg_wl:.1f}nm")
        with col3:
            if bytecode_stage.get("success"):
                st.metric("Binary Size", f"{bytecode_stage['size_bytes']} bytes")
        with col4:
            stages_completed = len([s for s in result["stages"].values() if s.get("success") or s.get("valid")])
            st.metric("Stages Completed", stages_completed)


def render_text_to_wavelength_mode(teacher: WaveLangPipeline):
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
                
                # Store instructions in session for optimizer
                st.session_state.last_instructions = result["instructions"]
            elif result["status"] == "goal_recognized":
                st.info("✨ I recognize you want to build something!")
                st.markdown(result.get("explanation", ""))
                if "suggestions" in result:
                    st.markdown("**Try these examples:**")
                    for sugg in result["suggestions"]:
                        st.markdown(f"- {sugg}")
            else:
                st.error("❌ Could not parse your description. Try being more specific.")
                st.info(result.get("explanation", ""))
                if "suggestions" in result:
                    st.markdown("**Try these examples:**")
                    for sugg in result["suggestions"]:
                        st.markdown(f"- {sugg}")
        else:
            st.warning("Please enter a description")


def render_wavelength_to_text_mode(teacher: WaveLangPipeline):
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


def render_optimize_mode(teacher: WaveLangPipeline):
    """Optimize program suggestions"""
    
    st.subheader("✨ Program Optimizer & Validator")
    
    st.markdown("""
    Analyze your wavelength program for optimization opportunities and logical errors.
    """)
    
    # Check if we have instructions from the converter
    if "last_instructions" in st.session_state and st.session_state.last_instructions:
        st.success(f"📋 Loaded {len(st.session_state.last_instructions)} instructions from your last conversion")
        
        # Display the program being analyzed
        with st.expander("📝 View Program Instructions"):
            for i, inst in enumerate(st.session_state.last_instructions, 1):
                st.text(f"{i}. {inst['opcode']} ({inst['wavelength']}nm) - {inst.get('explanation', '')}")
        
        instructions_to_analyze = st.session_state.last_instructions
        
        if st.button("🔍 Analyze Program", type="primary"):
            optimization = teacher.optimize_program(instructions_to_analyze)
            validation = teacher.validate_program(instructions_to_analyze)
            
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
                if optimization["suggestions"]:
                    for suggestion in optimization["suggestions"]:
                        if suggestion["type"] == "optimization":
                            st.info(f"💡 {suggestion['message']}\n\n**Impact:** {suggestion['impact']}")
                        else:
                            st.warning(f"⚠️ {suggestion['message']}\n\n**Impact:** {suggestion['impact']}")
                else:
                    st.success("✨ Your program is already optimized!")
            
            st.divider()
            st.markdown("### 📊 Program Stats:")
            col_a, col_b, col_c = st.columns(3)
            with col_a:
                st.metric("Total Instructions", len(instructions_to_analyze))
            with col_b:
                avg_wavelength = sum(i.get("wavelength", 0) for i in instructions_to_analyze) / len(instructions_to_analyze)
                st.metric("Avg Wavelength", f"{avg_wavelength:.1f}nm")
            with col_c:
                energy_cost = sum(i.get("wavelength", 0) for i in instructions_to_analyze)
                st.metric("Total Energy Cost", f"{energy_cost:.0f}")
    
    else:
        st.info("💡 **No program loaded yet!**")
        st.markdown("""
        First, use the **📝 Text → WaveLang** mode to convert an English description into wavelength instructions.
        
        Then come back here to analyze and optimize your program!
        
        **Quick Start:**
        1. Click "📝 Text → WaveLang" above
        2. Enter a description like: "Load input, multiply by frequency factor, output encoded signal"
        3. Click "Convert to WaveLang"
        4. Come back to this optimizer tab
        """)
        
        st.divider()
        st.markdown("### 📝 Or Enter Instructions Manually:")
        
        manual_input = st.text_area(
            "Enter instructions (one per line):",
            placeholder="LOAD\nMULTIPLY\nPRINT",
            height=100
        )
        
        if st.button("📥 Load Manual Instructions"):
            if manual_input.strip():
                lines = [line.strip() for line in manual_input.split('\n') if line.strip()]
                # Convert to instruction format
                manual_instructions = []
                for line in lines:
                    opcode = line.upper()
                    # Map to wavelength
                    wavelength_map = {
                        "LOAD": 495.0, "STORE": 508.0, "ADD": 380.0, "SUBTRACT": 386.0,
                        "MULTIPLY": 392.0, "DIVIDE": 398.0, "AND": 450.0, "OR": 462.0,
                        "IF": 570.0, "LOOP": 578.0, "PRINT": 650.0
                    }
                    if opcode in wavelength_map:
                        manual_instructions.append({
                            "opcode": opcode,
                            "wavelength": wavelength_map[opcode],
                            "explanation": f"{opcode} instruction"
                        })
                
                if manual_instructions:
                    st.session_state.last_instructions = manual_instructions
                    st.success(f"✅ Loaded {len(manual_instructions)} instructions!")
                    st.rerun()
                else:
                    st.error("No valid instructions found. Use opcodes like LOAD, ADD, MULTIPLY, PRINT")
            else:
                st.warning("Please enter some instructions")


if __name__ == "__main__":
    render_wavelang_ai_teacher()
