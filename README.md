# parametric-03.iverfinne.no

A parametric 3D studio. The UI shell (Next.js app, R3F viewer stage with
softbox lighting and orbit controls) comes from parametric-01.iverfinne.no.
The generative motor has been removed — a new one will be built from
scratch. Its mesh mounts in the grounded group in components/viewer.tsx;
its parameter state and controls mount in components/studio.tsx.
