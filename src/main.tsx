import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Anati's typefaces, self-hosted: Rubik for Hebrew and Latin text, Fraunces for the logo.
import '@fontsource/rubik/hebrew-400.css';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/hebrew-500.css';
import '@fontsource/rubik/latin-500.css';
import '@fontsource/rubik/hebrew-600.css';
import '@fontsource/rubik/latin-600.css';
import '@fontsource/rubik/hebrew-700.css';
import '@fontsource/rubik/latin-700.css';
import '@fontsource/fraunces/latin-600.css';
import { App } from './App';
import { StoreProvider } from './state/store';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
