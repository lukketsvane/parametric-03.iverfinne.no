"use client"

import { Canvas } from "@react-three/fiber"
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
} from "@react-three/drei"
import { Suspense } from "react"

/**
 * The viewer stage: camera, softbox lighting, ground shadow and orbit
 * controls. The generator's mesh mounts inside the grounded group below —
 * the previous engine has been removed, so for now it holds nothing.
 */
export function Viewer({ dark }: { dark: boolean }) {
  const bg = dark ? "#000000" : "#ffffff"
  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [2.6, 2.2, 6.6], fov: 32 }}
      className="touch-none"
    >
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 14, 34]} />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[4, 7, 3]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
      />
      <directionalLight position={[-6, 3, -2]} intensity={0.35} />

      <Suspense fallback={null}>
        <group position={[0, -0.85, 0]}>
          {/* ── new generator's mesh mounts here ── */}

          {/* ground: an invisible plane that only receives the cast shadow —
              light mode only, dark mode floats the piece in the void */}
          {!dark && (
            <>
              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[60, 60]} />
                <shadowMaterial transparent opacity={0.16} />
              </mesh>
              <ContactShadows
                position={[0, 0.001, 0]}
                opacity={0.28}
                scale={9}
                blur={2.2}
                far={2.6}
                resolution={512}
                frames={50}
                color="#000000"
              />
            </>
          )}
        </group>
        {/* local softbox studio — no remote HDR fetch */}
        <Environment resolution={256} environmentIntensity={1}>
          <color attach="background" args={["#9a9a9a"]} />
          <Lightformer
            form="rect"
            intensity={3}
            position={[0, 6, 1]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[9, 7, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1.6}
            position={[-6, 2, 3]}
            rotation={[0, Math.PI / 2.4, 0]}
            scale={[5, 3.2, 1]}
          />
          <Lightformer
            form="rect"
            intensity={1.1}
            position={[6, 1.4, -2.5]}
            rotation={[0, -Math.PI / 2.2, 0]}
            scale={[5, 2.6, 1]}
          />
          <Lightformer
            form="rect"
            intensity={0.7}
            position={[0, 1, 6]}
            rotation={[0, Math.PI, 0]}
            scale={[7, 1.8, 1]}
          />
        </Environment>
      </Suspense>

      <OrbitControls
        target={[0, 0.35, 0]}
        enablePan={false}
        enableZoom
        minDistance={2.6}
        maxDistance={16}
        enableRotate
        rotateSpeed={0.9}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2 + 0.35}
        makeDefault
      />
    </Canvas>
  )
}
