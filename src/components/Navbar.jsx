import { useEffect, useState } from 'react';

/*
 * Every chapter lives inside one pinned stage, so the nav can't just jump to
 * an anchor — it has to scroll to the point in the journey where that chapter
 * is on screen. The fractions below are positions along the master timeline.
 */
const links = [
  { label: 'About', at: 0.26 },
  { label: 'FAQs', at: 0.95 },
  { label: 'Timeline', at: 0.78 },
  { label: 'Stats', at: 0.63 },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  const goTo = (event, at) => {
    event.preventDefault();
    setOpen(false);

    const journey = document.querySelector('.journey');
    if (!journey) return;

    const travel = journey.offsetHeight - window.innerHeight;
    window.scrollTo({ top: journey.offsetTop + travel * at, behavior: 'smooth' });
  };

  return (
    <header className="navbar">
      <nav className="navbar__inner" aria-label="Primary">
        <a
          className="navbar__brand"
          href="#top"
          onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <img src="/assets/svg/logo.svg" alt="" width="34" height="38" />
          <span>Code2Create</span>
        </a>

        <button
          className="navbar__toggle"
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
        </button>

        <div className="navbar__links" data-open={open}>
          {links.map((link) => (
            <a key={link.label} href="#top" onClick={(event) => goTo(event, link.at)}>
              {link.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
