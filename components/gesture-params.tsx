"use client"

import { useEffect } from "react"
import * as THREE from "three"
import { useThree } from "@react-three/fiber"

export type NudgeAxis = "vertical" | "horizontal"

/**
 * Two-finger gestures on touch devices:
 *  - vertical two-finger scroll   → onNudge("vertical", px)
 *  - horizontal two-finger scroll → onNudge("horizontal", px)
 *  - pinch → camera zoom (handled here, since OrbitControls is paused
 *    while two fingers are down)
 * One-finger rotate stays with OrbitControls. What the nudge axes mean is
 * up to the engine (lib/engine.ts NUDGE_PARAMS).
 */
export function GestureParams({
  onNudge,
}: {
  onNudge: (axis: NudgeAxis, deltaPx: number) => void
}) {
  const gl = useThree((s) => s.gl)
  const controls = useThree((s) => s.controls) as {
    enabled: boolean
    target?: THREE.Vector3
  } | null
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    const el = gl.domElement
    const pts = new Map<number, { x: number; y: number }>()
    let mode: "none" | "pinch" | "v" | "h" = "none"
    let last = { cx: 0, cy: 0, d: 0 }

    const measure = () => {
      const [a, b] = [...pts.values()]
      return {
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
        d: Math.hypot(a.x - b.x, a.y - b.y),
      }
    }

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2) {
        mode = "none"
        last = measure()
        if (controls) controls.enabled = false
      }
    }

    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size !== 2) return
      const c = measure()
      const dx = c.cx - last.cx
      const dy = c.cy - last.cy
      const dd = c.d - last.d
      if (mode === "none") {
        // classify once per gesture, after a small dead zone
        if (Math.abs(dd) > Math.max(Math.abs(dx), Math.abs(dy)) * 1.2 && Math.abs(dd) > 5) {
          mode = "pinch"
        } else if (Math.abs(dy) > Math.abs(dx) * 1.3 && Math.abs(dy) > 5) {
          mode = "v"
        } else if (Math.abs(dx) > Math.abs(dy) * 1.3 && Math.abs(dx) > 5) {
          mode = "h"
        } else {
          return
        }
      }
      if (mode === "pinch") {
        if (last.d > 0 && c.d > 0) {
          // dolly around wherever the auto-framing put the orbit target
          const target = controls?.target?.clone() ?? new THREE.Vector3(0, 0.35, 0)
          const offset = camera.position.clone().sub(target)
          const dist = THREE.MathUtils.clamp(
            offset.length() * (last.d / c.d),
            2.6,
            16,
          )
          camera.position.copy(target).add(offset.setLength(dist))
          invalidate()
        }
      } else if (mode === "v") {
        onNudge("vertical", -dy)
      } else {
        onNudge("horizontal", dx)
      }
      last = c
    }

    const up = (e: PointerEvent) => {
      if (!pts.delete(e.pointerId)) return
      if (pts.size < 2) {
        mode = "none"
        // hand control back only when the gesture fully ends
        if (pts.size === 0 && controls) controls.enabled = true
      }
    }

    el.addEventListener("pointerdown", down)
    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      el.removeEventListener("pointerdown", down)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      if (controls) controls.enabled = true
    }
  }, [gl, controls, camera, invalidate, onNudge])

  return null
}
