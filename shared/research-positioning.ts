/**
 * Editorial positioning, not a priority finding or hardware certification.
 * Keep the public comparison and crawler summaries consistent.
 */
export const PROJECT_DESCRIPTION =
  "WavelengthScript is the core language technology driving NexusOS blockchain development, alongside WNSP spectral-coordinate encoding. The current focus is working software on conventional computers; wider developments belong to a century-long vision.";

export const PROJECT_FOCUS =
  "WavelengthScript and the blockchain have always been the project's primary focus. WavelengthScript is the vehicle for developing the blockchain, supported by WNSP's spectral-coordinate encoding and protocol work.";

export const PROJECT_HORIZON =
  "The wider NexusOS vision is a century-long project looking toward 2126, for future generations to continue building. It is a direction for research and development, not a promise of hardware delivery or completed capabilities today.";

export const PROJECT_EVIDENCE_PRINCIPLE =
  "Future developments can strengthen the project's credibility as they are implemented, tested and supported by reproducible evidence and independent review. Proposals alone are not validation, and language and blockchain development do not depend on speculative hardware being built.";

export const PROJECT_DISTINCTION =
  "The contribution being investigated is the particular combination of these rules in one framework—not the invention of colour alphabets, optical symbol encoding, photonic programming or interoperability individually.";

export const PRIORITY_BOUNDARY =
  "This is an initial related-work comparison, not an exhaustive prior-art search or a finding of novelty, historical priority or patentability. An exact equivalent has not been established by this comparison; that does not establish that none exists.";

export const RELATED_WORK = [
  {
    id: "colour_alphabet",
    title: "A Colour Alphabet (2010)",
    url: "https://www.aic-color.org/resources/Documents/jaic_v5_06.pdf",
    overlap: "Paul Green-Armytage represented alphabet letters with colours so readers could decode words and sentences.",
    difference: "Perceived colours are not necessarily single optical wavelengths. This is not a programming language, execution system or network protocol.",
  },
  {
    id: "wavelength_shift_keying",
    title: "Wavelength-shift keying",
    url: "https://descanso.jpl.nasa.gov/monograph/series7/Descanso%207_chap04_new.pdf",
    overlap: "NASA/JPL optical-communications literature describes carrying information through distinct wavelengths and other optical properties.",
    difference: "This is optical modulation, not by itself a human-readable programming language or an application-level addressing framework.",
  },
  {
    id: "blackbird",
    title: "Blackbird / Strawberry Fields (2018)",
    url: "https://arxiv.org/abs/1804.03159",
    overlap: "Xanadu described a photonic quantum programming language, compiler engine and multiple simulation backends.",
    difference: "It expresses quantum-optical circuits rather than WNSP's proposed combination of character-coordinate mappings, addressing and communication models.",
  },
  {
    id: "perceval",
    title: "Perceval Interoperability",
    url: "https://perceval.quandela.net/interopdocs/",
    overlap: "Quandela provides circuit translation from other quantum frameworks to linear-optical circuits and conversion of state representations.",
    difference: "Framework translation is not universal physical compatibility or a direct optical network protocol. Interoperability is therefore not an entirely new category of work.",
  },
  {
    id: "itu_g694_1",
    title: "ITU-T G.694.1 spectral grids",
    url: "https://www.itu.int/ITU-T/recommendations/rec.aspx?id=14498",
    overlap: "The standard defines shared optical frequency grids, frequency slots and slot widths for wavelength-division multiplexing.",
    difference: "A telecommunications channel plan does not assign programming-language semantics to characters or specify an operating system.",
  },
] as const;

export const INTEROPERABILITY_BOUNDARY =
  "A compatible electronic adapter can demonstrate gateway-mediated interoperability without native photonic execution. Native execution and direct optical exchange are separate claims requiring hardware-specific validation. Systems must agree on mapping versions, operation semantics, framing, precision, errors and security—not merely a wavelength label.";
