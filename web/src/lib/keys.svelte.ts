/*
 * Keyboard. Single keys act only when no field has focus (WCAG 2.1.4).
 * tmux habits work too: Ctrl+B is the prefix, then 1-9 / n / p / c / , / x.
 */
import { activePage, addPage, app, cyclePage, goToPage, redo, removePage, ui, undo } from './config/store.svelte.ts';

export const keys = $state({ prefix: false, renaming: null as string | null });

let prefixTimer: ReturnType<typeof setTimeout> | undefined;

function typing(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

const overlayOpen = () => ui.settings !== false || ui.picker || ui.help || ui.editingWidget !== null;

function focusSearch(): boolean {
  const el = document.querySelector<HTMLInputElement>('[data-search]:not(:disabled)');
  el?.focus();
  return !!el;
}

function prefixCommand(e: KeyboardEvent): void {
  keys.prefix = false;
  clearTimeout(prefixTimer);
  const k = e.key;
  if (/^[1-9]$/.test(k)) goToPage(+k - 1);
  else if (k === '0') goToPage(9);
  else if (k === 'n') cyclePage(1);
  else if (k === 'p') cyclePage(-1);
  else if (k === 'c') addPage(`page${app.config.pages.length + 1}`);
  else if (k === ',') keys.renaming = activePage().id;
  else if (k === 'x' || k === '&') {
    const p = activePage();
    if (confirm(`Supprimer la page « ${p.name} » ?`)) removePage(p.id);
  } else if (k === 'e') ui.editing = !ui.editing;
  else if (k === '?') ui.help = true;
  else return;
  e.preventDefault();
}

export function onGlobalKey(e: KeyboardEvent): void {
  if (keys.prefix && !e.ctrlKey && !e.metaKey && e.key !== 'Control' && e.key !== 'Shift') return prefixCommand(e);

  // Not while typing (Ctrl+B is bold in some fields) or with a panel open.
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b' && !typing(e) && !overlayOpen()) {
    e.preventDefault();
    keys.prefix = true;
    clearTimeout(prefixTimer);
    prefixTimer = setTimeout(() => (keys.prefix = false), 2000);
    return;
  }

  if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-9]$/.test(e.code)) {
    e.preventDefault();
    goToPage(+e.code.slice(5) - 1);
    return;
  }

  if (typing(e) || overlayOpen()) return;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  switch (e.key) {
    case '/':
      if (focusSearch()) e.preventDefault();
      break;
    case 'e':
      ui.editing = !ui.editing;
      break;
    case ',':
      ui.settings = 'general';
      break;
    case '?':
      ui.help = true;
      break;
    case '[':
      cyclePage(-1);
      break;
    case ']':
      cyclePage(1);
      break;
    case 'Escape':
      if (ui.editing) ui.editing = false;
      break;
    default:
      return;
  }
}

/** Typing anywhere (a printable key, nothing focused) starts a search, like most startpages. */
export function onTypeAhead(e: KeyboardEvent): void {
  if (e.defaultPrevented || typing(e) || overlayOpen() || ui.editing || keys.prefix) return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || /[/e,?[\]]/.test(e.key) || e.key === ' ') return;
  focusSearch();
}
