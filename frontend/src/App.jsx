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
import { captureRegion, detectSource, lassoBounds } from './lib/capture';
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

export default function App() {
  const [fontsReady, setFontsReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [phase, setPhase] = useState('desk');
  const [spread, setSpreadRaw] = useState(0);
  const [circleMode, setCircleMode] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [pending, setPending] = useState(null); // circled capture awaiting a question
  const look = useRef(createLook()).current;
  const captureRef = useRef(null);
  const tutor = useTutor();

  useEffect(() => {
    loadCanvasFonts().then(() => setFontsReady(true));
  }, []);

  const setSpread = useCallback((n) => setSpreadRaw(Math.max(0, Math.min(TOPICS.length - 1, n))), []);

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
    setPhase('wearing');
    tutor.connect(); // from the tap gesture, so audio + mic prompts are allowed
  }, [tutor]);

  const onSceneReady = useCallback(() => setSceneReady(true), []);

  const onWorn = useCallback(() => setPhase('booting'), []);

  const onBooted = useCallback(() => {
    setPhase((p) => {
      if (p !== 'booting') return p;
      Object.assign(look, createLook());
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

  const onLasso = useCallback((path, surfaceSize) => {
    const three = captureRef.current;
    if (!three) return;
    const rect = lassoBounds(path, surfaceSize.width, surfaceSize.height);
    const dataUrl = captureRegion(three, rect);
    const source = detectSource(three, rect);
    setPending({ path, rect, dataUrl, source });
  }, []);

  const onAsk = useCallback(
    (question) => {
      if (!pending) return;
      tutor.sendImage({ dataUrl: pending.dataUrl, source: pending.source, text: question });
      setPending(null);
    },
    [pending, tutor],
  );

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
        />
      )}
      <Loader done={sceneReady} />

      {phase === 'desk' && <Landing onStart={putOn} spread={spread} setSpread={setSpread} />}
      {phase === 'wearing' && <div className="iris-close pointer-events-none fixed inset-0 z-30" />}
      {phase === 'booting' && <BootSequence tutorStatus={tutor.status} onDone={onBooted} />}
      {phase === 'xr' && (
        <Hud
          tutor={tutor}
          look={look}
          spread={spread}
          setSpread={setSpread}
          circleMode={circleMode}
          setCircleMode={setCircleMode}
          shiftHeld={shiftHeld}
          onLasso={onLasso}
          pending={pending}
          onAsk={onAsk}
          onCancelPending={() => setPending(null)}
          onTakeOff={takeOff}
        />
      )}
    </div>
  );
}
