import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initNarration } from './audio/narration';
import { initAudioLifecycle } from './audio/lifecycle';
import './styles.css';

initNarration();
initAudioLifecycle();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
