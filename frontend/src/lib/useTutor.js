// The TeachXR tutor connection: one Gemini Live session relayed by our backend
// (see backend/src/services/live_tutor.py for the message protocol).

import { useCallback, useEffect, useRef, useState } from 'react';
import { createSession, liveUrl } from './api';
import { createPcmPlayer, startMicCapture } from './liveAudio';

// Mirrors LIVE_MAX_SESSION_SECONDS on the backend, for the HUD countdown.
export const SESSION_SECONDS = 480;
const PING_MS = 15000;

const END_REASONS = {
  time_limit: 'Session time is up. Reconnect to keep learning!',
  idle: 'TeachXR went to sleep after a quiet minute.',
  image_limit: 'That’s a lot of circles for one session! Reconnect for more.',
  text_limit: 'Message limit reached for this session. Reconnect for more.',
  image_too_large: 'That picture was too big to send.',
  error: 'TeachXR lost its connection.',
  model_closed: 'TeachXR lost its connection.',
};

let nextId = 1;

export function useTutor() {
  const [status, setStatus] = useState('idle'); // idle | connecting | live | ended | error
  const [messages, setMessages] = useState([]);
  const [notice, setNotice] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const [startedAt, setStartedAt] = useState(null);
  const [thinking, setThinking] = useState(false);

  const wsRef = useRef(null);
  const playerRef = useRef(null);
  const stopMicRef = useRef(null);
  const micOnRef = useRef(false);
  const micLevelRef = useRef(0);
  // Which bubble transcript chunks append to; null starts a new bubble.
  const openBubbleRef = useRef({ user: null, model: null });

  const pushMessage = useCallback((msg) => {
    const id = nextId++;
    setMessages((prev) => [...prev, { id, ...msg }]);
    return id;
  }, []);

  const appendTranscript = useCallback((role, text) => {
    const open = openBubbleRef.current;
    const other = role === 'user' ? 'model' : 'user';
    open[other] = null;
    if (open[role] == null) {
      const id = nextId++;
      open[role] = id;
      setMessages((prev) => [...prev, { id, role, text }]);
    } else {
      const id = open[role];
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: m.text + text } : m)));
    }
  }, []);

  const teardown = useCallback(() => {
    stopMicRef.current?.();
    stopMicRef.current = null;
    micOnRef.current = false;
    setMicOn(false);
    playerRef.current?.close();
    playerRef.current = null;
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
  }, []);

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      if (typeof payload === 'object' && !(payload instanceof ArrayBuffer) && payload.type !== 'ping') {
        setStatus((s) => (s === 'live' ? 'ended' : s));
        setNotice('TeachXR isn’t connected right now. Reconnect to ask.');
      }
      return false;
    }
    ws.send(typeof payload === 'string' || payload instanceof ArrayBuffer ? payload : JSON.stringify(payload));
    return true;
  }, []);

  const startMic = useCallback(async () => {
    if (stopMicRef.current) {
      micOnRef.current = true;
      setMicOn(true);
      return;
    }
    try {
      stopMicRef.current = await startMicCapture((chunk, level) => {
        micLevelRef.current = micOnRef.current ? level : 0;
        if (micOnRef.current) send(chunk);
      });
      micOnRef.current = true;
      setMicOn(true);
      setMicAvailable(true);
    } catch {
      setMicAvailable(false);
      setNotice('Microphone is off. You can still type your questions.');
    }
  }, [send]);

  // Called from the "put on glasses" tap, so audio playback is unlocked by a
  // real user gesture (iOS won't play Web Audio otherwise).
  const connectingRef = useRef(false);
  const connect = useCallback(async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    teardown();
    setStatus('connecting');
    setNotice('');
    openBubbleRef.current = { user: null, model: null };
    const player = createPcmPlayer();
    player.resume();
    playerRef.current = player;
    try {
      const sessionId = await createSession();
      const ws = new WebSocket(liveUrl(sessionId));
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;
      ws.onopen = () => {
        setStatus('live');
        setStartedAt(Date.now());
        startMic();
      };
      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          setThinking(false);
          playerRef.current?.enqueue(event.data);
          return;
        }
        const msg = JSON.parse(event.data);
        if (msg.type === 'transcript') {
          if (msg.role === 'model') setThinking(false);
          appendTranscript(msg.role, msg.text);
        } else if (msg.type === 'interrupted') {
          playerRef.current?.clear();
        } else if (msg.type === 'turn_complete') {
          openBubbleRef.current = { user: null, model: null };
        } else if (msg.type === 'ended') {
          setNotice(END_REASONS[msg.reason] || '');
          setStatus('ended');
        }
      };
      ws.onclose = (event) => {
        if (wsRef.current !== ws) return; // replaced by a newer session
        setThinking(false);
        if (event.code === 1008) setNotice('This session expired. Reconnect to start a new one.');
        setStatus((s) => (s === 'ended' ? s : s === 'connecting' ? 'error' : 'ended'));
        stopMicRef.current?.();
        stopMicRef.current = null;
        micOnRef.current = false;
        setMicOn(false);
      };
      ws.onerror = () => setNotice((n) => n || 'Couldn’t reach TeachXR.');
    } catch (err) {
      setStatus('error');
      setNotice(err.message);
    } finally {
      connectingRef.current = false;
    }
  }, [appendTranscript, startMic, teardown]);

  const toggleMic = useCallback(() => {
    if (micOnRef.current) {
      micOnRef.current = false;
      micLevelRef.current = 0;
      setMicOn(false);
    } else {
      startMic();
    }
  }, [startMic]);

  const sendText = useCallback(
    (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      openBubbleRef.current = { user: null, model: null };
      pushMessage({ role: 'user', text: trimmed });
      if (send({ type: 'text', text: trimmed })) {
        playerRef.current?.clear();
        setThinking(true);
      }
    },
    [pushMessage, send],
  );

  const sendImage = useCallback(
    ({ dataUrl, source, text = '' }) => {
      openBubbleRef.current = { user: null, model: null };
      pushMessage({ role: 'user', image: dataUrl, source, text });
      const data = dataUrl.slice(dataUrl.indexOf(',') + 1);
      if (send({ type: 'image', data, source, text })) {
        playerRef.current?.clear();
        setThinking(true);
      }
    },
    [pushMessage, send],
  );

  const hangup = useCallback(() => {
    send({ type: 'hangup' });
    teardown();
    setStatus('idle');
    setThinking(false);
  }, [send, teardown]);

  // Keepalive while the mic is off, so the backend's idle timeout only fires
  // for hidden or closed tabs, not a student who's typing.
  useEffect(() => {
    if (status !== 'live') return undefined;
    const timer = setInterval(() => {
      if (!micOnRef.current && document.visibilityState === 'visible') send({ type: 'ping' });
    }, PING_MS);
    return () => clearInterval(timer);
  }, [status, send]);

  useEffect(() => teardown, [teardown]);

  const getLevels = useCallback(
    () => ({ mic: micLevelRef.current, out: playerRef.current?.getLevel() ?? 0 }),
    [],
  );

  return {
    status,
    messages,
    notice,
    setNotice,
    micOn,
    micAvailable,
    startedAt,
    thinking,
    connect,
    hangup,
    toggleMic,
    sendText,
    sendImage,
    getLevels,
  };
}
