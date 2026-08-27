import { useEffect, useState } from 'react';

/*
 * The blossom bough across the top of the FAQ act.
 *
 * The design hangs the whole act off ONE branch, entering from the left —
 * there is no right-hand bough any more, at any width. The plate is the
 * supplied artwork (1827×861 bitmap), and where each rope ties on is read
 * from `limbCurve.js`.
 *
 * The second entry is the GHOST: an invisible, flattened box raised above
 * the frame that the right-hand column hangs from, so its ropes simply run
 * up off the top of the stage the way the design draws them. The ghost
 * still swings, carries load and is towed off in the simulation — only its
 * artwork is gone. On phones the visible branch spans the whole top and
 * carries every rope itself, and the ghost is parked where it covers
 * nothing.
 */

const WIDE = [
  { side: 'left', left: -3, top: -7, width: 53 },
  { side: 'right', left: 47, top: -26, width: 60, ghost: true },
];

const NARROW = [
  { side: 'left', left: -4, top: -2, width: 108 },
  { side: 'right', left: 120, top: -26, width: 40, ghost: true },
];

export default function Branches() {
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

  const boughs = narrow ? NARROW : WIDE;

  return (
    <div className="branches" aria-hidden="true">
      {boughs.map((bough) => (
        <div
          className={`bough bough--${bough.side}${bough.ghost ? ' bough--ghost' : ''}`}
          key={bough.side}
          data-bough-side={bough.side}
          style={{ left: `${bough.left}%`, top: `${bough.top}%`, width: `${bough.width}%` }}
        >
          {!bough.ghost && <img src="/assets/img/branch-plate.png" alt="" />}
        </div>
      ))}
    </div>
  );
}
