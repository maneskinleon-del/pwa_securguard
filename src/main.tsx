import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

// Registrar service worker para soporte PWA (instalable + offline).
// Solo en producción: en dev el SW cachearía bundles viejos y rompería HMR.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.info('[PWA] Service worker registered, scope:', registration.scope);
      })
      .catch((err) => {
        // No crítico: la app funciona igual sin SW si el navegador lo bloquea.
        console.warn('[PWA] Service worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
