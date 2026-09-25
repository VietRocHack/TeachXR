// TeachXR demo flow:
//   desk -> (tap glasses) wearing -> booting -> xr -> (take off) removing -> desk

import { useCallback, useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import Experience from './scene/Experience';
import { createLook } from './scene/CameraRig';
import BootSequence from './hud/BootSequence';
import Hud from './hud/Hud';
import Landing from './hud/Landing';
import { TOPICS } from './content/topics';
import { loadCanvasFonts } from './content/drawPage';
import { captureRegion, detectSource, lassoBounds, popupAnchor, projectLasso, tapTarget } from './lib/capture';
import { createPanelPose } from './scene/WorldUI';
import { useTutor } from './lib/useTutor';

function Loader({ done }) {
  const { progress } = useProgress();
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0c0a1f] transition-opacity duration-700 ${
        done ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="font-display text-4xl font-bold text-white">
        Teach<span className="text-violet-400">XR</span>
      </div>
      <div className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-violet-900/60">
        <div className="h-full bg-violet-400 transition-[width]" style={{ width: `${Math.round(progress)}%` }} />
      </div>
      <div className="mt-3 text-xs text-violet-200/70">Setting up your desk…</div>
    </div>
  );
}

// The R3F state saved by the scene is a snapshot; get() returns the current
// one (size and camera change when the window resizes).
function liveThreeFrom(ref) {
  return ref.current?.get ? ref.current.get() : ref.current;
}

export default function App() {
  const [fontsReady, setFontsReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [phase, setPhase] = useState('desk');
  const [spread, setSpreadRaw] = useState(0);
  const [circleMode, setCircleMode] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [pending, setPending] = useState(null); // circled capture awaiting a question
  const [worldLayer, setWorldLayer] = useState(null); // HUD element the in-room windows render into
  const look = useRef(createLook()).current;
  const panelPose = useRef(null); // where the tutor window floats; set when the glasses go on
  const captureRef = useRef(null);
  const pendingId = useRef(0);
  const tutor = useTutor();

  useEffect(() => {
    loadCanvasFonts().then(() => setFontsReady(true));
  }, []);

  const setSpread = useCallback((n) => setSpreadRaw(Math.max(0, Math.min(TOPICS.length - 1, n))), []);
  // Tapping the right page turns forward, the left page back.
  const turnPage = useCallback(
    (dir) => setSpreadRaw((s) => Math.max(0, Math.min(TOPICS.length - 1, s + dir))),
    [],
  );

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'Shift') setShiftHeld(true);
      if (phase !== 'xr' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') setSpread(spread + 1);
      if (e.key === 'ArrowLeft') setSpread(spread - 1);
      if (e.key === 'Escape') setPending(null);
    };
    const up = (e) => e.key === 'Shift' && setShiftHeld(false);
    const blur = () => setShiftHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [phase, spread, setSpread]);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const putOn = useCallback(() => {
    if (phaseRef.current !== 'desk') return;
    phaseRef.current = 'wearing';
    // No tutor connection yet: the student starts it with the ＋ button on the
    // TeachXR window once they've looked around (hud/LegacyLearnPanel.jsx).
    setPhase('wearing');
  }, []);

  const onSceneReady = useCallback(() => setSceneReady(true), []);

  const onWorn = useCallback(() => setPhase('booting'), []);

  const onBooted = useCallback(() => {
    setPhase((p) => {
      if (p !== 'booting') return p;
      Object.assign(look, createLook());
      const size = liveThreeFrom(captureRef)?.size;
      panelPose.current = createPanelPose(look, size ? size.width / size.height : 1.6);
      return 'xr';
    });
  }, [look]);

  const takeOff = useCallback(() => {
    tutor.hangup();
    setPending(null);
    setCircleMode(false);
    setPhase('removing');
  }, [tutor]);

  const onRemoved = useCallback(() => setPhase('desk'), []);

  // The glasses animations finish from the render loop, which stalls on a
  // hidden tab or a very slow GPU; don't let the flow get stuck behind them.
  useEffect(() => {
    if (phase !== 'wearing' && phase !== 'removing') return undefined;
    const next = phase === 'wearing' ? onWorn : onRemoved;
    const t = setTimeout(next, phase === 'wearing' ? 3500 : 2500);
    return () => clearTimeout(t);
  }, [phase, onWorn, onRemoved]);

  const onLasso = useCallback((path, surfaceSize) => {
    const three = liveThreeFrom(captureRef);
    if (!three) return;
    const rect = lassoBounds(path, surfaceSize.width, surfaceSize.height);
    const dataUrl = captureRegion(three, rect);
    const source = detectSource(three, rect);
    setPending({
      id: ++pendingId.current,
      dataUrl,
      source,
      trace: projectLasso(three, path),
      anchor: popupAnchor(three, rect),
    });
  }, []);

  // With the glasses on, the HUD's look surface covers the canvas, so taps come
  // through here: a tap on the book turns its page.
  const onTap = useCallback(
    (x, y) => {
      const three = liveThreeFrom(captureRef);
      const target = three && tapTarget(three, x, y);
      if (target?.source !== 'book') return;
      turnPage(target.object.worldToLocal(target.point.clone()).x >= 0 ? 1 : -1);
    },
    [turnPage],
  );

  // Bring the tutor window back in front of wherever you're looking.
  const recenter = useCallback(() => {
    const size = liveThreeFrom(captureRef)?.size;
    if (!panelPose.current) return;
    Object.assign(panelPose.current, createPanelPose(look, size ? size.width / size.height : 1.6));
  }, [look]);

  const onAsk = useCallback(
    (question) => {
      if (!pending) return;
      tutor.sendImage({ dataUrl: pending.dataUrl, source: pending.source, text: question });
      setPending(null);
    },
    [pending, tutor],
  );

  const cancelPending = useCallback(() => setPending(null), []);

  return (
    <div className="fixed inset-0 bg-[#0c0a1f]">
      {fontsReady && (
        <Experience
          phase={phase}
          spread={spread}
          look={look}
          onSelectGlasses={putOn}
          onWorn={onWorn}
          onRemoved={onRemoved}
          captureRef={captureRef}
          onReady={onSceneReady}
          tutor={tutor}
          panelPose={panelPose.current}
          worldLayer={worldLayer}
          pending={pending}
          onAsk={onAsk}
          onCancelPending={cancelPending}
          onTakeOff={takeOff}
          onTurnPage={turnPage}
        />
      )}
      <Loader done={sceneReady} />

      {phase === 'desk' && <Landing onStart={putOn} />}
      {phase === 'wearing' && <div className="iris-close pointer-events-none fixed inset-0 z-30" />}
      {phase === 'booting' && <BootSequence onDone={onBooted} />}
      {phase === 'xr' && (
        <Hud
          tutor={tutor}
          look={look}
          circleMode={circleMode}
          setCircleMode={setCircleMode}
          shiftHeld={shiftHeld}
          onLasso={onLasso}
          onTap={onTap}
          onRecenter={recenter}
          onTakeOff={takeOff}
          setWorldLayer={setWorldLayer}
        />
      )}
    </div>
  );
}
