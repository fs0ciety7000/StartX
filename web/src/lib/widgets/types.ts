import type { Component } from 'svelte';
import type { WidgetInstance } from '../config/schema.ts';

/** Props every widget view receives. */
export interface WidgetProps<C> {
  instance: WidgetInstance<C>;
  config: C;
  /** True while the page is in edit mode. */
  editing: boolean;
  /** Persist a new config for this instance (goes through the undo history). */
  update: (next: C) => void;
}

/** Props every widget editor receives (rendered in the edit drawer). */
export interface EditorProps<C> {
  config: C;
  update: (next: C) => void;
}

/**
 * A widget type. Add a folder under src/widgets/ exporting `default` of this shape
 * and it is registered automatically (see registry.ts). See docs/WIDGETS.md.
 */
export interface WidgetDef<C = any> {
  type: string;
  label: string;
  description: string;
  /** SVG path data, 24×24 viewBox, stroked. */
  icon: string;
  size: { w: number; h: number };
  defaults: () => C;
  /** Repair a config read from storage or an import: never trust its shape. */
  sanitize: (raw: unknown) => C;
  view: Component<WidgetProps<C>>;
  editor?: Component<EditorProps<C>>;
  /** No title bar outside edit mode (clock, search, weather): edit tools float over the top edge. */
  bare?: boolean;
  /** No card background either: the widget draws straight on the page (clock, search). */
  plain?: boolean;
}

export function defineWidget<C>(def: WidgetDef<C>): WidgetDef<C> {
  return def;
}
