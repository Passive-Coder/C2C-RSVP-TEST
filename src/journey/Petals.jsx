import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import { CANOPY_POINTS } from './canopyPoints.js';

/*
 * Sakura petals.
 *
 * One canvas for the whole page, fixed to the viewport. The petals the boughs
 * shed in the FAQ act are the same particles that land in the footer — there is
 * no per-section field and nothing is emitted at the footer's top edge, so the
 * fall carries straight across the boundary.
 *
 * Motion is integrated per frame: gravity toward a per-petal terminal velocity,
 * air drag, a flutter that also drives the tumble, and a wind field with gusts.
 * Nothing is ever spawned inside the frame, and every airborne petal carries a
 * lifetime, so none can end up hanging in mid-air.
 *
 * THE DRIFT
 * ---------
 * The drift is a height map — one depth per column — redrawn from that height
 * map every frame. It is deliberately NOT a baked bitmap that gets carved: a
 * bitmap and a height map drift apart the moment you cut into one of them,
 * which is what left voids hanging under the surface with nothing beneath them.
 * Drawing from the height map every frame makes the mass under the surface
 * solid by construction, so it cannot develop a hole.
 *
 * The map also slumps toward its neighbours each frame, the way a pile of
 * anything light does, so a disturbance heals into a smooth hollow rather than
 * leaving the straight cut edges a carve would.
 */

const BASE = [210, 105, 143];
const TAU = Math.PI * 2;
const GRAVITY = 0.055;
const DRAG = 0.986;
const BUCKETS = 190;

/* Roughly how long a hollow takes to fill back in. */
const REFILL_SECONDS = 3;
const REFILL_PER_FRAME = 7;

/* How fast the pile slumps sideways. Higher settles quicker; too high and the
   drift starts behaving like a liquid. */
const SLUMP = 0.14;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function drawPetal(ctx, p) {
  const s = p.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.scale(Math.cos(p.phase) * 0.34 + 0.66, 1);
  ctx.globalAlpha = p.alpha;
  ctx.fillStyle = p.fill;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.5, -s * 0.42, s * 0.46, s * 0.3, 0, s * 0.5);
  ctx.bezierCurveTo(-s * 0.46, s * 0.3, -s * 0.5, -s * 0.42, 0, -s * 0.5);
  ctx.fill();
  ctx.restore();
}

const Petals = forwardRef(function Petals(
  {
    trackSelector = null,
    floorSelector = null,
    fillSelector = null,
    interactive = false,
    max = 420,
  },
  ref,
) {
  const canvasRef = useRef(null);
  const cfg = useRef({ mode: 'none', intensity: 0, focus: { x: 0.5, y: 0.5 }, wind: 0 });

  useImperativeHandle(ref, () => ({
    setMode(next) {
      cfg.current.mode = next;
    },
    setIntensity(value) {
      cfg.current.intensity = Math.max(0, Math.min(1, value));
    },
    setFocus(x, y) {
      cfg.current.focus = { x, y };
    },
    setWind(value) {
      cfg.current.wind = value;
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const MAX = reduced ? 0 : max;

    const petals = Array.from({ length: MAX }, () => ({ dead: true }));
    let w = 0;
    let h = 0;

    /* The drift: depth of the pile per column, in px. */
    const bank = new Float32Array(BUCKETS);
    const slumped = new Float32Array(BUCKETS);
    let bedWidth = 0;
    let bedSeeded = false;

    /* Fixed per-column jitter so the crest keeps its shape frame to frame
       instead of boiling. */
    const crest = Float32Array.from({ length: BUCKETS }, () => Math.random());

    /*
     * The drift is made of petals, not of a colour. Painting the body as a
     * filled shape turns it into a slab of pink goo, and painting every petal
     * individually every frame is thousands of draws. So: one tile of real
     * petals, built once and wrapped so it repeats seamlessly, used as the
     * fill for the height map's shape.
     */
    const TILE = 240;
    const tile = document.createElement('canvas');
    const tileCtx = tile.getContext('2d');
    let pattern = null;

    const buildTile = (dpr) => {
      tile.width = TILE * dpr;
      tile.height = TILE * dpr;
      tileCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tileCtx.clearRect(0, 0, TILE, TILE);

      for (let n = 0; n < 260; n += 1) {
        const px = Math.random() * TILE;
        const py = Math.random() * TILE;
        const rx = 4.6 + Math.random() * 3.4;
        const ry = rx * (0.6 + Math.random() * 0.2);
        const angle = Math.random() * TAU;
        const shade = Math.random();
        tileCtx.fillStyle = `rgb(${196 + shade * 42}, ${96 + shade * 52}, ${134 + shade * 40})`;
        tileCtx.globalAlpha = 0.72 + shade * 0.28;

        /* Draw wrapped copies so the tile has no seam. */
        for (let ox = -1; ox <= 1; ox += 1) {
          for (let oy = -1; oy <= 1; oy += 1) {
            const x = px + ox * TILE;
            const y = py + oy * TILE;
            if (x < -12 || x > TILE + 12 || y < -12 || y > TILE + 12) continue;
            tileCtx.save();
            tileCtx.translate(x, y);
            tileCtx.rotate(angle);
            tileCtx.beginPath();
            tileCtx.ellipse(0, 0, rx, ry, 0, 0, TAU);
            tileCtx.fill();
            tileCtx.restore();
          }
        }
      }

      pattern = ctx.createPattern(tile, 'repeat');
      /* The tile is at device resolution; bring it back to CSS pixels. */
      if (pattern && pattern.setTransform) {
        pattern.setTransform(new DOMMatrix().scale(1 / dpr));
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildTile(dpr);
      bedSeeded = false;
    };
    resize();
    window.addEventListener('resize', resize);

    const pointer = { x: -9999, y: -9999, px: -9999, py: -9999, on: false };
    const onMove = (event) => {
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.on = true;
    };
    const onLeave = () => {
      pointer.on = false;
    };
    if (interactive) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerleave', onLeave);
    }

    /** Where the drift lives right now, in viewport coordinates. */
    const readFloor = () => {
      const el = floorSelector ? document.querySelector(floorSelector) : null;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -240 || rect.top > h + 240 || rect.width < 1) return null;

      bedWidth = rect.width;

      const fill = fillSelector ? document.querySelector(fillSelector) : null;
      /* Up to the middle of the wordmark: its lower half is buried in the
         drift, its top half still reads. */
      let target = rect.height * 0.2;
      if (fill) {
        const box = fill.getBoundingClientRect();
        target = Math.max(40, rect.bottom - (box.top + box.height * 0.5));
      }

      return { rect, floorY: rect.bottom, target: Math.min(target, rect.height * 0.55) };
    };

    const bucketAt = (localX) =>
      Math.max(0, Math.min(BUCKETS - 1, Math.floor((localX / bedWidth) * BUCKETS)));

    /**
     * Paint the drift from its height map: the solid body first — that is the
     * mass of petals, and drawing it as one shape is what makes voids
     * impossible — then loose petals along the crest so the surface reads as
     * petals rather than as a filled curve.
     */
    const drawBed = (floor) => {
      const { left } = floor.rect;
      const base = floor.floorY;
      let peak = 0;
      for (let i = 0; i < BUCKETS; i += 1) peak = Math.max(peak, bank[i]);
      if (peak < 1 || !pattern) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left, base + 4);
      for (let i = 0; i < BUCKETS; i += 1) {
        const x = left + ((i + 0.5) / BUCKETS) * bedWidth;
        ctx.lineTo(x, base - bank[i]);
      }
      ctx.lineTo(left + bedWidth, base + 4);
      ctx.closePath();
      ctx.clip();

      const top = base - peak - 8;
      const height = peak + 20;

      /* Every pixel of the mass is petal. */
      ctx.fillStyle = pattern;
      ctx.fillRect(left, top, bedWidth, height);

      /* Depth: the petals further down sit in their own shadow. */
      const shade = ctx.createLinearGradient(0, base - peak, 0, base + 4);
      shade.addColorStop(0, 'rgba(58, 18, 38, 0)');
      shade.addColorStop(0.6, 'rgba(58, 18, 38, 0.1)');
      shade.addColorStop(1, 'rgba(44, 12, 30, 0.24)');
      ctx.fillStyle = shade;
      ctx.fillRect(left, top, bedWidth, height);
      ctx.restore();

      /* Loose petals over the crest, so the top edge is broken rather than
         cut, and the drift spills a little past its own outline. */
      for (let i = 0; i < BUCKETS; i += 1) {
        if (bank[i] < 2) continue;
        const x = left + ((i + 0.5) / BUCKETS) * bedWidth;
        const surface = base - bank[i];
        for (let k = 0; k < 3; k += 1) {
          const j = crest[(i + k * 43) % BUCKETS];
          const j2 = crest[(i * 7 + k * 17) % BUCKETS];
          ctx.save();
          ctx.translate(x + (j - 0.5) * 22, surface + j2 * 14 - 9);
          ctx.rotate(j2 * TAU);
          ctx.globalAlpha = 0.5 + j * 0.45;
          ctx.fillStyle = `rgb(${204 + j * 32}, ${104 + j * 46}, ${140 + j * 34})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, 4.8 + j2 * 3, 3 + j2 * 2, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }
    };

    const reset = (p) => {
      p.size = rand(7, 13);
      p.angle = rand(0, TAU);
      p.spin = rand(-0.55, 0.55) / 60;
      p.flutter = rand(0.01, 0.03);
      p.phase = rand(0, TAU);
      p.sway = rand(0.1, 0.42);
      p.terminal = rand(1.5, 3.1);
      p.alpha = rand(0.5, 0.95);
      p.swirl = 0;
      p.refill = false;
      p.life = 0;
      p.maxLife = rand(620, 1150);
      const shift = rand(-26, 30);
      p.fill = `rgb(${BASE[0] + shift * 0.5}, ${BASE[1] + shift}, ${BASE[2] + shift * 0.7})`;
    };

    const spawn = (p, seeding) => {
      const { mode, wind } = cfg.current;
      reset(p);

      if (mode === 'canopy') {
        const tree = trackSelector ? document.querySelector(trackSelector) : null;
        const box = tree?.getBoundingClientRect();
        const point = CANOPY_POINTS[(Math.random() * CANOPY_POINTS.length) | 0];

        if (box && box.width > 0) {
          p.x = box.left + point[0] * box.width;
          p.y = box.top + point[1] * box.height;
        } else {
          p.x = rand(0, w * 0.5);
          p.y = rand(-h * 0.1, 0);
        }
        if (seeding) p.y += rand(0, h * 0.7);
        /* Off the canopy they drift down slowly — the quiet backdrop to the
           hero, not weather. */
        p.terminal *= 0.32;
        p.sway *= 0.6;
        p.vx = rand(-0.05, 0.15);
        p.vy = rand(0.1, 0.25);
        return;
      }

      if (mode === 'swirl') {
        const fromLeft = Math.random() < 0.5;
        p.x = fromLeft ? rand(-0.14, -0.02) * w : rand(1.02, 1.14) * w;
        p.y = rand(-0.05, 1.05) * h;
        /* Seeding scatters across the whole frame. Feeding only from the
           edges leaves the middle of the act empty. */
        if (seeding) {
          p.x = rand(-0.1, 1.1) * w;
          p.y = rand(-0.05, 1.05) * h;
        }
        p.vx = (fromLeft ? 1 : -1) * rand(0.5, 1.4);
        p.vy = rand(-0.3, 0.3);
        p.swirl = rand(0.45, 1.05) * (fromLeft ? 1 : -1);
        /* Each petal keeps to its own band of the vortex, so they spread over
           every radius instead of all being flung to the rim. */
        p.orbit = rand(0.12, 0.92);
        /* Long-lived: they are meant to circle the act, not cross it once. */
        p.maxLife = rand(1400, 2600);
        return;
      }

      const windy = Math.abs(wind) > 0.35;
      if (windy && Math.random() < 0.55) {
        p.x = wind > 0 ? rand(-0.16, -0.02) * w : rand(1.02, 1.16) * w;
        p.y = rand(-0.05, 0.85) * h;
      } else {
        p.x = rand(-0.08, 1.08) * w;
        p.y = rand(-0.22, -0.02) * h;
      }
      if (seeding) {
        p.x = rand(-0.08, 1.08) * w;
        p.y = rand(-0.15, 0.95) * h;
      }
      p.vx = wind * rand(0.4, 0.9);
      p.vy = rand(0.4, 1.1);
    };

    const free = () => {
      for (let i = 0; i < petals.length; i += 1) if (petals[i].dead) return petals[i];
      return null;
    };

    let raf = 0;
    let seeded = false;
    let lastMode = cfg.current.mode;
    let clock = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, w, h);
      clock += 1;

      const { mode, intensity, wind } = cfg.current;
      if (mode !== lastMode) {
        seeded = false;
        lastMode = mode;
      }

      const floor = readFloor();

      if (floor) {
        /* Lay the drift down in one go the first time its floor can be
           measured — the ground should be there when you arrive, not build
           itself while you watch. */
        if (!bedSeeded) {
          for (let i = 0; i < BUCKETS; i += 1) {
            /* Low-frequency undulation plus per-column jitter, so the crest
               has dunes in it rather than a ruled edge. */
            const dune = Math.sin(i * 0.07) * 0.06 + Math.sin(i * 0.021 + 1.7) * 0.05;
            bank[i] = floor.target * (0.86 + dune + crest[i] * 0.07);
          }
          bedSeeded = true;
        }

        /* Slump: each column pulls toward the mean of its neighbours, so a
           hollow heals into a smooth basin and no cut edge survives. */
        for (let i = 0; i < BUCKETS; i += 1) {
          const l = bank[i === 0 ? 0 : i - 1];
          const r = bank[i === BUCKETS - 1 ? BUCKETS - 1 : i + 1];
          slumped[i] = bank[i] + ((l + r) / 2 - bank[i]) * SLUMP;
        }
        bank.set(slumped);

        /* Sweeping the cursor through the drift throws the whole column above
           it into the air — not a pocket with petals left hanging over it. */
        if (interactive && pointer.on) {
          const localX = pointer.x - floor.rect.left;
          const moved = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);

          if (localX > 0 && localX < bedWidth && moved > 1.5) {
            const bucket = bucketAt(localX);
            const depthAtCursor = Math.max(0, floor.floorY - pointer.y);

            if (pointer.y > floor.floorY - bank[bucket] - 30) {
              const reach = 62;
              const span = Math.ceil(reach / (bedWidth / BUCKETS));
              let displaced = 0;

              for (let i = bucket - span; i <= bucket + span; i += 1) {
                if (i < 0 || i >= BUCKETS) continue;
                const falloff = 1 - Math.abs(i - bucket) / (span + 1);
                const cutTo = depthAtCursor + (1 - falloff) * (bank[i] - depthAtCursor);
                if (cutTo < bank[i]) {
                  displaced += bank[i] - cutTo;
                  bank[i] = cutTo;
                }
              }

              /* Everything the columns gave up goes downwind. */
              const dx = pointer.x - pointer.px;
              const dy = pointer.y - pointer.py;
              const speed = Math.min(24, moved);
              const throwing = Math.min(18, Math.round(displaced / 10));
              for (let n = 0; n < throwing; n += 1) {
                const p = free();
                if (!p) break;
                p.dead = false;
                reset(p);
                p.x = pointer.x + rand(-reach, reach);
                p.y = pointer.y - Math.random() * 60;
                p.vx = (dx / (moved || 1)) * speed * rand(0.3, 0.9) + rand(-2.2, 2.2);
                p.vy = (dy / (moved || 1)) * speed * rand(0.2, 0.5) - rand(1.6, 5.5);
                p.spin = rand(-3.2, 3.2) / 60;
                p.maxLife = rand(180, 420);
              }
            }
            pointer.px = pointer.x;
            pointer.py = pointer.y;
          }
        }

        drawBed(floor);
      }

      const gust = wind * (1 + Math.sin(clock * 0.006) * 0.35 + Math.sin(clock * 0.021) * 0.12);
      const cap = mode === 'swirl' ? 0.46 : 0.4;
      const want =
        mode === 'none' ? 0 : Math.min(Math.round(MAX * intensity), Math.round(MAX * cap));
      let live = 0;

      for (const p of petals) {
        if (p.dead) continue;
        if (!p.refill) live += 1;

        p.phase += p.flutter;
        p.angle += p.spin + p.vx * 0.004;
        p.life += 1;
        if (p.life > p.maxLife) {
          p.alpha *= 0.94;
          if (p.alpha < 0.04) {
            p.dead = true;
            continue;
          }
        }

        if (mode === 'swirl' && !p.refill) {
          const fx = cfg.current.focus.x * w;
          const fy = cfg.current.focus.y * h;
          const dx = fx - p.x;
          const dy = fy - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          const reach = Math.min(w, h) * 0.62;
          /* Toward this petal's own orbit: inside it they drift out, outside
             it they drift in, so the frame fills at every radius. */
          const pull = (Math.min(1.4, dist / reach) - (p.orbit || 0.5)) * 0.3;
          p.vx += ((-dy / dist) * p.swirl + (dx / dist) * pull) * 0.05;
          p.vy += ((dx / dist) * p.swirl + (dy / dist) * pull) * 0.05;
          /* Barely any weight in the swirl: they circle the frame rather than
             raining through it. */
          p.vy += GRAVITY * 0.12;
        } else {
          p.vy += (p.terminal - p.vy) * GRAVITY;
          p.vx += Math.sin(p.phase) * p.sway * 0.16;
        }

        if (!p.refill) p.vx += (gust - p.vx) * 0.012;
        p.vx *= DRAG;
        p.vy *= DRAG;

        p.x += p.vx;
        p.y += p.vy;

        /* Landing: the petal becomes depth in the column it fell into. */
        if (floor && p.x > floor.rect.left && p.x < floor.rect.right) {
          const bucket = bucketAt(p.x - floor.rect.left);
          if (p.y >= floor.floorY - bank[bucket]) {
            bank[bucket] = Math.min(floor.target, bank[bucket] + p.size * 0.5);
            p.dead = true;
            continue;
          }
        }

        /* Cull below the viewport, unless the drift's floor is further down
           still — otherwise a petal dies before it can ever land. */
        const cullY = floor ? Math.max(h + 60, floor.floorY + 40) : h + 60;
        if (p.y > cullY || p.x > w + 90 || p.x < -90) {
          p.dead = true;
        } else {
          drawPetal(ctx, p);
        }
      }

      /* Top the drift back up to the threshold and no further, so a full bed
         has nothing falling into it. Paced so a hollow closes over about
         REFILL_SECONDS rather than snapping shut. */
      let shortfall = 0;
      if (floor) {
        const low = [];
        for (let i = 0; i < BUCKETS; i += 1) {
          if (floor.target - bank[i] > 6) low.push(i);
        }
        shortfall = low.length;

        if (low.length) {
          let deficit = 0;
          for (const i of low) deficit += floor.target - bank[i];
          const perPetal = 10 * 0.5;
          const budget = Math.max(
            1,
            Math.min(REFILL_PER_FRAME, Math.ceil(deficit / perPetal / (REFILL_SECONDS * 60))),
          );

          for (let n = 0; n < budget; n += 1) {
            const bucket = low[(Math.random() * low.length) | 0];
            const p = free();
            if (!p) break;
            p.dead = false;
            reset(p);
            p.refill = true;
            p.x = floor.rect.left + ((bucket + Math.random()) / BUCKETS) * bedWidth;
            p.y = floor.floorY - bank[bucket] - rand(40, 130);
            p.vx = rand(-0.4, 0.4);
            p.vy = rand(1.6, 3);
            p.maxLife = 400;
          }
        }
      }

      /* Ambient fall, suppressed once the drift is full and the footer owns the
         viewport — nothing should be falling into a finished bed. */
      const footerOwnsView = floor && floor.rect.top < h * 0.4;
      if (footerOwnsView && shortfall === 0) {
        seeded = true;
      } else if (live < want) {
        const budget = seeded ? 3 : want;
        for (let i = 0, made = 0; i < petals.length && made < budget; i += 1) {
          if (!petals[i].dead) continue;
          petals[i].dead = false;
          spawn(petals[i], !seeded);
          made += 1;
        }
        seeded = true;
      } else if (live > want + 8) {
        for (const p of petals) {
          if (!p.dead && !p.refill) {
            p.alpha *= 0.97;
            if (p.alpha < 0.05) p.dead = true;
          }
        }
      }
    };

    if (MAX) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [max, interactive, trackSelector, floorSelector, fillSelector]);

  return <canvas ref={canvasRef} className="petals" aria-hidden="true" />;
});

export default Petals;
