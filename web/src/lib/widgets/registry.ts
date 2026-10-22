import type { WidgetDef } from './types.ts';

/*
 * Every src/widgets/<name>/index.ts is a widget. Dropping a folder in is the whole
 * registration step: the picker, the renderer and the config sanitizer read this map.
 */
const modules = import.meta.glob<{ default: WidgetDef }>('../../widgets/*/index.ts', { eager: true });

export const widgets: ReadonlyMap<string, WidgetDef> = new Map(
  Object.values(modules)
    .map((m) => m.default)
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    .map((d) => [d.type, d]),
);

export function widgetDef(type: string): WidgetDef | undefined {
  return widgets.get(type);
}
