<script lang="ts">
  import { ui, undo } from '../lib/config/store.svelte.ts';
</script>

<div class="toasts" role="status" aria-live="polite">
  {#if ui.toast}
    {#key ui.toast.id}
      <div class="toast">
        <span>{ui.toast.text}</span>
        {#if ui.toast.undo}
          <button
            type="button"
            onclick={() => {
              undo();
            }}>Annuler</button
          >
        {/if}
      </div>
    {/key}
  {/if}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    bottom: calc(var(--bar-h) + var(--space-5));
    transform: translateX(-50%);
    z-index: 60;
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: 10px 10px 10px var(--space-4);
    border-radius: var(--radius-md);
    background: var(--text-primary);
    color: var(--bg-base);
    font-size: var(--fs-small);
    font-weight: 500;
    box-shadow: var(--shadow-overlay);
    animation: up var(--motion-slow) var(--ease-emphasized);
    white-space: nowrap;
  }
  button {
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-weight: 650;
    color: var(--bg-base);
    background: color-mix(in srgb, var(--bg-base) 10%, transparent);
  }
  button:hover {
    background: color-mix(in srgb, var(--bg-base) 18%, transparent);
  }
  @keyframes up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
</style>
