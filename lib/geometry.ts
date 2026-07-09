import * as THREE from "three"
import type { TotemMeshArrays } from "./totem"

/** Wrap raw builder arrays in an indexed BufferGeometry. */
export function arraysToGeometry({
  positions,
  normals,
  indices,
}: TotemMeshArrays): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  return geo
}
