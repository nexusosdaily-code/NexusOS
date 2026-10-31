import { describe, expect, it } from "vitest";
import { compileWLS } from "./wnsp_vm";
import { compilePythonWavelength } from "../shared/wavelength-python";
import { LIBRARY_PROGRAM_IDS } from "../shared/wls-library-catalogue";
import { getCollectionProgramSource } from "../shared/wls-library";
import { assertNotCollectionSource } from "../shared/vm-security";

describe("native Map/Set programs cannot become legacy EXEC/log placeholders", () => {
  it.each(LIBRARY_PROGRAM_IDS.filter(id => /^(map|set)\./.test(id)))(
    "%s requires its real WLS-MAP/1 interpreter", id => {
      const source = getCollectionProgramSource(id);
      expect(() => compileWLS(source)).toThrow(/explicit WLS-MAP\/1 profile/);
      expect(() => compilePythonWavelength(source)).toThrow(/Missing supported WavelengthScript subset version/);
      // Removing a profile header must not turn remaining native opcodes into
      // a successful legacy logging-only program.
      expect(() => compileWLS(source.split("\n").slice(1).join("\n")))
        .toThrow(/explicit WLS-MAP\/1 profile/);
    },
  );
  it.each([
    '# WLS-MAP/1 is documentation\n@store key := 1',
    '@store label := "WLS-MAP/1"',
    '@store label := "MAP_NEW [\\"x\\"]"',
  ])("preserves ordinary legacy comments and quoted text", source => {
    expect(() => assertNotCollectionSource(source)).not.toThrow();
    expect(() => compileWLS(source)).not.toThrow();
  });
});
