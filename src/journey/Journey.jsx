import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Lanterns, { Wind, LANTERNS } from './Lanterns.jsx';
import Branches, { BOUGHS } from './Branches.jsx';
import { limbAt } from './limbCurve.js';
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

const BODY =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur';

/* Each About chapter is fronted by one of the five cards. */
const CHAPTERS = [
  { title: 'Code2Create', wordmark: true, card: 0 },
  { title: 'ACM-W', card: 2 },
  { title: 'ACM', card: 4 },
];

const DAY_BODY =
  'Lorem ipsum lorem ipsum lorem ipsum lorem ipsum Lorem ipsum lorem ipsum lorem ipsum lorem ipsum Lorem ipsum lorem ipsum lorem ipsum lorem ipsum Lorem ipsum lorem ipsum lorem ipsum lorem ipsum Lorem ipsum lorem ipsum lorem ipsum lorem ipsum';

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

const FAQ = [
  [
    {
      q: 'Who all can register?',
      a: 'Students from all over the country are eligible to participate in Code2Create. Everybody is welcome to make a difference.',
    },
    { q: 'What will the hackathon cost me?' },
    { q: 'Can I implement my idea in hardware?' },
    { q: 'What kind of hackathon is Code2Create?' },
    { q: 'How many members can constitute a team?' },
    { q: 'Will there be accommodation for external participants' },
  ],
  [
    { q: 'How to register?' },
    { q: 'Can I start working on my hack before the hackathon?' },
    { q: 'Is the hackathon only about technology?' },
    { q: 'What will be the judging criteria?' },
    { q: 'How will I benefit from attending this hackathon?' },
    { q: 'Will there be travel reimbursements provided?' },
  ],
];

export default function Journey({ onFaqToggle, openFaq, petalsRef }) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);

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
      const planks = q('.plank');
      const ropes = q('.rope');
      const boughs = q('.bough');

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
        const featureWidth = fit(source.feature.width, phone() ? 0.28 : 0.46);
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
      gsap.set(boughs, { autoAlpha: 0 });
      gsap.set(ropes, { scaleY: 0, transformOrigin: 'top center' });
      gsap.set(planks, { autoAlpha: 0 });
      gsap.set(q('.faq-shell'), { autoAlpha: 0 });
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
      tl.to(cards, { yPercent: 175, autoAlpha: 0, duration: 6, stagger: 0.3, ease: 'power2.in' }, 62)
        .to(ridges.mid, { yPercent: 0, duration: 9, ease: 'power2.out' }, 63)
        .to(q('.embers'), { autoAlpha: 0, duration: 5 }, 62)
        .to(q('.wind'), { autoAlpha: 1, duration: 4 }, 63)
;

      lanterns.forEach((lantern, index) => {
        const spec = LANTERNS[index];
        const entry = -(spec.x + spec.size + 8);
        gsap.set(lantern, { x: `${entry}vw`, y: `${spec.drop}vh`, autoAlpha: 0 });

        tl.to(lantern, { autoAlpha: 1, duration: 2 }, 64 + index * 1.6)
          /* Blown across — fast at first, then the gust lets go. */
          .to(lantern, { x: 0, duration: 20, ease: 'power2.out' }, 64 + index * 1.6)
          /* And rising all the while, easing out as it finds its level. */
          .to(lantern, { y: 0, duration: 24, ease: 'sine.out' }, 64 + index * 1.6);
      });

      tl.to(q('.lantern__label'), { autoAlpha: 1, duration: 3, stagger: 0.8 }, 78);

      /* H — the wind takes the lanterns away and the hills leave the frame
         entirely; nothing of them should be visible once the bonsai is on. */
      tl.to(q('.lantern__label'), { autoAlpha: 0, duration: 2.5 }, 86)
        .to(q('.wind'), { autoAlpha: 0, duration: 4 }, 88)
        .to(
          lanterns,
          { x: '86vw', y: '-52vh', autoAlpha: 0, duration: 13, stagger: 0.7, ease: 'power2.in' },
          87,
        )
        .to([ridges.near, ridges.mid], { yPercent: 130, duration: 9, ease: 'power2.inOut' }, 87)
        .to(ridges.far, { yPercent: 130, duration: 9, ease: 'power2.inOut' }, 88)
        /* With the hills gone the rose in the sky would sit exposed at the
           bottom of the frame and read as a section edge; wash it out. */
        .to(q('.sky-dim'), { autoAlpha: 1, duration: 10, ease: 'power1.inOut' }, 87);

      /* I — the bonsai slides in from the right and blooms inside a swirl of
         petals that crosses the whole frame. */
      tl.to(q('.bonsai'), { xPercent: 0, autoAlpha: 1, duration: 6, ease: 'power3.out' }, 96);

      /* Scoped to the bonsai so it does not also grab the branch flowers. */
      const bonsaiBloom = createBloomTimeline(q('.bonsai')[0], { moments: false });
      tl.add(bonsaiBloom.duration(22), 97);

      const days = q('.day');
      gsap.set(days, { autoAlpha: 0, filter: 'blur(3px)', y: 26 });
      tl.to(q('.days'), { autoAlpha: 1, duration: 2 }, 98)
        .to(days[0], { autoAlpha: 1, filter: 'blur(0px)', y: 0, duration: 2 }, 98.4)
        .to(days[0], { autoAlpha: 0, filter: 'blur(3px)', y: -26, duration: 1.8 }, 104.5)
        .to(days[1], { autoAlpha: 1, filter: 'blur(0px)', y: 0, duration: 1.8 }, 105.2)
        .to(days[1], { autoAlpha: 0, filter: 'blur(3px)', y: -26, duration: 1.8 }, 111.5)
        .to(days[2], { autoAlpha: 1, filter: 'blur(0px)', y: 0, duration: 1.8 }, 112.2)
        .to(q('.days'), { autoAlpha: 0, duration: 3 }, 118);

      /* J — the bonsai leaves and the boughs swing in. Each is held back and
         up, then released; the elastic ease is the stored energy playing out,
         so it overshoots and rocks itself still rather than easing politely
         into place. */
      tl.to(q('.bonsai'), { xPercent: 135, autoAlpha: 0, duration: 5, ease: 'power2.in' }, 120);

      const SWING_AT = 122;
      boughs.forEach((bough, index) => {
        const dir = BOUGHS[index].side === 'left' ? 1 : -1;
        gsap.set(bough, { transformOrigin: dir > 0 ? '4% 12%' : '96% 12%' });

        tl.set(bough, { autoAlpha: 1 }, SWING_AT)
          .fromTo(
            bough,
            { rotation: -26 * dir, yPercent: -46, xPercent: -8 * dir },
            { rotation: 0, yPercent: 0, xPercent: 0, duration: 9, ease: 'elastic.out(1, 0.42)' },
            SWING_AT + index * 0.5,
          );
      });

      /*
       * K — the ladder is already strung on the boughs when they are hauled
       * back, so it is carried up with them and flung when they let go. It is
       * a chain, not a set of independent boards: the release travels down it,
       * each rung starting a little after the one above and overshooting a
       * little more, the way slack runs down a rope ladder. Nothing fades in
       * and nothing falls out of the sky — every rung is on its cord the whole
       * time.
       */
      const LAG = 0.34; // how long the release takes to reach the next rung

      /* Wrapped, not passed by reference: attachRopes is declared further
         down, so naming it here would read it before initialisation. */
      const retie = () => attachRopes();
      tl.call(retie, null, SWING_AT + 3)
        .call(retie, null, SWING_AT + 7)
        .call(retie, null, SWING_AT + 12);

      tl.set(q('.faq-shell'), { autoAlpha: 1 }, SWING_AT - 0.2)
        .fromTo(
          ropes,
          { scaleY: 0 },
          { scaleY: 1, duration: 2.2, stagger: 0.12, ease: 'power2.out' },
          SWING_AT,
        );

      planks.forEach((plank) => {
        const column = plank.parentElement;
        /* Rope spans are children too, so count planks only. */
        const row = Array.from(column.querySelectorAll('.plank')).indexOf(plank);
        const at = SWING_AT + row * LAG;
        /* Further down the ladder means more slack to take up, so more throw
           and a looser settle. */
        const throwUp = 62 + row * 26;
        const tilt = (row % 2 ? 1 : -1) * (7 + row * 1.6);

        tl.set(plank, { autoAlpha: 1 }, SWING_AT - 0.2)
          .fromTo(
            plank,
            { y: -throwUp, rotation: tilt },
            { y: 0, duration: 6.5 + row * 0.3, ease: `elastic.out(1, ${(0.36 + row * 0.03).toFixed(2)})` },
            at,
          )
          .fromTo(
            plank,
            { rotation: tilt },
            { rotation: 0, duration: 7 + row * 0.3, ease: 'elastic.out(1, 0.3)' },
            at + 0.15,
          );
      });

      /* L — the boughs keep shedding; the fall carries on into the footer. */
      tl.to({}, { duration: 6 }, 150);

      /*
       * Hang each cord off the bough above it. The limbs are inside an SVG
       * with its own viewBox and `slice` fitting, so their on-screen geometry
       * cannot be derived from the markup — it is sampled: walk each limb,
       * project to screen space through the path's CTM, and take the point
       * closest in x to the cord. Re-run on every refresh.
       */
      const attachRopes = () => {
        const plate = boughs[0];
        if (!plate) return;

        ropes.forEach((rope) => {
          const column = rope.parentElement;
          const columnBox = column.getBoundingClientRect();
          const ropeBox = rope.getBoundingClientRect();
          const x = ropeBox.left + ropeBox.width / 2;

          /* Whichever bough covers this cord; the right-hand one is mirrored,
             so read its curve from the other end. */
          let best = null;
          boughs.forEach((bough, index) => {
            const box = bough.getBoundingClientRect();
            if (x < box.left || x > box.right || box.width < 1) return;
            let t = (x - box.left) / box.width;
            if (BOUGHS[index].side === 'right') t = 1 - t;
            const under = limbAt(t);
            if (under == null) return;
            const y = box.top + under * box.height;
            if (!best || y > best) best = y;
          });

          if (best != null) {
            const top = best - columnBox.top - 4;
            rope.style.top = `${top}px`;
            rope.style.height = `${Math.max(0, columnBox.height - top - 14)}px`;
          }
        });
      };

      /* ---------------- petals, cued off overall progress ------------- */

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
        } else if (at > 63 && at < 95) {
          /* Caught in the same gust that carries the lanterns. */
          api.setMode('drift');
          api.setWind(3.4);
          api.setIntensity(0.5 * ramp(63, 69) * (1 - ramp(88, 95)));
        } else if (at >= 95 && at < 122) {
          /* A mild swirl that hangs around the act — it holds until the boughs
             take over rather than thinning out while you are still reading. */
          api.setMode('swirl');
          api.setFocus(0.5, 0.5);
          api.setWind(0.15);
          api.setIntensity(ramp(95, 100));
        } else if (at >= 126) {
          /* Shed by the boughs, and still falling as the footer takes over. */
          api.setMode('drift');
          api.setWind(0.5);
          api.setIntensity(0.5 * ramp(126, 133));
        } else {
          api.setIntensity(0);
        }
      };

      const trigger = ScrollTrigger.create({
        animation: tl,
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        scrub: reduced ? true : 0.55,
        invalidateOnRefresh: true,
        onRefreshInit: () => {
          /* Card geometry depends on the breakpoint and the stage's aspect, so
             re-seed the start box before ScrollTrigger re-measures. */
          if (tl.progress() === 0) setStartState();
        },
        onUpdate: (self) => petalCue(self.progress),
        onRefresh: (self) => {
          attachRopes();
          petalCue(self.progress);
        },
      });

      petalCue(0);
      /* Cue again once mounting has fully settled, so the opening state cannot
         depend on which component attached its ref first. */
      requestAnimationFrame(() => petalCue(trigger.progress));

      /* The stage is built from large artwork that is still decoding when the
         trigger is created, so its end offset can come out unmeasured. Force a
         measure now, once every image has landed, and once more on load. */
      const refresh = () => ScrollTrigger.refresh();
      refresh();

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
        window.removeEventListener('load', refresh);
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

        <img className="hero-tree" src="/assets/img/tree.png" alt="" aria-hidden="true" />

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
          <a className="hero-cta" href="#register">
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
              <p className="chapter__body">{BODY}</p>
            </article>
          ))}
        </div>

        <h2 className="visually-hidden" id="stats">
          Code2Create by the numbers
        </h2>

        {/* ---------- timeline ---------- */}
        <div className="bonsai" id="timeline">
          <Plant />
        </div>
        <div className="days">
          {[1, 2, 3].map((day, index) => (
            <article className="moment day" key={day} aria-hidden={index !== 0}>
              <h3 className="day__title">{`Day ${day}`}</h3>
              <p className="day__body">{DAY_BODY}</p>
            </article>
          ))}
        </div>

        {/* ---------- FAQs ---------- */}
        <div className="faq-shell" id="faqs">
          <h2 className="visually-hidden">Frequently asked questions</h2>
          <div className="faq-columns">
            {FAQ.map((column, columnIndex) => (
              <ul className="faq-column" key={columnIndex}>
                <span className="rope rope--near" aria-hidden="true" />
                <span className="rope rope--far" aria-hidden="true" />
                {column.map((item, itemIndex) => {
                  const id = `${columnIndex}-${itemIndex}`;
                  const open = openFaq === id;
                  return (
                    <li className="plank" key={id}>
                      <h3 className="plank__heading">
                        <button
                          className="plank__face"
                          type="button"
                          aria-expanded={open}
                          aria-controls={`faq-${id}`}
                          onClick={() => onFaqToggle(id)}
                        >
                          <span>{item.q}</span>
                        </button>
                      </h3>
                      <div className="plank__answer" id={`faq-${id}`} data-open={open}>
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
