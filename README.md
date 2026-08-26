# Code2Create 2026 — landing page

Vite + React build of the Code2Create 2026 landing page, from the Figma file
[Code2Create-2026 → RSVP Final Screens][figma].

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## Shape of the page

The page is **one pinned stage** (`src/journey/`) plus the footer. A single GSAP
master timeline, scrubbed by `ScrollTrigger` over a 1000vh track, carries the
whole story; there are no separately scrolling sections.

| Act | Timeline | What happens |
| --- | --- | --- |
| Hero | 0–14 | Cherry tree, petals shedding off the canopy, sky lanterns lifting from behind the ridge |
| Pan | 6–28 | The ridges scroll east and the hero copy walks off left. **The emblem does not move, and the pan finishes as the spread lands** — once the hand is in place the hills are still |
| Star | 11–21 | The white rim and dark ground fade off the mark, then the five wedges revolve out into a five-pointed star |
| Cards | 21–31 | Each ray becomes a card and the hand spreads into the fan between the hills |
| About | 32–60 | Each chapter lifts its card out of the fan, holds, returns it. The backdrop is static throughout |
| Stats | 62–86 | The hand sinks, the middle ridge swells, and a gust blows the lanterns in from the left — petals ride the same wind |
| Timeline | 87–120 | Lanterns blow away, **the hills leave the frame entirely**, the bonsai slides in and blooms inside a page-wide swirl |
| FAQs | 120–150 | The boughs are hauled back and released; the ladder strung on them is flung, the release running down it rung by rung |
| Hand-off | 150–156 | The boughs keep shedding; the fall carries on into the footer |

Chapter geometry lives next to the markup: `Cards.jsx` owns the wedges, the fan
and the per-breakpoint layout table, `Lanterns.jsx` owns the lantern positions,
`Journey.jsx` owns the timing.

## The emblem becoming the cards

The C2C mark is a hexagon made of exactly five coloured triangles
(`logo.svg` → `Vector_3 … Vector_7`). Those triangles are the cards:

- Each card is `clip-path`-ed to one wedge, in that wedge's own colour, laid
  precisely over the emblem — so the hand-off is a swap of identical pixels,
  not a dissolve between two different things.
- Registration is analytic, not measured. A card is taller than the emblem at
  the same width, so `LOGO_BAND` in `Cards.jsx` maps the wedge coordinates into
  the middle band of the card box.
- A triangle can't interpolate into a rectangle cleanly if you just repeat a
  corner — that corner has to travel to two rect corners and the shape passes
  through a sliver. `toQuad()` splits the longest edge at its midpoint instead,
  giving four distinct points, and matches the rect's winding.

## Petals

`Petals.jsx` is a canvas particle system with three modes:

- **canopy** — release points sampled from `tree.png` itself
  (`canopyPoints.js`, generated from the plate's alpha and colour: the underside
  of the foliage, excluding the petal carpet at the roots). It reads the tree's
  live box each spawn, so petals keep leaving the foliage while it pans away.
  This runs in the hero only.
- **swirl** — a wide vortex fed from the left and right edges, covering the
  whole frame during the timeline act.
- **drift** — a fall from the top, blown along by whatever wind is set. Under a
  strong wind petals enter from the upwind edge instead.

Motion is integrated per frame: gravity toward a per-petal terminal velocity,
air drag, a flutter that also drives the tumble, and a wind field with gusts
(`setWind`). **Nothing is ever spawned inside the frame** — petals enter from
the canopy, the top, or off the sides — so they are never seen popping into
existence.

Every airborne petal also carries a lifetime. A vortex or a dead calm can
otherwise leave one hovering indefinitely; past its span it fades and the
particle is recycled, so nothing is ever left stuck in the air.

`settle` banks petals up along the floor. A petal that lands is **painted once
into an offscreen canvas and its particle freed**, so the drift can be as deep
as you like for the cost of one `drawImage` per frame — `max` bounds only what
is in flight. A per-column height map gives the surface its slope.
`interactive` then lets the cursor scoop: it carves the bake with a
`destination-out` arc, drops the bank there, and throws a few live petals back
out of the hollow.

## Artwork

Everything under `public/assets/` came out of Figma through the Figma MCP
server. Two plates were reworked, and several were retired once the animation
replaced them:

- **`tree.png`** — the source render had its falling petals painted in. They
  were removed (connected-component pass over the alpha, keeping only the tree)
  so the petals could be simulated instead, at the originals' size and colour:
  ~13px blobs around `rgb(210,105,143)`.
- **`ridge-tile.png`** — the hills plate cropped to the band where its alpha is
  fully opaque, then mirrored onto itself. That makes it tile seamlessly, so the
  ridges pan sideways forever, and gives every band a solid bottom edge.
- The FAQ branch plate, the footer's cherry-tree plates and its bed-of-petals
  plate are gone: the boughs are drawn SVG that grows, and the bed is live
  petals.

## Boughs and lanterns

The boughs are the supplied plates, not drawn limbs. Both source SVGs wrapped
the same 1827×861 bitmap — one plain, one mirrored — so it was extracted once to
`branch-plate.png` and the right-hand bough is that image flipped in CSS.

They do not grow, they swing: each is held back and up as though hauled down and
pinned, and the timeline lets go on an `elastic.out` so the stored energy plays
out as an overshooting swing that rocks itself still.

The ladder is strung on the boughs *before* they are hauled back, so it is
carried up with them and flung when they let go. Each rung is animated
individually — rotating a whole column as one slab reads as a rotating
rectangle, not as a ladder. A rope ladder is stiff rungs on slack cord, so the
release travels *down* it: each rung starts `LAG` after the one above, swings
about its own cords, and carries more slack the further down it hangs, so it
swings wider and takes longer to settle. Nothing fades in and nothing falls out
of the sky.

The ladder ties onto the wood. `limbCurve.js` is generated from the plate by
tracing, per column, the longest vertical run of dark opaque pixels — the main
limb where it is thickest — and taking its underside. `attachRopes()` maps each
cord's x into plate space (reversed for the mirrored bough) and reads the y, so
a knot lands on the branch rather than in mid-air. It re-ties three times during
the swing, because the wood is still moving while the ladder arrives.

The lantern light is built the way light behaves rather than as a shape: the
source is a point at the lamp's mouth, brightness falls off radially from it,
and nothing clips the sides — the ellipse *is* the cone, so the edges are soft.
Two layers, a wide spill and a brighter shaft.

`Lanterns.jsx` treats each lamp as a balloon: the entrance runs x and y on
different curves (blown across on `power2.out`, rising on `sine.out` over a
longer span), with a continuous buoyant bob on its own wrapper and a cursor
lean that eases rather than snaps. `Wind` draws the streaks that make the gust
legible.

## Verifying animation in an embedded preview

The preview pane reports `document.visibilityState === 'hidden'`, so the browser
correctly refuses to fire `requestAnimationFrame` and the petal field sits
frozen with nothing to show for it. **Screenshots and canvas readbacks taken
there say nothing about the particle system.** To check it, temporarily expose a
frame stepper from the effect and pump it from the console:

```js
canvas.__step = (n = 1) => { for (let i = 0; i < n; i += 1) { cancelAnimationFrame(raf); frame(); } };
```

That drives the real code path, so the drift, the scoop and the refill can all
be measured. GSAP is unaffected — `tl.progress()` renders synchronously, so the
timeline can be inspected by seeking at any time.

## Things worth knowing before editing

- **No `overflow-x: hidden` on `html`/`body`.** It turns the root into a scroll
  container and the pinned stage stops sticking.
- **Every ridge band is anchored `bottom: 0`.** A band that stops short shows
  the plate's own hard bottom edge as a line across the scene; depth comes from
  each band's height and `background-size`, not from floating it.
- **`ScrollTrigger.refresh()` is called explicitly** after the trigger is built,
  again per image `load`, and again on window load. The stage is built from
  large artwork that is still decoding at mount, and without this the trigger
  can come out with no end offset and never advance.
- **Card geometry is read, never captured.** `layout()` and `logo()` in
  `Journey.jsx` are called fresh inside function-based tween values, so
  `invalidateOnRefresh` re-evaluates them on resize and at the phone
  breakpoint. The emblem is positioned from the same numbers, so the two can't
  drift apart.
- **Card widths are capped against stage height** (`fit()`). Widths given as a
  % of stage width become far too tall on a short window — the featured card
  ends up sitting over the copy. The cap converts a maximum height back into a
  width and re-centres.
- **`.cards` sits at `z-index: 4`, permanently under the front ridge**, so a
  card can never flash in front of the hills on its way to the fan. The
  hand-off from the emblem still works because the emblem is hidden on the very
  frame the cards appear, so it does not matter that it stacks above them.
- **`.sky-dim` washes the rose out of the sky** for the timeline and FAQ acts.
  With the hills gone the gradient's pink would otherwise sit exposed along the
  bottom of the frame and read as a seam against the footer.
- **The petal canvas needs an explicit `width`/`height` in CSS.** A canvas is a
  replaced element, so `position: fixed; inset: 0` with `width: auto` resolves
  to its *intrinsic* size — the width/height attributes, which are the backing
  store at devicePixelRatio. It then lays out at 2x the viewport on a retina
  screen and most of the field, including the whole drift, sits off screen.
- **The drift's body is a repeating tile of real petals, not a fill.** Painting
  the mass as a solid colour turns it into a slab of goo; painting every petal
  individually every frame is thousands of draws. One seamless tile is built
  once (each petal drawn nine times, wrapped, so it repeats without a seam) and
  used as the fill for the height map's shape.
- **The drift is a height map, redrawn from that map every frame — not a baked
  bitmap that gets carved.** A bitmap and a height map drift apart the moment
  you cut into one of them, and that is what left voids hanging under the
  surface with nothing beneath them. Drawing the body as one filled shape from
  the height map makes the mass solid by construction, so it cannot develop a
  hole. Loose petals are scattered over the crest and down through it so it
  still reads as petals.
- **The map slumps toward its neighbours every frame** (`SLUMP`), the way a
  pile of anything light does. That is what heals a disturbance into a smooth
  hollow instead of leaving the straight cut edges a carve leaves behind.
- **It is laid down in one pass** the first time its floor can be measured —
  otherwise you arrive at the footer before there is any ground there — and
  tops back up over about three seconds (`REFILL_SECONDS`, paced from the
  actual deficit).
- **It fills to the middle of the wordmark**, not its top: the lower half of the
  letters is buried, the upper half still reads.
- **Scooping takes the whole column above the cursor**, not a pocket.
- **`Petals` mounts before `Journey`.** The journey cues the field from a
  layout effect; a component further down the tree would not have attached its
  imperative handle yet, and the hero would never be told to shed. Stacking is
  set in CSS, so DOM order costs nothing.
- **Petals are culled against the drift's floor, not the viewport edge.** Culling
  at the fold means a petal dies before it can land whenever the footer's floor
  is below it, and the bed can then only build while the page bottom is on
  screen.
- **The ambient fall is capped at 40% of the pool.** Topping the drift back up
  needs free particles; without the cap the sky fills and the bed never builds.
- The nav can't use anchors — every chapter is inside the one pinned stage — so
  `Navbar.jsx` scrolls to a fraction of the journey.

## Fonts

`Do Hyeon` (body) and `Geist` (footer) are the faces used in the design and load
from Google Fonts. The design also uses two licensed faces —
`FONTSPRING DEMO – Recoleta Alt` and `Canela Trial` — which are not
redistributable; `Fraunces` and `Playfair Display` stand in. Swap the
`--font-display` / `--font-numeral` tokens in `src/styles/base.css` once the
real licences are in place.

[figma]: https://www.figma.com/design/JGDiqcBZw4hp7QIKRoxfva/Code2Create-2026?node-id=1476-955
