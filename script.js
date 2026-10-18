/* ==========================================================================
   NEXT360 — Dussehra App Launch
   Countdown · Cinematic intro · Launch-day Google Play redirect
   ========================================================================== */

(function () {
  "use strict";

  /* ========================================================================
     1. CONFIGURATION — THE ONLY PLACE YOU NEED TO EDIT
     ======================================================================== */

  /**
   * LAUNCH_DATE — the single source of truth for launch.
   * Must be an ISO-8601 timestamp with an explicit UTC offset.
   * Default: Vijayadashami, October 20 2026, 10:00 AM IST (+05:30).
   */
  const LAUNCH_DATE = "2026-10-20T10:00:00+05:30";

  /**
   * PLAY_STORE_URL — the OFFICIAL Google Play listing of the NEXT360 app.
   * Leave "" until the real listing is published. The site will NEVER
   * invent an app id or redirect to a fake listing; while empty, visitors
   * see a clear fallback message instead of a Play button.
   * Example once available:
   *   "https://play.google.com/store/apps/details?id=com.company.next360"
   */
  const PLAY_STORE_URL = "";

  /**
   * LAUNCH_MODE — "countdown" or "live".
   *  - "countdown": show the countdown until LAUNCH_DATE, then go live.
   *  - "live":      show the live launch announcement immediately.
   * After the app is released, switch this to "live".
   */
  const LAUNCH_MODE = "countdown";

  /** Milliseconds after the live overlay appears before auto-redirect. */
  const REDIRECT_DELAY_MS = 2000;

  /* ---- Test overrides (query parameters, never used by real visitors) ----
     ?mode=live                       -> force live mode
     ?mode=countdown                  -> force countdown mode
     ?launch=2026-10-20T10:00:00+05:30 -> override launch time (any ISO date)
     Example: index.html?launch=2026-01-01T00:00:00+05:30  (already past → live)
     Example: index.html?launch=2030-01-01T00:00:00+05:30  (far future → long countdown)
  -------------------------------------------------------------------------- */
  const params = new URLSearchParams(window.location.search);

  function resolveConfig() {
    let mode = String(params.get("mode") || LAUNCH_MODE).toLowerCase().trim();
    if (mode !== "live") mode = "countdown";

    let launchDateStr = params.get("launch") || LAUNCH_DATE;
    let launchTs = Date.parse(launchDateStr);
    if (Number.isNaN(launchTs)) {
      console.error("[NEXT360] Invalid LAUNCH_DATE — falling back to default.", launchDateStr);
      launchDateStr = LAUNCH_DATE;
      launchTs = Date.parse(LAUNCH_DATE);
    }
    if (Number.isNaN(launchTs)) {
      console.error("[NEXT360] LAUNCH_DATE is unparseable. Countdown disabled.");
      launchTs = null;
    }
    return { mode, launchDateStr, launchTs };
  }

  const CFG = resolveConfig();

  /* ========================================================================
     2. UTILITIES
     ======================================================================== */

  const $ = (sel) => document.querySelector(sel);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /**
   * Validate that PLAY_STORE_URL is a real, well-formed Google Play
   * store listing URL. Returns the URL string or null.
   * We never redirect anywhere that isn't an actual play.google.com
   * /store/apps/details page with an app id.
   */
  function validatedPlayUrl() {
    try {
      if (!PLAY_STORE_URL || typeof PLAY_STORE_URL !== "string") return null;
      const url = new URL(PLAY_STORE_URL.trim());
      if (url.protocol !== "https:") return null;
      if (url.hostname !== "play.google.com") return null;
      if (!url.pathname.startsWith("/store/apps/details")) return null;
      const id = url.searchParams.get("id");
      if (!id || !/^[a-zA-Z0-9._]+$/.test(id)) return null;
      return url.href;
    } catch (_) {
      return null;
    }
  }

  /* ========================================================================
     3. LOGO FALLBACK — hide broken images, show typographic wordmark
     ======================================================================== */

  function initLogoFallback() {
    const imgs = document.querySelectorAll('img[src*="next360-logo"]');
    const markMissing = () => document.body.classList.add("logo-missing");

    // Preferred chain: official PNG -> bundled SVG wordmark -> typographic text.
    function attachFallback(img) {
      if (img.dataset.logoChain === "svg") {
        // SVG also failed -> typographic fallback
        markMissing();
        return;
      }
      if (img.dataset.logoChain === "png") {
        img.dataset.logoChain = "svg";
        img.src = "assets/next360-logo.svg";
        return;
      }
      markMissing();
    }

    imgs.forEach((img) => {
      img.dataset.logoChain = "png";
      img.addEventListener("error", () => attachFallback(img));
      if (img.complete && img.naturalWidth === 0) attachFallback(img);
    });
  }

  /* ========================================================================
     4. CINEMATIC INTRO — video with canvas fallback engine
     ======================================================================== */

  const introOverlay = $("#intro-overlay");
  const introVideo = $("#intro-video");
  const introCanvas = $("#intro-canvas");
  const skipBtn = $("#skip-intro");

  let introFinished = false;
  let introRafId = null;
  let introVideoListenersBound = false;

  function finishIntro() {
    if (introFinished) return;
    introFinished = true;
    if (introRafId) cancelAnimationFrame(introRafId);
    try { introVideo.pause(); } catch (_) {}
    introOverlay.classList.add("is-done");
    document.body.classList.remove("intro-playing");
    document.body.classList.add("intro-done");
    setTimeout(() => { introCanvas.style.display = "none"; }, 1100);
    revealHero();
  }

  function revealHero() {
    document.querySelectorAll(".hero .reveal").forEach((el) => el.classList.add("is-in"));
  }

  function startIntro() {
    if (prefersReducedMotion) {
      introFinished = true;
      introOverlay.classList.add("is-done");
      document.body.classList.remove("intro-playing");
      document.body.classList.add("no-intro");
      revealHero();
      return;
    }

    // If a rendered intro.mp4 exists, play it; otherwise run the canvas film.
    let videoDecided = false;

    const useCanvasFilm = () => {
      if (videoDecided) return;
      videoDecided = true;
      introVideo.classList.add("is-hidden");
      startCanvasFilm();
    };

    const useVideo = () => {
      if (videoDecided) return;
      videoDecided = true;
      introCanvas.style.display = "none";
      if (!introVideoListenersBound) {
        introVideo.addEventListener("ended", finishIntro);
        introVideo.addEventListener("error", () => { videoDecided = false; useCanvasFilm(); });
        introVideoListenersBound = true;
      }
      introVideo.muted = true;
      introVideo.playsInline = true;
      const p = introVideo.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => { videoDecided = false; useCanvasFilm(); });
      }
      // Safety: if the video never produces frames, switch to the canvas film.
      setTimeout(() => {
        if (introVideo.readyState < 2 && !introFinished) {
          videoDecided = false;
          useCanvasFilm();
        }
      }, 1500);
    };

    introVideo.addEventListener("canplaythrough", useVideo, { once: true });
    introVideo.addEventListener("error", useCanvasFilm, { once: true });
    introVideo.src = "assets/intro.mp4";
    introVideo.load();

    // If neither canplaythrough nor error fires quickly, run the canvas film.
    setTimeout(useCanvasFilm, 2200);

    skipBtn.addEventListener("click", finishIntro);
  }

  function replayIntro() {
    introFinished = false;
    introOverlay.classList.remove("is-done");
    document.body.classList.add("intro-playing");
    document.body.classList.remove("no-intro");
    introCanvas.style.display = "block";

    // Prefer the video if it exists; otherwise re-run the canvas film.
    if (introVideo.querySelector("source") || introVideo.src) {
      try {
        introVideo.currentTime = 0;
        const p = introVideo.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            introCanvas.style.display = "none";
          }).catch(() => startCanvasFilm());
          return;
        }
        introCanvas.style.display = "none";
        return;
      } catch (_) { /* fall through to canvas */ }
    }
    startCanvasFilm();
  }

  /* ------------------------------------------------------------------------
     Canvas film engine — renders the 5-scene cinematic intro in-browser.
     This guarantees a premium intro even before assets/intro.mp4 is rendered.
     ------------------------------------------------------------------------ */

  function startCanvasFilm() {
    const ctx = introCanvas.getContext("2d");
    let W = 0, H = 0, dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      introCanvas.width = Math.floor(W * dpr);
      introCanvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    if (!startCanvasFilm._resizeBound) {
      window.addEventListener("resize", resize);
      startCanvasFilm._resizeBound = true;
      startCanvasFilm._resize = resize;
    } else {
      startCanvasFilm._resize();
    }

    /* --- Preload logo for scene 3 (PNG -> SVG -> typographic fallback) --- */
    const logoImg = new Image();
    let logoReady = false;
    logoImg.onload = () => { logoReady = logoImg.naturalWidth > 0; };
    logoImg.onerror = () => {
      if (!logoImg.src.endsWith("next360-logo.svg")) {
        logoImg.src = "assets/next360-logo.svg";
      } else {
        logoReady = false;
      }
    };
    logoImg.src = "assets/next360-logo.png";

    /* --- Particles --- */
    const isMobile = W < 700;
    const P_COUNT = isMobile ? 90 : 180;
    const particles = [];
    for (let i = 0; i < P_COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.8 + 0.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -Math.random() * 0.35 - 0.08,
        tw: Math.random() * Math.PI * 2,
        tws: Math.random() * 0.03 + 0.01,
        gold: Math.random() > 0.35
      });
    }

    /* --- Circuit nodes for scene 2 --- */
    const circuits = [];
    for (let i = 0; i < (isMobile ? 10 : 20); i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      circuits.push({
        x, y,
        len: Math.random() * 90 + 40,
        ang: [0, Math.PI / 2, Math.PI, -Math.PI / 2][Math.floor(Math.random() * 4)],
        prog: Math.random(),
        speed: Math.random() * 0.006 + 0.003,
        blue: Math.random() > 0.5
      });
    }

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const easeInCubic = (t) => t * t * t;
    const clamp01 = (t) => Math.max(0, Math.min(1, t));

    /* Scene boundaries (ms) — matches the 5-scene brief */
    const S1 = [0, 5000];
    const S2 = [5000, 12000];
    const S3 = [12000, 19000];
    const S4 = [19000, 25000];
    const S5 = [25000, 29500];
    const TOTAL = S5[1];

    const t0 = performance.now();

    /* --- Drawing helpers --- */
    function bgGradient(glow) {
      const g = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.75);
      g.addColorStop(0, "#0a1630");
      g.addColorStop(0.55, "#050b18");
      g.addColorStop(1, "#02050d");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      if (glow > 0) {
        const gg = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.5);
        gg.addColorStop(0, `rgba(84, 116, 76,${0.16 * glow})`);
        gg.addColorStop(1, "rgba(84, 116, 76,0)");
        ctx.fillStyle = gg;
        ctx.fillRect(0, 0, W, H);
      }
    }

    function drawTrackedText(text, x, y, size, tracking, fillStyle, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `500 ${size}px Cinzel, "Times New Roman", serif`;
      ctx.fillStyle = fillStyle;
      ctx.textBaseline = "middle";
      const chars = [...text];
      const widths = chars.map((c) => ctx.measureText(c).width);
      const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
      let cx = x - total / 2;
      chars.forEach((c, i) => {
        ctx.fillText(c, cx, y);
        cx += widths[i] + tracking;
      });
      ctx.restore();
    }

    function drawDiya(x, y, s, flick) {
      ctx.save();
      ctx.translate(x, y);
      // glow
      const glow = ctx.createRadialGradient(0, -18 * s, 0, 0, -18 * s, 42 * s * (0.9 + flick * 0.25));
      glow.addColorStop(0, `rgba(122, 148, 105,${0.55 + flick * 0.2})`);
      glow.addColorStop(0.4, `rgba(84, 116, 76,${0.25 + flick * 0.1})`);
      glow.addColorStop(1, "rgba(84, 116, 76,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -18 * s, 42 * s * (0.9 + flick * 0.25), 0, Math.PI * 2);
      ctx.fill();
      // flame
      ctx.fillStyle = `rgba(255,236,180,${0.9 + flick * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(0, -18 * s + flick * 1.5, 3.4 * s, (8.5 + flick * 2.5) * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,180,60,0.85)`;
      ctx.beginPath();
      ctx.ellipse(0, -15.5 * s + flick * 1.2, 2 * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // clay lamp
      ctx.fillStyle = "#8a5a24";
      ctx.beginPath();
      ctx.ellipse(0, 0, 16 * s, 7 * s, 0, 0, Math.PI);
      ctx.quadraticCurveTo(12 * s, 6 * s, 0, 7.5 * s);
      ctx.quadraticCurveTo(-12 * s, 6 * s, -16 * s, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(84, 116, 76,0.8)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, -1 * s, 14 * s, 5 * s, 0, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    function sceneAlpha(t, a, b, fadeIn = 600, fadeOut = 600) {
      const inA = clamp01((t - a) / fadeIn);
      const outA = clamp01((b - t) / fadeOut);
      return easeOutCubic(inA) * easeOutCubic(outA);
    }

    /* --- Main loop --- */
    function frame(now) {
      if (introFinished) return;
      const t = now - t0;
      if (t >= TOTAL) { finishIntro(); return; }

      ctx.clearRect(0, 0, W, H);

      /* Global particle field — density/behavior shifts per scene */
      const trailMode = t >= S2[0] && t < S3[0] + 500;

      particles.forEach((p) => {
        if (trailMode) {
          // energy trails: accelerate toward horizontal flow
          p.vx += (p.gold ? 1 : 1) * 0.015;
          p.vx *= 0.985;
          p.x += p.vx * 2.2;
          p.y += p.vy * 0.4;
          if (p.x > W + 20) { p.x = -20; p.y = Math.random() * H; p.vx = (Math.random() - 0.5) * 0.2; }
        } else {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
          if (p.x < -10) p.x = W + 10;
          if (p.x > W + 10) p.x = -10;
        }
        p.tw += p.tws;
        const a = 0.35 + Math.sin(p.tw) * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold
          ? `rgba(122, 148, 105,${a})`
          : `rgba(122, 148, 105,${a * 0.85})`;
        ctx.fill();
      });

      /* ---------- SCENE 1 — Auspicious Beginning (0–5s) ---------- */
      if (t < S2[0] + 300) {
        bgGradient(sceneAlpha(t, S1[0], S1[1], 800, 900) * 0.8);

        // three diyas along the lower third
        const a1 = sceneAlpha(t, S1[0], S1[1], 700, 800);
        if (a1 > 0) {
          ctx.save();
          ctx.globalAlpha = a1;
          const fy = H * 0.78;
          const s = Math.min(W, H) / 620;
          drawDiya(W * 0.5 - 130 * s, fy, 1.15 * s, (Math.sin(now / 240) + 1) / 2);
          drawDiya(W * 0.5, fy - 14 * s, 1.45 * s, (Math.sin(now / 200 + 1.3) + 1) / 2);
          drawDiya(W * 0.5 + 130 * s, fy, 1.15 * s, (Math.sin(now / 270 + 2.6) + 1) / 2);
          ctx.restore();
        }

        const aT = sceneAlpha(t, 700, S1[1], 900, 700);
        if (aT > 0) {
          const size = Math.min(W * 0.055, 44);
          drawTrackedText("A New Beginning.", W / 2, H * 0.4, size, size * 0.12, "#9ab089", aT);
          drawTrackedText("A New Vision.", W / 2, H * 0.4 + size * 1.7, size, size * 0.12, "#fcfcfc", aT * 0.95);
        }
      }

      /* ---------- SCENE 2 — Technology Awakens (5–12s) ---------- */
      if (t >= S2[0] - 200 && t < S3[0]) {
        if (t >= S2[0]) bgGradient(0.35);

        const aC = sceneAlpha(t, S2[0], S3[0] - 400, 800, 800);
        if (aC > 0) {
          ctx.save();
          ctx.globalAlpha = aC * 0.75;
          circuits.forEach((c) => {
            c.prog += c.speed;
            if (c.prog > 1.4) c.prog = -0.2;
            const p = clamp01(c.prog);
            const x2 = c.x + Math.cos(c.ang) * c.len * p;
            const y2 = c.y + Math.sin(c.ang) * c.len * p;
            ctx.strokeStyle = c.blue ? "rgba(122, 148, 105,0.5)" : "rgba(84, 116, 76,0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            // node
            ctx.fillStyle = c.blue ? "rgba(154, 176, 137, 0.9)" : "rgba(122, 148, 105, 0.9)";
            ctx.beginPath();
            ctx.arc(x2, y2, 1.8, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        }

        // expanding innovation ring
        const ringT = clamp01((t - (S2[0] + 1200)) / 6000);
        if (ringT > 0 && ringT < 1) {
          const r = easeOutCubic(ringT) * Math.max(W, H) * 0.46;
          const fade = (1 - ringT) * 0.8;
          ctx.save();
          ctx.strokeStyle = `rgba(122, 148, 105,${fade})`;
          ctx.lineWidth = 2 - ringT;
          ctx.beginPath();
          ctx.arc(W / 2, H * 0.45, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = `rgba(84, 116, 76,${fade * 0.7})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(W / 2, H * 0.45, r * 0.82, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        const aT2 = sceneAlpha(t, S2[0] + 800, S3[0] - 300, 800, 600);
        if (aT2 > 0) {
          const size = Math.min(W * 0.04, 32);
          drawTrackedText("WHERE TRADITION", W / 2, H * 0.42, size, size * 0.16, "#9ab089", aT2 * 0.9);
          drawTrackedText("MEETS INNOVATION", W / 2, H * 0.42 + size * 1.8, size, size * 0.16, "#9ab089", aT2);
        }
      }

      /* ---------- SCENE 3 — NEXT360 Logo Reveal (12–19s) ---------- */
      if (t >= S3[0] - 300 && t < S4[0]) {
        bgGradient(0.5);

        const aL = sceneAlpha(t, S3[0], S4[0] - 500, 900, 900);
        if (aL > 0) {
          const scale = 0.86 + easeOutCubic(clamp01((t - S3[0]) / 1400)) * 0.14;
          ctx.save();
          ctx.globalAlpha = aL;
          ctx.translate(W / 2, H * 0.42);

          if (logoReady) {
            const maxW = Math.min(W * 0.56, 420);
            const ratio = logoImg.naturalHeight / logoImg.naturalWidth;
            const lw = maxW * scale;
            const lh = lw * ratio;
            // glow behind logo
            const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, lw * 0.8);
            lg.addColorStop(0, "rgba(84, 116, 76,0.28)");
            lg.addColorStop(0.6, "rgba(122, 148, 105,0.1)");
            lg.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = lg;
            ctx.fillRect(-lw, -lh * 1.4, lw * 2, lh * 2.8);
            ctx.drawImage(logoImg, -lw / 2, -lh / 2, lw, lh);
            // metallic shine sweep
            const shineX = ((t - S3[0]) / 2600) % 1.6 * lw * 1.6 - lw * 0.9;
            ctx.globalCompositeOperation = "source-atop";
            const sh = ctx.createLinearGradient(shineX - 40, 0, shineX + 40, 0);
            sh.addColorStop(0, "rgba(255,255,255,0)");
            sh.addColorStop(0.5, "rgba(255,244,214,0.35)");
            sh.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = sh;
            ctx.fillRect(-lw / 2, -lh / 2, lw, lh);
            ctx.globalCompositeOperation = "source-over";
          } else {
            // typographic fallback reveal
            const size = Math.min(W * 0.12, 96) * scale;
            drawTrackedText("NEXT", -size * 0.9, 0, size, size * 0.1, "#fcfcfc", aL);
            drawTrackedText("360", size * 1.05, 0, size, size * 0.1, "#7a9469", aL);
          }
          ctx.restore();
        }

        const aT3 = sceneAlpha(t, S3[0] + 2600, S4[0] - 200, 800, 600);
        if (aT3 > 0) {
          const size = Math.min(W * 0.042, 34);
          drawTrackedText("INTRODUCING THE NEXT360 APP", W / 2, H * 0.62, size, size * 0.14, "#fcfcfc", aT3);
        }
      }

      /* ---------- SCENE 4 — Dussehra Launch Announcement (19–25s) ---------- */
      if (t >= S4[0] - 200 && t < S5[0]) {
        bgGradient(0.85);
        const gold = "#9ab089";

        const m1 = sceneAlpha(t, S4[0] + 200, S4[0] + 2600, 700, 500);
        const m2 = sceneAlpha(t, S4[0] + 2400, S4[0] + 4200, 600, 500);
        const m3 = sceneAlpha(t, S4[0] + 4000, S5[0], 600, 400);

        if (m1 > 0) {
          const size = Math.min(W * 0.038, 31);
          drawTrackedText("THIS DUSSEHRA,", W / 2, H * 0.36, size, size * 0.15, gold, m1);
          drawTrackedText("A NEW DIGITAL EXPERIENCE BEGINS.", W / 2, H * 0.36 + size * 1.9, size, size * 0.15, gold, m1);
        }
        if (m2 > 0) {
          const size = Math.min(W * 0.045, 37);
          drawTrackedText("NEXT360 APP LAUNCHING SOON", W / 2, H * 0.46, size, size * 0.16, "#9ab089", m2);
        }
        if (m3 > 0) {
          const size = Math.min(W * 0.04, 33);
          drawTrackedText("OCTOBER 20, 2026  |  VIJAYADASHAMI", W / 2, H * 0.58, size, size * 0.15, "#fcfcfc", m3);
        }
      }

      /* ---------- SCENE 5 — Final Call to Action (25–29.5s) ---------- */
      if (t >= S5[0]) {
        bgGradient(0.6);
        const a5 = sceneAlpha(t, S5[0], S5[1], 700, 900);
        if (a5 > 0) {
          if (logoReady) {
            const maxW = Math.min(W * 0.4, 300);
            const ratio = logoImg.naturalHeight / logoImg.naturalWidth;
            ctx.save();
            ctx.globalAlpha = a5;
            ctx.drawImage(logoImg, W / 2 - maxW / 2, H * 0.32 - (maxW * ratio) / 2, maxW, maxW * ratio);
            ctx.restore();
          } else {
            const size = Math.min(W * 0.08, 64);
            drawTrackedText("NEXT360", W / 2, H * 0.32, size, size * 0.12, "#7a9469", a5);
          }
          const size = Math.min(W * 0.05, 40);
          drawTrackedText("THE FUTURE STARTS HERE.", W / 2, H * 0.52, size, size * 0.13, "#9ab089", a5);
          const size2 = Math.min(W * 0.034, 27);
          drawTrackedText("GET READY. NEXT360 IS COMING.", W / 2, H * 0.52 + size * 1.8, size2, size2 * 0.15, "#fcfcfc", a5 * 0.9);
        }
      }

      /* Cinematic vignette */
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.78);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      introRafId = requestAnimationFrame(frame);
    }

    introRafId = requestAnimationFrame(frame);
  }

  /* ========================================================================
     5. LIVE COUNTDOWN — timestamp-based, single source of truth
     ======================================================================== */

  const cdRoot = $("#countdown");
  const cdDays = $("#cd-days");
  const cdHours = $("#cd-hours");
  const cdMinutes = $("#cd-minutes");
  const cdSeconds = $("#cd-seconds");
  const cdNote = $("#countdown-note");

  /* Final 10 -> 1 full-screen launch countdown */
  const finalCd = $("#final-countdown");
  const finalCdNumber = $("#final-countdown-number");
  const FINAL_COUNTDOWN_SECONDS = 10;
  let finalCdShown = false;
  let lastFinalDigit = null;

  let countdownInterval = null;
  let countdownDone = false;

  function pad(n) { return String(n).padStart(2, "0"); }

  function setUnit(el, value) {
    const s = pad(value);
    if (el.textContent !== s) {
      el.textContent = s;
      el.classList.remove("tick", "flash");
      void el.offsetWidth; // restart animation
      el.classList.add("tick");
      if (el === cdSeconds) el.classList.add("flash");
    }
  }

  function showFinalCountdown(secondsLeft) {
    if (!finalCd) return;
    if (!finalCdShown) {
      finalCdShown = true;
      finalCd.hidden = false;
      finalCd.setAttribute("aria-hidden", "false");
      document.body.classList.add("final-countdown-active");
      // Ensure the cinematic intro is out of the way
      if (!introFinished) finishIntro();
      requestAnimationFrame(() => finalCd.classList.add("is-visible"));
    }
    if (secondsLeft !== lastFinalDigit) {
      lastFinalDigit = secondsLeft;
      finalCdNumber.textContent = String(secondsLeft);
      finalCdNumber.classList.remove("pop");
      void finalCdNumber.offsetWidth; // restart animation
      finalCdNumber.classList.add("pop");
      finalCd.classList.remove("pulse");
      void finalCd.offsetWidth;
      finalCd.classList.add("pulse");
    }
  }

  function hideFinalCountdown() {
    if (!finalCdShown) return;
    finalCdShown = false;
    finalCd.classList.remove("is-visible");
    finalCd.setAttribute("aria-hidden", "true");
    document.body.classList.remove("final-countdown-active");
    setTimeout(() => { if (!finalCdShown) finalCd.hidden = true; }, 800);
  }

  function tickCountdown() {
    if (CFG.launchTs === null) return;
    const now = Date.now();
    let diff = CFG.launchTs - now;

    if (diff <= 0) {
      setUnit(cdDays, 0);
      setUnit(cdHours, 0);
      setUnit(cdMinutes, 0);
      setUnit(cdSeconds, 0);
      if (!countdownDone) {
        countdownDone = true;
        if (countdownInterval) clearInterval(countdownInterval);
        cdRoot.classList.add("is-complete");
        if (cdNote) cdNote.textContent = "Launched — welcome to NEXT360";
        hideFinalCountdown();
        goLive({ fromCountdown: true });
      }
      return;
    }

    const sec = Math.floor(diff / 1000);
    setUnit(cdDays, Math.floor(sec / 86400));
    setUnit(cdHours, Math.floor((sec % 86400) / 3600));
    setUnit(cdMinutes, Math.floor((sec % 3600) / 60));
    setUnit(cdSeconds, sec % 60);

    // Final dramatic 10 -> 1 takeover in the last seconds
    if (sec <= FINAL_COUNTDOWN_SECONDS) {
      showFinalCountdown(Math.max(1, sec));
    }
  }

  function startCountdown() {
    tickCountdown(); // immediate paint
    countdownInterval = setInterval(tickCountdown, 1000);
  }

  /* ========================================================================
     6. LIVE STATE + GOOGLE PLAY REDIRECT
     ======================================================================== */

  const liveOverlay = $("#live-overlay");
  const liveStoreSlot = $("#live-store-slot");
  const liveRedirectNote = $("#live-redirect-note");
  const liveFallback = $("#live-fallback");
  const liveDismiss = $("#live-dismiss");
  const launchCtaSlot = $("#launch-cta-slot");

  let liveShown = false;

  function playStoreButton(url, big) {
    const a = document.createElement("a");
    a.className = "btn btn-play" + (big ? " btn-lg" : "");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML =
      '<svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden="true">' +
      '<path d="M1.2 1.05C.9 1.36.7 1.85.7 2.47v17.06c0 .62.2 1.11.5 1.42l.06.06 9.55-9.55v-.22L1.26.99l-.06.06Z" fill="#fff" fill-opacity=".9"/>' +
      '<path d="m14.1 14.76-3.29-3.29v-.22l3.3-3.3.07.04 3.9 2.22c1.12.64 1.12 1.68 0 2.32l-3.9 2.22-.08.01Z" fill="#FFD54F"/>' +
      '<path d="m14.17 14.72-3.36-3.36L1.2 20.95c.37.39.98.44 1.67.05l11.3-6.28Z" fill="#4CAF50"/>' +
      '<path d="M14.17 8.08 2.87 1.8C2.18 1.41 1.57 1.46 1.2 1.85l9.61 9.51 3.36-3.28Z" fill="#F44336"/>' +
      "</svg>Open on Google Play";
    return a;
  }

  function goLive(opts) {
    if (liveShown) return;
    liveShown = true;

    const url = validatedPlayUrl();

    // Replace the "View Countdown" CTA in the launch section with the Play button
    if (launchCtaSlot) {
      launchCtaSlot.innerHTML = "";
      if (url) {
        launchCtaSlot.appendChild(playStoreButton(url, true));
      } else {
        const note = document.createElement("p");
        note.className = "countdown-note";
        note.textContent = "Arriving on Google Play — October 20, 2026";
        launchCtaSlot.appendChild(note);
      }
    }

    // Live overlay
    liveStoreSlot.innerHTML = "";
    if (url) {
      liveStoreSlot.appendChild(playStoreButton(url, true));
      liveRedirectNote.hidden = false;
      liveFallback.hidden = true;
    } else {
      liveRedirectNote.hidden = true;
      liveFallback.hidden = false;
    }

    liveOverlay.hidden = false;
    requestAnimationFrame(() => liveOverlay.classList.add("is-visible"));

    liveDismiss.onclick = () => {
      liveOverlay.classList.remove("is-visible");
      setTimeout(() => { liveOverlay.hidden = true; }, 800);
    };

    // Auto-redirect only when we have a validated official listing URL.
    if (url && (!opts || opts.autoRedirect !== false)) {
      setTimeout(() => {
        if (!liveOverlay.classList.contains("is-visible")) return; // user dismissed early
        window.location.href = url;
      }, REDIRECT_DELAY_MS);
    }
  }

  /* ========================================================================
     7. HERO AMBIENT PARTICLES (lightweight, site background)
     ======================================================================== */

  function initHeroParticles() {
    if (prefersReducedMotion) return;
    const canvas = $("#particles-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, raf = null;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const count = w < 700 ? 40 : 80;
    const ps = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.3,
      vy: -(Math.random() * 0.25 + 0.05),
      vx: (Math.random() - 0.5) * 0.12,
      a: Math.random() * Math.PI * 2,
      as: Math.random() * 0.02 + 0.005,
      gold: Math.random() > 0.4
    }));

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ps.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.a += p.as;
        if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
        const alpha = 0.25 + Math.sin(p.a) * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold ? `rgba(122, 148, 105,${alpha})` : `rgba(154, 176, 137,${alpha * 0.8})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }

    // Pause when tab hidden for battery/performance
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = null; }
      else if (!raf) raf = requestAnimationFrame(draw);
    });

    raf = requestAnimationFrame(draw);
  }

  /* ========================================================================
     8. SCROLL REVEAL + HEADER
     ======================================================================== */

  function initScrollReveal() {
    const els = document.querySelectorAll(".reveal:not(.hero .reveal), .reveal-card");
    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => io.observe(el));
  }

  function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ========================================================================
     9. BOOT
     ======================================================================== */

  function boot() {
    initLogoFallback();
    initHeader();
    initScrollReveal();
    initHeroParticles();

    const replayBtn = $("#replay-intro");
    if (replayBtn) replayBtn.addEventListener("click", replayIntro);

    if (CFG.mode === "live") {
      // Live mode: skip the intro, show the announcement immediately.
      introFinished = true;
      introOverlay.classList.add("is-done");
      document.body.classList.remove("intro-playing");
      document.body.classList.add("no-intro");
      revealHero();
      goLive({ autoRedirect: true });
      return;
    }

    // Countdown mode. If the launch moment has already passed (visitors
    // arriving after launch), show the live state immediately — never a
    // permanently expired countdown.
    if (CFG.launchTs !== null && Date.now() >= CFG.launchTs) {
      introFinished = true;
      introOverlay.classList.add("is-done");
      document.body.classList.remove("intro-playing");
      document.body.classList.add("no-intro");
      revealHero();
      startCountdown(); // will immediately resolve to zero and call goLive
      return;
    }

    startIntro();
    startCountdown();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
