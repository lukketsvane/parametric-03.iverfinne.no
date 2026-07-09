"use client"

import { useState } from "react"
import {
  Shuffle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react"
import {
  PARAM_RANGES,
  PRESETS,
  SECTIONS,
  genParams,
  randomizeParams,
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

function chipClass(active: boolean) {
  return `min-h-[32px] rounded-full border px-3 text-[11px] font-medium capitalize transition active:scale-95 ${
    active
      ? "border-transparent bg-black text-white dark:bg-white dark:text-black"
      : `${HAIR} text-black dark:text-white`
  }`
}

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
      {/* tap the label to lock this value against randomize */}
      <button
        onClick={onToggleLock}
        aria-pressed={locked}
        title={locked ? "Locked — tap to let randomize change it" : "Tap to lock against randomize"}
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
  // collapsed → half (preset, chips) → full (every parameter)
  const [mode, setMode] = useState<"collapsed" | "half" | "full">("collapsed")
  const open = mode !== "collapsed"
  // tapped-locked parameters survive randomize untouched
  const [locked, setLocked] = useState<ReadonlySet<ParamKey>>(new Set())
  // shuffle roams across ALL presets unless the type is locked by
  // tapping the seed number next to the dropdown
  const [presetLocked, setPresetLocked] = useState(false)

  const set = (patch: Partial<Params>) => onChange({ ...params, ...patch })

  const toggleLock = (key: ParamKey) =>
    setLocked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const shuffle = () => {
    const preset = presetLocked
      ? params.preset
      : PRESETS[Math.floor(Math.random() * PRESETS.length)]
    const next = randomizeParams(randomSeed(), preset)
    for (const k of locked) next[k] = params[k]
    onChange(next)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className={`pointer-events-auto w-full max-w-md rounded-3xl border ${HAIR} bg-white dark:bg-black`}>
        {/* header row */}
        <div className="flex items-center gap-1.5 p-2.5">
          <div className={`relative flex h-10 items-center rounded-full border ${HAIR}`}>
            <select
              value={params.preset}
              onChange={(e) => onChange(genParams(params.seed, e.target.value))}
              aria-label="Preset"
              className="h-full appearance-none rounded-full bg-transparent pl-3.5 pr-8 text-xs font-medium text-black outline-none dark:text-white [&>option]:bg-white dark:[&>option]:bg-black"
            >
              {PRESETS.map((fam) => (
                <option key={fam} value={fam}>
                  {fam.charAt(0).toUpperCase() + fam.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-black/60 dark:text-white/60"
              strokeWidth={2.2}
            />
          </div>
          <button
            onClick={() => setPresetLocked((l) => !l)}
            aria-pressed={presetLocked}
            title={
              presetLocked
                ? "Type locked — shuffle stays in this preset"
                : "Tap to lock the type against shuffle"
            }
            className={`px-1 text-[11px] tabular-nums tracking-widest text-black/60 transition-opacity dark:text-white/60 ${
              presetLocked ? "opacity-30" : ""
            }`}
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
            onClick={() => setMode(open ? "collapsed" : "half")}
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

        {/* expandable body */}
        {open && (
          <div className="max-h-[56vh] overflow-y-auto px-4 pb-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => set({ seed: randomSeed() })}
                className={chipClass(false)}
                title="New seed, same parameters"
              >
                reseed
              </button>
            </div>

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

            {/* half ↔ full: every parameter lives behind this expander */}
            <button
              onClick={() => setMode(mode === "full" ? "half" : "full")}
              aria-expanded={mode === "full"}
              className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl border ${HAIR} py-2 text-[10px] font-semibold uppercase tracking-widest text-black/70 transition active:scale-[0.99] dark:text-white/70`}
            >
              {mode === "full" ? (
                <>
                  fewer controls
                  <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.2} />
                </>
              ) : (
                <>
                  all parameters
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.2} />
                </>
              )}
            </button>

            {mode === "full" &&
              SECTIONS.map(({ title, keys }) => (
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
