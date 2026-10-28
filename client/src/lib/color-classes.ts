/**
 * Static Tailwind class lookup maps.
 *
 * Dynamic class construction (`text-${color}-400`) prevents Tailwind v4 from
 * tree-shaking the CSS bundle — it cannot resolve the interpolated value so it
 * includes entire color-scale shades. Replace every template-literal class
 * string with a lookup into one of these maps so only the classes that are
 * actually referenced here end up in the built CSS.
 *
 * Add new entries only when a new color or variant is genuinely needed.
 */

/** `text-{color}-400` */
export const colorText400: Record<string, string> = {
  amber:   "text-amber-400",
  blue:    "text-blue-400",
  cyan:    "text-cyan-400",
  emerald: "text-emerald-400",
  fuchsia: "text-fuchsia-400",
  gray:    "text-gray-400",
  green:   "text-green-400",
  indigo:  "text-indigo-400",
  lime:    "text-lime-400",
  orange:  "text-orange-400",
  pink:    "text-pink-400",
  purple:  "text-purple-400",
  red:     "text-red-400",
  rose:    "text-rose-400",
  slate:   "text-slate-400",
  violet:  "text-violet-400",
  yellow:  "text-yellow-400",
};

/** `text-{color}-300` — wnsp-v7 octave freq labels only */
export const colorText300: Record<string, string> = {
  amber:   "text-amber-300",
  blue:    "text-blue-300",
  cyan:    "text-cyan-300",
  fuchsia: "text-fuchsia-300",
  green:   "text-green-300",
  lime:    "text-lime-300",
  orange:  "text-orange-300",
  purple:  "text-purple-300",
  red:     "text-red-300",
  violet:  "text-violet-300",
  yellow:  "text-yellow-300",
};

/** `bg-{color}-500` (solid dot / progress bar fill) */
export const colorBg500: Record<string, string> = {
  // nexus-v6: purple / blue / green / orange
  // analytics: green / cyan / purple
  blue:    "bg-blue-500",
  cyan:    "bg-cyan-500",
  green:   "bg-green-500",
  orange:  "bg-orange-500",
  purple:  "bg-purple-500",
};

/**
 * Badge/chip combo: `bg-{color}-500/20 text-{color}-400 border-{color}-500/30`
 * nexus-v8: amber / red / purple / blue / green
 * resonance-propulsion: green / amber / orange / yellow / red
 */
export const colorBadge: Record<string, string> = {
  amber:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  blue:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  green:  "bg-green-500/20 text-green-400 border-green-500/30",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  red:    "bg-red-500/20 text-red-400 border-red-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

/**
 * Announcement card background + border + hover variant:
 * `bg-{color}-900/20 border border-{color}-500/30 rounded-lg p-4 hover:border-{color}-500/50 transition-colors`
 */
export const colorAnnouncementCard: Record<string, string> = {
  amber:  "bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 hover:border-amber-500/50 transition-colors",
  blue:   "bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 hover:border-blue-500/50 transition-colors",
  cyan:   "bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 hover:border-cyan-500/50 transition-colors",
  green:  "bg-green-900/20 border border-green-500/30 rounded-lg p-4 hover:border-green-500/50 transition-colors",
  orange: "bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 hover:border-orange-500/50 transition-colors",
  purple: "bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/50 transition-colors",
};

/**
 * History/experiment row: `bg-{color}-900/10 border border-{color}-500/30 rounded-lg p-4`
 * Used in resonance-propulsion experimental history.
 */
export const colorHistoryRow: Record<string, string> = {
  amber:  "bg-amber-900/10 border border-amber-500/30 rounded-lg p-4",
  orange: "bg-orange-900/10 border border-orange-500/30 rounded-lg p-4",
  red:    "bg-red-900/10 border border-red-500/30 rounded-lg p-4",
  yellow: "bg-yellow-900/10 border border-yellow-500/30 rounded-lg p-4",
};

/**
 * Octave spectrum row:
 * `bg-{color}-900/20 border border-{color}-500/30 rounded-lg p-4 hover:bg-{color}-900/30 transition-colors`
 */
export const colorOctaveRow: Record<string, string> = {
  amber:   "bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 hover:bg-amber-900/30 transition-colors",
  blue:    "bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 hover:bg-blue-900/30 transition-colors",
  cyan:    "bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 hover:bg-cyan-900/30 transition-colors",
  fuchsia: "bg-fuchsia-900/20 border border-fuchsia-500/30 rounded-lg p-4 hover:bg-fuchsia-900/30 transition-colors",
  green:   "bg-green-900/20 border border-green-500/30 rounded-lg p-4 hover:bg-green-900/30 transition-colors",
  lime:    "bg-lime-900/20 border border-lime-500/30 rounded-lg p-4 hover:bg-lime-900/30 transition-colors",
  orange:  "bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 hover:bg-orange-900/30 transition-colors",
  purple:  "bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 hover:bg-purple-900/30 transition-colors",
  red:     "bg-red-900/20 border border-red-500/30 rounded-lg p-4 hover:bg-red-900/30 transition-colors",
  violet:  "bg-violet-900/20 border border-violet-500/30 rounded-lg p-4 hover:bg-violet-900/30 transition-colors",
  yellow:  "bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 hover:bg-yellow-900/30 transition-colors",
};

/**
 * Gradient dot (circular avatar / icon background):
 * `w-12 h-12 rounded-full bg-gradient-to-br from-{color}-400 to-{color}-600`
 */
export const colorGradientDot: Record<string, string> = {
  amber:   "w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600",
  blue:    "w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600",
  cyan:    "w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600",
  fuchsia: "w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-400 to-fuchsia-600",
  green:   "w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600",
  lime:    "w-12 h-12 rounded-full bg-gradient-to-br from-lime-400 to-lime-600",
  orange:  "w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600",
  purple:  "w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600",
  red:     "w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600",
  violet:  "w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-violet-600",
  yellow:  "w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600",
};

/**
 * Metric card (border + background tint):
 * `rounded-xl border border-{color}-700/30 bg-{color}-950/20 p-4`
 * Used in polariton-exchange and resonance-cavity live-metrics grids.
 */
export const colorMetricCard: Record<string, string> = {
  amber:   "rounded-xl border border-amber-700/30 bg-amber-950/20 p-4",
  emerald: "rounded-xl border border-emerald-700/30 bg-emerald-950/20 p-4",
  indigo:  "rounded-xl border border-indigo-700/30 bg-indigo-950/20 p-4",
  rose:    "rounded-xl border border-rose-700/30 bg-rose-950/20 p-4",
  slate:   "rounded-xl border border-slate-700/30 bg-slate-950/20 p-4",
  violet:  "rounded-xl border border-violet-700/30 bg-violet-950/20 p-4",
};
