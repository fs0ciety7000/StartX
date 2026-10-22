<script lang="ts">
  import { updateWidgetQuiet } from '../../lib/config/store.svelte.ts';
  import type { WidgetProps } from '../../lib/widgets/types.ts';
  import type { NotesConfig } from './index.ts';

  let { instance, config }: WidgetProps<NotesConfig> = $props();
</script>

<textarea
  class="notes"
  spellcheck="false"
  placeholder="Écrire ici…"
  aria-label={instance.title}
  value={config.text}
  oninput={(e) => updateWidgetQuiet(instance.id, { text: e.currentTarget.value })}></textarea>

<style>
  .notes {
    width: 100%;
    height: 100%;
    resize: none;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--text-base);
    line-height: 1.7;
    padding: 0;
  }
  .notes::placeholder {
    color: var(--text-muted);
  }
</style>
