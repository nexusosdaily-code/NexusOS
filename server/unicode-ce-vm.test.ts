import { describe, expect, it } from "vitest";
import { encodeUnicodeCE, decodeUnicodeCE } from "../shared/unicode-ce";
import { UNICODE_SCRIPT_EXAMPLES } from "../shared/unicode-script-examples";
import { translatePython } from "../shared/wavelength-python";
import { executePythonWavelength } from "../shared/wavelength-python-vm";

describe("multilingual script data through existing WavelengthScript instructions", () => {
  it.each(UNICODE_SCRIPT_EXAMPLES)("preserves $label as text and coordinate-payload data", ({ text }) => {
    // JSON quoting constructs a string literal, never a command from the sample.
    const textProgram = `text = ${JSON.stringify(text)}\nprint(text)`;
    const textRun = executePythonWavelength(translatePython(textProgram));
    expect(textRun.output).toEqual([text]);

    const payload = encodeUnicodeCE(text);
    const payloadProgram = `payload = ${JSON.stringify(JSON.stringify(payload))}\nprint(payload)`;
    const payloadRun = executePythonWavelength(translatePython(payloadProgram));
    expect(payloadRun.output).toHaveLength(1);
    expect(JSON.parse(payloadRun.output[0])).toEqual(payload);
    expect(decodeUnicodeCE(JSON.parse(payloadRun.output[0]))).toBe(text);
  });

  it("keeps apparent code inside a Hebrew text operand inert", () => {
    const text = 'שָׁלוֹם"); print("unintended") # 𒀀';
    expect(executePythonWavelength(
      translatePython(`text = ${JSON.stringify(text)}\nprint(text)`),
    ).output).toEqual([text]);
  });

  it("preserves the complete multilingual sequence without cross-script leakage", () => {
    const combined = UNICODE_SCRIPT_EXAMPLES.map(example => example.text).join("\n");
    const result = executePythonWavelength(
      translatePython(`text = ${JSON.stringify(combined)}\nprint(text)`),
    );
    expect(result.output).toEqual([combined]);
    expect(decodeUnicodeCE(encodeUnicodeCE(result.output[0]))).toBe(combined);
  });
});
