# TeachXR: the pitch

Condensed from the [Devpost submission](https://devpost.com/software/teachxr)
(Cal Hacks 11.0, winner of **Hackers' Choice** and **Vapi: Show us your Voice AI**).
Team: Duc Vu, Lam Pham, Vuong Ho, Hoang Le.

## Problem

Schools around the world face teacher shortages. Students reading on their own
get stuck with no one to ask, and generic chatbots don't know what's on the
page in front of them.

## Idea

TeachXR (a pun on "teacher") is an AI tutor in mixed-reality glasses. A student
reads a real textbook while wearing the glasses. When something is confusing,
they circle it with their finger. TeachXR sees exactly that passage and
explains it by voice: summaries, examples, step-by-step help, and follow-up
questions in natural conversation.

## Original build (Oct 2024)

- **Hardware**: Meta Quest 3 in passthrough, cast to a laptop.
- **Gestures**: MediaPipe gesture recognition. Point up to trace around a
  passage, thumbs up to crop.
- **Capture and OCR**: Google Cloud Vision reads the cropped image, and
  SingleStore stores it. A socket.io event pushes it to the web app.
- **Voice**: Vapi orchestrates Deepgram (speech to text), Gemini 1.5 Flash
  (reasoning) and Cartesia (speech), in a React + Tailwind interface.

## Today

A browser demo recreates the experience in a 3D dorm room with Gemini Live
underneath (see `docs/adr/`), so anyone can try it at teachxr.vietrochack.com.
