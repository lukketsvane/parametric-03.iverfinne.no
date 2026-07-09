"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useThree } from "@react-three/fiber"
import { PRESET_COLORS, type Params } from "@/lib/engine"
import { buildVesselArrays, gridMetaFor } from "@/lib/vessel"
import { arraysToGeometry } from "@/lib/geometry"
import type { EngineJob, EngineResult } from "@/lib/engine-worker"

// target grid cells along the largest axis — coarse while dragging,
// refined once the parameters settle. Refines are sampled by a fleet of
// slab workers across every available core, so desktops can afford grids
// fine enough for paper-thin sheets. Phones get a lighter, single-worker
// refine so regeneration never feels stuck.
const PREVIEW_RES = 96
const REFINE_RES_MOBILE = 144
const REFINE_RES = 240
const REFINE_RES_HI = 300
const REFINE_DELAY = 240

const newWorker = () =>
  new Worker(new URL("../lib/engine-worker.ts", import.meta.url))

export function EngineMesh({
  params,
  hiDetail,
  mobile,
  onFit,
}: {
  params: Params
  hiDetail: boolean
  mobile: boolean
  onFit?: (radius: number, centerY: number) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const invalidate = useThree((s) => s.invalidate)

  const genRef = useRef(0)

  // two lanes: a persistent fast worker for previews, and a killable
  // fleet for long refines — a stale refine is terminated instead of
  // awaited, so switching presets or dragging never waits behind an old
  // build
  const previewWorker = useRef<Worker | null>(null)
  const previewBusy = useRef(false)
  const previewPending = useRef<EngineJob | null>(null)
  const refineFleet = useRef<Worker[]>([])
  const workersDead = useRef(false)

  const killRefine = () => {
    for (const w of refineFleet.current) w.terminate()
    refineFleet.current = []
  }

  const swap = (geo: THREE.BufferGeometry) => {
    const mesh = meshRef.current
    if (!mesh) {
      geo.dispose()
      return
    }
    // stand the vessel on the floor plane at y = 0
    geo.computeBoundingBox()
    const bb = geo.boundingBox
    if (bb) {
      geo.translate(0, -bb.min.y, 0)
      // report the grounded piece's size so the camera can frame it
      const w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z)
      const h = bb.max.y - bb.min.y
      onFit?.(Math.hypot(w, h) / 2, h / 2)
    }
    const old = mesh.geometry
    mesh.geometry = geo
    old?.dispose()
    invalidate()
  }

  const applyMesh = (r: EngineResult) => {
    if (r.kind !== "mesh" || r.gen !== genRef.current) return
    const { positions, normals, indices } = r
    swap(arraysToGeometry({ positions, normals, indices }))
  }

  const postPreview = (job: EngineJob) => {
    if (workersDead.current) {
      if (job.kind === "build")
        swap(arraysToGeometry(buildVesselArrays(job.params, job.res)))
      return
    }
    if (!previewWorker.current) {
      try {
        const w = newWorker()
        w.onmessage = (e: MessageEvent<EngineResult>) => {
          applyMesh(e.data)
          const pending = previewPending.current
          previewPending.current = null
          if (pending) w.postMessage(pending)
          else previewBusy.current = false
        }
        w.onerror = () => {
          workersDead.current = true
        }
        previewWorker.current = w
      } catch {
        workersDead.current = true
        if (job.kind === "build")
          swap(arraysToGeometry(buildVesselArrays(job.params, job.res)))
        return
      }
    }
    if (previewBusy.current) {
      previewPending.current = job
    } else {
      previewBusy.current = true
      previewWorker.current.postMessage(job)
    }
  }

  /**
   * High-res refine: split the grid into z-slabs, sample them on a fleet
   * of workers in parallel (one per core), then hand the assembled field
   * to one last worker for surface extraction.
   */
  const postRefine = (gen: number, params: Params, res: number) => {
    if (workersDead.current) return
    killRefine()
    let meta
    try {
      meta = gridMetaFor(params, res)
    } catch {
      return
    }
    const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4
    const lanes = Math.min(8, Math.max(1, cores - 1))
    const chunk = Math.max(4, Math.ceil(meta.nz / lanes))
    const jobs: { z0: number; z1: number }[] = []
    for (let z0 = 0; z0 < meta.nz; z0 += chunk)
      jobs.push({ z0, z1: Math.min(meta.nz, z0 + chunk) })

    const slabs: { z0: number; field: Float32Array }[] = []
    try {
      for (const { z0, z1 } of jobs) {
        const w = newWorker()
        refineFleet.current.push(w)
        w.onmessage = (e: MessageEvent<EngineResult>) => {
          const r = e.data
          if (r.kind !== "slab" || r.gen !== genRef.current) return
          slabs.push({ z0: r.z0, field: r.field })
          w.terminate()
          if (slabs.length !== jobs.length) return
          // all slabs in — mesh on one final worker
          try {
            const mw = newWorker()
            refineFleet.current.push(mw)
            mw.onmessage = (me: MessageEvent<EngineResult>) => {
              applyMesh(me.data)
              killRefine()
            }
            mw.onerror = () => killRefine()
            const job: EngineJob = { kind: "mesh", gen, meta, slabs }
            mw.postMessage(job, slabs.map((s) => s.field.buffer as ArrayBuffer))
          } catch {
            killRefine()
          }
        }
        w.onerror = () => killRefine()
        const job: EngineJob = { kind: "slab", gen, params, res, z0, z1 }
        w.postMessage(job)
      }
    } catch {
      killRefine()
    }
  }

  useEffect(() => {
    return () => {
      previewWorker.current?.terminate()
      previewWorker.current = null
      killRefine()
    }
  }, [])

  useEffect(() => {
    const gen = ++genRef.current
    postPreview({ kind: "build", gen, params, res: PREVIEW_RES })
    const refineRes = hiDetail
      ? REFINE_RES_HI
      : mobile
        ? REFINE_RES_MOBILE
        : REFINE_RES
    const id = window.setTimeout(() => {
      if (gen === genRef.current) {
        postRefine(gen, params, refineRes)
      }
    }, REFINE_DELAY)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, hiDetail, mobile])

  useEffect(() => {
    const mesh = meshRef.current
    return () => mesh?.geometry?.dispose()
  }, [])

  const tint = PRESET_COLORS[params.preset] ?? "#f3f0e9"

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      {/* matte slip-cast body under a faint sheen, tinted per family */}
      <meshPhysicalMaterial
        color={tint}
        roughness={0.62}
        metalness={0}
        clearcoat={0.25}
        clearcoatRoughness={0.6}
        envMapIntensity={0.7}
      />
    </mesh>
  )
}
