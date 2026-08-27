import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Base tokens first so section stylesheets (pulled in via App) can override.
import './styles/base.css';
import './styles/botanical.css';
import App from './App.jsx';

/*
 * The journey is a staged set at a fixed scale: pinch zoom would tear the
 * composition apart. Trackpad pinches arrive as ctrl+wheel (Chrome, Edge,
 * Firefox) or as gesture events (Safari); both are cancelled. Touch pinch is
 * handled by `touch-action: pan-y` in CSS plus the viewport meta. Keyboard
 * zoom is left alone — it is an accessibility path, not a stray gesture.
 */
window.addEventListener(
  'wheel',
  (event) => {
    if (event.ctrlKey) event.preventDefault();
  },
  { passive: false },
);
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (event) => event.preventDefault());
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
