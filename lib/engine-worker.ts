import {
  buildVesselArrays,
  makeSampler,
  meshField,
  type GridMeta,
} from "./vessel"
import type { Params } from "./engine"

/**
 * Meshing worker: keeps field sampling + marching cubes off the main
 * thread so slider drags stay responsive.
 *
 * Three job kinds:
 *  - build: sample + mesh in one go (fast previews, fallbacks)
 *  - slab:  sample one z-slab of the grid — a fleet of these runs in
 *    parallel across every core for high-resolution refines
 *  - mesh:  assemble transferred slabs and extract the surface
 */
export type EngineJob =
  | { kind: "build"; gen: number; params: Params; res: number }
  | { kind: "slab"; gen: number; params: Params; res: number; z0: number; z1: number }
  | { kind: "mesh"; gen: number; meta: GridMeta; slabs: { z0: number; field: Float32Array }[] }

export type SlabResult = { kind: "slab"; gen: number; z0: number; field: Float32Array }
export type MeshResult = {
  kind: "mesh"
  gen: number
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
}
export type EngineResult = SlabResult | MeshResult

const post = (msg: EngineResult, buffers: ArrayBufferLike[]) =>
  (self as unknown as Worker).postMessage(msg, buffers as ArrayBuffer[])

self.onmessage = (e: MessageEvent<EngineJob>) => {
  const job = e.data
  if (job.kind === "build") {
    const { positions, normals, indices } = buildVesselArrays(job.params, job.res)
    post({ kind: "mesh", gen: job.gen, positions, normals, indices }, [
      positions.buffer,
      normals.buffer,
      indices.buffer,
    ])
  } else if (job.kind === "slab") {
    const sampler = makeSampler(job.params, job.res)
    const field = sampler.fill(job.z0, job.z1)
    post({ kind: "slab", gen: job.gen, z0: job.z0, field }, [field.buffer])
  } else {
    const { meta, slabs } = job
    const field = new Float32Array(meta.nx * meta.ny * meta.nz)
    for (const s of slabs) field.set(s.field, meta.nx * meta.ny * s.z0)
    const { positions, normals, indices } = meshField(meta, field)
    post({ kind: "mesh", gen: job.gen, positions, normals, indices }, [
      positions.buffer,
      normals.buffer,
      indices.buffer,
    ])
  }
}
