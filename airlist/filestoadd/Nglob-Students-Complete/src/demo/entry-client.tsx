import { hydrate, render } from 'solid-js/web';
import { Demo } from './Demo';
const app = document.getElementById('app');
if (!app) throw new Error('The preview is missing its app container.');
if (import.meta.env.DEV) render(() => <Demo />, app);
else hydrate(() => <Demo />, app);

// External journeys should open normally outside the local preview frame.
if (location.protocol === 'file:') {
  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (link instanceof HTMLAnchorElement && /^https?:/.test(link.href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  });
}
