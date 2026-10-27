<script lang="ts">
  /** The moon's lit part: a half disc on the lit side closed by the terminator, an ellipse. */
  let { phase, fraction, size = 56 }: { phase: number; fraction: number; size?: number } = $props();

  const r = 20;
  const path = $derived.by(() => {
    const waxing = phase < 0.5;
    const rx = r * Math.abs(Math.cos(2 * Math.PI * phase));
    const sweepLimb = waxing ? 1 : 0;
    const sweepTerm = waxing === fraction > 0.5 ? 1 : 0;
    return `M24 ${24 - r} A${r} ${r} 0 0 ${sweepLimb} 24 ${24 + r} A${rx} ${r} 0 0 ${sweepTerm} 24 ${24 - r}Z`;
  });
</script>

<svg class="moon" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
  <circle cx="24" cy="24" {r} class="dark" />
  {#if fraction > 0.01}<path d={path} class="lit" />{/if}
  <circle cx="24" cy="24" {r} class="rim" />
</svg>

<style>
  .moon {
    flex: none;
  }
  .dark {
    fill: var(--bg-base);
  }
  .lit {
    fill: var(--ansi-15);
    filter: drop-shadow(0 0 6px color-mix(in srgb, var(--ansi-15) 35%, transparent));
  }
  .rim {
    fill: none;
    stroke: var(--border-strong);
    stroke-width: 1;
  }
</style>
