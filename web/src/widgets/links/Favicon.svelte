<script lang="ts">
  import { faviconFor } from '../../lib/open.ts';

  let { url, name, icon = '', size = 18 }: { url: string; name: string; icon?: string; size?: number } = $props();
  let failed = $state(false);
  const src = $derived(faviconFor(url, icon));
  $effect(() => {
    // A new URL deserves a new attempt.
    void src;
    failed = false;
  });
</script>

<span class="fav" style:--s={`${size}px`} aria-hidden="true">
  {#if src && !failed}
    <img
      {src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      onerror={() => (failed = true)}
    />
  {:else}
    <span class="mono">{(name.trim()[0] ?? '?').toUpperCase()}</span>
  {/if}
</span>

<style>
  .fav {
    width: calc(var(--s) + 10px);
    height: calc(var(--s) + 10px);
    flex: none;
    display: grid;
    place-items: center;
    border-radius: var(--radius-md);
    /* A touch lighter than the card: dark logos (GitHub, Notion) stay readable. */
    background: color-mix(in srgb, var(--text-primary) 9%, var(--bg-elevated));
    border: 1px solid var(--border-subtle);
    overflow: hidden;
  }
  img {
    width: var(--s);
    height: var(--s);
    object-fit: contain;
  }
  span.mono {
    font-size: calc(var(--s) * 0.62);
    font-weight: 600;
    color: var(--wa, var(--accent));
  }
</style>
