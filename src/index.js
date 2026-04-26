import { render, navigate } from './lib/router.js';

window.addEventListener('popstate', render);
render();
