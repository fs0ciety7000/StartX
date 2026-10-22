<script lang="ts">
  import type { Sky } from './api.ts';
  let { sky, day = true, size = 40 }: { sky: Sky; day?: boolean; size?: number } = $props();
</script>

<svg
  class="sky"
  width={size}
  height={size}
  viewBox="0 0 48 48"
  fill="none"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if sky === 'clear' || sky === 'partly'}
    {#if day}
      <g class="sun" stroke-width="2.2">
        <circle cx={sky === 'partly' ? 18 : 24} cy={sky === 'partly' ? 18 : 24} r="7" />
        {#each [0, 45, 90, 135, 180, 225, 270, 315] as a (a)}
          <path d="M0 -12V-15" transform={`translate(${sky === 'partly' ? 18 : 24} ${sky === 'partly' ? 18 : 24}) rotate(${a})`} />
        {/each}
      </g>
    {:else}
      <path
        class="moon"
        stroke-width="2.2"
        d={sky === 'partly' ? 'M22 10a9 9 0 1 0 8 12 7 7 0 0 1-8-12z' : 'M28 12a12 12 0 1 0 10 16 9.5 9.5 0 0 1-10-16z'}
      />
    {/if}
  {/if}
  {#if sky !== 'clear'}
    <path class="cloud" stroke-width="2.2" d="M15 36h19a7 7 0 0 0 .8-14 10 10 0 0 0-19.3 2.5A6 6 0 0 0 15 36z" />
  {/if}
  {#if sky === 'rain' || sky === 'drizzle' || sky === 'storm'}
    <g class="rain" stroke-width="2.2">
      <path d="M19 40l-1.5 4M26 40l-1.5 4" />
      {#if sky !== 'drizzle'}<path d="M33 40l-1.5 4" />{/if}
    </g>
  {/if}
  {#if sky === 'storm'}<path class="bolt" stroke-width="2.2" d="M26 30l-4 7h5l-3 7" />{/if}
  {#if sky === 'snow'}<g class="snow" stroke-width="2.4"><path d="M19 42h.01M26 44h.01M33 42h.01" /></g>{/if}
  {#if sky === 'fog'}<g class="fog" stroke-width="2.2"><path d="M12 40h24M16 44h18" /></g>{/if}
</svg>

<style>
  .sky {
    flex: none;
  }
  .sun {
    stroke: var(--ansi-3);
    fill: color-mix(in srgb, var(--ansi-3) 18%, transparent);
  }
  .moon {
    stroke: var(--ansi-13);
    fill: color-mix(in srgb, var(--ansi-13) 12%, transparent);
  }
  .cloud {
    stroke: var(--text-secondary);
    fill: var(--bg-surface);
  }
  .rain {
    stroke: var(--ansi-4);
  }
  .bolt {
    stroke: var(--ansi-11);
  }
  .snow {
    stroke: var(--ansi-15);
  }
  .fog {
    stroke: var(--text-muted);
  }
</style>
