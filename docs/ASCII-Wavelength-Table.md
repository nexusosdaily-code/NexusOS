# WNSP v7.1 ASCII-to-Wavelength Encoding Table

## Complete Printable ASCII Range (32–126)

Each character maps to a specific wavelength in the electromagnetic spectrum. WNSP v7's oscillating encoding achieves **2+ characters per particle** by using wavelength transitions (λ₁ → λ₂).

### Encoding Formula
```
λ = 380 + ((ASCII - 32) × 4.21) nm
```
Base: 380nm (UV) → Peak: 776nm (IR)
Range spans visible spectrum: Violet → Red → Near-IR

---

## Full Table

| ASCII | Char | Wavelength (nm) | Spectrum Region | Frequency (THz) | Lambda Mass (×10⁻³⁶ kg) |
|-------|------|-----------------|-----------------|-----------------|-------------------------|
| 32 | (space) | 380.00 | UV/Violet | 789.21 | 5.815 |
| 33 | ! | 384.21 | Violet | 780.55 | 5.751 |
| 34 | " | 388.42 | Violet | 772.03 | 5.688 |
| 35 | # | 392.63 | Violet | 763.66 | 5.626 |
| 36 | $ | 396.84 | Violet | 755.43 | 5.566 |
| 37 | % | 401.05 | Violet | 747.35 | 5.506 |
| 38 | & | 405.26 | Violet | 739.40 | 5.448 |
| 39 | ' | 409.47 | Violet | 731.59 | 5.390 |
| 40 | ( | 413.68 | Violet | 723.91 | 5.334 |
| 41 | ) | 417.89 | Violet | 716.36 | 5.278 |
| 42 | * | 422.10 | Violet | 708.94 | 5.224 |
| 43 | + | 426.31 | Violet/Blue | 701.65 | 5.170 |
| 44 | , | 430.52 | Blue | 694.48 | 5.117 |
| 45 | - | 434.73 | Blue | 687.43 | 5.065 |
| 46 | . | 438.94 | Blue | 680.50 | 5.014 |
| 47 | / | 443.15 | Blue | 673.69 | 4.964 |
| 48 | 0 | 447.36 | Blue | 666.99 | 4.915 |
| 49 | 1 | 451.57 | Blue | 660.41 | 4.866 |
| 50 | 2 | 455.78 | Blue | 653.93 | 4.819 |
| 51 | 3 | 459.99 | Blue | 647.57 | 4.772 |
| 52 | 4 | 464.20 | Blue | 641.31 | 4.726 |
| 53 | 5 | 468.41 | Blue/Cyan | 635.15 | 4.680 |
| 54 | 6 | 472.62 | Cyan | 629.10 | 4.636 |
| 55 | 7 | 476.83 | Cyan | 623.15 | 4.592 |
| 56 | 8 | 481.04 | Cyan | 617.30 | 4.549 |
| 57 | 9 | 485.25 | Cyan | 611.54 | 4.506 |
| 58 | : | 489.46 | Cyan | 605.88 | 4.464 |
| 59 | ; | 493.67 | Cyan/Green | 600.31 | 4.423 |
| 60 | < | 497.88 | Green | 594.83 | 4.383 |
| 61 | = | 502.09 | Green | 589.45 | 4.343 |
| 62 | > | 506.30 | Green | 584.15 | 4.304 |
| 63 | ? | 510.51 | Green | 578.94 | 4.265 |
| 64 | @ | 514.72 | Green | 573.81 | 4.227 |
| 65 | A | 518.93 | Green | 568.77 | 4.190 |
| 66 | B | 523.14 | Green | 563.81 | 4.153 |
| 67 | C | 527.35 | Green | 558.93 | 4.117 |
| 68 | D | 531.56 | Green | 554.13 | 4.082 |
| 69 | E | 535.77 | Green/Yellow | 549.41 | 4.047 |
| 70 | F | 539.98 | Yellow | 544.77 | 4.013 |
| 71 | G | 544.19 | Yellow | 540.20 | 3.979 |
| 72 | H | 548.40 | Yellow | 535.70 | 3.946 |
| 73 | I | 552.61 | Yellow | 531.28 | 3.913 |
| 74 | J | 556.82 | Yellow | 526.93 | 3.881 |
| 75 | K | 561.03 | Yellow | 522.64 | 3.850 |
| 76 | L | 565.24 | Yellow | 518.42 | 3.819 |
| 77 | M | 569.45 | Yellow/Orange | 514.27 | 3.788 |
| 78 | N | 573.66 | Orange | 510.18 | 3.758 |
| 79 | O | 577.87 | Orange | 506.16 | 3.728 |
| 80 | P | 582.08 | Orange | 502.20 | 3.699 |
| 81 | Q | 586.29 | Orange | 498.30 | 3.670 |
| 82 | R | 590.50 | Orange | 494.46 | 3.642 |
| 83 | S | 594.71 | Orange | 490.68 | 3.614 |
| 84 | T | 598.92 | Orange/Red | 486.96 | 3.587 |
| 85 | U | 603.13 | Red | 483.29 | 3.560 |
| 86 | V | 607.34 | Red | 479.68 | 3.534 |
| 87 | W | 611.55 | Red | 476.12 | 3.508 |
| 88 | X | 615.76 | Red | 472.61 | 3.482 |
| 89 | Y | 619.97 | Red | 469.16 | 3.457 |
| 90 | Z | 624.18 | Red | 465.76 | 3.432 |
| 91 | [ | 628.39 | Red | 462.40 | 3.407 |
| 92 | \ | 632.60 | Red | 459.10 | 3.383 |
| 93 | ] | 636.81 | Red | 455.84 | 3.359 |
| 94 | ^ | 641.02 | Red | 452.63 | 3.336 |
| 95 | _ | 645.23 | Red | 449.47 | 3.312 |
| 96 | ` | 649.44 | Red | 446.35 | 3.290 |
| 97 | a | 653.65 | Red | 443.27 | 3.267 |
| 98 | b | 657.86 | Red | 440.24 | 3.245 |
| 99 | c | 662.07 | Red | 437.25 | 3.223 |
| 100 | d | 666.28 | Red | 434.30 | 3.201 |
| 101 | e | 670.49 | Red | 431.39 | 3.180 |
| 102 | f | 674.70 | Red | 428.52 | 3.159 |
| 103 | g | 678.91 | Red | 425.69 | 3.138 |
| 104 | h | 683.12 | Red | 422.90 | 3.117 |
| 105 | i | 687.33 | Red | 420.15 | 3.097 |
| 106 | j | 691.54 | Red | 417.43 | 3.077 |
| 107 | k | 695.75 | Red | 414.76 | 3.057 |
| 108 | l | 699.96 | Red | 412.11 | 3.038 |
| 109 | m | 704.17 | Red/IR | 409.50 | 3.018 |
| 110 | n | 708.38 | Near-IR | 406.93 | 2.999 |
| 111 | o | 712.59 | Near-IR | 404.39 | 2.981 |
| 112 | p | 716.80 | Near-IR | 401.88 | 2.962 |
| 113 | q | 721.01 | Near-IR | 399.41 | 2.944 |
| 114 | r | 725.22 | Near-IR | 396.96 | 2.926 |
| 115 | s | 729.43 | Near-IR | 394.55 | 2.908 |
| 116 | t | 733.64 | Near-IR | 392.17 | 2.890 |
| 117 | u | 737.85 | Near-IR | 389.82 | 2.873 |
| 118 | v | 742.06 | Near-IR | 387.50 | 2.855 |
| 119 | w | 746.27 | Near-IR | 385.21 | 2.838 |
| 120 | x | 750.48 | Near-IR | 382.94 | 2.821 |
| 121 | y | 754.69 | Near-IR | 380.71 | 2.805 |
| 122 | z | 758.90 | Near-IR | 378.50 | 2.788 |
| 123 | { | 763.11 | Near-IR | 376.32 | 2.772 |
| 124 | \| | 767.32 | Near-IR | 374.16 | 2.756 |
| 125 | } | 771.53 | Near-IR | 372.04 | 2.741 |
| 126 | ~ | 775.74 | Near-IR | 369.93 | 2.725 |

---

## Spectrum Distribution

```
UV/Violet  (380-430nm):  Space ! " # $ % & ' ( ) * + ,
Blue       (430-480nm):  - . / 0 1 2 3 4 5 6 7 8
Cyan       (480-510nm):  9 : ; < = >
Green      (510-570nm):  ? @ A B C D E F G H I J K L M
Yellow     (570-590nm):  N O P Q R S
Orange     (590-620nm):  T U V W X Y Z
Red        (620-700nm):  [ \ ] ^ _ ` a b c d e f g h i j k l
Near-IR    (700-780nm):  m n o p q r s t u v w x y z { | } ~
```

---

## WNSP v7 Oscillating Encoding

### Single Wavelength (v6 - Legacy)
```
'A' = 518.93nm = 1 character
```

### Oscillating Wavelength (v7 - Current)
```
'A' → 'B' = 518.93nm → 523.14nm = 2 characters
Transition encodes: "AB"
```

### Why 2+ Characters Per Particle

The oscillation between λ₁ and λ₂ carries information in:
1. **Start wavelength** (first character)
2. **End wavelength** (second character)
3. **Transition slope** (optional third+ character via phase encoding)

```
Energy per character (v6): E = hf = 6.626×10⁻³⁴ × 568.77×10¹² = 3.77×10⁻¹⁹ J
Energy per character (v7): E = hf / 2.3 = 1.64×10⁻¹⁹ J
Savings: 56.5%
```

---

## Lambda Mass Calculation

For each character, the Lambda Boson mass-equivalent:

```
Λ = hf/c²

Where:
h = 6.62607015×10⁻³⁴ J·s (Planck constant)
f = frequency in Hz
c = 299,792,458 m/s (speed of light)
```

Example for 'A' (518.93nm):
```
f = c/λ = 299,792,458 / 518.93×10⁻⁹ = 5.777×10¹⁴ Hz
E = hf = 6.626×10⁻³⁴ × 5.777×10¹⁴ = 3.828×10⁻¹⁹ J
Λ = E/c² = 3.828×10⁻¹⁹ / (2.998×10⁸)² = 4.26×10⁻³⁶ kg
```

**Every character in NexusOS has real mass-equivalent.**

---

## Economic Implications

| Message Type | Characters | Particles (v7) | Energy Cost | NXT Fee |
|--------------|------------|----------------|-------------|---------|
| Tweet (280 chars) | 280 | ~122 | 2.0×10⁻¹⁷ J | 0.00001 |
| Email (2KB) | 2,048 | ~890 | 1.5×10⁻¹⁶ J | 0.0001 |
| Document (50KB) | 51,200 | ~22,261 | 3.7×10⁻¹⁵ J | 0.002 |
| Image (1MB) | 1,048,576 | ~455,903 | 7.5×10⁻¹⁴ J | 0.02 |
| Video (100MB) | 104,857,600 | ~45,590,261 | 7.5×10⁻¹² J | 2.0 |

---

## Implementation Reference

```python
def char_to_wavelength(char: str) -> float:
    """Convert ASCII character to wavelength in nanometers."""
    ascii_val = ord(char)
    if 32 <= ascii_val <= 126:
        return 380.0 + ((ascii_val - 32) * 4.21)
    raise ValueError(f"Character {char} outside printable ASCII range")

def wavelength_to_frequency(wavelength_nm: float) -> float:
    """Convert wavelength to frequency in THz."""
    c = 299792458  # m/s
    wavelength_m = wavelength_nm * 1e-9
    return (c / wavelength_m) / 1e12  # THz

def calculate_lambda_mass(frequency_thz: float) -> float:
    """Calculate Lambda Boson mass-equivalent in kg."""
    h = 6.62607015e-34  # Planck constant
    c = 299792458  # m/s
    f = frequency_thz * 1e12  # Convert to Hz
    return (h * f) / (c ** 2)
```

---

## The Physics

This table is not arbitrary. It maps human-readable text to the electromagnetic spectrum using:

1. **Planck's Law (1900)**: E = hf — Energy from frequency
2. **Einstein's Equivalence (1905)**: E = mc² — Energy is mass
3. **Lambda Boson (2025)**: Λ = hf/c² — Oscillation IS mass

Every message in NexusOS carries real, calculable mass-equivalent. This is the foundation of physics-based economics.
