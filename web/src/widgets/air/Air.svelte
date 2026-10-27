<script lang="ts">
  import type { WidgetProps } from '../../lib/widgets/types.ts';
  import { aqiBand, cachedAir, fetchAir, POLLENS, POLLUTANTS, pollenLevel, type Air } from './api.ts';
  import type { AirConfig } from './index.ts';

  let { config }: WidgetProps<AirConfig> = $props();

  let data = $state<Air | null>(null);
  let error = $state('');

  $effect(() => {
    const place = { city: config.city, country: config.country, lat: config.lat, lon: config.lon };
    data = cachedAir(place)?.data ?? null;
    error = '';
    let alive = true;
    const run = () =>
      fetchAir(place)
        .then((a) => alive && (data = a))
        .catch((e: Error) => alive && !data && (error = e.message));
    void run();
    const id = setInterval(run, 30 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  });

  const band = $derived(data?.aqi != null ? aqiBand(data.aqi) : null);
  const pollens = $derived(
    data
      ? POLLENS.map((p) => ({ ...p, v: data?.values[p.key] ?? null }))
          .filter((p) => p.v !== null && p.v >= 1)
          .map((p) => ({ ...p, level: pollenLevel(p.v as number, p.levels) }))
          .sort((a, b) => (b.v as number) - (a.v as number))
      : [],
  );
  const hasPollenData = $derived(!!data && POLLENS.some((p) => data?.values[p.key] != null));
  const maxAqi = $derived(Math.max(60, ...(data?.hourly.map((h) => h.aqi ?? 0) ?? [])));
  const fmt = (n: number | null | undefined) => (n == null ? '—' : n < 10 ? n.toFixed(1).replace('.', ',') : String(Math.round(n)));
</script>

<div class="air">
  {#if data && band && data.aqi != null}
    <div class="head">
      <div class="index" style:--band={band.color}>
        <span class="n">{Math.round(data.aqi)}</span>
        <span class="lbl">
          <span class="band">{band.label}</span>
          <span class="meta">indice européen · {config.city}</span>
        </span>
      </div>
      <div class="scale" aria-hidden="true">
        <span class="cursor" style:left={`${Math.min(100, data.aqi)}%`}></span>
      </div>
    </div>

    <dl class="pollutants">
      {#each POLLUTANTS as p (p.key)}
        <div>
          <dt class="meta">{p.label}</dt>
          <dd><b>{fmt(data.values[p.key])}</b> <span class="u">µg/m³</span></dd>
        </div>
      {/each}
    </dl>

    {#if config.pollen}
      <div class="pollen">
        <p class="meta">Pollens</p>
        {#if pollens.length}
          <ul role="list">
            {#each pollens as p (p.key)}
              <li>
                <span class="pname">{p.label}</span>
                <span class="steps" aria-hidden="true">
                  {#each [0, 1, 2, 3] as s (s)}<i class:on={s <= p.level.step} data-s={p.level.step}></i>{/each}
                </span>
                <span class="plevel mono">{p.level.label}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="muted none">{hasPollenData ? 'Aucun pollen en ce moment.' : 'Pas de données pollen pour ce lieu.'}</p>
        {/if}
      </div>
    {/if}

    {#if config.forecast && data.hourly.length}
      <div class="forecast">
        <div class="bars" role="img" aria-label="Indice de qualité de l’air sur les 24 prochaines heures">
          {#each data.hourly as h, i (h.time)}
            <i
              style:height={`${Math.max(6, ((h.aqi ?? 0) / maxAqi) * 100)}%`}
              style:background={h.aqi != null ? aqiBand(h.aqi).color : 'var(--border-subtle)'}
              title={`${h.time.slice(11, 16)} · ${h.aqi ?? '—'}`}
              class:first={i === 0}
            ></i>
          {/each}
        </div>
        <div class="bars-axis mono"><span>maintenant</span><span>+12 h</span><span>+24 h</span></div>
      </div>
    {/if}
  {:else if error}
    <p class="muted msg">Qualité de l’air indisponible ({error}).</p>
  {:else}
    <p class="muted msg">Qualité de l’air à {config.city}…</p>
  {/if}
</div>

<style>
  .air {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .head {
    display: grid;
    gap: var(--space-3);
  }
  .index {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  .n {
    font-family: var(--font-display);
    font-size: 40px;
    line-height: 1;
    letter-spacing: -0.04em;
    font-weight: 500;
    color: var(--band);
    font-variant-numeric: tabular-nums;
  }
  .lbl {
    display: grid;
    gap: 2px;
  }
  .band {
    font-weight: 550;
  }
  .scale {
    position: relative;
    height: 6px;
    border-radius: var(--radius-pill);
    background: linear-gradient(
      to right,
      var(--ansi-2) 0 20%,
      var(--ansi-6) 20% 40%,
      var(--ansi-3) 40% 60%,
      var(--ansi-9) 60% 80%,
      var(--ansi-1) 80% 100%
    );
    opacity: 0.85;
  }
  .cursor {
    position: absolute;
    top: 50%;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--text-primary);
    border: 2px solid var(--bg-surface);
    transform: translate(-50%, -50%);
  }
  .pollutants {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-3);
  }
  .pollutants dd {
    margin: 2px 0 0;
    white-space: nowrap;
  }
  .pollutants b {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .u {
    font-size: 10.5px;
    color: var(--text-muted);
  }
  .pollen {
    display: grid;
    gap: var(--space-2);
  }
  .pollen ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 6px;
  }
  .pollen li {
    display: grid;
    grid-template-columns: 1fr auto 9ch;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--fs-small);
  }
  .steps {
    display: flex;
    gap: 3px;
  }
  .steps i {
    width: 14px;
    height: 6px;
    border-radius: 2px;
    background: var(--border-subtle);
  }
  .steps i.on[data-s='0'] {
    background: var(--ansi-2);
  }
  .steps i.on[data-s='1'] {
    background: var(--ansi-3);
  }
  .steps i.on[data-s='2'] {
    background: var(--ansi-9);
  }
  .steps i.on[data-s='3'] {
    background: var(--ansi-1);
  }
  .plevel {
    font-size: 11px;
    color: var(--text-secondary);
    text-align: right;
  }
  .none,
  .msg {
    font-size: var(--fs-small);
  }
  .forecast {
    margin-top: auto;
    display: grid;
    gap: 4px;
    flex: none;
  }
  .bars {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 28px;
  }
  .bars i {
    flex: 1;
    border-radius: 2px 2px 0 0;
    opacity: 0.55;
  }
  .bars i.first {
    opacity: 1;
  }
  .bars-axis {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--text-muted);
  }
</style>
