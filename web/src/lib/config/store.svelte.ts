import { defaultConfig } from './defaults.ts';
import { normalize } from './normalize.ts';
import { uid, type Page, type StartxConfig, type WidgetInstance } from './schema.ts';
import { widgetDef } from '../widgets/registry.ts';

const KEY = 'startx:config';
const HISTORY_MAX = 40;

function readStored(): StartxConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

let stored: StartxConfig | null = null;

/** The single source of truth. Mutate only through `edit()` so undo and persistence follow. */
export const app = $state<{ config: StartxConfig }>({ config: defaultConfig() });

export const ui = $state({
  editing: false,
  settings: false as false | 'general' | 'search' | 'pages' | 'data',
  picker: false,
  help: false,
  /** Widget whose editor drawer is open. */
  editingWidget: null as string | null,
  toast: null as null | { text: string; undo?: boolean; id: number },
});

const past: string[] = [];
const future: string[] = [];

/** Apply a change, keeping the previous state for undo. */
export function edit(fn: (c: StartxConfig) => void, label?: string): void {
  past.push(JSON.stringify(app.config));
  if (past.length > HISTORY_MAX) past.shift();
  future.length = 0;
  fn(app.config);
  if (label) toast(label, true);
}

export function undo(): boolean {
  const prev = past.pop();
  if (!prev) return false;
  future.push(JSON.stringify(app.config));
  app.config = normalize(JSON.parse(prev));
  toast('Annulé');
  return true;
}

export function redo(): boolean {
  const next = future.pop();
  if (!next) return false;
  past.push(JSON.stringify(app.config));
  app.config = normalize(JSON.parse(next));
  return true;
}

let toastSeq = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, undoable = false): void {
  clearTimeout(toastTimer);
  ui.toast = { text, undo: undoable, id: ++toastSeq };
  toastTimer = setTimeout(() => (ui.toast = null), undoable ? 6000 : 2600);
}

/** Replace everything (import, reset). Undoable. */
export function replaceConfig(next: unknown, label: string): void {
  edit((c) => Object.assign(c, normalize(next)), label);
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let lastSaved = '';

/**
 * Called once from main.ts, after the widget registry is loaded (normalize() needs it;
 * doing this at import time would depend on module evaluation order).
 */
export function initStore(): void {
  stored = readStored();
  if (stored) {
    app.config = stored;
    lastSaved = JSON.stringify(stored);
  }
  // Persistence: debounced write on any deep change; other tabs pick it up.
  $effect.root(() => {
    $effect(() => {
      const json = JSON.stringify(app.config);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (json === lastSaved) return;
        try {
          localStorage.setItem(KEY, json);
          lastSaved = json;
        } catch {
          toast('Stockage local indisponible : les changements ne seront pas conservés');
        }
      }, 250);
    });
    $effect(() => {
      document.documentElement.dataset['theme'] = app.config.settings.theme;
    });
  });

  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue || e.newValue === lastSaved) return;
    try {
      lastSaved = e.newValue;
      app.config = normalize(JSON.parse(e.newValue));
    } catch {
      /* another tab wrote garbage: keep ours */
    }
  });
}

/** First run only: a server-provided default (STARTX_DEFAULT_CONFIG) wins over the built-in one. */
export async function loadServerDefault(): Promise<void> {
  if (stored) return;
  try {
    const res = await fetch('/api/defaults', { headers: { accept: 'application/json' } });
    if (res.status !== 200) return;
    if (past.length) return; // the user already started editing
    app.config = normalize(await res.json());
  } catch {
    /* offline or static hosting: built-in default stays */
  }
}

// ---------- Helpers used across the UI ----------

export function activePage(): Page {
  const c = app.config;
  return c.pages.find((p) => p.id === c.activePage) ?? (c.pages[0] as Page);
}

export function goToPage(index: number): void {
  const p = app.config.pages[index];
  if (p) app.config.activePage = p.id;
}

export function cyclePage(delta: number): void {
  const pages = app.config.pages;
  const i = pages.findIndex((p) => p.id === app.config.activePage);
  goToPage((i + delta + pages.length) % pages.length);
}

export function addPage(name = 'page'): void {
  const id = uid('p');
  edit((c) => {
    c.pages.push({ id, name: name.slice(0, 24), columns: 3, widgets: [] });
    c.activePage = id;
  });
  ui.editing = true;
}

export function removePage(id: string): void {
  if (app.config.pages.length <= 1) {
    toast('Il faut garder au moins une page');
    return;
  }
  const name = app.config.pages.find((p) => p.id === id)?.name ?? '';
  edit((c) => {
    const i = c.pages.findIndex((p) => p.id === id);
    c.pages.splice(i, 1);
    if (c.activePage === id) c.activePage = c.pages[Math.max(0, i - 1)]?.id ?? '';
  }, `Page « ${name} » supprimée`);
}

export function addWidget(type: string): void {
  const def = widgetDef(type);
  if (!def) return;
  const inst: WidgetInstance = {
    id: uid(),
    type,
    title: def.label,
    w: def.size.w,
    h: def.size.h,
    config: def.defaults(),
  };
  edit((c) => {
    const p = c.pages.find((x) => x.id === c.activePage);
    if (!p) return;
    inst.w = Math.min(inst.w, p.columns);
    p.widgets.push(inst);
  });
  ui.editingWidget = inst.id;
}

export function findWidget(id: string): { page: Page; widget: WidgetInstance } | null {
  for (const page of app.config.pages) {
    const widget = page.widgets.find((w) => w.id === id);
    if (widget) return { page, widget };
  }
  return null;
}

export function removeWidget(id: string): void {
  const hit = findWidget(id);
  if (!hit) return;
  if (ui.editingWidget === id) ui.editingWidget = null;
  edit((c) => {
    const p = c.pages.find((x) => x.id === hit.page.id);
    if (p) p.widgets = p.widgets.filter((w) => w.id !== id);
  }, `« ${hit.widget.title} » supprimé`);
}

/** Move a widget before another one (or to the end), possibly across pages. */
export function moveWidget(id: string, toPage: string, beforeId: string | null): void {
  const hit = findWidget(id);
  if (!hit || id === beforeId) return;
  edit((c) => {
    const from = c.pages.find((p) => p.id === hit.page.id);
    const to = c.pages.find((p) => p.id === toPage);
    if (!from || !to) return;
    const i = from.widgets.findIndex((w) => w.id === id);
    const [w] = from.widgets.splice(i, 1);
    if (!w) return;
    w.w = Math.min(w.w, to.columns);
    const j = beforeId ? to.widgets.findIndex((x) => x.id === beforeId) : -1;
    if (j < 0) to.widgets.push(w);
    else to.widgets.splice(j, 0, w);
  });
}

export function nudgeWidget(id: string, delta: -1 | 1): void {
  const hit = findWidget(id);
  if (!hit) return;
  edit((c) => {
    const p = c.pages.find((x) => x.id === hit.page.id);
    if (!p) return;
    const i = p.widgets.findIndex((w) => w.id === id);
    const j = i + delta;
    if (j < 0 || j >= p.widgets.length) return;
    const a = p.widgets[i] as WidgetInstance;
    p.widgets[i] = p.widgets[j] as WidgetInstance;
    p.widgets[j] = a;
  });
}

export function resizeWidget(id: string, dw: number, dh: number): void {
  const hit = findWidget(id);
  if (!hit) return;
  edit((c) => {
    const p = c.pages.find((x) => x.id === hit.page.id);
    const w = p?.widgets.find((x) => x.id === id);
    if (!p || !w) return;
    w.w = Math.min(p.columns, Math.max(1, w.w + dw));
    w.h = Math.min(8, Math.max(1, w.h + dh));
  });
}

export function updateWidget(id: string, patch: Partial<Pick<WidgetInstance, 'title' | 'config'>>): void {
  edit((c) => {
    for (const p of c.pages) {
      const w = p.widgets.find((x) => x.id === id);
      if (w) Object.assign(w, patch);
    }
  });
}

/** Coalesce rapid edits (typing in a note) into one undo step. */
const quiet = new Map<string, ReturnType<typeof setTimeout>>();
export function updateWidgetQuiet(id: string, config: Record<string, unknown>): void {
  if (!quiet.has(id)) past.push(JSON.stringify(app.config));
  clearTimeout(quiet.get(id));
  quiet.set(
    id,
    setTimeout(() => quiet.delete(id), 1200),
  );
  const hit = findWidget(id);
  if (hit) hit.widget.config = config;
}

export function exportConfig(): void {
  const blob = new Blob([JSON.stringify(app.config, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `startx-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
