/*
 * The great blossom behind the timeline card.
 *
 * One huge stylised cherry blossom: five petals around a golden heart, each
 * tip carrying the V cleft that marks sakura. The timeline reveals the
 * petals one at a time as the act scrubs by and turns the whole head
 * slowly; everything here is a static SVG on its own compositor layer, so
 * the turn is a transform and costs the frame nothing.
 *
 * Purely ornamental: it sits below the day card and the bonsai, and the
 * timeline fades it out before the days leave, so the FAQ act still opens
 * on a bare stage.
 */

/* Pointing up from the flower's centre; the two L segments cut the V. */
const PETAL =
  'M 0 -10 C -26 -16 -45 -44 -43 -72 C -42 -92 -29 -105 -15 -104 L 0 -86 L 15 -104 C 29 -105 42 -92 43 -72 C 45 -44 26 -16 0 -10 Z';

const PETALS = [0, 1, 2, 3, 4];
const DOTS = [36, 108, 180, 252, 324];

export default function Rosette() {
  return (
    <div className="rosette" aria-hidden="true">
      <svg viewBox="-120 -120 240 240">
        <defs>
          <linearGradient id="rosettePetalTint" x1="0" y1="0.95" x2="0" y2="0.05">
            <stop offset="0" stopColor="#8d345a" />
            <stop offset="0.45" stopColor="#c9668c" />
            <stop offset="0.8" stopColor="#eeb7ca" />
            <stop offset="1" stopColor="#fbe3ec" />
          </linearGradient>
          <radialGradient id="rosetteCoreTint" cx="42%" cy="40%" r="72%">
            <stop offset="0" stopColor="#f7d58a" />
            <stop offset="0.6" stopColor="#c99a52" />
            <stop offset="1" stopColor="#7c5a2c" />
          </radialGradient>
        </defs>

        <g className="rosette__petals">
          {PETALS.map((index) => (
            <g key={index} transform={`rotate(${index * 72})`}>
              {/* The group is what the timeline reveals, so the vein can
                  never show before its own petal does. */}
              <g className="rosette__petal">
                <path className="rosette__petal-shape" d={PETAL} />
                <path className="rosette__vein" d="M 0 -18 C -2 -42 -1 -62 0 -78" />
              </g>
            </g>
          ))}
        </g>

        <circle className="rosette__core" r="11" fill="url(#rosetteCoreTint)" />
        {DOTS.map((angle) => {
          const theta = (angle * Math.PI) / 180;
          return (
            <circle
              className="rosette__dot"
              cx={(Math.sin(theta) * 18).toFixed(2)}
              cy={(-Math.cos(theta) * 18).toFixed(2)}
              r="2.2"
              key={angle}
            />
          );
        })}
      </svg>
    </div>
  );
}
