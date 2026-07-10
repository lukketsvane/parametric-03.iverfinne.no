import { marchGrid, type Grid } from "./marching-cubes"
import type { Params } from "./engine"

/**
 * The totem motor: parameters → scalar field → watertight mesh.
 *
 * Everything is one signed-distance-ish field:
 *
 *   1. hubs    one to four bodies stacked on the y axis — anisotropic
 *              spheres (squash = height, flat = depth) that crossfade
 *              into faceted polyhedra (the cut is itself continuous,
 *              diamond → dodeca → icosa), fused by a smooth neck; zigzag
 *              chevron beads can fill the joints between them; a twin
 *              fold (|x| − offset) doubles the whole piece into two
 *              side-by-side lobes pinched at a shared waist
 *   2. holes   funnel-countersunk bores through the hubs along z —
 *              round eyes, vertically stretched slots, side-by-side
 *              pairs, optionally sunk into a square recessed panel
 *   3. limbs   tapered capsules smooth-blended at their roots: bowed
 *              legs fanning from the base hub (in-plane X stances or
 *              full tripod/spider circles), antenna prongs from the
 *              crown (needle spikes to parallel candle fingers), short
 *              side arms at the equators, teat nubs underneath, one
 *              optional spout on top
 *   4. carve   the whole body is displaced near the surface — cellular
 *              scallop dimples (every Worley cell one hammer blow, the
 *              crisp ridges landing exactly on the cell walls)
 *              crossfading into long directional gouges
 *
 * Every organic accident (hub swelling, hole drift, limb jitter) is
 * seeded, so a design is exactly reproducible from its parameters.
 *
 * Sampling is splittable: makeSampler() exposes fill(z0, z1) so a fleet
 * of workers can compute grid slabs in parallel and meshField() extracts
 * the surface from the assembled field.
 */

export type TotemMeshArrays = {
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
}

export type GridMeta = {
  nx: number
  ny: number
  nz: number
  ox: number
  oy: number
  oz: number
  cell: number
}

const TAU = Math.PI * 2

/* ---------------------------------- noise --------------------------------- */

// integer lattice hash → [0,1)
function ih(x: number, y: number, z: number, s: number): number {
  let n =
    Math.imul(x, 374761393) ^
    Math.imul(y, 668265263) ^
    Math.imul(z, 1274126177) ^
    Math.imul(s, 39916801)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  n ^= n >>> 16
  return (n >>> 0) / 4294967296
}

// trilinear value noise, ~[0,1]
function vnoise3(x: number, y: number, z: number, s: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = x - xi
  const yf = y - yi
  const zf = z - zi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const w = zf * zf * (3 - 2 * zf)
  const c000 = ih(xi, yi, zi, s)
  const c100 = ih(xi + 1, yi, zi, s)
  const c010 = ih(xi, yi + 1, zi, s)
  const c110 = ih(xi + 1, yi + 1, zi, s)
  const c001 = ih(xi, yi, zi + 1, s)
  const c101 = ih(xi + 1, yi, zi + 1, s)
  const c011 = ih(xi, yi + 1, zi + 1, s)
  const c111 = ih(xi + 1, yi + 1, zi + 1, s)
  const x00 = c000 + (c100 - c000) * u
  const x10 = c010 + (c110 - c010) * u
  const x01 = c001 + (c101 - c001) * u
  const x11 = c011 + (c111 - c011) * u
  const y0 = x00 + (x10 - x00) * v
  const y1 = x01 + (x11 - x01) * v
  return y0 + (y1 - y0) * w
}

// centered seeded jitter in [-1, 1]
function jit(a: number, b: number, seed: number): number {
  return ih(a, b, 101, seed) * 2 - 1
}

// Worley F1 — distance to the nearest jittered feature point. One hammer
// blow per cell: the cups sit at the features, the crisp ridges land on
// the cell walls. A single hash per cell is sliced into the three jitter
// coordinates.
function worleyF1(x: number, y: number, z: number, s: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  let best = 8
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dz = -1; dz <= 1; dz++) {
        const cx = xi + dx
        const cy = yi + dy
        const cz = zi + dz
        let n =
          Math.imul(cx, 374761393) ^
          Math.imul(cy, 668265263) ^
          Math.imul(cz, 1274126177) ^
          Math.imul(s, 39916801)
        n = Math.imul(n ^ (n >>> 13), 1274126177)
        n ^= n >>> 16
        const u = n >>> 0
        const fx = cx + ((u & 1023) + 0.5) / 1024 - x
        const fy = cy + (((u >>> 10) & 1023) + 0.5) / 1024 - y
        const fz = cz + (((u >>> 20) & 1023) + 0.5) / 1024 - z
        const d2 = fx * fx + fy * fy + fz * fz
        if (d2 < best) best = d2
      }
  return Math.sqrt(best)
}

/* --------------------------------- helpers -------------------------------- */

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

// polynomial smooth union
function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b)
  const h = clamp01(0.5 + (0.5 * (b - a)) / k)
  return b + (a - b) * h - k * h * (1 - h)
}

/* ------------------------------ facet planes ------------------------------ */

const PHI = (1 + Math.sqrt(5)) / 2

type Vec3 = [number, number, number]

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

// rotate the whole set around x so one dodeca face looks straight at +z —
// pieces read as plaques with a pentagon (or crystal face) toward the viewer
function rotX(v: Vec3, ang: number): Vec3 {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]
}

function buildPlanes(raw: Vec3[]): Float32Array {
  const ang = -Math.atan2(1, PHI)
  const out = new Float32Array(raw.length * 3)
  raw.forEach((r, i) => {
    const n = rotX(normalize(r), ang)
    out[i * 3] = n[0]
    out[i * 3 + 1] = n[1]
    out[i * 3 + 2] = n[2]
  })
  return out
}

const OCTA_RAW: Vec3[] = []
for (const sx of [-1, 1])
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) OCTA_RAW.push([sx, sy, sz])

const DODECA_RAW: Vec3[] = []
for (const a of [-1, 1])
  for (const b of [-PHI, PHI]) {
    DODECA_RAW.push([0, a, b], [a, b, 0], [b, 0, a])
  }

const ICOSA_RAW: Vec3[] = [...OCTA_RAW]
for (const a of [-1 / PHI, 1 / PHI])
  for (const b of [-PHI, PHI]) {
    ICOSA_RAW.push([0, a, b], [a, b, 0], [b, 0, a])
  }

// plane sets + inradius factors tuned so faceted hubs read the same size
// as their round originals
const PLANE_SETS: { n: Float32Array; k: number }[] = [
  { n: buildPlanes(OCTA_RAW), k: 0.6 }, // diamond
  { n: buildPlanes(DODECA_RAW), k: 0.82 }, // dodecahedron
  { n: buildPlanes(ICOSA_RAW), k: 0.78 }, // icosahedron
]

/* ---------------------------------- plan ---------------------------------- */

type Hub = {
  cy: number
  rx: number
  ry: number
  rz: number
  w: number // facet crossfade weight
}

type Seg = {
  ax: number
  ay: number
  az: number
  bx: number
  by: number
  bz: number
  ra: number
  rb: number
}

type Hole = {
  hx: number
  hy: number
  hr: number
  stretch: number // vertical slot half-extension
  rz: number // depth radius of the host hub, for the funnel
}

type Panel = { cx: number; cy: number; a: number; zP: number } | null

type Plan = {
  S: number // world scale: field is built at unit scale, queried at /S
  hubs: Hub[]
  minis: Hub[] // zigzag chevron beads (always diamond-cut)
  segs: Seg[]
  holes: Hole[]
  panel: Panel
  // the cut crossfades between two adjacent plane sets
  planesA: Float32Array
  planeKA: number
  planesB: Float32Array
  planeKB: number
  facetMix: number
  twinOff: number // |x| fold offset — 0 keeps a single body
  neckK: number
  holeFunnel: number
  seed: number
  tex: number
  texScale: number
  gouge: number
  // world-space bounds (already scaled by S)
  bounds: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }
}

function computePlan(p: Params): Plan {
  const seed = (p.seed | 0) || 1
  const n = Math.max(1, Math.round(p.nodes))

  /* hubs — stacked bottom (0) to top (n-1) */
  const hubs: Hub[] = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    const r =
      p.belly * (1 + (p.taper - 1) * t) * (1 + 0.05 * jit(i, 1, seed))
    const w =
      p.facet * clamp01(n === 1 ? 1 : 1 + p.facetUp * (n - 1) - i)
    hubs.push({ cy: 0, rx: r, ry: r * p.squash, rz: r * p.flat, w })
  }
  let cy = 0
  for (let i = 1; i < n; i++) {
    const a = hubs[i - 1]
    const b = hubs[i]
    const overlap = 0.18 * Math.min(a.ry, b.ry)
    const zgap = p.zig * 0.95 * Math.min(a.ry, b.ry)
    cy += a.ry + b.ry - overlap + zgap
    b.cy = cy
  }

  /* zigzag beads between separated hubs — gated on a committed zig and
     floored in height so they read as chunky chevrons, never razor discs */
  const minis: Hub[] = []
  if (p.zig > 0.3) {
    for (let i = 1; i < n; i++) {
      const a = hubs[i - 1]
      const b = hubs[i]
      const y0 = a.cy + a.ry * 0.5
      const y1 = b.cy - b.ry * 0.5
      if (y1 - y0 < 0.05) continue
      const m = 3
      const rr = Math.min(a.rx, b.rx) * (0.55 + 0.3 * p.zig)
      const hh = Math.max(((y1 - y0) / m) * 0.85, rr * 0.33)
      for (let k = 0; k < m; k++) {
        const my = y0 + ((k + 0.5) / m) * (y1 - y0)
        minis.push({ cy: my, rx: rr, ry: hh, rz: rr * p.flat, w: 1 })
      }
    }
  }

  const bottom = hubs[0]
  const top = hubs[n - 1]
  // primary hub: the largest body carries the extra holes, slot and panel
  let prim = 0
  for (let i = 1; i < n; i++) if (hubs[i].rx > hubs[prim].rx) prim = i

  /* limbs */
  const segs: Seg[] = []
  const limbR = p.limbR

  // legs — quadratic bows from the base hub, sampled as tapered capsules.
  // Every foot lands on one shared ground line just below the belly so the
  // piece actually stands: length jitter goes into the sideways reach only,
  // and legs are always long enough to clear the hub underside.
  const legs = Math.round(p.legs)
  const legLen = Math.max(p.legLen, bottom.ry * 0.45 + 0.1)
  for (let j = 0; j < legs; j++) {
    const az = (TAU * (j + 0.5)) / legs + Math.PI / 2
    let dx = Math.sin(az)
    let dz = Math.cos(az) * (0.1 + 0.9 * p.around)
    dz += 0.06 * jit(j, 2, seed) // coplanar stances still read as two limbs
    const dl = Math.hypot(dx, dz) || 1
    dx /= dl
    dz /= dl
    const L = legLen
    const reach = p.legSplay * L * (1 + 0.1 * jit(j, 3, seed))
    const ax = dx * bottom.rx * 0.6
    const ay = bottom.cy - bottom.ry * 0.55
    const az2 = dz * bottom.rz * 0.6
    const fx = ax + dx * reach
    const fy = ay - L
    const fz = az2 + dz * reach
    // control point pushed outward for the bowed knee
    const kx = (ax + fx) / 2 + dx * p.legBend * L * 0.42
    const ky = (ay + fy) / 2 + L * 0.06 * p.legBend
    const kz = (az2 + fz) / 2 + dz * p.legBend * L * 0.42
    const ra = limbR * 1.2
    const rb = limbR * p.legTaper
    const STEPS = 4
    let px = ax
    let py = ay
    let pz = az2
    for (let s = 1; s <= STEPS; s++) {
      const t = s / STEPS
      const u = 1 - t
      const qx = u * u * ax + 2 * u * t * kx + t * t * fx
      const qy = u * u * ay + 2 * u * t * ky + t * t * fy
      const qz = u * u * az2 + 2 * u * t * kz + t * t * fz
      segs.push({
        ax: px, ay: py, az: pz, bx: qx, by: qy, bz: qz,
        ra: ra + (rb - ra) * ((s - 1) / STEPS),
        rb: ra + (rb - ra) * t,
      })
      px = qx
      py = qy
      pz = qz
    }
  }

  // prongs — antennae rising from the crown; spread 0 keeps them parallel
  const prongs = Math.round(p.prongs)
  for (let k = 0; k < prongs; k++) {
    const u = prongs === 1 ? 0 : (k / (prongs - 1)) * 2 - 1
    const tilt = u * p.spread * 0.72
    const L = p.prongLen * (1 + 0.07 * jit(k, 4, seed))
    const ax = u * top.rx * 0.68
    const ay = top.cy + top.ry * 0.4
    const az = 0.04 * jit(k, 5, seed)
    segs.push({
      ax, ay, az,
      bx: ax + Math.sin(tilt) * L,
      by: ay + Math.cos(tilt) * L,
      bz: az,
      ra: limbR * 0.95,
      rb: limbR * p.prongTaper,
    })
  }

  // spout — one blunt stub straight up from the crown
  if (p.spout > 0.02) {
    const L = p.spout * (0.12 + top.rx * 0.45)
    segs.push({
      ax: 0, ay: top.cy + top.ry * 0.7, az: 0,
      bx: 0, by: top.cy + top.ry * 0.7 + L, bz: 0,
      ra: limbR * 1.1, rb: limbR * 0.75,
    })
  }

  // arms — ±x stub pairs on the largest bodies first; girth follows the
  // host body so stubs read carved-on rather than pinned-in
  const arms = Math.min(Math.round(p.arms), n)
  const bySize = hubs
    .map((h, i) => i)
    .sort((a, b) => hubs[b].rx - hubs[a].rx)
  for (let a = 0; a < arms; a++) {
    const h = hubs[bySize[a]]
    const L = p.armLen + h.rx * 0.2
    const ay = h.cy + 0.1 * h.ry * jit(a, 6, seed)
    const ra = limbR * 1.05 + h.rx * 0.05
    for (const sx of [-1, 1]) {
      segs.push({
        ax: sx * h.rx * 0.75, ay, az: 0,
        bx: sx * (h.rx * 0.75 + L), by: ay + p.armTilt * L, bz: 0,
        ra, rb: ra * 0.72,
      })
    }
  }

  // nubs — short teats hanging under the base hub, never reaching past
  // its underside (a dangling teat must not become the foot)
  const nubs = Math.round(p.nubs)
  for (let k = 0; k < nubs; k++) {
    const dx = (k - (nubs - 1) / 2) * limbR * 3
    const L = Math.min(0.12 + limbR * 2, bottom.ry * 0.26)
    segs.push({
      ax: dx, ay: bottom.cy - bottom.ry * 0.72, az: 0,
      bx: dx * 1.25, by: bottom.cy - bottom.ry * 0.72 - L, bz: 0,
      ra: limbR * 0.85, rb: limbR * 0.55,
    })
  }

  /* needle tips thinner than the sampling grid fragment into floating
     crumbs (and unprintable islands) — floor every limb radius at just
     over one refine-grid cell in world units. Radii live in plan units,
     so the floor is divided by the world scale the piece will get. */
  {
    let sy0 = Infinity
    let sy1 = -Infinity
    for (const h of hubs) {
      sy0 = Math.min(sy0, h.cy - h.ry)
      sy1 = Math.max(sy1, h.cy + h.ry)
    }
    for (const s of segs) {
      const r = Math.max(s.ra, s.rb)
      sy0 = Math.min(sy0, s.ay - r, s.by - r)
      sy1 = Math.max(sy1, s.ay + r, s.by + r)
    }
    const tipFloor = (0.017 * Math.max(0.001, sy1 - sy0)) / p.height
    for (const s of segs) {
      s.ra = Math.max(s.ra, tipFloor)
      s.rb = Math.max(s.rb, tipFloor)
    }
  }

  /* holes — every pierced body gets one; extras stack inside the primary.
     Strong `eyes` pulls the whole cluster onto the primary body instead
     (twin eyes, triple slots) and fans it out horizontally. */
  const holes: Hole[] = []
  const hCount = Math.round(p.holes)
  if (hCount > 0) {
    const concentrate = p.eyes >= 0.5
    const pierced = concentrate
      ? [prim]
      : bySize.slice(0, Math.min(hCount, n))
    const extra = hCount - pierced.length
    for (const i of pierced) {
      const h = hubs[i]
      const isPrim = i === prim
      const m = isPrim ? 1 + extra : 1
      const shrink = 1 / (1 + 0.4 * (m - 1))
      for (let k = 0; k < m; k++) {
        const off =
          m === 1 ? 0 : (k - (m - 1) / 2) * h.rx * (m === 2 ? 0.52 : 0.46)
        const hr =
          p.holeR * h.rx * shrink * (1 + 0.15 * jit(i * 7 + k, 8, seed))
        holes.push({
          hx: p.eyes * off,
          hy: h.cy + (1 - p.eyes) * off + 0.08 * h.ry * jit(i * 7 + k, 9, seed),
          hr,
          stretch: isPrim ? p.slot * h.ry * 0.42 : 0,
          rz: h.rz,
        })
      }
    }
  }

  /* panel — a sunken rounded square around the primary hub's holes */
  let panel: Panel = null
  if (p.panel > 0.02 && hCount > 0) {
    const h = hubs[prim]
    panel = {
      cx: 0,
      cy: h.cy,
      a: h.rx * (0.5 + 0.18 * p.panel),
      zP: h.rz * (1 - 0.42 * p.panel),
    }
  }

  // continuous cut: 0..1 fades diamond → dodeca, 1..2 dodeca → icosa
  const kf = Math.max(0, Math.min(2, p.facetKind))
  const kLo = kf >= 1 ? 1 : 0
  const setA = PLANE_SETS[kLo]
  const setB = PLANE_SETS[kLo + 1]

  /* twin fold — two side-by-side lobes pinched at a shared waist */
  let maxRx = 0
  for (const h of hubs) maxRx = Math.max(maxRx, h.rx)
  const twinOff = p.twin > 0.04 ? p.twin * maxRx * 0.9 : 0

  /* bounds — swept over every primitive, padded for carve + blend */
  let x1 = 0
  let y0 = Infinity
  let y1 = -Infinity
  let z1 = 0
  for (const h of [...hubs, ...minis]) {
    x1 = Math.max(x1, h.rx)
    y0 = Math.min(y0, h.cy - h.ry)
    y1 = Math.max(y1, h.cy + h.ry)
    z1 = Math.max(z1, h.rz)
  }
  for (const s of segs) {
    const r = Math.max(s.ra, s.rb)
    x1 = Math.max(x1, Math.abs(s.ax) + r, Math.abs(s.bx) + r)
    y0 = Math.min(y0, s.ay - r, s.by - r)
    y1 = Math.max(y1, s.ay + r, s.by + r)
    z1 = Math.max(z1, Math.abs(s.az) + r, Math.abs(s.bz) + r)
  }
  x1 += twinOff
  // the height slider is the piece's true overall height: whatever the
  // limbs and stack add up to is scaled to exactly p.height world units
  const S = p.height / Math.max(0.001, y1 - y0)
  const pad = 0.1 + p.tex * 0.04
  x1 += pad
  y0 -= pad
  y1 += pad
  z1 += pad

  return {
    S,
    hubs,
    minis,
    segs,
    holes,
    panel,
    planesA: setA.n,
    planeKA: setA.k,
    planesB: setB.n,
    planeKB: setB.k,
    facetMix: kf - kLo,
    twinOff,
    neckK: p.neck * Math.min(...hubs.map((h) => h.rx)),
    holeFunnel: p.funnel,
    seed,
    tex: p.tex,
    texScale: p.texScale,
    gouge: p.gouge,
    bounds: {
      x0: -x1 * S,
      x1: x1 * S,
      y0: y0 * S,
      y1: y1 * S,
      z0: -z1 * S,
      z1: z1 * S,
    },
  }
}

/* ---------------------------------- field --------------------------------- */

// texture displacement is only resolved this close to the surface
const TEX_BAND = 0.09

function fieldAt(plan: Plan, wx: number, wy: number, wz: number): number {
  const { S, hubs, minis, segs, holes, panel, planesA, planeKA, planesB, planeKB, facetMix, neckK } = plan
  let x = wx / S
  const y = wy / S
  const z = wz / S
  // twin fold: |x| − offset places a full mirrored copy of the piece in
  // each lobe, hard-unioned at the x = 0 waist
  if (plan.twinOff > 0) x = Math.abs(x) - plan.twinOff

  /* hubs, smooth-fused into one spine */
  let d = Infinity
  for (let i = 0; i < hubs.length; i++) {
    const h = hubs[i]
    const qx = x / h.rx
    const qy = (y - h.cy) / h.ry
    const qz = z / h.rz
    const m = Math.min(h.rx, h.ry, h.rz)
    let dh = (Math.hypot(qx, qy, qz) - 1) * m
    if (h.w > 0) {
      let dfA = -Infinity
      for (let k = 0; k < planesA.length; k += 3) {
        const t = qx * planesA[k] + qy * planesA[k + 1] + qz * planesA[k + 2]
        if (t > dfA) dfA = t
      }
      let f = dfA - planeKA
      if (facetMix > 0) {
        let dfB = -Infinity
        for (let k = 0; k < planesB.length; k += 3) {
          const t = qx * planesB[k] + qy * planesB[k + 1] + qz * planesB[k + 2]
          if (t > dfB) dfB = t
        }
        f += (dfB - planeKB - f) * facetMix
      }
      dh += (f * m - dh) * h.w
    }
    d = i === 0 ? dh : smin(d, dh, neckK)
  }

  /* zigzag beads — always diamond-cut */
  const octa = PLANE_SETS[0].n
  for (const h of minis) {
    const qx = x / h.rx
    const qy = (y - h.cy) / h.ry
    const qz = z / h.rz
    const m = Math.min(h.rx, h.ry, h.rz)
    let df = -Infinity
    for (let k = 0; k < octa.length; k += 3) {
      const t = qx * octa[k] + qy * octa[k + 1] + qz * octa[k + 2]
      if (t > df) df = t
    }
    d = smin(d, (df - PLANE_SETS[0].k) * m, 0.03)
  }

  /* limbs — their raw distance is tracked so the carve can spare them */
  const dBody = d
  let dLimb = Infinity
  for (const s of segs) {
    const pax = x - s.ax
    const pay = y - s.ay
    const paz = z - s.az
    const bax = s.bx - s.ax
    const bay = s.by - s.ay
    const baz = s.bz - s.az
    const hh = clamp01(
      (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz),
    )
    const ds =
      Math.hypot(pax - bax * hh, pay - bay * hh, paz - baz * hh) -
      (s.ra + (s.rb - s.ra) * hh)
    if (ds < dLimb) dLimb = ds
    d = smin(d, ds, 0.04)
  }

  /* panel recess — carve the faces down around the hole cluster */
  if (panel) {
    const bx = Math.abs(x - panel.cx) - panel.a
    const by = Math.abs(y - panel.cy) - panel.a
    const round = panel.a * 0.25
    const box =
      Math.hypot(Math.max(bx + round, 0), Math.max(by + round, 0)) - round
    const cut = Math.max(box, panel.zP - Math.abs(z))
    d = Math.max(d, -cut)
  }

  /* holes — funnel-countersunk bores straight through z */
  for (const ho of holes) {
    const qx = x - ho.hx
    const qy = Math.max(Math.abs(y - ho.hy) - ho.stretch, 0)
    let cut = Math.hypot(qx, qy) - ho.hr
    cut -= 1.35 * plan.holeFunnel * Math.max(0, Math.abs(z) - 0.18 * ho.rz)
    d = Math.max(d, -cut)
  }

  /* carve — scalloped peen chips crossfading into directional gouges.
     Limbs keep a turned-smooth skin: the carve fades wherever a limb, not
     the body, is the nearest surface, so thin legs stop reading as drips. */
  if (plan.tex > 0 && Math.abs(d) < TEX_BAND) {
    const wLimb = clamp01(0.5 + (dBody - dLimb) * 9)
    const texAmp = plan.tex * (1 - 0.78 * wLimb)
    if (texAmp > 0.002) {
      const s = plan.texScale
      // hammer physics: fine peen strikes shallow, coarse chips dig deep
      const depth = Math.min(1.3, Math.max(0.6, 34 / s))
      let disp = 0
      if (plan.gouge < 1) {
        // one hammer blow per cell: a shallow cup at each feature point,
        // crisp ridges standing where neighbouring cups meet
        const f1 = worleyF1(x * s, y * s, z * s, plan.seed)
        let cup = 1 - f1 * 1.45
        if (cup < 0) cup = 0
        cup *= cup * (3 - 2 * cup)
        disp += (1 - plan.gouge) * 0.023 * depth * (cup - 0.38)
      }
      if (plan.gouge > 0) {
        // long strokes: value noise stretched along y, ridged
        const gou = vnoise3(x * s * 0.9, y * s * 0.28, z * s * 0.9, plan.seed + 7)
        let ridge = 1 - Math.abs(gou - 0.5) * 2
        ridge *= ridge * (3 - 2 * ridge)
        disp += plan.gouge * 0.017 * depth * (ridge - 0.45)
      }
      const micro = vnoise3(x * s * 2.7, y * s * 2.7, z * s * 2.7, plan.seed + 13)
      d += texAmp * (disp + 0.003 * (micro - 0.5))
    }
  }

  return d * S
}

/* --------------------------------- meshing -------------------------------- */

export function gridMetaFor(p: Params, res: number): GridMeta {
  const b = computePlan(p).bounds
  const ex = b.x1 - b.x0
  const ey = b.y1 - b.y0
  const ez = b.z1 - b.z0
  const cell = Math.max(ex, ey, ez) / res
  return {
    nx: Math.ceil(ex / cell) + 2,
    ny: Math.ceil(ey / cell) + 2,
    nz: Math.ceil(ez / cell) + 2,
    ox: b.x0 - cell / 2,
    oy: b.y0 - cell / 2,
    oz: b.z0 - cell / 2,
    cell,
  }
}

/** Splittable sampler: fill() computes the field for one z-slab. */
export function makeSampler(
  p: Params,
  res: number,
): { meta: GridMeta; fill: (z0: number, z1: number) => Float32Array } {
  const plan = computePlan(p)
  const meta = gridMetaFor(p, res)
  const { nx, ny, ox, oy, oz, cell } = meta

  function fill(z0: number, z1: number): Float32Array {
    const field = new Float32Array(nx * ny * (z1 - z0))
    let i = 0
    for (let zi = z0; zi < z1; zi++) {
      const wz = oz + zi * cell
      for (let yi = 0; yi < ny; yi++) {
        const wy = oy + yi * cell
        for (let xi = 0; xi < nx; xi++) {
          field[i++] = fieldAt(plan, ox + xi * cell, wy, wz)
        }
      }
    }
    return field
  }

  return { meta, fill }
}

/** Extract the surface from a fully assembled field. */
export function meshField(meta: GridMeta, field: Float32Array): TotemMeshArrays {
  const grid: Grid = { ...meta, field }
  const { positions, indices } = marchGrid(grid)
  return { positions, normals: buildNormals(positions, indices), indices }
}

/** Single-threaded build: sample everything, then mesh. */
export function buildTotemArrays(p: Params, res: number): TotemMeshArrays {
  const sampler = makeSampler(p, res)
  return meshField(sampler.meta, sampler.fill(0, sampler.meta.nz))
}

/** Area-weighted smooth vertex normals — dense MC meshes shade well with these. */
function buildNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length)
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3
    const b = indices[t + 1] * 3
    const c = indices[t + 2] * 3
    const abx = positions[b] - positions[a]
    const aby = positions[b + 1] - positions[a + 1]
    const abz = positions[b + 2] - positions[a + 2]
    const acx = positions[c] - positions[a]
    const acy = positions[c + 1] - positions[a + 1]
    const acz = positions[c + 2] - positions[a + 2]
    const nx = aby * acz - abz * acy
    const ny = abz * acx - abx * acz
    const nz = abx * acy - aby * acx
    normals[a] += nx
    normals[a + 1] += ny
    normals[a + 2] += nz
    normals[b] += nx
    normals[b + 1] += ny
    normals[b + 2] += nz
    normals[c] += nx
    normals[c + 1] += ny
    normals[c + 2] += nz
  }
  for (let i = 0; i < normals.length; i += 3) {
    const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1
    normals[i] /= l
    normals[i + 1] /= l
    normals[i + 2] /= l
  }
  return normals
}
