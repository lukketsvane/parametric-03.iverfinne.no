"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DEFAULT_PARAMS,
  NUDGE_PARAMS,
  PARAM_RANGES,
  PRESETS,
  type Params,
  type ParamKey,
} from "@/lib/engine"
import { Viewer } from "./viewer"
import { ControlsPanel } from "./controls-panel"
import type { NudgeAxis } from "./gesture-params"

// pixels of two-finger scroll to sweep a parameter's full range
const NUDGE_RANGE_PX = 420

// follow the system color scheme only — no in-app toggle
function useSystemDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const sync = () => setDark(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return dark
}

// desktop = fine pointer + roomy viewport; only there do we offer max detail
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 1024px)")
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return desktop
}

export function Studio() {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS)
  const [hiDetail, setHiDetail] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dark = useSystemDark()
  const isDesktop = useIsDesktop()

  // avoid SSR of the WebGL canvas; restore a shared design from the URL.
  // The hash is untrusted input — every field is validated and clamped so
  // no crafted URL can push NaN or hostile values into the engine.
  useEffect(() => {
    setMounted(true)
    try {
      const h = window.location.hash.slice(1)
      if (h.startsWith("p=")) {
        const obj = JSON.parse(decodeURIComponent(h.slice(2)))
        if (obj && typeof obj === "object") {
          setParams((prev) => {
            const next = { ...prev }
            for (const k of Object.keys(PARAM_RANGES) as ParamKey[]) {
              const v = (obj as Record<string, unknown>)[k]
              if (typeof v === "number" && Number.isFinite(v)) {
                const r = PARAM_RANGES[k]
                next[k] = Math.min(r.max, Math.max(r.min, v))
              }
            }
            if (typeof obj.seed === "number" && Number.isFinite(obj.seed)) {
              next.seed = Math.floor(obj.seed)
            }
            if (typeof obj.preset === "string" && PRESETS.includes(obj.preset)) {
              next.preset = obj.preset
            }
            return next
          })
        }
      }
    } catch {
      // malformed hash — ignore
    }
  }, [])

  // keep the URL shareable: it always encodes the current design
  useEffect(() => {
    const id = window.setTimeout(() => {
      window.history.replaceState(
        null,
        "",
        "#p=" + encodeURIComponent(JSON.stringify(params)),
      )
    }, 400)
    return () => window.clearTimeout(id)
  }, [params])

  // two-finger scroll sweeps whichever parameters the engine mapped
  const nudge = useCallback((axis: NudgeAxis, deltaPx: number) => {
    const key = NUDGE_PARAMS[axis]
    if (key === undefined) return
    setParams((p) => {
      const r = PARAM_RANGES[key]
      const v = Math.min(
        r.max,
        Math.max(r.min, p[key] + (deltaPx / NUDGE_RANGE_PX) * (r.max - r.min)),
      )
      return { ...p, [key]: +v.toFixed(3) }
    })
  }, [])

  // never leave hi-detail on for a non-desktop client
  const detailOn = hiDetail && isDesktop

  return (
    <main className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
      <div className="absolute inset-0">
        {mounted && (
          <Viewer
            params={params}
            dark={dark}
            hiDetail={detailOn}
            mobile={!isDesktop}
            onNudge={nudge}
          />
        )}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-end p-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <a
          href="https://iverfinne.no"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto text-[11px] tracking-wide text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
        >
          iverfinne.no
        </a>
      </header>

      <ControlsPanel
        params={params}
        isDesktop={isDesktop}
        hiDetail={hiDetail}
        onToggleDetail={() => setHiDetail((d) => !d)}
        onChange={setParams}
      />
    </main>
  )
}
