"use client"

import { useState } from "react"
import {
  Shuffle,
  SlidersHorizontal,
  ChevronDown,
  Download,
} from "lucide-react"
import {
  PARAM_RANGES,
  SECTIONS,
  genParams,
  randomSeed,
  type ParamKey,
  type Params,
} from "@/lib/engine"
import { downloadSTL } from "@/lib/export-stl"

// monochrome controls — solid black/white ink, thin subtle hairline outlines
const HAIR = "border-black/15 dark:border-white/20"
const ICON_BTN =
  `flex h-10 w-10 items-center justify-center rounded-full border ${HAIR} text-black transition active:scale-95 dark:text-white`
const ICON_BTN_SOLID =
  "flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition active:scale-95 dark:bg-white dark:text-black"

function Row({
  label,
  value,
  range,
  locked,
  onChange,
  onToggleLock,
}: {
  label: string
  value: number
  range: { min: number; max: number; step: number }
  locked: boolean
  onChange: (v: number) => void
  onToggleLock: () => void
}) {
  const isInt = range.step >= 1
  return (
    <div
      className={`flex items-center gap-3 py-1.5 transition-opacity ${
        locked ? "opacity-30" : ""
      }`}
    >
      {/* tap the label to lock this value against shuffle */}
      <button
        onClick={onToggleLock}
        aria-pressed={locked}
        title={locked ? "Locked — tap to let shuffle change it" : "Tap to lock against shuffle"}
        className="w-20 shrink-0 text-left text-[11px] uppercase tracking-widest text-black dark:text-white"
      >
        {label}
      </button>
      <input
        type="range"
        className="pslider flex-1"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
      />
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-black dark:text-white">
        {isInt ? value : value.toFixed(2)}
      </span>
    </div>
  )
}

export function ControlsPanel({
  params,
  isDesktop,
  hiDetail,
  onToggleDetail,
  onChange,
}: {
  params: Params
  isDesktop: boolean
  hiDetail: boolean
  onToggleDetail: () => void
  onChange: (p: Params) => void
}) {
  // one generator, no types: the panel is just seed + shuffle + sliders
  const [open, setOpen] = useState(false)
  // tapped-locked parameters survive shuffle untouched
  const [locked, setLocked] = useState<ReadonlySet<ParamKey>>(new Set())

  const set = (patch: Partial<Params>) => onChange({ ...params, ...patch })

  const toggleLock = (key: ParamKey) =>
    setLocked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const shuffle = () => {
    const next = genParams(randomSeed())
    for (const k of locked) next[k] = params[k]
    onChange(next)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className={`pointer-events-auto w-full max-w-md rounded-3xl border ${HAIR} bg-white dark:bg-black`}>
        {/* header row */}
        <div className="flex items-center gap-1.5 p-2.5">
          <button
            onClick={() => set({ seed: randomSeed() })}
            title="New carve seed — same form"
            className={`flex h-10 items-center rounded-full border ${HAIR} px-3.5 text-xs font-medium tabular-nums tracking-widest text-black transition active:scale-95 dark:text-white`}
          >
            {params.seed}
          </button>

          <div className="flex-1" />

          <button
            onClick={shuffle}
            aria-label="Randomize design"
            className={ICON_BTN_SOLID}
          >
            <Shuffle className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <button
            onClick={() => downloadSTL(params)}
            aria-label="Download STL"
            title="Download print-ready STL"
            className={ICON_BTN}
          >
            <Download className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Hide controls" : "Show controls"}
            aria-expanded={open}
            className={ICON_BTN}
          >
            {open ? (
              <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
            ) : (
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2.2} />
            )}
          </button>
        </div>

        {/* expandable body — every parameter of the one system */}
        {open && (
          <div className="max-h-[56vh] overflow-y-auto px-4 pb-4">
            {isDesktop && (
              <button
                onClick={onToggleDetail}
                role="switch"
                aria-checked={hiDetail}
                className={`mb-3 flex w-full items-center justify-between rounded-2xl border ${HAIR} px-3 py-2 transition active:scale-[0.99]`}
              >
                <span className="text-[11px] uppercase tracking-widest text-black dark:text-white">
                  Max detail
                </span>
                <span
                  className={`relative h-5 w-9 rounded-full border ${HAIR} transition ${
                    hiDetail ? "bg-black dark:bg-white" : "bg-transparent"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
                      hiDetail
                        ? "left-[18px] bg-white dark:bg-black"
                        : "left-0.5 bg-black dark:bg-white"
                    }`}
                  />
                </span>
              </button>
            )}

            {SECTIONS.map(({ title, keys }) => (
              <div key={title} className="mb-2">
                <p className="pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                  {title}
                </p>
                {keys.map(({ key, label }) => (
                  <Row
                    key={key}
                    label={label}
                    value={params[key]}
                    range={PARAM_RANGES[key]}
                    locked={locked.has(key)}
                    onChange={(v) => set({ [key]: v } as Partial<Params>)}
                    onToggleLock={() => toggleLock(key)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
