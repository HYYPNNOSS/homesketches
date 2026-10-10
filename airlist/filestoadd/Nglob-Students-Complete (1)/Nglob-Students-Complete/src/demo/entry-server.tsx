import { generateHydrationScript, renderToString } from 'solid-js/web';
import { Demo } from './Demo';
export const render = () => ({ html: renderToString(() => <Demo />), hydration: generateHydrationScript() });
