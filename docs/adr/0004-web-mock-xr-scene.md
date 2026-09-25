# 0004: A Three.js mock-XR scene instead of requiring a headset

## Status

Accepted (2026-09-25).

## Context

The product vision is a kid wearing mixed-reality glasses at their desk. The
hackathon build needed a Quest 3 and a laptop. A permanent demo has to work in
any browser, on desktop and phone.

## Decision

Recreate the experience as a first-person scene with `@react-three/fiber`:

- **Scene**: a dorm room at night, with a desk, a flippable textbook, a
  monitor, props, and the glasses on a charging pad.
- **Content**: book pages and monitor screens are drawn into canvas textures
  from `content/topics.js`, so they're crisp, editable in code, and legible to
  Gemini in captures. There are five spreads, each with a matching monitor
  screen.
- **Assets**: the room, desk, glasses and most props are procedural. Seven CC0
  models from Poly Haven add realism (lamp, alarm clock, plant, wall clock,
  bookshelf, book set, armchair). They're meshopt + WebP compressed to 1.4 MB
  total. Environment lighting uses `Lightformer`s, so there are no HDR
  downloads.
- **Flow**:
  1. Tap the glasses.
  2. They animate to the camera (`Glasses.jsx`) while an iris closes.
  3. The boot sequence plays.
  4. The HUD appears with the tutor on standby. Nothing connects to Gemini
     (and the mic isn't requested) until the student presses ＋ on the window.
- **HUD**: it keeps the original frontend's look: the purple/indigo palette
  (`darkPurple`, `deepIndigo`), the layered gradient orb (now audio-reactive),
  and the "Power learning by Touch/Sound/Vision/Senses" typewriter.
- **Layout (revised same day)**: the tutor chat is a **window floating in the
  room**, like the original Quest build's panels, not a screen-fixed sidebar.
  `scene/WorldUI.jsx` renders real DOM with drei `<Html transform>` (so text is
  crisp and inputs work) into a HUD layer above the look/lasso surface. A
  WebGL neon frame and a point light sit behind it, so it glows in the scene.
  - The window is anchored by yaw/pitch/distance around the eye. Drag the
    visionOS-style bar under it to swing it around you, or press **Recenter** to bring it in front.
  - A circle is projected onto the surface under it and drawn as a glowing
    dashed trace. The "ask about this" card floats beside it, 0.42 m from the eye.
  - The only screen-fixed UI is on the "lens": the status bar, the dock and
    the corner brackets. Portrait screens start the desk view turned slightly
    left so the glasses are in frame.

## Consequences

- Not real WebXR. A WebXR mode (passthrough on Quest) is a natural follow-up;
  see the backlog.
- The bundle is about 1.3 MB of JS (mostly three.js), plus models, behind a
  loading screen.
