"use client"

import { useRef, useState } from "react"
import {
  Shuffle,
  SlidersHorizontal,
  ChevronDown,
  Download,
} from "lucide-react"
import {
  MM_PER_UNIT,
  PARAM_RANGES,
  SECTIONS,
  genName,
  genParams,
  randomSeed,
  seedFromText,
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

// pixels of vertical drag that sweep a trait's full range
const TILE_DRAG_PX = 220

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

/**
 * One trait, one surface: drag up for more of it, down for less; tap to
 * rethrow just this trait; the dot locks it against shuffle. The whole
 * parameter wall collapses into eight of these.
 */
function TraitTile({
  title,
  keys,
  params,
  locked,
  onPatch,
  onReroll,
  onToggleLock,
}: {
  title: string
  keys: { key: ParamKey; label: string }[]
  params: Params
  locked: boolean
  onPatch: (patch: Partial<Params>) => void
  onReroll: () => void
  onToggleLock: () => void
}) {
  const drag = useRef<{
    y0: number
    vals: Record<string, number>
    moved: boolean
  } | null>(null)

  // trait level — mean of the group's normalized params, feedback only
  let level = 0
  for (const { key } of keys) {
    const r = PARAM_RANGES[key]
    level += (params[key] - r.min) / (r.max - r.min)
  }
  level /= keys.length

  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dy = d.y0 - e.clientY
    if (!d.moved && Math.abs(dy) < 6) return
    d.moved = true
    const patch: Partial<Params> = {}
    for (const { key } of keys) {
      const r = PARAM_RANGES[key]
      let v = d.vals[key] + (dy / TILE_DRAG_PX) * (r.max - r.min)
      v = Math.min(r.max, Math.max(r.min, v))
      patch[key] = r.step >= 1 ? Math.round(v) : +v.toFixed(3)
    }
    onPatch(patch)
  }

  return (
    <div
      onPointerDown={(e) => {
        if (locked) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const vals: Record<string, number> = {}
        for (const { key } of keys) vals[key] = params[key]
        drag.current = { y0: e.clientY, vals, moved: false }
      }}
      onPointerMove={move}
      onPointerUp={() => {
        const d = drag.current
        drag.current = null
        if (d && !d.moved && !locked) onReroll()
      }}
      onPointerCancel={() => (drag.current = null)}
      role="button"
      aria-label={`${title}: drag to shape, tap to reroll`}
      title={`${title} — drag ↑ for more, ↓ for less, tap to reroll`}
      className={`relative cursor-ns-resize touch-none select-none overflow-hidden rounded-2xl border ${HAIR} px-3 py-2.5 transition ${
        locked ? "opacity-35" : "active:scale-[0.985]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-black dark:text-white">
          {title}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-pressed={locked}
          title={locked ? "Locked — tap to release" : "Lock against shuffle"}
          className="-mr-1 flex h-6 w-6 items-center justify-center rounded-full text-[13px] leading-none text-black/50 dark:text-white/50"
        >
          {locked ? "●" : "○"}
        </button>
      </div>
      {/* trait level — a quiet ink bar */}
      <div className="mt-2 h-[3px] w-full rounded-full bg-black/10 dark:bg-white/15">
        <div
          className="h-full rounded-full bg-black/70 transition-[width] duration-75 dark:bg-white/80"
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </div>
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
  // one generator, no types: the panel is name + shuffle + eight traits
  const [open, setOpen] = useState(false)
  const [fine, setFine] = useState(false)
  // locked parameters survive shuffle and trait rerolls untouched
  const [locked, setLocked] = useState<ReadonlySet<ParamKey>>(new Set())
  // the seed field is free text: numbers are seeds, anything else is a
  // signature — «Iver» is always Iver's totem
  const [draft, setDraft] = useState<string | null>(null)

  const set = (patch: Partial<Params>) => onChange({ ...params, ...patch })

  const toggleLock = (key: ParamKey) =>
    setLocked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const toggleGroupLock = (keys: { key: ParamKey }[]) =>
    setLocked((prev) => {
      const next = new Set(prev)
      const all = keys.every(({ key }) => next.has(key))
      for (const { key } of keys) {
        if (all) next.delete(key)
        else next.add(key)
      }
      return next
    })

  const fromSeed = (seed: number, sig?: string) => {
    const next = genParams(seed)
    for (const k of locked) next[k] = params[k]
    onChange(sig ? { ...next, sig } : next)
  }

  const shuffle = () => fromSeed(randomSeed())

  // rethrow one trait: sample a fresh design, keep only this group's keys
  const rerollGroup = (keys: { key: ParamKey }[]) => {
    const roll = genParams(randomSeed())
    const patch: Partial<Params> = {}
    for (const { key } of keys) if (!locked.has(key)) patch[key] = roll[key]
    onChange({ ...params, ...patch })
  }

  const shown = draft ?? params.sig ?? String(params.seed)
  const commit = () => {
    if (draft === null) return
    const t = draft.trim()
    setDraft(null)
    if (!t || t === (params.sig ?? String(params.seed))) return
    if (/^\d{1,9}$/.test(t)) fromSeed(Math.max(1, parseInt(t, 10)))
    else fromSeed(seedFromText(t), t.slice(0, 24))
  }

  // the piece's label: a typed signature wins, otherwise it speaks its
  // own name — with its true standing height
  const title = params.sig?.trim() || genName(params.seed)
  const mm = Math.round(params.height * MM_PER_UNIT)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className={`pointer-events-auto w-full max-w-md rounded-3xl border ${HAIR} bg-white dark:bg-black`}>
        {/* the piece's label — its name and true standing height */}
        <div className="flex items-baseline justify-between px-4 pt-2.5 -mb-1">
          <span className="truncate text-[11px] tracking-[0.18em] text-black/60 dark:text-white/60">
            «{title}»
          </span>
          <span className="shrink-0 pl-3 text-[10px] tabular-nums text-black/40 dark:text-white/40">
            {mm} mm
          </span>
        </div>

        {/* header row */}
        <div className="flex items-center gap-1.5 p-2.5">
          <input
            value={shown}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
            }}
            spellCheck={false}
            autoComplete="off"
            placeholder="seed or name"
            aria-label="Seed number or a name — text becomes its own totem"
            title="Type a number or any name — text is a seed of its own"
            className={`h-10 w-32 min-w-0 flex-1 rounded-full border ${HAIR} bg-transparent px-3.5 text-xs font-medium tabular-nums tracking-widest text-black outline-none focus:border-black/40 dark:text-white dark:focus:border-white/50`}
          />

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

        {/* expandable body — eight traits, one gesture each */}
        {open && (
          <div className="px-2.5 pb-2.5">
            <div className="grid grid-cols-2 gap-1.5">
              {SECTIONS.map(({ title: t, keys }) => (
                <TraitTile
                  key={t}
                  title={t}
                  keys={keys}
                  params={params}
                  locked={keys.every(({ key }) => locked.has(key))}
                  onPatch={set}
                  onReroll={() => rerollGroup(keys)}
                  onToggleLock={() => toggleGroupLock(keys)}
                />
              ))}
            </div>
            <p className="px-1.5 pt-2 text-center text-[10px] tracking-wide text-black/35 dark:text-white/35">
              drag a trait to shape it · tap to rethrow it · ○ locks it
            </p>

            <div className="mt-1 flex items-center justify-between px-1.5">
              <button
                onClick={() => setFine((f) => !f)}
                aria-expanded={fine}
                className="py-1 text-[10px] uppercase tracking-widest text-black/50 transition hover:text-black dark:text-white/50 dark:hover:text-white"
              >
                {fine ? "− fine tune" : "+ fine tune"}
              </button>
              {isDesktop && (
                <button
                  onClick={onToggleDetail}
                  role="switch"
                  aria-checked={hiDetail}
                  className="flex items-center gap-2 py-1 text-[10px] uppercase tracking-widest text-black/50 transition hover:text-black dark:text-white/50 dark:hover:text-white"
                >
                  Max detail
                  <span
                    className={`relative h-4 w-7 rounded-full border ${HAIR} transition ${
                      hiDetail ? "bg-black dark:bg-white" : "bg-transparent"
                    }`}
                  >
                    <span
                      className={`absolute top-[2.5px] h-2.5 w-2.5 rounded-full transition-all ${
                        hiDetail
                          ? "left-[15px] bg-white dark:bg-black"
                          : "left-[2.5px] bg-black dark:bg-white"
                      }`}
                    />
                  </span>
                </button>
              )}
            </div>

            {/* the full parameter list, tucked away for precision work */}
            {fine && (
              <div className="mt-1 max-h-[34vh] overflow-y-auto px-1.5 pb-1">
                {SECTIONS.map(({ title: t, keys }) => (
                  <div key={t} className="mb-2">
                    <p className="pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                      {t}
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
        )}
      </div>
    </div>
  )
}
