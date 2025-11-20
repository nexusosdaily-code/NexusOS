# WaveLang Beginner's Guide: Write Code with Light Wavelengths

## 🎯 What is WaveLang?

Instead of typing traditional code like `result = 5 + 3`, WaveLang lets you write instructions as **wavelengths of light**. Each operation is a different color:

- **Red light (650nm)** = Print something
- **Blue light (450nm)** = Logic operations (AND, OR)
- **Green light (495nm)** = Load data from memory
- **Violet light (380nm)** = Math operations (ADD, MULTIPLY)

## 🚀 Getting Started in 3 Steps

### Step 1: Access the WaveLang Dashboard
1. Open your NexusOS app
2. Navigate to the **"Wavelength Code"** tab
3. You'll see 4 sections: Concepts, Examples, Analysis, and Instruction Set

### Step 2: Understand the 7 Core Concepts

#### 1. **Spectral Regions** (Which section of code?)
```
Violet (380nm)    → Math (ADD, SUBTRACT, MULTIPLY)
Blue (450nm)      → Logic (AND, OR, NOT)
Green (495nm)     → Memory (LOAD, STORE)
Yellow (570nm)    → Control Flow (IF, LOOP)
Orange (590nm)    → Functions (CALL, RETURN)
Red (650nm)       → Input/Output (PRINT, INPUT)
```

#### 2. **Wavelengths** (What specific operation?)
Each operation has its own exact wavelength:
- `ADD = 380.0 nm` (violet light)
- `MULTIPLY = 392.0 nm` (still violet)
- `LOAD = 495.0 nm` (green light)
- `PRINT = 650.0 nm` (red light)

#### 3. **Amplitude** (How important is this?)
- `0.5` = Low priority (can wait)
- `0.8` = Normal priority
- `1.0` = High priority (run first)

#### 4. **Phase** (What kind of branching?)
```
0°   (0 radians)      → Do this normally
90°  (π/2 radians)    → Do this IF true
180° (π radians)      → Do this IF false
270° (3π/2 radians)   → Do this in a LOOP
```

#### 5. **Modulation** (How complex?)
- `OOK` = Simple (1 bit per symbol)
- `PSK` = Medium (2 bits per symbol)
- `QAM16` = Complex (4 bits per symbol)
- `QAM64` = Very complex (6 bits per symbol)

#### 6. **E=hf Energy** (How much does it cost?)
Quantum energy = `E = h × f`
- Red light (650nm) = Lower frequency = Cheaper to run
- Violet light (380nm) = Higher frequency = More expensive to run

#### 7. **DAG** (What depends on what?)
Parent messages = Dependencies. If function A needs function B's result, B is the "parent".

---

## 💡 Your First Program: Simple Addition

Let's create a program that adds 5 + 3:

```python
from wavelength_code_generator import WavelengthCodeGenerator

# Create a code generator
gen = WavelengthCodeGenerator()

# Create an ADD function
add_func = gen.create_arithmetic_function(
    name="my_addition",
    operation="add",
    param1=5,
    param2=3,
    amplitude=0.8  # Normal priority
)

# Register it (save it to your program)
gen.register_function(add_func)

# View the result
summary = gen.get_program_summary()
print(f"✅ Program created with {summary['function_count']} function")
print(f"Total instructions: {summary['total_instructions']}")
print(f"Total energy cost: {summary['total_energy_joules']:.2e} Joules")
```

**What happens inside:**
1. **LOAD** (495nm, Green) - Load the number 5
2. **LOAD** (508nm, Green) - Load the number 3
3. **ADD** (380nm, Violet) - Add them together
4. **RETURN** (600nm, Orange) - Return the result (8)

---

## 🔄 Second Program: Conditional Logic (IF/ELSE)

Create a function that checks a condition:

```python
# Create conditional function
if_func = gen.create_conditional_function(
    name="my_check",
    condition_wavelength=450.0  # Blue (logic)
)

gen.register_function(if_func)
```

**The phase encoding:**
- Phase = 90° → Execute the TRUE branch
- Phase = 180° → Execute the FALSE branch

**Inside the program:**
1. **LOAD** (495nm) - Load the condition
2. **IF** (570nm, Phase=90°) - Check if true
3. **OUTPUT** (635nm) - Print "true"
4. **IF** (570nm, Phase=180°) - Check if false
5. **OUTPUT** (635nm) - Print "false"

---

## 🔁 Third Program: Loops

Create a function that counts from 0 to N:

```python
# Create loop function
loop_func = gen.create_loop_function(
    name="my_counter",
    iterations=5  # Count 0, 1, 2, 3, 4
)

gen.register_function(loop_func)
```

**How loops work with wavelengths:**
- Phase = 270° → This is a LOOP
- Amplitude = Higher amplitude = Higher priority = More iterations
- E=hf = Quantum energy budget determines how many times to loop

**Inside:**
1. **LOAD** (495nm) - Load counter = 0
2. **LOOP** (578nm, Phase=270°) - Start loop
3. **ADD** (380nm) - Increment counter
4. **PRINT** (650nm) - Print current value
5. **BREAK** (586nm) - Check if done
6. **RETURN** (600nm) - Exit

---

## 📊 Viewing Your Program

Once you create functions, see them on the dashboard:

### **Concepts Tab**
- Learn what each region means
- Understand phase-based branching
- See how E=hf affects execution

### **Examples Tab**
1. Select a function from the dropdown
2. See all its instructions in a table:
   - Wavelength (nm)
   - Spectral region (color)
   - Operation (ADD, LOAD, etc.)
   - Modulation (OOK, PSK, QAM16, QAM64)
   - Amplitude (priority)
   - Phase (0°, 90°, 180°, 270°)
   - Cost in NXT

### **Analysis Tab**
- Total energy your program uses
- How much each function costs
- Breakdown by spectral region

### **Instruction Set Tab**
- Complete reference of all 20 opcodes
- Their wavelengths
- Their spectral regions

---

## 🎨 Real Example: Fibonacci Sequence

Fibonacci generates: 0, 1, 1, 2, 3, 5, 8, 13...

```python
# Create Fibonacci function
fib_func = gen.create_complex_algorithm("fibonacci")
gen.register_function(fib_func)
```

**How it works in wavelengths:**
```
Initialize:
  a = 0, b = 1
  
Loop 5 times:
  temp = a + b
  a = b
  b = temp
  Print b
```

**In wavelengths:**
1. **LOAD** (495nm) - Load a=0
2. **LOAD** (508nm) - Load b=1
3. **LOOP** (578nm) - Start loop
4. **ADD** (380nm) - Calculate a+b
5. **STORE** (521nm) - Save to memory
6. **OUTPUT** (635nm) - Print result
7. **BREAK** (586nm) - Check if done
8. **RETURN** (600nm) - Exit

---

## 🔧 Modifying a Program

Want to change your addition to multiplication?

```python
# Create multiplication instead
mult_func = gen.create_arithmetic_function(
    name="my_multiplication",
    operation="multiply",  # ← Change from "add" to "multiply"
    param1=4,
    param2=7,
    amplitude=0.9  # Slightly higher priority
)

gen.register_function(mult_func)
```

**The only difference:**
- ADD uses wavelength **380.0 nm** (violet)
- MULTIPLY uses wavelength **392.0 nm** (still violet, but slightly different)

---

## 💰 Understanding Energy Cost

Every instruction costs quantum energy:

```
E = h × f  (where h=Planck's constant, f=frequency)

Red (650nm):    Lower frequency = Lower cost
Violet (380nm): Higher frequency = Higher cost

Example:
- 10 PRINT instructions (red): Cheap
- 10 ADD instructions (violet): More expensive
```

---

## 🚀 Quick Checklist: Your First Wavelength Program

- [ ] Open NexusOS and find "Wavelength Code" section
- [ ] Read the Concepts tab (5 minutes)
- [ ] Create an addition function using the code example
- [ ] View it in the Examples tab
- [ ] Check its cost in the Analysis tab
- [ ] Try creating a loop or conditional
- [ ] Compare energy costs between functions

---

## ❓ FAQ for Beginners

**Q: Why use wavelengths instead of regular code?**
A: It's fun! It also connects computation to physics. Every instruction has real quantum properties.

**Q: Which wavelength should I use?**
A: Use the suggested ones in the examples. They're already optimized for each operation type.

**Q: Can I mix different modulation types?**
A: Yes! But higher modulation (QAM64) costs more energy. Start with OOK or PSK.

**Q: What happens if I use amplitude=1.0?**
A: Your instruction runs with highest priority. Good for critical operations.

**Q: How do I know if my program is good?**
A: Check the Analysis tab. If energy is low and instructions are efficient, it's good!

---

## 🎓 Next Steps

1. **Master the basics**: Create 5+ functions using the examples
2. **Understand energy**: Compare costs of different wavelengths
3. **Learn phases**: Build programs with IF/ELSE and LOOP
4. **Build complex algorithms**: Create your own Fibonacci or other algorithms
5. **Integrate with WNSP**: Send your wavelength programs as WNSP messages!

Good luck! 🌊✨
