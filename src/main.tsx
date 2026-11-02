import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initNarration } from './audio/narration';
import './styles.css';

initNarration();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
