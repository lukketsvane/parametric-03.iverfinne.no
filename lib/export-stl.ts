import * as THREE from "three"
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js"
import { MM_PER_UNIT, genName, type Params } from "./engine"
import { buildTotemArrays, type TotemMeshArrays } from "./totem"
import { arraysToGeometry } from "./geometry"
import type { EngineJob, EngineResult } from "./engine-worker"

// the file is named after the piece — its signature or spoken name
function fileSlug(p: Params): string {
  const name = (p.sig?.trim() || genName(p.seed))
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
  return name || "totem"
}

// STL exports are meshed once at high resolution regardless of the live
// viewport quality, so downloads are always print-grade.
const EXPORT_RES = 416

// one export at a time — a build this dense takes a few seconds
let exporting = false

/**
 * Build the current totem, encode it as a binary STL in millimeters
 * (slicers assume mm), standing on z = 0, and download it. The dense
 * export mesh is sampled on a worker so the page never freezes; where
 * workers are unavailable it falls back to meshing inline.
 */
export function downloadSTL(params: Params): void {
  if (exporting) return
  exporting = true

  const finish = (arrays: TotemMeshArrays) => {
    exporting = false
    const geo = arraysToGeometry(arrays)
    geo.scale(MM_PER_UNIT, MM_PER_UNIT, MM_PER_UNIT)
    // stand on the build plate: z up, base at z = 0
    geo.rotateX(Math.PI / 2)
    geo.computeBoundingBox()
    if (geo.boundingBox) geo.translate(0, 0, -geo.boundingBox.min.z)
    const mesh = new THREE.Mesh(geo)
    const data = new STLExporter().parse(mesh, { binary: true }) as unknown as DataView
    geo.dispose()

    const blob = new Blob([data], { type: "model/stl" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `totem-${fileSlug(params)}-${params.seed}.stl`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  // STL carries no color — skip the finish bake
  const inline = () => finish(buildTotemArrays(params, EXPORT_RES, false))

  try {
    const w = new Worker(new URL("./engine-worker.ts", import.meta.url))
    w.onmessage = (e: MessageEvent<EngineResult>) => {
      w.terminate()
      if (e.data.kind === "mesh") finish(e.data)
      else exporting = false
    }
    w.onerror = () => {
      w.terminate()
      inline()
    }
    const job: EngineJob = { kind: "build", gen: 0, params, res: EXPORT_RES, bake: false }
    w.postMessage(job)
  } catch {
    inline()
  }
}
