# parametric-03.iverfinne.no

> **Merged into [parametric.iverfinne.no](https://github.com/lukketsvane/parametric.iverfinne.no):**
> all four parametric studios were combined into one app — this motor
> lives on there as the «totems» engine, selectable from the engine dropdown.
> This repository stays as an archive of the standalone studio.

A parametric 3D studio. The UI shell (viewer stage, controls panel,
gestures, shareable URL state) comes from parametric-01.iverfinne.no;
the generative motor is its own — ONE totem system of stacked, pierced,
limb-sprouting bodies in ebonised near-black, with no named types: every
design is a seed-sampled point in the same continuous parameter space.

Every piece carries a posture (sway leans the spine, drifts bodies off
axis, twists the crystal cuts, un-mirrors the arms), its own finish
(a seeded patina — ebonised black or raw carved wood — with dry-brush
wax baked into the carve ridges), and a name of its own — or yours: the
seed field takes any text, so «Iver» is always the same totem, and the
label + STL filename carry the name and the true standing height in mm.
Crowns can grow fat parallel fingers, openwork ring lattices with
stub-ended bars, or a pegged side rail. The controls are eight trait
tiles — drag one to shape that trait, tap to rethrow it, lock it against
shuffle — with the full slider list tucked behind "fine tune".

See lib/engine.ts (parameter space, sampler, names) and lib/totem.ts
(SDF + marching cubes geometry, gesture warp, finish bake).
