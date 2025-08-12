import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@fortawesome/fontawesome-free/css/all.css';
import 'leaflet/dist/leaflet.css';
import StartupError from './components/StartupError';

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to. Ensure an element with id 'root' exists in your HTML.");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  // Log the full error details to help with troubleshooting
  console.error('Application failed to start:', error);

  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    const message = error instanceof Error ? error.message : String(error);
    root.render(<StartupError message={message} />);
  }
}

// PWA service worker registration is now handled automatically by vite-plugin-pwa.
// The manual registration block has been removed.
