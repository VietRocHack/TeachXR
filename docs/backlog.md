# Backlog

Known, non-blocking issues and ideas, roughly by value.

- **Real-mic QA.** Voice was verified end to end with real Gemini audio out,
  but mic input has only been tested indirectly (the build environment blocks
  mic access). Test on desktop Chrome, Safari, iOS and Android: speech
  recognition quality with the 16 kHz downsampling, barge-in feel, and
  autoplay/mic prompts.
- **Session resumption.** A reconnect starts a fresh Live session with no
  memory of the conversation. Gemini Live supports session resumption handles;
  the backend could carry one across reconnects.
- **App Check.** Add Firebase App Check with limited-use tokens on
  `/api/session` if abuse shows up (see YoungHeroes ADR 0006).
- **WebXR mode.** On a Quest or Vision Pro, enter immersive-ar passthrough and
  circle a real book with hand tracking, closing the loop with the original
  hackathon idea.
- **Bundle size.** The JS is about 1.3 MB (370 KB gzipped). Lazy-load
  postprocessing, or split the scene, if first-load time matters.
- **Glasses model polish.** The procedural visor reads well in the desk view
  but is basic up close. A proper low-poly GLB would be nicer.
- **More content.** Topics live in `frontend/src/content/topics.js`. Adding
  spreads needs no other code changes.
- **Collapsed chat sheet on phones** still offsets the view as if it were open.
