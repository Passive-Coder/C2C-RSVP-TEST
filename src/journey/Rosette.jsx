/*
 * The great blossom behind the timeline card.
 *
 * One huge cherry blossom: five petals around a ring of stamens, each tip
 * carrying the V cleft that marks sakura. Built the way the flower actually
 * reads — petals flushed deep rose at the base and near-white at the tips,
 * a fan of fine veins, a rim of light along each edge, every petal tilted a
 * hair off the mechanical 72°, a dark back whorl filling the gaps for
 * depth, and a heart of curved filaments tipped with golden anthers.
 *
 * The timeline reveals the front petals one at a time as the act scrubs by
 * and turns the whole head slowly; everything here is a static SVG on its
 * own compositor layer, so the turn is a transform and costs the frame
 * nothing. No SVG filters — this act's frame budget was hard won.
 *
 * Purely ornamental: it sits below the day card and the bonsai, and the
 * timeline fades it out before the days leave, so the FAQ act still opens
 * on a bare stage.
 */

/* Pointing up from the flower's centre; the two L segments cut the V. */
const PETAL =
  'M 0 -8 C -22 -12 -40 -30 -45 -55 C -50 -76 -44 -95 -29 -103 C -22 -106.5 -15 -106 -13 -104.5 L 0 -87 L 13 -104.5 C 15 -106 22 -106.5 29 -103 C 44 -95 50 -76 45 -55 C 40 -30 22 -12 0 -8 Z';

/* Three veins fanning from the base, as one path. */
const VEINS =
  'M 0 -14 C -1.5 -40 -1 -62 0 -80 M -7 -16 C -13 -36 -17 -54 -18 -70 M 7 -16 C 13 -36 17 -54 18 -70';

/* A hair of tilt per petal, so the flower is grown rather than drafted. */
const TILT = [-2, 1.6, -1.2, 2.2, -1.5];

/* The stamen ring: deterministic jitter, so renders never disagree. */
const STAMENS = Array.from({ length: 14 }, (_, i) => {
  const angle = i * (360 / 14) + (((i * 53) % 9) - 4);
  const length = 24 + ((i * 29) % 10);
  const theta = (angle * Math.PI) / 180;
  const sx = Math.sin(theta);
  const sy = -Math.cos(theta);
  const bend = (((i * 17) % 7) - 3) * 0.55;
  const mx = ((sx * 5 + sx * length) / 2 - sy * bend).toFixed(1);
  const my = ((sy * 5 + sy * length) / 2 + sx * bend).toFixed(1);
  return {
    d: `M ${(sx * 5).toFixed(1)} ${(sy * 5).toFixed(1)} Q ${mx} ${my} ${(sx * length).toFixed(1)} ${(sy * length).toFixed(1)}`,
    tx: +(sx * length).toFixed(1),
    ty: +(sy * length).toFixed(1),
  };
});

const PETALS = [0, 1, 2, 3, 4];

export default function Rosette() {
  return (
    <div className="rosette" aria-hidden="true">
      <svg viewBox="-120 -120 240 240">
        <defs>
          {/* Base flush: deep rose at the heart, white by the tips. Shared in
              user space so all five petals shade from the same centre. */}
          <radialGradient id="rosetteFlush" gradientUnits="userSpaceOnUse" cx="0" cy="-4" r="106">
            <stop offset="0" stopColor="#a63a63" />
            <stop offset="0.22" stopColor="#cf7799" />
            <stop offset="0.5" stopColor="#eeb2c6" />
            <stop offset="0.78" stopColor="#f9dbe5" />
            <stop offset="1" stopColor="#fdf2f6" />
          </radialGradient>
          {/* Tip luminance: sakura petals go almost white at the cleft. */}
          <linearGradient id="rosetteTipGlow" gradientUnits="userSpaceOnUse" x1="0" y1="-28" x2="0" y2="-105">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.68" stopColor="#fffcfd" stopOpacity="0.26" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.5" />
          </linearGradient>
          {/* The back whorl, showing through the gaps between petals. Fully
              opaque out to its own silhouette — a fade here would erase the
              lobes, which are the only part the gaps ever reveal. */}
          <radialGradient id="rosetteBackTint" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="100">
            <stop offset="0" stopColor="#7c2b52" />
            <stop offset="0.65" stopColor="#5e2140" />
            <stop offset="1" stopColor="#47182f" />
          </radialGradient>
        </defs>

        {/* Depth: a darker whorl turned half a step, filling the gaps. */}
        <g className="rosette__back">
          {PETALS.map((index) => (
            <g key={index} transform={`rotate(${index * 72 + 36}) scale(0.94)`}>
              <path d={PETAL} />
            </g>
          ))}
        </g>

        <g className="rosette__petals">
          {PETALS.map((index) => (
            <g key={index} transform={`rotate(${index * 72 + TILT[index]})`}>
              {/* The group is what the timeline reveals, so the detail can
                  never show before its own petal does. */}
              <g className="rosette__petal">
                <path className="rosette__petal-shape" d={PETAL} />
                <path className="rosette__glow" d={PETAL} />
                <path className="rosette__vein" d={VEINS} />
              </g>
            </g>
          ))}
        </g>

        {/* The heart: calyx disc, curved filaments, golden anthers. */}
        <circle className="rosette__disc" r="6" />
        {STAMENS.map((stamen) => (
          <path className="rosette__stamen" d={stamen.d} key={stamen.d} />
        ))}
        {STAMENS.map((stamen) => (
          <circle
            className="rosette__anther"
            cx={stamen.tx}
            cy={stamen.ty}
            r="1.7"
            key={`a${stamen.d}`}
          />
        ))}
        <circle className="rosette__pistil" r="2.1" />
      </svg>
    </div>
  );
}
