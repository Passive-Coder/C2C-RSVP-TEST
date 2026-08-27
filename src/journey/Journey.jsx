import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Lanterns, { Wind, lanternAt } from './Lanterns.jsx';
import Branches from './Branches.jsx';
import Rosette from './Rosette.jsx';
import { useFallingLadder } from './fallingLadder/index.js';
import Cards, {
  Emblem,
  LAYOUT,
  LOGO,
  CARD_RATIO,
  CARD_CLIP,
  wedgeClip,
  LOGO_BAND,
  STAR,
  STAR_REACH,
} from './Cards.jsx';
import { Plant, createBloomTimeline } from '../timeline/botanical.jsx';
import './journey.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* Each About chapter is fronted by one of the five cards. */
const CHAPTERS = [
  /* Cards are dealt in fan order: each chapter lifts the next card from the
     left, so the hand empties leftmost to rightmost. */
  {
    title: 'Code2Create',
    wordmark: true,
    card: 0,
    body: [
      'Code2Create is ACM-VIT’s flagship 48-hour national hackathon open to participants from colleges across India. C2C is all about pushing boundaries and building innovative projects.',
      'With multiple tracks to suit diverse interests, the event brings together participants to take on real-world challenges, team up with peers and learn from industry mentors.',
      'It’s a space where creativity meets skill and young developers get to showcase their talent.',
      'Whether you’re someone who’s just beginning to build your skill set or aiming to claim your next hackathon prize, C2C is the right event for you.',
      'Be part of a culture where we don’t just code for the vibes, we code to create.',
    ],
  },
  {
    title: 'ACM',
    card: 1,
    body: [
      'As the official student chapter of the Association for Computing Machinery at VIT Vellore, we’ve been pushing boundaries and challenging conventions since 2009. From research and development to open-source contributions and unorthodox events, we turn ideas into real-world impact.',
      'We don’t just write code — we ask questions, build with purpose, and learn together. With a culture built on trust and innovation, we’re here to build tools, solve problems, and grow as a community — because technology, at its best, brings people together.',
    ],
  },
  {
    title: 'ACM-W',
    card: 2,
    body: [
      'ACM-W was created with a simple yet profound mission: to create equal access to opportunities in technology and ensure that everyone, regardless of gender, has the chance to grow in STEM. We believe talent and potential aren’t defined by barriers, but by the right support, mentorship, and exposure.',
      'As a sister chapter of ACM-VIT, we are a part of a community that values contributions across all computing fields. Through our InspiHER podcast series, blogs, and community stalls, we’ve carved out a space where stories and perspectives are shared and voices in tech are amplified.',
      'We stand for inclusion, empowerment and growth, encouraging women to take initiative, share their ideas, and thrive in computing fields, shoulder to shoulder with their peers.',
    ],
  },
  {
    title: 'VIT',
    card: 3,
    body: [
      'Founded in 1984, VIT Vellore is one of India’s top engineering institutions, renowned for academic excellence, global outlook, and a strong emphasis on research and innovation. With students from across India and around the world, VIT offers a diverse and inclusive learning environment.',
      'The university provides world-class infrastructure, experienced faculty, and a wide range of industry-connected programs designed to prepare students for professional success. From pioneering research to impactful engineering projects, VIT empowers students to make meaningful contributions across every field.',
    ],
  },
];

/* The schedule is still under wraps: the three timeline cards spell it out,
   each carrying a placeholder line until the real days land. */
const TIMELINE_TEASER = [
  { title: 'Yet', line: 'The Code2Create timeline is still being crafted.' },
  { title: 'To Be', line: 'Day-wise tracks, talks and showdowns will drop right here.' },
  { title: 'Announced', line: 'Stay tuned — the full schedule lands soon.' },
];

/* Deterministic so the layout does not jump between renders. */
const EMBERS = [
  { left: 63, size: 60, duration: 34, delay: -4, sway: -70 },
  { left: 71, size: 40, duration: 44, delay: -19, sway: 52 },
  { left: 80, size: 76, duration: 38, delay: -27, sway: -40 },
  { left: 88, size: 48, duration: 48, delay: -11, sway: 64 },
  { left: 57, size: 34, duration: 52, delay: -33, sway: 38 },
  { left: 94, size: 64, duration: 41, delay: -40, sway: -56 },
  { left: 68, size: 28, duration: 58, delay: -23, sway: 46 },
];

/* One flat list with stable ids. A phone shows every one of them on a single
   ladder rather than dropping half the answers, and the id a panel is keyed by
   does not change when the breakpoint does. */
const FAQ = [
  {
    id: 'register',
    q: 'Who all can register?',
    a: 'Students from all over the country are eligible to participate in Code2Create. Everybody is welcome to make a difference.',
  },
  { id: 'cost', q: 'What will the hackathon cost me?' },
  { id: 'hardware', q: 'Can I implement my idea in hardware?' },
  { id: 'kind', q: 'What kind of hackathon is Code2Create?' },
  { id: 'team', q: 'How many members can constitute a team?' },
  { id: 'stay', q: 'Will there be accommodation for external participants' },
  { id: 'how', q: 'How to register?' },
  { id: 'early', q: 'Can I start working on my hack before the hackathon?' },
  { id: 'tech', q: 'Is the hackathon only about technology?' },
  { id: 'judging', q: 'What will be the judging criteria?' },
  { id: 'benefit', q: 'How will I benefit from attending this hackathon?' },
  { id: 'travel', q: 'Will there be travel reimbursements provided?' },
];

export default function Journey({ onFaqToggle, openFaq, petalsRef }) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);

  /*
   * The FAQ act runs as a simulation, not as part of the scrubbed timeline: a
   * fall stepped through by a scroll wheel is not a fall. The timeline only
   * cues it, and the act owns its own boughs and panel from there.
   */
  const ladder = useFallingLadder(stageRef);

  /* Two ladders side by side, or one long one on a phone. Every question is on
     the page either way — a phone used to be shown half of them. */
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const ladderColumns = useMemo(
    () => (narrow ? [FAQ] : [FAQ.slice(0, 6), FAQ.slice(6)]),
    [narrow],
  );

  useGSAP(
    () => {
      const root = rootRef.current;
      const stage = stageRef.current;
      const q = gsap.utils.selector(stage);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const cards = q('.card');
      const ridges = { far: q('.ridge--far')[0], mid: q('.ridge--mid')[0], near: q('.ridge--near')[0] };
      const lanterns = q('.lantern');
      const panels = q('.chapter');

      /* Geometry is read fresh rather than captured, so a resize (which makes
         ScrollTrigger refresh and invalidate) re-evaluates it against the new
         breakpoint and stage aspect. */
      const phone = () => window.matchMedia('(max-width: 760px)').matches;
      const base = () => (phone() ? LAYOUT.phone : LAYOUT.wide);

      /* Card widths are given as a % of stage width, which on a short stage
         makes them far too tall — the featured card ends up over the copy.
         Cap the resulting height and let the width follow. */
      const fit = (widthPct, maxHeightFraction) => {
        const box = stage.getBoundingClientRect();
        const maxWidth = ((box.height * maxHeightFraction * CARD_RATIO) / box.width) * 100;
        return Math.min(widthPct, maxWidth);
      };

      const layout = () => {
        const source = base();
        const fanWidth = fit(source.fanWidth, phone() ? 0.24 : 0.34);
        const featureWidth = fit(source.feature.width, phone() ? 0.24 : 0.46);
        return {
          fan: source.fan,
          fanWidth,
          feature: {
            ...source.feature,
            width: featureWidth,
            /* Keep it centred on where it would have sat. */
            left: source.feature.left + (source.feature.width - featureWidth) / 2,
          },
        };
      };

      const logo = () => {
        const box = phone() ? LOGO.phone : LOGO.wide;
        const short = window.innerHeight < 620;
        const width = fit(short ? box.width * 0.62 : box.width, 0.26);
        return { width, top: short ? 15 : box.top, left: 50 - width / 2 };
      };

      /* A card's height as a % of stage height, for a given width %. */
      const cardHeight = (widthPct) => {
        const box = stage.getBoundingClientRect();
        return (((widthPct / 100) * box.width) / CARD_RATIO / box.height) * 100;
      };

      /* The card box that lays its wedge exactly over the emblem. */
      const overEmblem = () => {
        const box = logo();
        return {
          left: `${box.left}%`,
          top: `${box.top - LOGO_BAND.offset * cardHeight(box.width)}%`,
          width: `${box.width}%`,
        };
      };

      const setStartState = () => {
        const at = overEmblem();
        const box = logo();

        /* The emblem is placed from the same numbers as the cards, so the two
           can never drift apart across breakpoints. */
        gsap.set(q('.emblem-holder'), {
          left: `${box.left}%`,
          top: `${box.top}%`,
          width: `${box.width}%`,
        });

        cards.forEach((card, index) => {
          gsap.set(card, {
            ...at,
            rotation: 0,
            clipPath: wedgeClip(index),
            borderRadius: 0,
            autoAlpha: 0,
            zIndex: 10 + index,
          });
        });
      };

      /* ---------------- initial state ---------------- */

      gsap.set(q('.hero-copy'), { xPercent: -50, autoAlpha: 1 });
      gsap.set(q('.hero-tree'), { xPercent: 0, autoAlpha: 1 });
      gsap.set(q('.emblem-holder'), { autoAlpha: 1 });
      gsap.set(q('.emblem__wedges'), { autoAlpha: 1 });
      setStartState();
      gsap.set(q('.card__face'), { autoAlpha: 0 });
      gsap.set(q('.card__wedge'), { autoAlpha: 1 });

      gsap.set(ridges.mid, { yPercent: 120 });
      gsap.set(q('.lantern__label'), { autoAlpha: 0 });
      gsap.set(panels, { autoAlpha: 0, xPercent: 8 });
      gsap.set(q('.bonsai'), { xPercent: 135, autoAlpha: 0 });
      gsap.set(q('.branches'), { autoAlpha: 1 });
      gsap.set(q('.wind'), { autoAlpha: 0 });
      gsap.set(q('.sky-dim'), { autoAlpha: 0 });

      /* ---------------- master timeline ---------------- */

      const tl = gsap.timeline({ defaults: { ease: 'none' } });

      /* A — hero holds while the petals come off the tree. */
      tl.to({}, { duration: 6 }, 0);

      /* B — the world pans east and the hero copy walks off to the left. The
         emblem stays exactly where it is; it is about to become the cards.
         The pan finishes as the spread lands: once the hand is in place the
         hills must be still, or the cards look like they are sliding. */
      const pan = (target, distance) =>
        tl.to(target, { backgroundPositionX: `-=${distance}`, duration: 22, ease: 'power2.out' }, 6);
      pan(ridges.near, 1500);
      pan(ridges.mid, 920);
      pan(ridges.far, 520);

      tl.to(q('.hero-copy'), { xPercent: -178, autoAlpha: 0, duration: 7, ease: 'power2.in' }, 6)
        .to(q('.hero-tree'), { xPercent: -120, duration: 9, ease: 'power2.in' }, 6);

      /* C — the mark opens up. First the white rim and dark ground fade out,
         leaving only the five coloured wedges; the cards take those over on a
         frame where nothing is moving, so the hand-off cannot be seen. */
      tl.to(q('.emblem__shell'), { autoAlpha: 0, duration: 2.6, ease: 'power2.inOut' }, 11.5)
        .set(cards, { autoAlpha: 1 }, 14.2)
        .set(q('.emblem__wedges'), { autoAlpha: 0 }, 14.2)
        .set(q('.emblem-holder'), { autoAlpha: 0 }, 14.2);

      /* D — the wedges revolve out into a five-pointed star. */
      cards.forEach((card, index) => {
        const star = STAR[index];
        tl.to(
          card,
          {
            rotation: star.spin,
            xPercent: star.dx * STAR_REACH * 100,
            yPercent: star.dy * STAR_REACH * 100 * CARD_RATIO,
            duration: 7,
            ease: 'power2.inOut',
          },
          14.4,
        );
      });

      /* E — each ray becomes a card, then the hand spreads out below. */
      cards.forEach((card, index) => {
        tl.to(
          card,
          {
            clipPath: CARD_CLIP,
            borderRadius: 16,
            duration: 4,
            ease: 'power2.inOut',
          },
          21.6 + index * 0.35,
        ).to(
          card,
          {
            left: () => `${layout().fan[index].left}%`,
            top: () => `${layout().fan[index].top}%`,
            width: () => `${layout().fanWidth}%`,
            rotation: () => layout().fan[index].rotate,
            xPercent: 0,
            yPercent: 0,
            duration: 6,
            ease: 'power2.inOut',
          },
          23.4 + index * 0.35,
        );
      });

      tl.to(q('.card__wedge'), { autoAlpha: 0, duration: 2.6 }, 24)
        .to(q('.card__face'), { autoAlpha: 1, duration: 2.4, stagger: 0.2 }, 26)
        ;

      /* D/E/F — each chapter lifts its card out of the fan, holds, returns. */
      CHAPTERS.forEach((chapter, index) => {
        const at = 32 + index * 9;
        const card = cards[chapter.card];

        tl.to(
          card,
          {
            left: () => `${layout().feature.left}%`,
            top: () => `${layout().feature.top}%`,
            width: () => `${layout().feature.width}%`,
            rotation: () => layout().feature.rotate,
            zIndex: 40,
            duration: 2.4,
            ease: 'power3.out',
          },
          at,
        )
          .to(panels[index], { autoAlpha: 1, xPercent: 0, duration: 2, ease: 'power2.out' }, at + 0.8)
          .to(panels[index], { autoAlpha: 0, xPercent: -6, duration: 1.6, ease: 'power2.in' }, at + 7)
          .to(
            card,
            {
              left: () => `${layout().fan[chapter.card].left}%`,
              top: () => `${layout().fan[chapter.card].top}%`,
              width: () => `${layout().fanWidth}%`,
              rotation: () => layout().fan[chapter.card].rotate,
              zIndex: 10 + chapter.card,
              duration: 2.4,
              ease: 'power3.inOut',
            },
            at + 7.4,
          );
      });

      /* G — the hand slides away under the hills and the middle ridge swells
         up. Then a hard gust blows the lanterns in from the left: they are
         carried horizontally and float up on their own buoyancy, the way a
         balloon does, so x and y run on different curves. */
      tl.to(cards, { yPercent: 175, autoAlpha: 0, duration: 6, stagger: 0.3, ease: 'power2.in' }, 70)
        .to(ridges.mid, { yPercent: 0, duration: 9, ease: 'power2.out' }, 71)
        .to(q('.embers'), { autoAlpha: 0, duration: 5 }, 70)
        .to(q('.wind'), { autoAlpha: 1, duration: 4 }, 71)
;

      lanterns.forEach((lantern, index) => {
        const spec = lanternAt(index, phone());
        const entry = -(spec.x + spec.size + 8);
        gsap.set(lantern, { x: `${entry}vw`, y: `${spec.drop}vh`, autoAlpha: 0 });

        tl.to(lantern, { autoAlpha: 1, duration: 2 }, 72 + index * 1.6)
          /* Blown across — fast at first, then the gust lets go. */
          .to(lantern, { x: 0, duration: 20, ease: 'power2.out' }, 72 + index * 1.6)
          /* And rising all the while, easing out as it finds its level. */
          .to(lantern, { y: 0, duration: 24, ease: 'sine.out' }, 72 + index * 1.6);
      });

      tl.to(q('.lantern__label'), { autoAlpha: 1, duration: 3, stagger: 0.8 }, 86);

      /* H — the wind takes the lanterns away and the hills leave the frame
         entirely; nothing of them should be visible once the bonsai is on. */
      tl.to(q('.lantern__label'), { autoAlpha: 0, duration: 2.5 }, 94)
        .to(q('.wind'), { autoAlpha: 0, duration: 4 }, 96)
        .to(
          lanterns,
          { x: '86vw', y: '-52vh', autoAlpha: 0, duration: 13, stagger: 0.7, ease: 'power2.in' },
          95,
        )
        .to([ridges.near, ridges.mid], { yPercent: 130, duration: 9, ease: 'power2.inOut' }, 95)
        .to(ridges.far, { yPercent: 130, duration: 9, ease: 'power2.inOut' }, 96)
        /* With the hills gone the rose in the sky would sit exposed at the
           bottom of the frame and read as a section edge; wash it out. */
        .to(q('.sky-dim'), { autoAlpha: 1, duration: 10, ease: 'power1.inOut' }, 95);

      /* I — the bonsai slides in from the right and blooms inside a swirl of
         petals that crosses the whole frame. */
      tl.to(q('.bonsai'), { xPercent: 0, autoAlpha: 1, duration: 6, ease: 'power3.out' }, 104);

      /* The great blossom behind the day card: it fades up with the act and
         turns slowly under the scroll — those stay scrubbed — but the five
         petals do NOT. A scrubbed stagger is compressed into however long
         the user spends crossing its scroll span, which at any real pace is
         a blink, and it never read as one-by-one. Instead each petal pops
         in REAL time — 0.55s with a little overshoot — the moment the
         playhead crosses its mark, exactly the way the ladder act is cued,
         so the sequence reads petal by petal at any scroll speed and folds
         back petal by petal on the way up. The container still goes fully
         dark by 129, so the FAQ act opens on a bare stage. */
      const rosette = q('.rosette')[0];
      const rosettePetals = q('.rosette__petal');
      gsap.set(rosette, { xPercent: -50, yPercent: -50, autoAlpha: 0, rotation: -24 });
      gsap.set(rosettePetals, {
        autoAlpha: 0,
        scale: 0.78,
        rotation: -9,
        transformOrigin: '50% 100%',
      });
      tl.to(rosette, { autoAlpha: 0.85, duration: 2.5 }, 105)
        .to(rosette, { rotation: 36, duration: 22, ease: 'none' }, 105)
        .to(rosette, { autoAlpha: 0, duration: 2.6 }, 126.4);

      const petalShown = rosettePetals.map(() => false);
      const rosetteCue = (progress) => {
        const at = progress * tl.duration();
        rosettePetals.forEach((petal, index) => {
          const wanted = at >= 108 + index * 3.2;
          if (wanted === petalShown[index]) return;
          petalShown[index] = wanted;
          gsap.to(
            petal,
            wanted
              ? {
                  autoAlpha: 1,
                  scale: 1,
                  rotation: 0,
                  duration: 0.55,
                  ease: 'back.out(1.6)',
                  overwrite: 'auto',
                }
              : {
                  autoAlpha: 0,
                  scale: 0.78,
                  rotation: -9,
                  duration: 0.4,
                  ease: 'power2.in',
                  overwrite: 'auto',
                },
          );
        });
      };

      /* Scoped to the bonsai so it does not also grab the branch flowers.
         Ends at 125.5, the moment the bonsai starts to leave. */
      const bonsaiBloom = createBloomTimeline(q('.bonsai')[0], { moments: false });
      tl.add(bonsaiBloom.duration(20.5), 105);

      /* Fade and rise only — no blur() in these: a filter tween on live text
         repaints the card on every scrubbed frame, and this act already pays
         for the bloom. */
      const days = q('.day');
      gsap.set(days, { autoAlpha: 0, y: 26 });
      tl.to(q('.days'), { autoAlpha: 1, duration: 2 }, 106)
        .to(days[0], { autoAlpha: 1, y: 0, duration: 2 }, 106.4)
        .to(days[0], { autoAlpha: 0, y: -26, duration: 1.8 }, 112.5)
        .to(days[1], { autoAlpha: 1, y: 0, duration: 1.8 }, 113.2)
        .to(days[1], { autoAlpha: 0, y: -26, duration: 1.8 }, 119.5)
        .to(days[2], { autoAlpha: 1, y: 0, duration: 1.8 }, 120.2)
        .to(q('.days'), { autoAlpha: 0, duration: 3 }, 126);

      /*
       * J/K — the bonsai leaves, and the FAQ act takes over. The boughs being
       * hauled back and released, the roll being paid out and the ladder
       * settling are all simulated in real time by `useFallingLadder`; the
       * timeline's only job is to say when. Scrolling back up past the cue
       * reels the ladder in again.
       *
       * The bonsai is fully out at 129.5 — before the reel's door at 130 —
       * so while the rig is being hauled off, the stage behind it is bare:
       * no act re-enters until the reel has finished and the door opens.
       */
      tl.to(q('.bonsai'), { xPercent: 135, autoAlpha: 0, duration: 4, ease: 'power2.in' }, 125.5);

      const FAQ_CUE = 131;
      /* The reel's door, in timeline seconds: while the ladder is being
         hauled back in, the scroll holds here, just below the cue. The
         bonsai act's furniture is gone by 129.5, so the stage behind the
         reel is bare and nothing else can appear until the rig has left.
         Forward is never walled — scrolling on toward the footer mid-fall
         is free, and the fall simply plays out as it goes. */
      const FAQ_ENTRY = 130;

      /* L — the FAQ act's scroll span: the shed reaches full at 141, then a
         short run carries the fall into the footer. */
      tl.to({}, { duration: 13 }, 133);

      /* M — the camera tilt. On layouts where the ladder is taller than the
         frame — a phone's single column, a short tablet — the whole act pans
         upward across the span, boughs and shell together so the knots never
         part from the wood, bringing the tail rungs on screen before the
         footer arrives. Wide stages measure zero overflow and never move.
         offsetTop/offsetHeight are layout values, untouched by the act's
         transforms, so the measure is exact even taken mid-fall. */
      const faqShell = q('.faq-shell')[0];
      const faqBranches = q('.branches')[0];
      const faqOverflow = () =>
        Math.max(0, faqShell.offsetTop + faqShell.offsetHeight + 28 - stage.clientHeight);
      tl.to(
        [faqBranches, faqShell],
        { y: () => -faqOverflow(), duration: 11, ease: 'none' },
        133.5,
      );

      /* ---------------- petals, cued off overall progress ------------- */

      /* Past the cue the ladder is out; before it, reeled in. A GSAP callback
         fires whichever way the playhead crosses it, so it cannot express a
         state — this can. The hook itself ignores a repeat of what it is
         already doing. */
      const ladderCue = (progress) => {
        ladder.setActive(progress * tl.duration() >= FAQ_CUE);
      };

      const petalCue = (progress) => {
        const api = petalsRef.current;
        if (!api) return;
        const at = progress * tl.duration();
        const ramp = (from, to) => gsap.utils.clamp(0, 1, (at - from) / (to - from));

        if (at < 15) {
          /* Strictly the hero: shed from the canopy itself, and sparsely. */
          api.setMode('canopy');
          api.setWind(0.08);
          api.setIntensity(0.12);
        } else if (at > 71 && at < 103) {
          /* Caught in the same gust that carries the lanterns — kept sparse so
             the stats stay legible. */
          api.setMode('drift');
          api.setWind(3.4);
          api.setIntensity(0.08 * ramp(71, 77) * (1 - ramp(96, 103)));
        } else if (at >= 103 && at < 130) {
          /* Carried slowly along the act's own route — down the left, across
             the floor, up the right — rather than milling about the middle. */
          api.setMode('path');
          api.setWind(0);
          api.setIntensity(ramp(103, 108));
        } else if (at >= 134) {
          /* Shed by the boughs, and still falling as the footer takes over —
             a light fall, so the questions stay the point of the act. */
          api.setMode('drift');
          api.setWind(0.5);
          api.setIntensity(0.085 * ramp(134, 141));
        } else {
          /* Between acts. Handing the mode to 'drift' marks any routed
             petals as strangers, which die fast — a quick scroll into the
             FAQ act must not carry the timeline's river along with it. */
          api.setMode('drift');
          api.setIntensity(0);
        }
      };

      /*
       * The tow must be watched whole: while the ladder is being hauled back
       * in, the scroll is walled at the reel's door and let go the moment
       * the rig is off. Only the reverse direction is gated — a fall never
       * holds the scroll. A nav jump is a deliberate leap rather than a
       * scroll, so it stands the wall down — for a window long enough to
       * carry the smooth scroll across the act and play its tow out, and
       * re-armed sooner if the user takes the wheel back. Enforcement is an
       * instant scroll: the page's own smooth behavior would turn the wall
       * to rubber.
       */
      let leapUntil = 0;
      const leap = () => {
        leapUntil = performance.now() + 2000;
      };
      const grab = () => {
        leapUntil = 0;
      };

      const gate = (self) => {
        if (ladder.getBusy() !== 'reel') return;
        if (performance.now() < leapUntil) return;
        const wall =
          self.start + (FAQ_ENTRY / tl.duration()) * (self.end - self.start);
        if (self.scroll() < wall) {
          window.scrollTo({ top: wall, behavior: 'instant' });
        }
      };

      const trigger = ScrollTrigger.create({
        animation: tl,
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        /* Enough catch-up to glide, little enough to feel free under the
           wheel. */
        scrub: reduced ? true : 0.7,
        invalidateOnRefresh: true,
        onRefreshInit: () => {
          /* Card geometry depends on the breakpoint and the stage's aspect, so
             re-seed the start box before ScrollTrigger re-measures. */
          if (tl.progress() === 0) setStartState();
        },
        onUpdate: (self) => {
          petalCue(self.progress);
          ladderCue(self.progress);
          rosetteCue(self.progress);
          gate(self);
        },
        onRefresh: (self) => {
          petalCue(self.progress);
          ladderCue(self.progress);
          rosetteCue(self.progress);
        },
      });

      /* The trigger stops reporting once its progress pegs at an end, so the
         walls also stand on the raw scroll — added after the trigger, which
         keeps them downstream of the cue that starts the act. */
      const guard = () => gate(trigger);
      window.addEventListener('scroll', guard, { passive: true });

      /* An opened answer makes the shell taller mid-act; once the expand
         settles, re-measure so the tilt still brings the tail into view. */
      let shellTimer = 0;
      const shellWatch = new ResizeObserver(() => {
        clearTimeout(shellTimer);
        shellTimer = setTimeout(() => ScrollTrigger.refresh(), 220);
      });
      shellWatch.observe(faqShell);
      window.addEventListener('journey:leap', leap);
      window.addEventListener('wheel', grab, { passive: true });
      window.addEventListener('touchstart', grab, { passive: true });

      petalCue(0);
      /* Cue again once mounting has fully settled, so the opening state cannot
         depend on which component attached its ref first. */
      requestAnimationFrame(() => petalCue(trigger.progress));

      /* The stage is built from large artwork that is still decoding when the
         trigger is created, so its end offset can come out unmeasured. Force a
         measure now, once every image has landed, and once more on load. */
      const refresh = () => ScrollTrigger.refresh();
      refresh();
      if (import.meta.env.DEV) window.__tl = { tl, trigger, petalCue, ladderCue, ladder, gsap };

      const images = Array.from(stage.querySelectorAll('img'));
      const pending = images.filter((img) => !img.complete);
      pending.forEach((img) => {
        img.addEventListener('load', refresh, { once: true });
        img.addEventListener('error', refresh, { once: true });
      });

      if (document.readyState === 'complete') {
        requestAnimationFrame(refresh);
      } else {
        window.addEventListener('load', refresh, { once: true });
      }

      return () => {
        clearTimeout(shellTimer);
        shellWatch.disconnect();
        window.removeEventListener('load', refresh);
        window.removeEventListener('scroll', guard);
        window.removeEventListener('journey:leap', leap);
        window.removeEventListener('wheel', grab);
        window.removeEventListener('touchstart', grab);
        pending.forEach((img) => img.removeEventListener('load', refresh));
        trigger.kill();
      };
    },
    { scope: rootRef },
  );

  return (
    <div className="journey" ref={rootRef}>
      <div className="journey__stage scene" ref={stageRef}>
        <div className="sky" aria-hidden="true" />
        <div className="sky-dim" aria-hidden="true" />

        <div className="ridge ridge--far" aria-hidden="true" />

        {/* Sky lanterns drifting up from behind the hills. */}
        <div className="embers" aria-hidden="true">
          {EMBERS.map((ember, index) => (
            <img
              key={index}
              src="/assets/img/lantern.png"
              alt=""
              style={{
                left: `${ember.left}%`,
                width: `${ember.size}px`,
                animationDuration: `${ember.duration}s`,
                animationDelay: `${ember.delay}s`,
                '--sway': `${ember.sway}px`,
              }}
            />
          ))}
        </div>

        <div className="ridge ridge--mid" aria-hidden="true" />

        <Wind />
        <Lanterns stageRef={stageRef} />
        <Cards />

        <div className="ridge ridge--near" aria-hidden="true" />

        <img className="hero-tree" src="/assets/img/tree.webp" alt="" aria-hidden="true" />

        <Branches />

        {/* ---------- hero ---------- */}
        <div className="emblem-holder">
          <Emblem />
        </div>

        <div className="hero-copy">
          <h1 className="hero-wordmark">
            <img src="/assets/svg/wordmark.svg" alt="Code2Create" width="669" height="85" />
          </h1>
          <p className="hero-tagline">Don’t just code for the vibes, Code2Create.</p>
          <a className="hero-cta" href="https://gravitas.vit.ac.in/events">
            <img src="/assets/svg/btn-box.svg" alt="" aria-hidden="true" />
            <span>Register Now</span>
          </a>
        </div>

        {/* ---------- about chapters ---------- */}
        <div className="chapters" id="about">
          {CHAPTERS.map((chapter) => (
            <article className="chapter" key={chapter.title}>
              <h2 className="chapter__title">
                <span>About</span>{' '}
                {chapter.wordmark ? (
                  <img src="/assets/svg/wordmark-sm.svg" alt="Code2Create" width="288" height="37" />
                ) : (
                  <span className="chapter__name">{chapter.title}</span>
                )}
              </h2>
              <div className="chapter__body">
                {chapter.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <h2 className="visually-hidden" id="stats">
          Code2Create by the numbers
        </h2>

        {/* ---------- timeline ---------- */}
        <Rosette />
        <div className="bonsai" id="timeline">
          <Plant />
        </div>
        <div className="days">
          {TIMELINE_TEASER.map((slot, index) => (
            <article className="moment day" key={slot.title} aria-hidden={index !== 0}>
              <h3 className="day__title">{slot.title}</h3>
              <p className="day__body">{slot.line}</p>
            </article>
          ))}
        </div>

        {/* ---------- FAQs ---------- */}
        <div className="faq-shell" id="faqs">
          <h2 className="visually-hidden">Frequently asked questions</h2>
          <div className="faq-columns">
            {ladderColumns.map((column, columnIndex) => (
              <ul className="faq-column" key={columnIndex}>
                <span className="rope rope--near" aria-hidden="true" />
                <span className="rope rope--far" aria-hidden="true" />
                {column.map((item) => {
                  const open = openFaq === item.id;
                  return (
                    <li className="plank" key={item.id}>
                      <h3 className="plank__heading">
                        <button
                          className="plank__face"
                          type="button"
                          aria-expanded={open}
                          aria-controls={`faq-${item.id}`}
                          onClick={() => onFaqToggle(item.id)}
                        >
                          <span>{item.q}</span>
                        </button>
                      </h3>
                      <div className="plank__answer" id={`faq-${item.id}`} data-open={open}>
                        <p>{item.a ?? 'Answers go live closer to the event — watch this space.'}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
