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
  3. The boot sequence waits for the tutor connection.
  4. The HUD appears.
- **HUD**: it keeps the original frontend's look: the purple/indigo palette
  (`darkPurple`, `deepIndigo`), the layered gradient orb (now audio-reactive),
  and the "Power learning by Touch/Sound/Vision/Senses" typewriter.
- **Layout**: on desktop the chat is a right column, and the camera uses
  `setViewOffset` to frame the desk left of it. On phones it's a bottom sheet
  and the view shifts up. Portrait screens start turned slightly left so the
  glasses are in frame.

## Consequences

- Not real WebXR. A WebXR mode (passthrough on Quest) is a natural follow-up;
  see the backlog.
- The bundle is about 1.3 MB of JS (mostly three.js), plus models, behind a
  loading screen.
