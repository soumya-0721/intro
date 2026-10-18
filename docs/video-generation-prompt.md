# NEXT360 — Cinematic Intro Video Generation Prompt

This document contains a complete, production-ready prompt package for generating
the 25–30 second cinematic launch intro (`assets/intro.mp4`) with an AI video
generator (Runway Gen-3/4, Kling, Luma, Sora, Veo) **or** for briefing a motion
graphics artist working in After Effects / Blender.

> **Important:** The website already ships with a real-time **canvas-rendered
> cinematic intro** that plays automatically when `assets/intro.mp4` is absent.
  Generating the video is an upgrade, not a requirement — the site works today.

---

## Master prompt (paste into a text-to-video tool)

**Format:** 16:9 landscape, 4K or 1080p, 30 fps, ~28 seconds, seamless dark
backgrounds between scenes, cinematic color grade (deep midnight navy +
metallic gold + electric blue), film grain, subtle anamorphic glow. No
voice-over required; design for a licensed cinematic orchestral/Indian-fusion
music bed added in post.

### Scene 1 — Auspicious Beginning (0:00–0:05)

> Ultra-cinematic opening. Deep midnight-blue void with soft volumetric haze.
> Warm golden bokeh particles drift slowly upward like temple sparks. Three
> elegant glowing diyas (traditional Indian oil lamps) rest on a reflective
> dark surface in the lower third, flames flickering naturally with realistic
> light falloff and reflections. Slow dolly-in camera movement. Soft golden
> light blooms from the center. Mood: reverent, premium, anticipatory.
> Overlay text fades in with elegant serif gold typography:
> **"A New Beginning. A New Vision."**

### Scene 2 — Technology Awakens (0:05–0:12)

> The golden particles accelerate and transform into luminous blue and gold
> digital energy streams flowing across the frame. Subtle glowing circuit-board
> traces draw themselves in electric blue over the dark navy background.
> A beautiful expanding ring of white-blue light pulses outward from center,
> symbolizing innovation. Blend of Indian festive warmth (gold) and futuristic
> digital aesthetics (blue). Particles resolve into an elegant data-flow
> pattern. Camera: slow orbital drift. Keep the frame refined and uncluttered.
> No text in this scene.

### Scene 3 — Logo Reveal (0:12–0:19)

> Premium cinematic logo reveal. A metallic gold and electric-blue light
> sweep crosses the frame and reveals the **NEXT360 logo** (insert the official
> logo as an image reference — preserve exact design, proportions, and colors).
> The logo settles center-frame with realistic metallic reflections, subtle
> depth of field, soft rim light in gold on one edge and blue on the other,
> and a gentle floating motion. A soft light flare travels across the logo
> surface once. Background: deep navy with faint radial glow.
> Below the logo, refined gold serif text fades in:
> **"Introducing the NEXT360 App"**

### Scene 4 — Dussehra Launch Announcement (0:19–0:25)

> Warm golden ambient glow fills the frame with extremely subtle festive
> sparkle and a faint ornamental mandala texture at very low opacity in the
> background. Elegant staggered text fade-ins, one line at a time, in
> gold and white premium typography:
> **"THIS DUSSEHRA, A NEW DIGITAL EXPERIENCE BEGINS."**
> **"NEXT360 APP LAUNCHING SOON"**
> **"October 20, 2026 | Vijayadashami"**
> Slow push-in camera. Sophisticated, readable, cinematic.

### Scene 5 — Final Call to Action (0:25–0:29)

> The NEXT360 logo returns, centered on a premium dark background with golden
> and blue light accents sweeping gently behind it. Final text lines fade in:
> **"The Future Starts Here."**
> **"Get Ready. NEXT360 Is Coming."**
> The frame slowly fades to black on the last beat of the music.

---

## Negative prompt (for tools that support it)

> no cartoon, no cheap neon, no cluttered UI mockups, no stock footage of
> people, no fake app screenshots, no misspelled text, no watermark, no
> distorted logo, no low resolution, no fast shaky camera.

---

## Audio design (add in post — 28–30 s)

| Time | Element |
|------|---------|
| 0:00–0:05 | Soft tanpura/ambient drone, gentle bell, warm and reverent |
| 0:05–0:12 | Rising electronic pulse + rhythmic tabla-inspired percussion build |
| 0:12–0:19 | Cinematic impact hit on logo reveal, then warm orchestral swell |
| 0:19–0:25 | Uplifting Indian-fusion theme, sitar/santoor accents over strings |
| 0:25–0:29 | Final resolving chord + soft shimmer tail, fade to silence |

Use royalty-free tracks (Epidemic Sound, Artlist, YouTube Audio Library) and
confirm the license covers commercial launch use.

---

## After Effects / Blender production notes (for a human animator)

1. **Composition:** 1920×1080 (or 3840×2160), 30 fps, 29.5 s, work in 16:9.
2. **Scene 1:** Particular/Particle World for golden sparks; draw 3 diyas as
   vector art with animated flame masks; camera dolly 5 s.
3. **Scene 2:** Trapcode Form or built-in particles re-timed into horizontal
   trails; shape-layer circuit traces with Trim Paths animation; expanding
   ring with radial wipe.
4. **Scene 3:** Import `assets/next360-logo.png` (the OFFICIAL logo — never
   redraw or approximate it). Add CC Light Sweep or a gradient wipe for the
   metallic shine; soft drop shadow + subtle 3D rotation (5–8°).
5. **Scene 4/5:** Text layers in Cinzel (or the brand font), staggered
   opacity/position keyframes, easing `Easy Ease` with long handles.
6. **Grade:** Lumetri — lift navy shadows, protect gold highlights, gentle
   vignette, 2–3 % film grain.
7. **Export:** H.264 MP4, target 8–15 Mbps for 1080p, `yuv420p` color,
   **no audio track needed** (site mutes autoplay; users can unmute via replay
   in a future iteration) — but including a soft audio bed is fine since the
   player starts muted.

---

## Delivery checklist for the video

- [ ] 16:9 landscape, 1080p or 4K, ≤ 30 seconds
- [ ] Official NEXT360 logo used exactly as supplied (no redraws)
- [ ] All five scenes present with correct copy
- [ ] Dark navy + gold + electric-blue palette only
- [ ] No fake Play Store badges, no invented app screenshots
- [ ] Exported as `assets/intro.mp4` (H.264, yuv420p)
- [ ] File size < ~25 MB for fast mobile loading
- [ ] Optionally also export a 9:16 vertical cut for social teasers
