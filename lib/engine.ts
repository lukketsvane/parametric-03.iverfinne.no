/**
 * The vessel motor's public parameter space.
 *
 * One formal system covers every reference piece: a thrown-vessel profile
 * (foot → belly → neck → flared mouth), optionally stepped into hanging
 * pagoda skirts, whose surface is built not as a solid skin but from
 * structure — a fluted core wall, paper-thin radial fins and horizontal
 * shelves that follow the profile (waffle or herringbone grids where they
 * cross), thin blade spikes at the crossings, an optional solid lower
 * skin, and every free edge ruffled, frayed and torn. Structure can stop
 * below the mouth so a smooth petal-scalloped bowl rises out of it.
 * Each preset is one of the reference pieces; the sliders move through
 * the space between them.
 *
 * This module is UI-facing and dependency-free. The geometry itself is
 * built in lib/vessel.ts (SDF + marching cubes) and mounted by
 * components/engine-mesh.tsx.
 */

/** Physical scale: 1 scene unit = 50 mm. STL exports are scaled to mm. */
export const MM_PER_UNIT = 50

export type ParamKey =
  // silhouette
  | "height"
  | "foot"
  | "belly"
  | "bellyY"
  | "neck"
  | "neckY"
  | "flare"
  | "lip"
  // pagoda skirts
  | "tiers"
  | "tierDepth"
  | "droop"
  // radial fins
  | "fins"
  | "finDepth"
  | "finThick"
  | "twist"
  | "chevron"
  | "finTop"
  // horizontal shelves
  | "rings"
  | "ringDepth"
  | "ringThick"
  // body
  | "core"
  | "flute"
  | "fluteN"
  | "wall"
  | "skin"
  // free edges
  | "ruffle"
  | "ruffleFreq"
  | "mouthWave"
  | "mouthAmp"
  | "spikes"
  | "rough"
  | "micro"

export type ParamRange = { min: number; max: number; step: number }

export type Params = { preset: string; seed: number } & Record<ParamKey, number>

export const PARAM_RANGES: Record<ParamKey, ParamRange> = {
  height: { min: 1.6, max: 4.4, step: 0.05 },
  foot: { min: 0.2, max: 1.2, step: 0.01 },
  belly: { min: 0.3, max: 1.6, step: 0.01 },
  bellyY: { min: 0.1, max: 0.7, step: 0.01 },
  neck: { min: 0.12, max: 0.9, step: 0.01 },
  neckY: { min: 0.5, max: 0.92, step: 0.01 },
  flare: { min: 0, max: 1.2, step: 0.01 },
  lip: { min: 0, max: 1, step: 0.01 },
  tiers: { min: 0, max: 6, step: 1 },
  tierDepth: { min: 0, max: 0.5, step: 0.01 },
  droop: { min: 0, max: 1, step: 0.01 },
  fins: { min: 0, max: 48, step: 1 },
  finDepth: { min: 0, max: 0.7, step: 0.01 },
  finThick: { min: 0.015, max: 0.12, step: 0.005 },
  twist: { min: -1, max: 1, step: 0.01 },
  chevron: { min: 0, max: 1, step: 0.01 },
  finTop: { min: 0.5, max: 1, step: 0.01 },
  rings: { min: 0, max: 20, step: 1 },
  ringDepth: { min: 0, max: 0.6, step: 0.01 },
  ringThick: { min: 0.015, max: 0.14, step: 0.005 },
  core: { min: 0.25, max: 1, step: 0.01 },
  flute: { min: 0, max: 0.15, step: 0.005 },
  fluteN: { min: 4, max: 64, step: 1 },
  wall: { min: 0.04, max: 0.2, step: 0.005 },
  skin: { min: 0, max: 1, step: 0.01 },
  ruffle: { min: 0, max: 0.35, step: 0.01 },
  ruffleFreq: { min: 2, max: 24, step: 1 },
  mouthWave: { min: 0, max: 12, step: 1 },
  mouthAmp: { min: 0, max: 0.35, step: 0.01 },
  spikes: { min: 0, max: 1, step: 0.01 },
  rough: { min: 0, max: 1, step: 0.01 },
  micro: { min: 0, max: 1, step: 0.01 },
}

/** How the controls panel groups the parameters. */
export const SECTIONS: {
  title: string
  keys: { key: ParamKey; label: string }[]
}[] = [
  {
    title: "Silhouette",
    keys: [
      { key: "height", label: "Height" },
      { key: "foot", label: "Foot" },
      { key: "belly", label: "Belly" },
      { key: "bellyY", label: "Belly at" },
      { key: "neck", label: "Neck" },
      { key: "neckY", label: "Neck at" },
      { key: "flare", label: "Flare" },
      { key: "lip", label: "Lip" },
    ],
  },
  {
    title: "Skirts",
    keys: [
      { key: "tiers", label: "Tiers" },
      { key: "tierDepth", label: "Depth" },
      { key: "droop", label: "Droop" },
    ],
  },
  {
    title: "Fins",
    keys: [
      { key: "fins", label: "Fins" },
      { key: "finDepth", label: "Depth" },
      { key: "finThick", label: "Thick" },
      { key: "twist", label: "Twist" },
      { key: "chevron", label: "Chevron" },
      { key: "finTop", label: "Stop at" },
    ],
  },
  {
    title: "Shelves",
    keys: [
      { key: "rings", label: "Shelves" },
      { key: "ringDepth", label: "Depth" },
      { key: "ringThick", label: "Thick" },
    ],
  },
  {
    title: "Body",
    keys: [
      { key: "core", label: "Core" },
      { key: "flute", label: "Flutes" },
      { key: "fluteN", label: "Flute n" },
      { key: "wall", label: "Wall" },
      { key: "skin", label: "Skin" },
    ],
  },
  {
    title: "Edges",
    keys: [
      { key: "ruffle", label: "Ruffle" },
      { key: "ruffleFreq", label: "Waves" },
      { key: "mouthWave", label: "Mouth n" },
      { key: "mouthAmp", label: "Mouth amp" },
      { key: "spikes", label: "Spikes" },
      { key: "rough", label: "Tear" },
      { key: "micro", label: "Micro" },
    ],
  },
]

/**
 * The reference pieces, one preset each:
 *  - relikvie: tall white column — spine of thin shelves over a fluted
 *    core with blade spikes, solid lower skirt, ruffled crown
 *  - sikksakk: cylinder in a herringbone lattice of paper-thin torn
 *    sheets, smooth scalloped bowl rising from a spiked collar
 *  - pagode:   grey stepped tower — dense pleat fins over four drooping
 *    skirts, squared trumpet mouth
 *  - vaffel:   blue ovoid — open fin × shelf waffle grid around an inner
 *    vessel, flat squared collar
 *  - turbin:   squat cream rotor — deep thin radial sails around a fat
 *    dome, hanging skirt, flared top
 *  - korall:   white bloom — few thin fins and draped shelves, torn all
 *    over, under a smooth fluted horn mouth
 *  - blomst:   small sphere of deep thin sails crowned by a big smooth
 *    petal bowl
 */
const BASE: Record<string, Record<ParamKey, number>> = {
  relikvie: {
    height: 4.1, foot: 0.95, belly: 1.02, bellyY: 0.5, neck: 0.42, neckY: 0.78,
    flare: 0.58, lip: 0.4,
    tiers: 0, tierDepth: 0, droop: 0.3,
    fins: 12, finDepth: 0.3, finThick: 0.03, twist: 0, chevron: 0, finTop: 1,
    rings: 12, ringDepth: 0.26, ringThick: 0.035,
    core: 0.52, flute: 0.045, fluteN: 32, wall: 0.08, skin: 0.38,
    ruffle: 0.03, ruffleFreq: 9, mouthWave: 0, mouthAmp: 0, spikes: 1,
    rough: 0.45, micro: 0.75,
  },
  sikksakk: {
    height: 3.3, foot: 0.95, belly: 1.08, bellyY: 0.45, neck: 0.58, neckY: 0.82,
    flare: 0.5, lip: 0.3,
    tiers: 0, tierDepth: 0, droop: 0.2,
    fins: 16, finDepth: 0.32, finThick: 0.025, twist: 0, chevron: 0.7, finTop: 0.84,
    rings: 9, ringDepth: 0.22, ringThick: 0.025,
    core: 0.58, flute: 0.03, fluteN: 28, wall: 0.06, skin: 0,
    ruffle: 0.05, ruffleFreq: 12, mouthWave: 6, mouthAmp: 0.1, spikes: 0,
    rough: 0.7, micro: 0.8,
  },
  pagode: {
    height: 3.3, foot: 0.5, belly: 1.18, bellyY: 0.3, neck: 0.34, neckY: 0.72,
    flare: 0.58, lip: 0.3,
    tiers: 4, tierDepth: 0.3, droop: 0.6,
    fins: 34, finDepth: 0.11, finThick: 0.032, twist: 0, chevron: 0, finTop: 1,
    rings: 0, ringDepth: 0, ringThick: 0.04,
    core: 0.82, flute: 0, fluteN: 24, wall: 0.07, skin: 0,
    ruffle: 0.04, ruffleFreq: 15, mouthWave: 4, mouthAmp: 0.15, spikes: 0,
    rough: 0.5, micro: 0.55,
  },
  vaffel: {
    height: 2.9, foot: 0.5, belly: 1.02, bellyY: 0.42, neck: 0.3, neckY: 0.8,
    flare: 0.72, lip: 0.75,
    tiers: 0, tierDepth: 0, droop: 0.15,
    fins: 12, finDepth: 0.22, finThick: 0.04, twist: 0, chevron: 0, finTop: 1,
    rings: 8, ringDepth: 0.22, ringThick: 0.04,
    core: 0.85, flute: 0.02, fluteN: 24, wall: 0.07, skin: 0,
    ruffle: 0.03, ruffleFreq: 8, mouthWave: 4, mouthAmp: 0.2, spikes: 0.5,
    rough: 0.35, micro: 0.5,
  },
  turbin: {
    height: 2.3, foot: 0.55, belly: 1.5, bellyY: 0.3, neck: 0.45, neckY: 0.68,
    flare: 0.7, lip: 0.25,
    tiers: 2, tierDepth: 0.3, droop: 0.7,
    fins: 18, finDepth: 0.48, finThick: 0.04, twist: 0.05, chevron: 0, finTop: 1,
    rings: 0, ringDepth: 0, ringThick: 0.04,
    core: 0.58, flute: 0.03, fluteN: 18, wall: 0.08, skin: 0,
    ruffle: 0.07, ruffleFreq: 9, mouthWave: 0, mouthAmp: 0, spikes: 0,
    rough: 0.4, micro: 0.6,
  },
  korall: {
    height: 3.0, foot: 0.68, belly: 1.15, bellyY: 0.44, neck: 0.5, neckY: 0.7,
    flare: 1.0, lip: 0.6,
    tiers: 2, tierDepth: 0.15, droop: 0.6,
    fins: 9, finDepth: 0.3, finThick: 0.035, twist: 0, chevron: 0, finTop: 0.78,
    rings: 5, ringDepth: 0.26, ringThick: 0.035,
    core: 0.62, flute: 0.05, fluteN: 18, wall: 0.07, skin: 0.1,
    ruffle: 0.24, ruffleFreq: 7, mouthWave: 9, mouthAmp: 0.07, spikes: 0.15,
    rough: 0.6, micro: 0.75,
  },
  blomst: {
    height: 2.2, foot: 0.35, belly: 1.15, bellyY: 0.52, neck: 0.6, neckY: 0.55,
    flare: 0.55, lip: 0.15,
    tiers: 0, tierDepth: 0, droop: 0.5,
    fins: 12, finDepth: 0.55, finThick: 0.035, twist: 0, chevron: 0, finTop: 0.6,
    rings: 2, ringDepth: 0.18, ringThick: 0.04,
    core: 0.5, flute: 0.05, fluteN: 14, wall: 0.08, skin: 0,
    ruffle: 0.2, ruffleFreq: 6, mouthWave: 7, mouthAmp: 0.22, spikes: 0,
    rough: 0.5, micro: 0.7,
  },
}

export const PRESETS: readonly string[] = Object.keys(BASE)

/** Body tint per family, matched to the reference pieces. */
export const PRESET_COLORS: Record<string, string> = {
  relikvie: "#f4f1e8",
  sikksakk: "#f2efe6",
  pagode: "#b8b0ac",
  vaffel: "#8fb0cc",
  turbin: "#eddcb4",
  korall: "#f5f2ec",
  blomst: "#f6f3ee",
}

/** Which parameter each two-finger scroll axis nudges. */
export const NUDGE_PARAMS: { vertical?: ParamKey; horizontal?: ParamKey } = {
  vertical: "height",
  horizontal: "belly",
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 9000) + 1000
}

/**
 * The canonical design of a preset family. Deliberately NOT seed-jittered:
 * picking a preset reproduces the reference piece exactly — the seed only
 * phases the ruffle/tear noise fields.
 */
export function genParams(seed: number, preset: string): Params {
  const base = BASE[preset] ?? BASE[PRESETS[0]]
  return { preset: BASE[preset] ? preset : PRESETS[0], seed, ...base }
}

// mulberry32 — tiny deterministic PRNG for shuffle jitter
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// how far shuffle may wander from the family base: fraction of the full
// range for continuous params, absolute ± for integer ones
const JITTER: Record<ParamKey, number> = {
  height: 0.12, foot: 0.15, belly: 0.15, bellyY: 0.12, neck: 0.15,
  neckY: 0.08, flare: 0.2, lip: 0.2,
  tiers: 1, tierDepth: 0.2, droop: 0.25,
  fins: 4, finDepth: 0.2, finThick: 0.08, twist: 0.15, chevron: 0.1,
  finTop: 0.05,
  rings: 2, ringDepth: 0.2, ringThick: 0.08,
  core: 0.12, flute: 0.15, fluteN: 4, wall: 0.08, skin: 0.1,
  ruffle: 0.2, ruffleFreq: 3, mouthWave: 0, mouthAmp: 0.15, spikes: 0.2,
  rough: 0.2, micro: 0.15,
}

/** A seeded variation within a preset family. */
export function randomizeParams(seed: number, preset: string): Params {
  const p = genParams(seed, preset)
  const rnd = rng(seed * 2654435761)
  for (const k of Object.keys(PARAM_RANGES) as ParamKey[]) {
    const r = PARAM_RANGES[k]
    const j = JITTER[k]
    if (j === 0) continue
    let v: number
    if (r.step >= 1) {
      v = p[k] + Math.round((rnd() - 0.5) * 2 * j)
    } else {
      v = p[k] + (rnd() - 0.5) * 2 * j * (r.max - r.min)
    }
    v = Math.min(r.max, Math.max(r.min, v))
    p[k] = r.step >= 1 ? Math.round(v) : +v.toFixed(3)
  }
  // structure that collapses to zero stays zero — it defines the family
  const base = BASE[p.preset]
  for (const k of ["fins", "rings", "tiers", "skin", "spikes", "mouthAmp", "flute", "chevron"] as ParamKey[]) {
    if (base[k] === 0) p[k] = 0
  }
  if (base.finTop === 1) p.finTop = 1
  return p
}

export const DEFAULT_PARAMS: Params = genParams(1204, "relikvie")
