# 0003: A browser lasso replaces the MediaPipe gesture backend

## Status

Accepted (2026-09-25).

## Context

`TeachXR-backend-gesture` screen-captured the Windows "Casting" window of a
Quest 3 using win32 APIs, ran MediaPipe's gesture recognizer, and tracked the
index fingertip while "Pointing_Up". "Thumb_Up" cropped the bounding box of
the recent points (plus 20 px padding) and POSTed it to the OCR server. None of
that can run on a web page for a random visitor.

## Decision

In the web demo, the student's "hand" is the mouse or a finger:

- `hud/LookSurface.jsx`: in **Circle** mode (dock button, or hold Shift) a
  drag draws a glowing lasso. Otherwise a drag turns your head, and a pinch or
  the scroll wheel zooms.
- On release, `lib/capture.js` does what the gesture script did:
  1. Takes the lasso's bounding box plus padding.
  2. Renders one clean frame (no bloom, so text stays crisp).
  3. Crops it from the WebGL canvas.
  4. Encodes it as a JPEG, with its long side scaled into 480–1024 px.
- It raycasts a grid inside the box to label the capture `book`, `monitor` or
  `desk`, so the tutor knows where it came from. Hidden objects are skipped,
  because the worn glasses sit right at the camera.
- `hud/SelectionPopup.jsx` replaces the original Accept/Reject box with quick
  questions ("Explain this", "Help me solve it", …) or a free-form question.

## Consequences

- No hand tracking. The gesture idea survives as the lasso, and the landing
  page's "How it works" panel explains the original.
- The HUD is DOM, so it's never in the capture; only the 3D scene is.
