// The 3D scene root: the dorm room, desk, book, monitor and glasses, plus
// lighting and post-processing.

import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, Vignette } from '@react-three/postprocessing';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import * as THREE from 'three';
import Room, { ROOM, WIN } from './Room';
import Desk, { DESK_TOP, LAMP_HEAD } from './Desk';
import Book, { useBookTextures } from './Book';
import Monitor from './Monitor';
import Glasses from './Glasses';
import CameraRig, { EYE } from './CameraRig';
import { CapturePopup, LassoTrace, TutorWindow } from './WorldUI';

const isMobile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

RectAreaLightUniformsLib.init();

// Motivated lighting for a dorm at night: a warm desk lamp as the key light,
// cool moonlight through the window, the monitor's glow, the bedside lamp and
// fairy lights (in Room.jsx), with a dim interior HDRI for reflections and
// fill. Real-time intensities are in physical-ish units (three.js r155+).
function Lights() {
  return (
    <>
      <hemisphereLight args={['#dcd6f0', '#5a4a3e', 0.35]} />
      {/* LED task lamp: a soft, warm-white pool of light on the book. Kept
          modest so the white pages don't clip under AgX. */}
      <spotLight
        position={[LAMP_HEAD[0], LAMP_HEAD[1] - 0.012, LAMP_HEAD[2]]}
        target-position={[-0.08, DESK_TOP, 0.05]}
        angle={0.95}
        penumbra={1}
        intensity={0.5}
        distance={3}
        decay={2}
        color="#ffe6c4"
        castShadow
        shadow-mapSize={isMobile ? [512, 512] : [2048, 2048]}
        shadow-bias={-0.0002}
        shadow-radius={isMobile ? 2 : 6}
        shadow-blurSamples={isMobile ? 8 : 16}
      />
      {/* moonlight: a soft area light filling the window opening, plus a
          dim shadow-casting key so the sill and curtains read */}
      <rectAreaLight
        position={[WIN.x, WIN.y, ROOM.minZ - 0.02]}
        width={WIN.w}
        height={WIN.h}
        intensity={2.2}
        color="#8ea4ff"
        onUpdate={(l) => l.lookAt(WIN.x, WIN.y, 2)}
      />
      <directionalLight position={[-0.6, 2.8, -3]} intensity={0.35} color="#8ea4ff" />
      {/* warm spill from the fairy lights over the window */}
      <pointLight position={[WIN.x, 2.05, -0.3]} intensity={0.45} distance={2.2} decay={2} color="#ffb35c" />
      <pointLight position={[0, DESK_TOP + 0.05, -0.45]} intensity={0.35} distance={1.1} decay={2} color="#8b5cf6" />
    </>
  );
}

// Dev-only: window.__snap(width) overlays a still of the fully post-processed
// frame in the top-left corner (captured right after the composer renders),
// for inspecting the scene where normal screenshots are unreliable.
function DevSnap() {
  const { gl } = useThree();
  const { scene, camera } = useThree();
  useEffect(() => {
    // Synchronous variant that works while the tab is hidden (no render loop):
    // places the camera, renders once without post-processing, overlays it.
    window.__snapRaw = ({ pos, target, fov = 60 }, width = 400, left = 0, top = 0) => {
      const saved = { p: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov };
      camera.position.set(...pos);
      camera.lookAt(...target);
      camera.fov = fov;
      camera.updateProjectionMatrix();
      gl.render(scene, camera);
      const url = gl.domElement.toDataURL('image/jpeg', 0.9);
      camera.position.copy(saved.p);
      camera.quaternion.copy(saved.q);
      camera.fov = saved.fov;
      camera.updateProjectionMatrix();
      const img = document.createElement('img');
      img.className = '__snapraw';
      img.src = url;
      img.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:${width}px;z-index:99999;border:1px solid #fff`;
      img.onclick = () => img.remove();
      document.body.appendChild(img);
    };
    window.__snap = (width = 400) =>
      new Promise((resolve) => {
        window.__snapRequest = (url) => {
          document.getElementById('__snap')?.remove();
          const img = document.createElement('img');
          img.id = '__snap';
          img.src = url;
          img.style.cssText = `position:fixed;left:0;top:0;width:${width}px;z-index:99999;border:1px solid #fff`;
          img.onclick = () => img.remove();
          document.body.appendChild(img);
          resolve(true);
        };
      });
  }, [gl, scene, camera]);
  useFrame(() => {
    if (window.__snapRequest) {
      const done = window.__snapRequest;
      window.__snapRequest = null;
      done(gl.domElement.toDataURL('image/jpeg', 0.9));
    }
  }, 2);
  return null;
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
  onTurnPage,
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
      {/* CC0 Poly Haven "hotel_room" HDRI, lighting only (not the background) */}
      <Environment files="/env/hotel_room_1k.hdr" environmentIntensity={0.45} environmentRotation={[0, Math.PI / 2, 0]} />
      <Room />
      <Desk />
      <Book spread={spread} textures={textures} onTurn={onTurnPage} interactive={phase === 'desk'} />
      <Monitor spread={spread} />
      <Glasses phase={phase} onSelect={onSelectGlasses} onWorn={onWorn} onRemoved={onRemoved} />
      <CameraRig phase={phase} look={look} />
      {import.meta.env.DEV && <DevSnap />}
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
        <EffectComposer multisampling={0}>
          {/* contact shadows where objects meet surfaces */}
          <N8AO aoRadius={0.35} distanceFalloff={0.6} intensity={2.4} halfRes color="#1a1426" />
          <Bloom mipmapBlur intensity={0.5} luminanceThreshold={0.9} luminanceSmoothing={0.25} />
          <HueSaturation saturation={0.06} />
          <BrightnessContrast contrast={0.06} />
          <Vignette offset={0.3} darkness={phase === 'xr' ? 0.4 : 0.6} />
        </EffectComposer>
      )}
    </>
  );
}

export default function Experience(props) {
  return (
    <Canvas
      // Variance shadow maps give soft, blurred lamp shadows (drei's PCSS
      // SoftShadows doesn't compile against current three.js).
      shadows="variance"
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      camera={{ position: EYE.toArray(), fov: 50, near: 0.01, far: 30 }}
      gl={{ antialias: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.05 }}
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
