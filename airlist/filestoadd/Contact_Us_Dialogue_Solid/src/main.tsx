import { render } from 'solid-js/web';
import ContactUsPage from './contact';
import './preview.css';

const mount = document.getElementById('root');
if (!mount) throw new Error('Missing application mount element.');

// Local demo. Supply the typed adapters to connect your own backend and AI.
render(() => <ContactUsPage />, mount);
