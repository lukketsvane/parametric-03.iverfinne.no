"use client"

import { useEffect, useState } from "react"
import { Viewer } from "./viewer"

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

/**
 * The studio shell: full-screen stage + header. The previous generator
 * (parameter state, shareable URL hash, controls panel, gestures) has
 * been removed — the new generator's state and controls mount here.
 */
export function Studio() {
  const [mounted, setMounted] = useState(false)
  const dark = useSystemDark()

  // avoid SSR of the WebGL canvas
  useEffect(() => setMounted(true), [])

  return (
    <main className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
      <div className="absolute inset-0">{mounted && <Viewer dark={dark} />}</div>

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
    </main>
  )
}
