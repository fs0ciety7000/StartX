<script lang="ts">
  import type { WidgetProps } from '../../lib/widgets/types.ts';
  import { moon, nextPhase, phaseName, sunAltitude, sunTimes } from './astro.ts';
  import Moon from './Moon.svelte';
  import type { SunConfig } from './index.ts';

  let { config }: WidgetProps<SunConfig> = $props();

  let now = $state(new Date());
  $effect(() => {
    const id = setInterval(() => (now = new Date()), 60_000);
    return () => clearInterval(id);
  });

  // Local noon of today: the solar day we describe.
  const today = $derived(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12));
  const t = $derived(sunTimes(today, config.lat, config.lon));
  const y = $derived(sunTimes(new Date(today.valueOf() - 86_400_000), config.lat, config.lon));
  const length = (s: typeof t) => (s.sunrise && s.sunset ? s.sunset.valueOf() - s.sunrise.valueOf() : null);
  const dayLen = $derived(length(t));
  const delta = $derived(dayLen !== null && length(y) !== null ? Math.round((dayLen - (length(y) as number)) / 60_000) : null);
  const alt = $derived(sunAltitude(now, config.lat, config.lon));
  // Position of the sun along today's arc, 0 at sunrise, 1 at sunset (clamped outside).
  const progress = $derived(
    t.sunrise && t.sunset
      ? Math.min(1, Math.max(0, (now.valueOf() - t.sunrise.valueOf()) / (t.sunset.valueOf() - t.sunrise.valueOf())))
      : alt > 0
        ? 0.5
        : 0,
  );
  const up = $derived(alt > -0.833);
  const m = $derived(moon(now));
  const nextFull = $derived(nextPhase(now, 0.5));
  const nextNew = $derived(nextPhase(now, 0));

  const hm = (d: Date | null) => (d ? d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }) : '—');
  const dur = (ms: number | null) =>
    ms === null
      ? alt > 0
        ? '24 h'
        : '0 h'
      : `${Math.floor(ms / 3_600_000)} h ${String(Math.round((ms % 3_600_000) / 60_000)).padStart(2, '0')}`;
  const day = (d: Date) => d.toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');

  // Arc geometry: a half ellipse from (8, 64) to (192, 64), apex 52 px above the horizon.
  const sunX = $derived(8 + 184 * progress);
  const sunY = $derived(64 - 52 * Math.sin(Math.PI * progress));
</script>

<div class="sun">
  <section class="day" aria-label="Soleil">
    <svg class="arc" viewBox="0 0 200 76" aria-hidden="true">
      <defs>
        <linearGradient id="sky-{config.lat}-{config.lon}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="var(--ansi-3)" stop-opacity="0.18" />
          <stop offset="1" stop-color="var(--ansi-3)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="M8 64 A92 52 0 0 1 192 64" class="track" />
      {#if up}
        <path d="M8 64 A92 52 0 0 1 192 64 Z" fill="url(#sky-{config.lat}-{config.lon})" />
      {/if}
      <line x1="0" x2="200" y1="64" y2="64" class="horizon" />
      <circle cx={sunX} cy={up ? sunY : 70} r="6" class="dot" class:down={!up} />
    </svg>
    <div class="ends mono">
      <span><b>{hm(t.sunrise)}</b> lever</span>
      <span class="city">{config.city}</span>
      <span>coucher <b>{hm(t.sunset)}</b></span>
    </div>
    <dl class="facts">
      <div>
        <dt class="meta">Durée</dt>
        <dd>
          {dur(dayLen)}{#if delta !== null && delta !== 0}<span class="delta" class:plus={delta > 0}
              >{delta > 0 ? '+' : '−'}{Math.abs(delta)} min</span
            >{/if}
        </dd>
      </div>
      <div>
        <dt class="meta">Midi solaire</dt>
        <dd>{hm(t.noon)}</dd>
      </div>
      <div>
        <dt class="meta">Aube civile</dt>
        <dd>{hm(t.dawn)}</dd>
      </div>
      <div>
        <dt class="meta">Crépuscule</dt>
        <dd>{hm(t.dusk)}</dd>
      </div>
    </dl>
  </section>

  {#if config.moon}
    <section class="night" aria-label="Lune">
      <Moon phase={m.phase} fraction={m.fraction} size={48} />
      <div class="moon-txt">
        <p class="phase">{phaseName(m.phase)}</p>
        <p class="mono pct">{Math.round(m.fraction * 100)} % éclairée</p>
        <p class="mono next">pleine lune {day(nextFull)}</p>
        <p class="mono next">nouvelle lune {day(nextNew)}</p>
      </div>
    </section>
  {/if}
</div>

<style>
  .sun {
    container-type: inline-size;
    position: relative;
    height: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-5);
    align-items: center;
  }
  .day {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }
  .arc {
    width: 100%;
    max-height: 60px;
    overflow: visible;
  }
  .track {
    fill: none;
    stroke: var(--border-strong);
    stroke-width: 1.2;
    stroke-dasharray: 2 4;
  }
  .horizon {
    stroke: var(--border-strong);
    stroke-width: 1;
  }
  .dot {
    fill: var(--ansi-3);
    filter: drop-shadow(0 0 8px var(--ansi-3));
  }
  .dot.down {
    fill: var(--text-muted);
    filter: none;
  }
  .ends {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-muted);
  }
  .city {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-meta);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ends {
    gap: var(--space-3);
  }
  .ends b {
    color: var(--text-primary);
    font-weight: 500;
    font-size: 13px;
  }
  .facts {
    margin: var(--space-1) 0 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(78px, 1fr));
    gap: var(--space-2) var(--space-4);
  }
  .facts dd {
    margin: 2px 0 0;
    font-size: var(--fs-ui-sm);
    font-variant-numeric: tabular-nums;
  }
  .delta {
    display: block;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--ansi-1);
  }
  .delta.plus {
    color: var(--ansi-2);
  }
  .night {
    display: grid;
    justify-items: center;
    gap: var(--space-2);
    padding-left: var(--space-5);
    border-left: 1px solid var(--border-subtle);
    text-align: center;
  }
  .moon-txt {
    display: grid;
    gap: 2px;
  }
  .phase {
    font-size: var(--fs-ui-sm);
    font-weight: 500;
  }
  .pct {
    font-size: 11px;
    color: var(--wa);
  }
  .next {
    font-size: 10.5px;
    color: var(--text-muted);
  }
  @container (max-width: 400px) {
    .sun {
      grid-template-columns: 1fr;
    }
    .night {
      grid-auto-flow: column;
      justify-content: start;
      text-align: left;
      padding: var(--space-3) 0 0;
      border-left: 0;
      border-top: 1px solid var(--border-subtle);
    }
  }
</style>
