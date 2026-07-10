/**
 * The totem motor's public parameter space.
 *
 * ONE formal system, no named types: every design is a point in the same
 * continuous parameter space — a vertical totem of one to four hub
 * bodies stacked on a shared axis — each hub a squashed sphere that can
 * crystallise into a faceted polyhedron (the cut crossfades diamond →
 * dodecahedron → icosahedron) — pierced by funnel-recessed through-holes
 * (round eyes, tall slots, sunken square panels), and sprouting radial
 * limbs: antenna prongs from the crown, tapered legs from the base,
 * short side arms from the equators, teat nubs underneath. The whole
 * body is chip-carved with a hammered peen or directional gouge.
 *
 * Variety comes from the seed alone: genParams() blends between internal
 * anchor recipes (the reference pieces, kept only as gravity wells of the
 * sampler — they have no names in the UI and every blend between them is
 * legal) and jitters outward from there. The sliders then move anywhere.
 *
 * This module is UI-facing and dependency-free. The geometry itself is
 * built in lib/totem.ts (SDF + marching cubes) and mounted by
 * components/engine-mesh.tsx.
 */

/** Physical scale: 1 scene unit = 100 mm. STL exports are scaled to mm. */
export const MM_PER_UNIT = 100

export type ParamKey =
  // stack
  | "height"
  | "nodes"
  | "taper"
  | "belly"
  | "squash"
  | "flat"
  | "neck"
  | "twin"
  // crystal
  | "facet"
  | "facetKind"
  | "facetUp"
  | "zig"
  // holes
  | "holes"
  | "holeR"
  | "funnel"
  | "slot"
  | "eyes"
  | "panel"
  // legs
  | "legs"
  | "legLen"
  | "legSplay"
  | "legBend"
  | "legTaper"
  | "around"
  | "limbR"
  // crown
  | "prongs"
  | "prongLen"
  | "spread"
  | "prongTaper"
  | "spout"
  // arms & nubs
  | "arms"
  | "armLen"
  | "armTilt"
  | "nubs"
  // surface
  | "tex"
  | "texScale"
  | "gouge"

export type ParamRange = { min: number; max: number; step: number }

export type Params = { seed: number } & Record<ParamKey, number>

export const PARAM_RANGES: Record<ParamKey, ParamRange> = {
  height: { min: 1.8, max: 4.4, step: 0.05 },
  nodes: { min: 1, max: 4, step: 1 },
  taper: { min: 0.45, max: 1.6, step: 0.01 },
  belly: { min: 0.4, max: 1.05, step: 0.01 },
  squash: { min: 0.55, max: 1.45, step: 0.01 },
  flat: { min: 0.35, max: 1, step: 0.01 },
  neck: { min: 0.02, max: 0.5, step: 0.01 },
  twin: { min: 0, max: 1, step: 0.01 },
  facet: { min: 0, max: 1, step: 0.01 },
  facetKind: { min: 0, max: 2, step: 0.01 },
  facetUp: { min: 0, max: 1, step: 0.01 },
  zig: { min: 0, max: 1, step: 0.01 },
  holes: { min: 0, max: 3, step: 1 },
  holeR: { min: 0.08, max: 0.5, step: 0.01 },
  funnel: { min: 0, max: 1, step: 0.01 },
  slot: { min: 0, max: 1, step: 0.01 },
  eyes: { min: 0, max: 1, step: 0.01 },
  panel: { min: 0, max: 1, step: 0.01 },
  legs: { min: 0, max: 8, step: 1 },
  legLen: { min: 0.3, max: 2.4, step: 0.01 },
  legSplay: { min: 0, max: 0.9, step: 0.01 },
  legBend: { min: 0, max: 1, step: 0.01 },
  legTaper: { min: 0.12, max: 1, step: 0.01 },
  around: { min: 0, max: 1, step: 0.01 },
  limbR: { min: 0.045, max: 0.16, step: 0.002 },
  prongs: { min: 0, max: 5, step: 1 },
  prongLen: { min: 0.15, max: 2, step: 0.01 },
  spread: { min: 0, max: 1, step: 0.01 },
  prongTaper: { min: 0.08, max: 1, step: 0.01 },
  spout: { min: 0, max: 1, step: 0.01 },
  arms: { min: 0, max: 3, step: 1 },
  armLen: { min: 0.08, max: 1.2, step: 0.01 },
  armTilt: { min: -0.6, max: 0.6, step: 0.01 },
  nubs: { min: 0, max: 3, step: 1 },
  tex: { min: 0, max: 1, step: 0.01 },
  texScale: { min: 8, max: 64, step: 1 },
  gouge: { min: 0, max: 1, step: 0.01 },
}

const PARAM_KEYS = Object.keys(PARAM_RANGES) as ParamKey[]

/** How the controls panel groups the parameters. */
export const SECTIONS: {
  title: string
  keys: { key: ParamKey; label: string }[]
}[] = [
  {
    title: "Stack",
    keys: [
      { key: "height", label: "Height" },
      { key: "nodes", label: "Bodies" },
      { key: "taper", label: "Taper" },
      { key: "belly", label: "Belly" },
      { key: "squash", label: "Squash" },
      { key: "flat", label: "Depth" },
      { key: "neck", label: "Neck" },
      { key: "twin", label: "Twin" },
    ],
  },
  {
    title: "Crystal",
    keys: [
      { key: "facet", label: "Facet" },
      { key: "facetKind", label: "Cut" },
      { key: "facetUp", label: "Climb" },
      { key: "zig", label: "Zigzag" },
    ],
  },
  {
    title: "Holes",
    keys: [
      { key: "holes", label: "Holes" },
      { key: "holeR", label: "Bore" },
      { key: "funnel", label: "Funnel" },
      { key: "slot", label: "Slot" },
      { key: "eyes", label: "Eyes" },
      { key: "panel", label: "Panel" },
    ],
  },
  {
    title: "Legs",
    keys: [
      { key: "legs", label: "Legs" },
      { key: "legLen", label: "Length" },
      { key: "legSplay", label: "Splay" },
      { key: "legBend", label: "Bend" },
      { key: "legTaper", label: "Taper" },
      { key: "around", label: "Around" },
      { key: "limbR", label: "Girth" },
    ],
  },
  {
    title: "Crown",
    keys: [
      { key: "prongs", label: "Prongs" },
      { key: "prongLen", label: "Length" },
      { key: "spread", label: "Spread" },
      { key: "prongTaper", label: "Taper" },
      { key: "spout", label: "Spout" },
    ],
  },
  {
    title: "Arms",
    keys: [
      { key: "arms", label: "Arm pairs" },
      { key: "armLen", label: "Length" },
      { key: "armTilt", label: "Tilt" },
      { key: "nubs", label: "Nubs" },
    ],
  },
  {
    title: "Surface",
    keys: [
      { key: "tex", label: "Carve" },
      { key: "texScale", label: "Grain" },
      { key: "gouge", label: "Gouge" },
    ],
  },
]

/**
 * Anchor recipes — the reference pieces, kept purely as scaffolding for
 * the seed sampler. They are NOT user-facing types: the generator blends
 * two or three of them at random weights and jitters from there, so the
 * whole space between and around them is one continuous family.
 *
 *  - tinde:      one great lens body, three antennae, four legs, one
 *                funneled eye
 *  - troll:      horned head with twin eyes and ear stubs over two long
 *                bowed legs
 *  - lykt:       small cross-armed head over a deep-funneled body on a
 *                tripod, one teat
 *  - edderkopp:  round head, two tall ears, eight legs all around
 *  - varde:      three pierced bodies spiked with crossing antennae,
 *                legs and side arms
 *  - krystall:   four parallel fingers and a pierced head resting on a
 *                faceted crystal plinth
 *  - kandelaber: flat plaque body, four candle fingers, a sunken panel
 *                of three slots
 *  - spira:      slotted tall body under a pierced head, cross arms,
 *                tripod legs
 *  - rombe:      three diamond-cut bodies stacked point to point, each
 *                pierced, on two short legs
 *  - sikksakk:   two pierced spiked bodies joined by a stack of zigzag
 *                chevrons
 *  - søyle:      a ribbed column of flat discs and chevrons, eared cup
 *                on top, no holes and no legs
 *  - tvilling:   the twin fold — two pierced lobes side by side sharing
 *                a pinched waist, antennae up and legs down from each
 */
const ANCHOR_RECIPES: Record<string, Record<ParamKey, number>> = {
  tinde: {
    height: 3.9, nodes: 1, taper: 1, belly: 0.95, squash: 1.1, flat: 0.55,
    neck: 0.2, twin: 0,
    facet: 0, facetKind: 1, facetUp: 0, zig: 0,
    holes: 1, holeR: 0.2, funnel: 0.8, slot: 0, eyes: 0, panel: 0,
    legs: 4, legLen: 1.35, legSplay: 0.22, legBend: 0.12, legTaper: 0.24,
    around: 0.55, limbR: 0.09,
    prongs: 3, prongLen: 1.65, spread: 0.35, prongTaper: 0.14, spout: 0,
    arms: 0, armLen: 0.2, armTilt: 0, nubs: 0,
    tex: 0.8, texScale: 36, gouge: 0.2,
  },
  troll: {
    height: 3.4, nodes: 2, taper: 1.25, belly: 0.62, squash: 1.1, flat: 0.75,
    neck: 0.26, twin: 0,
    facet: 0, facetKind: 1, facetUp: 0, zig: 0,
    holes: 2, holeR: 0.16, funnel: 0.35, slot: 0, eyes: 1, panel: 0,
    legs: 2, legLen: 1.55, legSplay: 0.3, legBend: 0.6, legTaper: 0.32,
    around: 0, limbR: 0.105,
    prongs: 2, prongLen: 0.6, spread: 0.85, prongTaper: 0.18, spout: 0.5,
    arms: 1, armLen: 0.3, armTilt: 0.02, nubs: 0,
    tex: 0.75, texScale: 36, gouge: 0.35,
  },
  lykt: {
    height: 3.8, nodes: 2, taper: 0.6, belly: 0.82, squash: 0.95, flat: 0.8,
    neck: 0.22, twin: 0,
    facet: 0, facetKind: 1, facetUp: 0, zig: 0,
    holes: 2, holeR: 0.24, funnel: 0.75, slot: 0, eyes: 0, panel: 0,
    legs: 3, legLen: 1.35, legSplay: 0.32, legBend: 0.06, legTaper: 0.5,
    around: 0.5, limbR: 0.105,
    prongs: 1, prongLen: 0.5, spread: 0, prongTaper: 0.6, spout: 0,
    arms: 2, armLen: 0.32, armTilt: 0, nubs: 1,
    tex: 0.85, texScale: 38, gouge: 0,
  },
  edderkopp: {
    height: 3.2, nodes: 1, taper: 1, belly: 0.85, squash: 1, flat: 0.95,
    neck: 0.2, twin: 0,
    facet: 0, facetKind: 1, facetUp: 0, zig: 0,
    holes: 1, holeR: 0.15, funnel: 0.25, slot: 0, eyes: 0, panel: 0,
    legs: 8, legLen: 1.4, legSplay: 0.34, legBend: 0.3, legTaper: 0.3,
    around: 1, limbR: 0.095,
    prongs: 2, prongLen: 1.3, spread: 0.12, prongTaper: 0.3, spout: 0,
    arms: 0, armLen: 0.2, armTilt: 0, nubs: 0,
    tex: 0.7, texScale: 40, gouge: 0.15,
  },
  varde: {
    height: 4.1, nodes: 3, taper: 0.85, belly: 0.68, squash: 0.9, flat: 0.7,
    neck: 0.2, twin: 0,
    facet: 0, facetKind: 1, facetUp: 0, zig: 0,
    holes: 3, holeR: 0.24, funnel: 0.55, slot: 0, eyes: 0, panel: 0,
    legs: 2, legLen: 1.45, legSplay: 0.5, legBend: 0.15, legTaper: 0.28,
    around: 0, limbR: 0.085,
    prongs: 2, prongLen: 1.65, spread: 0.9, prongTaper: 0.2, spout: 0.4,
    arms: 3, armLen: 0.36, armTilt: 0.02, nubs: 2,
    tex: 0.85, texScale: 36, gouge: 0.5,
  },
  krystall: {
    height: 4.0, nodes: 2, taper: 0.72, belly: 0.88, squash: 0.95, flat: 0.85,
    neck: 0.12, twin: 0,
    facet: 1, facetKind: 1, facetUp: 0, zig: 0,
    holes: 2, holeR: 0.2, funnel: 0.7, slot: 0, eyes: 0, panel: 0,
    legs: 0, legLen: 0.8, legSplay: 0.2, legBend: 0.1, legTaper: 0.4,
    around: 0, limbR: 0.11,
    prongs: 4, prongLen: 1.7, spread: 0.12, prongTaper: 0.75, spout: 0,
    arms: 1, armLen: 0.14, armTilt: 0, nubs: 0,
    tex: 0.8, texScale: 34, gouge: 0.7,
  },
  kandelaber: {
    height: 4.0, nodes: 1, taper: 1, belly: 1.0, squash: 1.25, flat: 0.5,
    neck: 0.2, twin: 0,
    facet: 0, facetKind: 1, facetUp: 0, zig: 0,
    holes: 3, holeR: 0.11, funnel: 0.12, slot: 1, eyes: 1, panel: 1,
    legs: 4, legLen: 1.25, legSplay: 0.36, legBend: 0.1, legTaper: 0.45,
    around: 0.3, limbR: 0.105,
    prongs: 4, prongLen: 1.3, spread: 0.05, prongTaper: 0.8, spout: 0,
    arms: 1, armLen: 0.2, armTilt: 0, nubs: 1,
    tex: 0.85, texScale: 38, gouge: 0.2,
  },
  spira: {
    height: 4.1, nodes: 2, taper: 0.5, belly: 0.88, squash: 1.35, flat: 0.65,
    neck: 0.3, twin: 0,
    facet: 0, facetKind: 1, facetUp: 0, zig: 0,
    holes: 2, holeR: 0.12, funnel: 0.3, slot: 1, eyes: 0, panel: 0,
    legs: 3, legLen: 1.5, legSplay: 0.42, legBend: 0.12, legTaper: 0.35,
    around: 0.45, limbR: 0.1,
    prongs: 1, prongLen: 0.55, spread: 0, prongTaper: 0.55, spout: 0,
    arms: 2, armLen: 0.45, armTilt: 0.03, nubs: 1,
    tex: 0.9, texScale: 42, gouge: 0.15,
  },
  rombe: {
    height: 3.9, nodes: 3, taper: 0.95, belly: 0.8, squash: 1.0, flat: 0.5,
    neck: 0.06, twin: 0,
    facet: 1, facetKind: 0, facetUp: 1, zig: 0,
    holes: 3, holeR: 0.17, funnel: 0.15, slot: 0, eyes: 0, panel: 0,
    legs: 2, legLen: 0.7, legSplay: 0.35, legBend: 0, legTaper: 0.5,
    around: 0, limbR: 0.09,
    prongs: 0, prongLen: 0.3, spread: 0, prongTaper: 0.5, spout: 0,
    arms: 0, armLen: 0.2, armTilt: 0, nubs: 0,
    tex: 0.5, texScale: 30, gouge: 0.4,
  },
  sikksakk: {
    height: 4.0, nodes: 2, taper: 1.0, belly: 0.72, squash: 0.95, flat: 0.55,
    neck: 0.1, twin: 0,
    facet: 0, facetKind: 1, facetUp: 0, zig: 0.8,
    holes: 2, holeR: 0.2, funnel: 0.5, slot: 0, eyes: 0, panel: 0,
    legs: 2, legLen: 1.3, legSplay: 0.45, legBend: 0.1, legTaper: 0.2,
    around: 0, limbR: 0.08,
    prongs: 2, prongLen: 1.2, spread: 0.55, prongTaper: 0.16, spout: 0,
    arms: 1, armLen: 0.25, armTilt: 0, nubs: 0,
    tex: 0.9, texScale: 40, gouge: 0.3,
  },
  søyle: {
    height: 4.4, nodes: 4, taper: 1.0, belly: 0.72, squash: 0.6, flat: 1.0,
    neck: 0.04, twin: 0,
    facet: 0, facetKind: 0, facetUp: 0, zig: 0.85,
    holes: 0, holeR: 0.15, funnel: 0.2, slot: 0, eyes: 0, panel: 0,
    legs: 0, legLen: 0.6, legSplay: 0.2, legBend: 0.05, legTaper: 0.5,
    around: 0.5, limbR: 0.08,
    prongs: 0, prongLen: 0.4, spread: 0, prongTaper: 0.7, spout: 0.9,
    arms: 1, armLen: 0.12, armTilt: 0.05, nubs: 0,
    tex: 0.35, texScale: 24, gouge: 0.05,
  },
  tvilling: {
    height: 3.6, nodes: 1, taper: 1, belly: 0.8, squash: 1.05, flat: 0.6,
    neck: 0.2, twin: 0.85,
    facet: 0, facetKind: 1, facetUp: 0, zig: 0,
    holes: 1, holeR: 0.28, funnel: 0.6, slot: 0, eyes: 0, panel: 0,
    legs: 4, legLen: 1.5, legSplay: 0.25, legBend: 0.12, legTaper: 0.22,
    around: 0.15, limbR: 0.085,
    prongs: 2, prongLen: 1.55, spread: 0.5, prongTaper: 0.16, spout: 0,
    arms: 1, armLen: 0.3, armTilt: 0, nubs: 0,
    tex: 0.85, texScale: 44, gouge: 0.15,
  },
}

const ANCHORS: Record<ParamKey, number>[] = Object.values(ANCHOR_RECIPES)

/** Which parameter each two-finger scroll axis nudges. */
export const NUDGE_PARAMS: { vertical?: ParamKey; horizontal?: ParamKey } = {
  vertical: "squash",
  horizontal: "belly",
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 9000) + 1000
}

// mulberry32 — tiny deterministic PRNG for the design sampler
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

// how far a sampled design may wander beyond its anchor blend: fraction
// of the full range for continuous params, absolute ± for integer ones
const JITTER: Record<ParamKey, number> = {
  height: 0.1, nodes: 1, taper: 0.15, belly: 0.12, squash: 0.15, flat: 0.12,
  neck: 0.15, twin: 0.06,
  facet: 0.15, facetKind: 0.25, facetUp: 0.2, zig: 0.15,
  holes: 1, holeR: 0.15, funnel: 0.2, slot: 0.15, eyes: 0.15, panel: 0.1,
  legs: 1, legLen: 0.15, legSplay: 0.15, legBend: 0.2, legTaper: 0.15,
  around: 0.15, limbR: 0.12,
  prongs: 1, prongLen: 0.18, spread: 0.15, prongTaper: 0.15, spout: 0.2,
  arms: 1, armLen: 0.2, armTilt: 0.15, nubs: 1,
  tex: 0.12, texScale: 8, gouge: 0.2,
}

/**
 * THE generator: seed → design. One call covers the whole space — it
 * picks two anchors (sometimes leaning on a third), blends them at a
 * random weight, jitters every parameter, then applies a little
 * structural hygiene. Deterministic: the same seed always rebuilds the
 * same design.
 */
export function genParams(seed: number): Params {
  const s = (seed | 0) || 1
  const rnd = rng(s * 2654435761)

  // two anchor recipes at a random blend...
  const n = ANCHORS.length
  const a = Math.floor(rnd() * n)
  let b = Math.floor(rnd() * (n - 1))
  if (b >= a) b++
  const t = rnd()
  // ...with an occasional pull toward a third
  const c = Math.floor(rnd() * n)
  const w3 = rnd() < 0.4 ? rnd() * 0.35 : 0

  const p = { seed: s } as Params
  for (const k of PARAM_KEYS) {
    const r = PARAM_RANGES[k]
    let v = ANCHORS[a][k] + (ANCHORS[b][k] - ANCHORS[a][k]) * t
    v += (ANCHORS[c][k] - v) * w3
    const j = JITTER[k]
    if (r.step >= 1) v += Math.round((rnd() - 0.5) * 2 * j)
    else v += (rnd() - 0.5) * 2 * j * (r.max - r.min)
    v = Math.min(r.max, Math.max(r.min, v))
    p[k] = r.step >= 1 ? Math.round(v) : +v.toFixed(3)
  }

  // the cut axis is free — no anchor owns a facet shape
  p.facetKind = +(rnd() * 2).toFixed(2)

  // faceted bodies are a strong motif in the references — lean a slice
  // of the space hard into crystal
  if (rnd() < 0.18) p.facet = Math.max(p.facet, +(0.75 + rnd() * 0.25).toFixed(3))

  // the twin fold is all-or-nothing: a slight fold only smears the waist
  if (p.twin < 0.12) p.twin = 0
  else if (p.twin < 0.45) p.twin = 0.45
  // ...and one seed in ten commits to it outright
  if (rnd() < 0.1) p.twin = +(0.55 + rnd() * 0.4).toFixed(3)

  // surface styles: a smooth turned-wood slice, and dense fine peen on
  // most of the heavily carved pieces
  if (rnd() < 0.15) {
    p.tex = +(p.tex * 0.12).toFixed(3)
  } else if (p.tex > 0.6 && rnd() < 0.55) {
    p.texScale = Math.max(p.texScale, Math.round(36 + rnd() * 22))
  }

  // features that ride on holes make no sense without them
  if (p.holes === 0) {
    p.slot = 0
    p.eyes = 0
    p.panel = 0
  }
  // a totem with nothing at all sprouting or pierced reads as a blob
  if (p.holes === 0 && p.legs === 0 && p.prongs === 0 && p.arms === 0) {
    p.holes = 1
  }

  // chevrons commit or vanish — a faint zig only opens razor-thin flanges
  if (p.zig < 0.25) p.zig = 0
  else if (p.zig < 0.45) p.zig = 0.45

  // stances that can actually stand: never one leg, three legs make a
  // tripod, five or more walk all the way around, two spread their feet
  if (p.legs === 1) p.legs = 2
  if (p.legs === 3) p.around = Math.max(p.around, 0.45)
  if (p.legs >= 5) p.around = Math.max(p.around, 0.75)
  if (p.legs === 2) p.legSplay = Math.max(p.legSplay, 0.18)
  p.legTaper = Math.max(p.legTaper, 0.22)

  // crowded crowns read as combs: four or more prongs are either parallel
  // candle fingers or a wide fan, never the mush in between — and shorter.
  // The twin fold doubles every prong, so it carries fewer.
  if (p.prongs >= 4) {
    p.spread = p.spread < 0.4 ? 0.08 : 0.8
    p.prongLen = Math.min(p.prongLen, 1.5)
  }
  if (p.twin > 0 && p.prongs > 3) p.prongs = 3

  // heavy peen erases crystal edges — faceted bodies carve shallower
  if (p.facet > 0.6) {
    p.tex = Math.min(p.tex, 0.6)
    p.gouge = Math.min(p.gouge, 0.4)
    p.texScale = Math.max(p.texScale, 32)
  }
  return p
}

/** The opening design: three pierced bodies, crossing antennae, hammered. */
export const DEFAULT_PARAMS: Params = { seed: 1204, ...ANCHOR_RECIPES.varde }
