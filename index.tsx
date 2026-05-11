import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    const baseUrl = (import.meta as any).env?.BASE_URL || '/';
    navigator.serviceWorker.register(`${baseUrl}sw.js`).catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
