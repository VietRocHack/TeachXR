// Raw PCM mic capture + playback for the Gemini Live tutor session — see
// docs/adr/0002-gemini-live.md. Copied from YoungHeroes' liveAudio.js, plus
// level metering that drives the HUD orb. Live API needs raw 16-bit PCM at
// 16kHz in / plays back 24kHz out; MediaRecorder only produces compressed
// container formats (webm/opus), so mic capture goes through the Web Audio
// API directly instead.

const LIVE_INPUT_SAMPLE_RATE = 16000;
const LIVE_OUTPUT_SAMPLE_RATE = 24000;

// Downsample Float32 samples at `inputRate` to Int16 PCM at LIVE_INPUT_SAMPLE_RATE.
// Simple linear interpolation — good enough for voice, not hi-fi audio.
function downsampleTo16kPCM16(float32Samples, inputRate) {
  const ratio = inputRate / LIVE_INPUT_SAMPLE_RATE;
  const outLength = Math.floor(float32Samples.length / ratio);
  const pcm16 = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio;
    const lo = Math.floor(srcIndex);
    const hi = Math.min(lo + 1, float32Samples.length - 1);
    const frac = srcIndex - lo;
    const sample = float32Samples[lo] + (float32Samples[hi] - float32Samples[lo]) * frac;
    const clamped = Math.max(-1, Math.min(1, sample));
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return pcm16;
}

function rms(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

// Starts streaming the mic as 16-bit PCM chunks at 16kHz. Calls
// `onChunk(ArrayBuffer, level)` for each chunk, where level is the chunk's RMS
// (0..1). Returns a stop() function that tears down the mic stream and audio graph.
export async function startMicCapture(onChunk) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);

  // ScriptProcessorNode is deprecated in favor of AudioWorklet, but needs no
  // separate worklet module file to load — simpler for this app's scope.
  const bufferSize = 4096;
  const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const pcm16 = downsampleTo16kPCM16(input, audioContext.sampleRate);
    onChunk(pcm16.buffer, rms(input));
  };

  source.connect(processor);
  // ScriptProcessorNode only fires onaudioprocess while connected to a
  // destination, even a silent one.
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);

  let stopped = false;
  return function stop() {
    // Hang-up and the unmount cleanup can both call this — AudioContext.close()
    // throws InvalidStateError on a second call.
    if (stopped) return;
    stopped = true;
    processor.disconnect();
    source.disconnect();
    silentGain.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    if (audioContext.state === "running" || audioContext.state === "suspended") {
      audioContext.close();
    }
  };
}

// Queues and gaplessly plays back raw 24kHz 16-bit PCM chunks as they arrive.
export function createPcmPlayer() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: LIVE_OUTPUT_SAMPLE_RATE,
  });
  let nextStartTime = 0;
  let activeSources = [];
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.connect(audioContext.destination);
  const levelBuffer = new Float32Array(analyser.fftSize);

  function enqueue(arrayBuffer) {
    const pcm16 = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
    }

    const audioBuffer = audioContext.createBuffer(1, float32.length, LIVE_OUTPUT_SAMPLE_RATE);
    audioBuffer.copyToChannel(float32, 0);

    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(analyser);
    sourceNode.onended = () => {
      activeSources = activeSources.filter((node) => node !== sourceNode);
    };

    const startTime = Math.max(nextStartTime, audioContext.currentTime);
    sourceNode.start(startTime);
    nextStartTime = startTime + audioBuffer.duration;
    activeSources.push(sourceNode);
  }

  // Current output loudness (0..1), for the speaking orb.
  function getLevel() {
    analyser.getFloatTimeDomainData(levelBuffer);
    return rms(levelBuffer);
  }

  function isPlaying() {
    return nextStartTime > audioContext.currentTime;
  }

  // Must be called from a user gesture on iOS/Safari, or playback stays muted.
  function resume() {
    if (audioContext.state === 'suspended') audioContext.resume();
  }

  // Barge-in: stop everything queued/playing right now so the model's
  // cut-off turn doesn't keep talking over the student.
  function clear() {
    activeSources.forEach((node) => {
      try {
        node.stop();
      } catch {
        // already stopped/ended — fine to ignore
      }
    });
    activeSources = [];
    nextStartTime = audioContext.currentTime;
  }

  function close() {
    clear();
    // AudioContext.close() throws unless the context is currently running or
    // suspended — calling it twice (e.g. once from an error path, again from
    // an unmount cleanup) would otherwise throw InvalidStateError.
    if (audioContext.state === "running" || audioContext.state === "suspended") {
      audioContext.close();
    }
  }

  // Resolves once everything queued so far has finished playing.
  function whenDrained() {
    const remainingMs = Math.max(0, nextStartTime - audioContext.currentTime) * 1000;
    return new Promise((resolve) => setTimeout(resolve, remainingMs));
  }

  return { enqueue, clear, close, whenDrained, getLevel, isPlaying, resume };
}
