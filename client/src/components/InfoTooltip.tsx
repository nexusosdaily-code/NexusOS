import { HelpCircle, ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoSource {
  title: string;
  url: string;
  organization?: string;
}

interface InfoTooltipProps {
  title: string;
  description: string;
  sources: InfoSource[];
  className?: string;
}

export function InfoTooltip({ title, description, sources, className = "" }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/30 transition-colors cursor-help ${className}`}
            data-testid={`info-tooltip-${title.toLowerCase().replace(/\s+/g, '-')}`}
            aria-label={`Info about ${title}`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-sm bg-slate-900 border-2 border-cyan-500/50 p-4 text-left z-50 shadow-xl"
          sideOffset={5}
        >
          <div className="space-y-3">
            <div className="font-bold text-cyan-300 text-sm">{title}</div>
            <p className="text-gray-200 text-xs leading-relaxed">{description}</p>
            {sources.length > 0 && (
              <div className="pt-3 border-t border-cyan-500/30">
                <div className="text-xs text-cyan-400 font-semibold mb-2">📚 Research Sources:</div>
                <div className="space-y-2">
                  {sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 text-xs text-white bg-slate-800 hover:bg-cyan-900/50 p-2 rounded border border-slate-600 hover:border-cyan-500/50 transition-all cursor-pointer"
                      data-testid={`info-link-${idx}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span className="underline underline-offset-2">
                        {source.organization ? `${source.organization}: ` : ""}{source.title}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const RESEARCH_SOURCES = {
  planck: {
    title: "Planck's Equation (E = hf)",
    description: "Max Planck's foundational quantum theory showing energy comes in discrete packets (quanta) proportional to frequency.",
    sources: [
      { title: "Original 1901 Paper", url: "https://www.jstor.org/stable/2369245", organization: "Annalen der Physik" },
      { title: "Quantum Theory Overview", url: "https://physics.nist.gov/cuu/Constants/", organization: "NIST" },
    ]
  },
  einstein: {
    title: "Mass-Energy Equivalence (E = mc²)",
    description: "Einstein's special relativity equation demonstrating mass and energy are interchangeable.",
    sources: [
      { title: "Einstein Papers Project", url: "https://einsteinpapers.press.princeton.edu/", organization: "Princeton" },
      { title: "Relativity Theory", url: "https://www.aps.org/publications/apsnews/200512/history.cfm", organization: "APS Physics" },
    ]
  },
  lambda: {
    title: "Lambda Boson Theory (Λ = hf/c²)",
    description: "Novel synthesis unifying Planck and Einstein: oscillation frequency carries inherent mass-equivalent.",
    sources: [
      { title: "WNSP Protocol v7", url: "/wnsp-v7", organization: "NexusOS" },
      { title: "Lambda Gate Substrate", url: "/research", organization: "Te Rata Pou" },
    ]
  },
  maxwell: {
    title: "Maxwell's Equations",
    description: "The fundamental equations of electromagnetism describing how electric and magnetic fields propagate.",
    sources: [
      { title: "Electromagnetic Theory", url: "https://www.feynmanlectures.caltech.edu/II_18.html", organization: "Feynman Lectures" },
      { title: "EM Wave Propagation", url: "https://www.nist.gov/pml/div686/maxwell", organization: "NIST" },
    ]
  },
  schumann: {
    title: "Schumann Resonance",
    description: "Earth-ionosphere cavity resonances at 7.83 Hz fundamental, used in geophysics and environmental monitoring.",
    sources: [
      { title: "Global EM Resonances", url: "https://www.ncei.noaa.gov/", organization: "NOAA" },
      { title: "Ionospheric Research", url: "https://www.swpc.noaa.gov/", organization: "Space Weather Prediction" },
    ]
  },
  tesla: {
    title: "Tesla Resonance Principles",
    description: "Nikola Tesla's work on resonant energy transmission, wireless power, and planetary-scale coupling.",
    sources: [
      { title: "Tesla Collection", url: "https://teslauniverse.com/nikola-tesla/patents", organization: "Tesla Universe" },
      { title: "Wardenclyffe Project", url: "https://teslasciencecenter.org/", organization: "Tesla Science Center" },
    ]
  },
  witricity: {
    title: "Resonant Wireless Power",
    description: "MIT-developed resonant coupling technology enabling efficient mid-range wireless power transfer.",
    sources: [
      { title: "Original MIT Research", url: "https://www.science.org/doi/10.1126/science.1143254", organization: "Science Magazine" },
      { title: "WiTricity Technology", url: "https://witricity.com/technology/", organization: "WiTricity" },
    ]
  },
  haarp: {
    title: "Ionospheric Research",
    description: "High-frequency Active Auroral Research Program studying ionosphere-magnetosphere coupling.",
    sources: [
      { title: "HAARP Research", url: "https://haarp.gi.alaska.edu/", organization: "University of Alaska" },
      { title: "Ionospheric Heating", url: "https://www.gi.alaska.edu/research/space-physics", organization: "Geophysical Institute" },
    ]
  },
  cses: {
    title: "Seismo-Electromagnetic Monitoring",
    description: "China Seismo-Electromagnetic Satellite program studying earthquake precursor signals in ionosphere.",
    sources: [
      { title: "CSES Mission", url: "https://cses.ac.cn/", organization: "CSES-01" },
      { title: "EM Earthquake Research", url: "https://www.nature.com/articles/s41598-019-56526-4", organization: "Nature Scientific Reports" },
    ]
  },
  oam: {
    title: "Orbital Angular Momentum",
    description: "Photons carry OAM modes enabling multiplexed data transmission on single wavelengths.",
    sources: [
      { title: "OAM Multiplexing", url: "https://www.nature.com/articles/nphoton.2012.138", organization: "Nature Photonics" },
      { title: "Structured Light", url: "https://opg.optica.org/oe/abstract.cfm?uri=oe-24-9-10070", organization: "Optica" },
    ]
  },
  wdm: {
    title: "Wavelength Division Multiplexing",
    description: "Fiber optic technology multiplexing multiple wavelengths on single fiber for high bandwidth.",
    sources: [
      { title: "WDM Standards", url: "https://www.itu.int/rec/T-REC-G.694.1", organization: "ITU-T" },
      { title: "Optical Communications", url: "https://ieeexplore.ieee.org/document/6879244", organization: "IEEE" },
    ]
  },
};
