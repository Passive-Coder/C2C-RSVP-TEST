import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Base tokens first so section stylesheets (pulled in via App) can override.
import './styles/base.css';
import './styles/botanical.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
