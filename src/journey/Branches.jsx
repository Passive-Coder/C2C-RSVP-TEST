/*
 * The blossom boughs across the top of the FAQ act.
 *
 * These are the supplied plates rather than drawn limbs. Both source SVGs
 * wrapped the same 1827×861 bitmap — one plain, one mirrored — so the bitmap
 * was extracted once and the right-hand bough is that image flipped in CSS.
 *
 * They do not grow, they swing: each bough is held back and up as though it had
 * been hauled down and pinned, and the timeline lets go. The release runs on an
 * elastic ease so the stored energy plays out as a swing that overshoots and
 * settles. The ladder hangs off the wood knot by knot — where each rope ties on
 * is read from `limbCurve.js`, which traces the underside of the limb in the
 * plate itself.
 */

/** Where each bough sits, as a % of the stage. */
export const BOUGHS = [
  { side: 'left', left: -8, top: -14, width: 60 },
  { side: 'right', left: 48, top: -16, width: 60 },
];

export default function Branches() {
  return (
    <div className="branches" aria-hidden="true">
      {BOUGHS.map((bough) => (
        <div
          className={`bough bough--${bough.side}`}
          key={bough.side}
          data-bough-side={bough.side}
          style={{ left: `${bough.left}%`, top: `${bough.top}%`, width: `${bough.width}%` }}
        >
          <img src="/assets/img/branch-plate.png" alt="" />
        </div>
      ))}
    </div>
  );
}
