import * as THREE from "three"
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js"
import { MM_PER_UNIT, type Params } from "./engine"
import { buildTotemArrays } from "./totem"
import { arraysToGeometry } from "./geometry"

// STL exports are meshed once at high resolution regardless of the live
// viewport quality, so downloads are always print-grade.
const EXPORT_RES = 288

/**
 * Build the current totem, encode it as a binary STL in millimeters
 * (slicers assume mm), standing on z = 0, and download it.
 */
export function downloadSTL(params: Params): void {
  const geo = arraysToGeometry(buildTotemArrays(params, EXPORT_RES))
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
  a.download = `totem-${params.preset}-${params.seed}.stl`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
