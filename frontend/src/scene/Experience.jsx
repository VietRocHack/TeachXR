// The 3D scene root: the dorm room, desk, book, monitor and glasses, plus
// lighting and post-processing.

import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Room from './Room';
import Desk, { DESK_TOP } from './Desk';
import Book, { useBookTextures } from './Book';
import Monitor from './Monitor';
import Glasses from './Glasses';
import CameraRig, { EYE } from './CameraRig';
import { CapturePopup, LassoTrace, TutorWindow } from './WorldUI';

const isMobile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} color="#8b86c9" />
      <hemisphereLight args={['#6d5bd0', '#2a1f3a', 0.45]} />
      {/* desk lamp: warm pool of light on the book */}
      <spotLight
        position={[-0.5, 1.22, -0.18]}
        target-position={[-0.05, DESK_TOP, 0.05]}
        angle={0.6}
        penumbra={0.8}
        intensity={2.2}
        distance={3}
        decay={2}
        color="#ffd8a8"
        castShadow
        shadow-mapSize={isMobile ? [512, 512] : [1024, 1024]}
        shadow-bias={-0.0004}
      />
      {/* moonlight + city glow through the window */}
      <directionalLight position={[-0.4, 2.6, -2.5]} intensity={0.6} color="#8fa2ff" />
      {/* string lights / LED strip ambience */}
      <pointLight position={[-0.3, 2.1, -0.3]} intensity={0.6} distance={2.5} color="#ffb86b" />
      <pointLight position={[0, DESK_TOP + 0.05, -0.45]} intensity={0.5} distance={1.2} color="#8b5cf6" />
      <pointLight position={[0.8, 2.3, 1.6]} intensity={0.8} distance={4} color="#b8a6ff" />
    </>
  );
}

function Scene({
  phase,
  spread,
  look,
  onSelectGlasses,
  onWorn,
  onRemoved,
  captureRef,
  onReady,
  tutor,
  panelPose,
  worldLayer,
  pending,
  onAsk,
  onCancelPending,
  onTakeOff,
}) {
  // drei <Html portal> wants a ref object.
  const portal = useMemo(() => ({ current: worldLayer }), [worldLayer]);
  const showWorldUI = phase === 'xr' && worldLayer && panelPose;
  const textures = useBookTextures();
  const three = useThree();
  useEffect(() => {
    captureRef.current = three;
    if (import.meta.env.DEV) window.__r3f = three;
  }, [three, captureRef]);
  // Runs once everything inside Suspense (models, textures) has loaded.
  useEffect(() => {
    const raf = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(raf);
  }, [onReady]);

  return (
    <>
      <color attach="background" args={['#0c0a1f']} />
      <Lights />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={2} color="#c4b5fd" position={[0, 3, 1]} scale={[4, 1, 1]} />
        <Lightformer intensity={1.5} color="#ffd8a8" position={[-2, 1, 0]} scale={[1, 2, 1]} />
        <Lightformer intensity={1} color="#67e8f9" position={[2, 1, -1]} scale={[1, 2, 1]} />
      </Environment>
      <Room />
      <Desk />
      <Book spread={spread} textures={textures} />
      <Monitor spread={spread} />
      <Glasses phase={phase} onSelect={onSelectGlasses} onWorn={onWorn} onRemoved={onRemoved} />
      <CameraRig phase={phase} look={look} />
      {showWorldUI && <TutorWindow tutor={tutor} pose={panelPose} portal={portal} onHome={onTakeOff} />}
      {showWorldUI && pending && (
        <>
          <LassoTrace points={pending.trace} />
          <CapturePopup
            key={pending.id}
            pending={pending}
            portal={portal}
            onAsk={onAsk}
            onCancel={onCancelPending}
            canSend={tutor.status === 'live'}
          />
        </>
      )}
      {!isMobile && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.85} luminanceSmoothing={0.2} />
          <Vignette offset={0.25} darkness={phase === 'xr' ? 0.35 : 0.55} />
        </EffectComposer>
      )}
    </>
  );
}

export default function Experience(props) {
  return (
    <Canvas
      shadows
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      camera={{ position: EYE.toArray(), fov: 50, near: 0.01, far: 30 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
