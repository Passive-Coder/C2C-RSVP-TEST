/*
 * The FAQ act, simulated rather than keyframed.
 *
 * A rolled rope ladder is strung on the blossom bough. The bough is hauled
 * back and pinned; the act lets go of it, and a beat later it lets go of the
 * roll. Nothing after that is scripted. Gravity pays the ladder out a rung at
 * a time — each cord hangs slack until the rung below it has fallen past, so
 * the release runs down the ladder rather than happening to it — and the last
 * cord to catch loads the whole rope at once. Rope is elastic, so that arrival
 * is stored rather than absorbed and comes straight back out: the ladder
 * recoils, bounces smaller, and settles onto the layout the CSS already
 * describes.
 *
 * Sideways is a second, separate pendulum. The two cords hang off two points
 * on the same limb, so the limb's swing carries the ladder's top with it while
 * the weight below lags. The rungs trail, but they stay level: a rung is a
 * plank of text, and text that rolls with the rope is unreadable, so the
 * ladder leans without ever turning.
 *
 * Scrolling back up reels the ladder in — see `createReelSim` at the foot of
 * this file, which hauls the rope home and stacks the rungs back into the roll
 * they were paid out of.
 *
 * Rates and times below are in *simulation* seconds. The ticker feeds this
 * real time divided by TIME_SCALE, so the act plays out that much slower than
 * these numbers read on their own. Nothing else is touched — gravity,
 * stiffness and damping are what they were — which is what keeps the slowed
 * motion a real fall rather than a fall on a slow tape.
 *
 * No DOM in here: `world` is plain measured geometry, handed over by
 * useFallingLadder.js, and the solver writes its state back onto it.
 */

const DEG = Math.PI / 180;

/** Real seconds per simulation second. At 1 the act was over before it read. */
export const TIME_SCALE = 2.5;

/** Fixed solver step. The cords are stiff, so this sits well inside them. */
export const SIM_STEP = 1 / 600;

/** A backstop; the act is always over well inside this. */
const MAX_SIM_TIME = 5;

/* ---- the bough ------------------------------------------------------ */

/** How far back it is hauled before the act lets go. */
const BRANCH_PULL = 26 * DEG;
/** Natural frequency: one swing out and back every 0.58 sim seconds. */
const BRANCH_FREQ = 10.85;
/*
 * Damping ratio. Each swing returns at 18% of the one before it, so the bough
 * reads as exactly two full pendulum motions — a big one, then a small one —
 * and is still by the third.
 */
const BRANCH_DAMPING = 0.26;
/** The far bough is let go a beat after the near one. */
const BRANCH_STAGGER = 0.05;
/*
 * The bough also arrives: it starts up and outside the frame and slides into
 * place. That is a one-way settle rather than part of the swing, so it rides
 * the decay envelope on its own instead of the swinging cosine.
 */
const BRANCH_ENTRY_X = -0.08;
const BRANCH_ENTRY_Y = -0.46;

/*
 * The ladder tugs back on the limb it hangs from. Only the surplus over what
 * it weighs is passed on — the static droop is already in the artwork — so the
 * bough feels the snap when the rope goes taut and feels nothing at rest.
 */
const LOAD_GAIN = 2.4e-7;
const LOAD_CAP = 26000;

/* ---- the ladder ----------------------------------------------------- */

/** px/s². Stylised: real g at this scale would be off the screen in a blink. */
const GRAVITY = 2200;
/** Cord stiffness and damping, as a spring. This is where the recoil lives. */
const CORD_FREQ = 50;
const CORD_DAMPING = 0.46;
/** The bough is already swinging by the time the roll is dropped. */
const RELEASE_AT = 0.1;
/** How proud each rung sits in the roll before it is paid out. */
const STACK_GAP = 3;
/*
 * Air. Small enough that the fall is still a fall, big enough that the ladder
 * does not keep trading the same energy back and forth between rope and drop
 * long after the eye has stopped caring.
 */
const RUNG_DRAG = 0.6;

/* ---- sideways ------------------------------------------------------- */

const SWAY_FREQ = 18;
const SWAY_DAMPING = 0.45;
/** Cords cannot fold, and a lurching column of answers reads as broken. */
const MAX_SWAY = 5 * DEG;

/* ---- rest ----------------------------------------------------------- */

const REST_SPEED = 10; // px/s
const REST_OFFSET = 1; // px
const REST_ANGLE = 0.004; // rad

const BRANCH_W2 = BRANCH_FREQ * BRANCH_FREQ;
const BRANCH_C = 2 * BRANCH_DAMPING * BRANCH_FREQ;
const CORD_K = CORD_FREQ * CORD_FREQ;
const CORD_C = 2 * CORD_DAMPING * CORD_FREQ;
const SWAY_W2 = SWAY_FREQ * SWAY_FREQ;
const SWAY_C = 2 * SWAY_DAMPING * SWAY_FREQ;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/*
 * Where a point pinned to a bough has got to once the bough has turned and
 * slid, and the velocity and acceleration it carries. Rigid-body, so the
 * ladder hangs off the knot's real position rather than an estimate of it.
 */
function anchorAt(bough, anchor) {
  const phi = bough.dir * bough.angle;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = anchor.ax - bough.pivotX;
  const dy = anchor.ay - bough.pivotY;
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  const phiV = bough.dir * bough.angularV;
  const phiA = bough.dir * bough.angularA;

  anchor.rx = rx;
  anchor.x = bough.left + bough.pivotX + rx + bough.tx;
  anchor.y = bough.top + bough.pivotY + ry + bough.ty;
  anchor.vy = phiV * rx + bough.tvy;
  anchor.accX = phiA * -ry - phiV * phiV * rx;
  return anchor;
}

/** Where a rung sits in the roll, counting down from the knot. */
const stackAt = (column, index) => column.anchorY + index * STACK_GAP;

export function createLadderSim(world) {
  const { boughs, columns } = world;

  boughs.forEach((bough, index) => {
    bough.delay = index * BRANCH_STAGGER;
    bough.angle = BRANCH_PULL;
    bough.angularV = 0;
    bough.angularA = 0;
    bough.entry = 1;
    bough.load = 0;
    bough.tx = BRANCH_ENTRY_X * bough.dir * bough.width;
    bough.ty = BRANCH_ENTRY_Y * bough.height;
    bough.tvy = 0;
  });

  columns.forEach((column) => {
    const count = column.rungs.length;

    column.rungs.forEach((rung, index) => {
      const above = index === 0 ? column.anchorRest.y : column.rungs[index - 1].rest;
      /*
       * A cord under load is already stretched where the ladder hangs still.
       * Take that stretch out of the unloaded length and the ladder comes to
       * rest exactly on the rows the CSS laid out, not a few pixels below them.
       */
      const load = count - index;
      const sag = (load * GRAVITY) / CORD_K;
      rung.span = Math.max(4, rung.rest - above - sag);
      /*
       * A cord high up the ladder is holding more than one below it, and a
       * spring damped for one rung barely touches six. Scale with the root of
       * what it carries and every cord is damped the same amount for its own
       * load, so the ladder settles as a ladder instead of the top of it
       * ringing on long after the foot has stopped.
       */
      rung.damping = CORD_C * Math.sqrt(load);
      rung.pos = rung.rest;
      rung.v = 0;
      rung.taut = true;
    });

    column.sway = 0;
    column.swayV = 0;
    column.anchorX = column.anchorRest.x;
    column.anchorY = column.anchorRest.y;
  });

  let time = 0;
  let released = false;
  let done = false;

  const stepBoughs = (dt) => {
    boughs.forEach((bough) => {
      const local = time - bough.delay;
      if (local <= 0) {
        bough.load = 0;
        return;
      }

      const accel = -BRANCH_W2 * bough.angle - BRANCH_C * bough.angularV + bough.load;
      bough.angularA = accel;
      bough.angularV += accel * dt;
      bough.angle += bough.angularV * dt;
      bough.load = 0;

      const entry = Math.exp(-BRANCH_C * local);
      bough.entry = entry;
      bough.tx = BRANCH_ENTRY_X * bough.dir * bough.width * entry;
      bough.ty = BRANCH_ENTRY_Y * bough.height * entry;
      bough.tvy = BRANCH_ENTRY_Y * bough.height * -BRANCH_C * entry;
    });
  };

  const stepColumn = (column, dt) => {
    const anchors = column.anchors;
    const count = anchors.length;
    let midY = 0;
    let midVy = 0;
    let midAx = 0;
    let midX = 0;
    anchors.forEach((anchor) => {
      anchorAt(anchor.bough, anchor);
      midX += anchor.x;
      midY += anchor.y;
      midVy += anchor.vy;
      midAx += anchor.accX;
    });
    midX /= count;
    midY /= count;
    midVy /= count;
    midAx /= count;
    column.anchorX = midX;
    column.anchorY = midY;

    const rungs = column.rungs;
    const total = rungs.length;

    if (!released) {
      /* Rolled and still tied on: the roll goes wherever the limb goes. */
      rungs.forEach((rung, index) => {
        rung.pos = midY + index * STACK_GAP;
        rung.v = midVy;
        rung.taut = true;
      });
    } else {
      for (let index = 0; index < total; index += 1) {
        const rung = rungs[index];
        rung.v += (GRAVITY - RUNG_DRAG * rung.v) * dt;
      }

      for (let index = 0; index < total; index += 1) {
        const rung = rungs[index];
        const aboveY = index === 0 ? midY : rungs[index - 1].pos;
        const aboveV = index === 0 ? midVy : rungs[index - 1].v;
        const stretch = rung.pos - aboveY - rung.span;
        rung.taut = stretch > 0;
        if (!rung.taut) continue;

        /* Cord pulls and never pushes, so tension is clamped at zero. */
        const tension = Math.max(0, CORD_K * stretch + rung.damping * (rung.v - aboveV));
        rung.v -= tension * dt;

        if (index === 0) {
          const surplus = clamp(tension - total * GRAVITY, -LOAD_CAP, LOAD_CAP);
          anchors.forEach((anchor) => {
            anchor.bough.load +=
              (anchor.bough.dir * anchor.rx * surplus * LOAD_GAIN) / count;
          });
        } else {
          rungs[index - 1].v += tension * dt;
        }
      }

      for (let index = 0; index < total; index += 1) {
        rungs[index].pos += rungs[index].v * dt;
      }
    }

    /* Sideways: a pendulum whose pivot is being shaken by the bough. */
    const swayA =
      -SWAY_W2 * column.sway - SWAY_C * column.swayV - midAx / column.length;
    column.swayV += swayA * dt;
    let sway = column.sway + column.swayV * dt;
    if (sway > MAX_SWAY) {
      sway = MAX_SWAY;
      if (column.swayV > 0) column.swayV = 0;
    } else if (sway < -MAX_SWAY) {
      sway = -MAX_SWAY;
      if (column.swayV < 0) column.swayV = 0;
    }
    column.sway = sway;
  };

  const atRest = () => {
    if (time < RELEASE_AT + 0.3) return false;
    for (const bough of boughs) {
      if (Math.abs(bough.angle) > REST_ANGLE) return false;
      if (Math.abs(bough.angularV) > 0.08) return false;
      if (bough.entry > 0.01) return false;
    }
    for (const column of columns) {
      if (Math.abs(column.sway) > 0.003 || Math.abs(column.swayV) > 0.04) return false;
      for (const rung of column.rungs) {
        if (Math.abs(rung.pos - rung.rest) > REST_OFFSET) return false;
        if (Math.abs(rung.v) > REST_SPEED) return false;
      }
    }
    return true;
  };

  const finish = () => {
    boughs.forEach((bough) => {
      bough.angle = 0;
      bough.angularV = 0;
      bough.angularA = 0;
      bough.entry = 0;
      bough.tx = 0;
      bough.ty = 0;
      bough.tvy = 0;
      bough.load = 0;
    });
    columns.forEach((column) => {
      column.sway = 0;
      column.swayV = 0;
      column.anchors.forEach((anchor) => anchorAt(anchor.bough, anchor));
      column.anchorX = column.anchorRest.x;
      column.anchorY = column.anchorRest.y;
      column.rungs.forEach((rung) => {
        rung.pos = rung.rest;
        rung.v = 0;
        rung.taut = true;
      });
    });
    time = MAX_SIM_TIME;
    released = true;
    done = true;
  };

  return {
    get done() {
      return done;
    },
    finish,
    step(dt) {
      if (done) return;
      time += dt;
      if (!released && time >= RELEASE_AT) released = true;
      stepBoughs(dt);
      columns.forEach((column) => stepColumn(column, dt));
      if (time >= MAX_SIM_TIME || atRest()) finish();
    },
  };
}

/* ---- reeling in ----------------------------------------------------- */

/*
 * Scrolling back up hauls the rope home. That is not the fall run backwards:
 * a fall is gravity let go of, and a reel is a hand pulling, so it is its own
 * short motion. The rope is drawn in at the knot, which lifts the whole
 * hanging ladder at once; each rung rises until it reaches the knot, and then
 * stops there and lets the ones below it come up under it. By the time the
 * last rung arrives the ladder is a roll again — the same roll the fall starts
 * from, so the act can be scrolled through as many times as you like.
 */

/** Sim seconds to haul a ladder of any length home. */
const REEL_TIME = 0.42;
/** Whatever sideways the ladder still had dies off as the rope goes tight. */
const REEL_SWAY_DECAY = 9;

/** Slow off the mark, quick through the middle, easy at the top. */
const smoothstep = (t) => t * t * (3 - 2 * t);

export function createReelSim(world) {
  const { columns } = world;

  let travel = 0;
  columns.forEach((column) => {
    column.rungs.forEach((rung, index) => {
      rung.slot = stackAt(column, index);
      rung.from = rung.pos;
      rung.v = 0;
      rung.taut = true;
      travel = Math.max(travel, rung.from - rung.slot);
    });
  });

  let time = 0;
  let done = false;

  const finish = () => {
    columns.forEach((column) => {
      column.sway = 0;
      column.swayV = 0;
      column.rungs.forEach((rung, index) => {
        rung.pos = stackAt(column, index);
        rung.v = 0;
      });
    });
    done = true;
  };

  return {
    get done() {
      return done;
    },
    finish,
    step(dt) {
      if (done) return;
      time += dt;
      const hauled = smoothstep(Math.min(1, time / REEL_TIME)) * travel;
      const decay = Math.exp(-REEL_SWAY_DECAY * dt);
      columns.forEach((column) => {
        column.sway *= decay;
        column.swayV *= decay;
        column.rungs.forEach((rung) => {
          /* The rope only shortens, so a rung that has reached the knot has
             arrived — it cannot be pulled up past the thing pulling it. */
          rung.pos = Math.max(rung.slot, rung.from - hauled);
        });
      });
      if (time >= REEL_TIME) finish();
    },
  };
}
