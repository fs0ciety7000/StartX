import './styles/tokens.css';
import './styles/app.css';
// The registry must be evaluated before the store reads and normalizes the saved config.
import './lib/widgets/registry.ts';
import { mount } from 'svelte';
import { initStore, loadServerDefault } from './lib/config/store.svelte.ts';
import App from './App.svelte';

initStore();
void loadServerDefault();

mount(App, { target: document.getElementById('app') as HTMLElement });
