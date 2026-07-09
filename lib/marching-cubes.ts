import { edgeTable, triTable } from "./mc-tables"

/**
 * Classic marching cubes over a scalar field sampled on a regular grid.
 * The surface is extracted at field = 0 with the convention field < 0 = inside.
 * Vertices are welded on shared grid edges so the result is an indexed,
 * watertight mesh ready for smooth normals and STL export. Pure TS — safe to
 * run inside a Web Worker.
 */
export type Grid = {
  nx: number
  ny: number
  nz: number
  /** world position of grid point (0,0,0) */
  ox: number
  oy: number
  oz: number
  /** grid spacing (cubic cells) */
  cell: number
  /** field values, indexed x + nx*(y + ny*z) */
  field: Float32Array
}

export type MeshArrays = {
  positions: Float32Array
  indices: Uint32Array
}

// Bourke cube corners: bit i set when corner i is inside (field < 0)
//   0:(0,0,0) 1:(1,0,0) 2:(1,1,0) 3:(0,1,0) 4:(0,0,1) 5:(1,0,1) 6:(1,1,1) 7:(0,1,1)
const CDX = [0, 1, 1, 0, 0, 1, 1, 0]
const CDY = [0, 0, 1, 1, 0, 0, 1, 1]
const CDZ = [0, 0, 0, 0, 1, 1, 1, 1]
// cube edge e runs from corner EDGE_CORNER_A[e] to EDGE_CORNER_B[e]
const EDGE_CORNER_A = [0, 1, 3, 0, 4, 5, 7, 4, 0, 1, 2, 3]
const EDGE_CORNER_B = [1, 2, 2, 3, 5, 6, 6, 7, 4, 5, 6, 7]
// each cube edge is a unique global grid edge: owning grid point offset + axis
// (0 = +x, 1 = +y, 2 = +z), used to weld vertices between neighboring cells
const EDX = [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0]
const EDY = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1]
const EDZ = [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0]
const EAXIS = [0, 1, 0, 1, 0, 1, 0, 1, 2, 2, 2, 2]

export function marchGrid(g: Grid): MeshArrays {
  const { nx, ny, nz, field, cell } = g
  const positions: number[] = []
  const indices: number[] = []
  // global edge id -> welded vertex index
  const edgeVerts = new Map<number, number>()
  const nxy = nx * ny

  const cornerVal = new Float32Array(8)
  const localVert = new Int32Array(12)

  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      let base = nx * (y + ny * z)
      for (let x = 0; x < nx - 1; x++, base++) {
        let cubeIndex = 0
        for (let c = 0; c < 8; c++) {
          const v = field[base + CDX[c] + nx * CDY[c] + nxy * CDZ[c]]
          cornerVal[c] = v
          if (v < 0) cubeIndex |= 1 << c
        }
        const edges = edgeTable[cubeIndex]
        if (edges === 0) continue

        for (let e = 0; e < 12; e++) {
          if (!(edges & (1 << e))) continue
          const gid =
            3 * (x + EDX[e] + nx * (y + EDY[e] + ny * (z + EDZ[e]))) + EAXIS[e]
          let vi = edgeVerts.get(gid)
          if (vi === undefined) {
            const a = EDGE_CORNER_A[e]
            const b = EDGE_CORNER_B[e]
            const va = cornerVal[a]
            const vb = cornerVal[b]
            let t = va / (va - vb)
            if (!Number.isFinite(t)) t = 0.5
            t = Math.min(0.999, Math.max(0.001, t))
            const px = x + CDX[a] + (CDX[b] - CDX[a]) * t
            const py = y + CDY[a] + (CDY[b] - CDY[a]) * t
            const pz = z + CDZ[a] + (CDZ[b] - CDZ[a]) * t
            vi = positions.length / 3
            positions.push(g.ox + px * cell, g.oy + py * cell, g.oz + pz * cell)
            edgeVerts.set(gid, vi)
          }
          localVert[e] = vi
        }

        const row = cubeIndex * 16
        for (let t = 0; t < 16 && triTable[row + t] !== -1; t += 3) {
          const a = localVert[triTable[row + t]]
          const b = localVert[triTable[row + t + 1]]
          const c = localVert[triTable[row + t + 2]]
          if (a === b || b === c || c === a) continue
          // reversed vs. Bourke's tables so normals point outward for
          // the field < 0 = inside convention
          indices.push(a, c, b)
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  }
}
