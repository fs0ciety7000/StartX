<script lang="ts">
  import type { WidgetProps } from '../../lib/widgets/types.ts';
  import { cachedWeather, describe, fetchWeather, type Weather } from './api.ts';
  import Sky from './Sky.svelte';
  import type { WeatherConfig } from './index.ts';

  let { config }: WidgetProps<WeatherConfig> = $props();

  let data = $state<Weather | null>(null);
  let error = $state('');

  $effect(() => {
    const c = { ...config };
    data = cachedWeather(c)?.data ?? null;
    error = '';
    let alive = true;
    const run = () =>
      fetchWeather(c)
        .then((w) => alive && (data = w))
        .catch((e: Error) => alive && !data && (error = e.message));
    void run();
    const id = setInterval(run, 15 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  });

  const deg = (n: number) => `${Math.round(n)}°`;
  const now = $derived(data ? describe(data.code) : null);
  const days = $derived(data ? data.daily.slice(1, 1 + config.days) : []);
  const dayName = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-BE', { weekday: 'short' }).replace('.', '');
</script>

<div class="weather">
  {#if data && now}
    <div class="now">
      <Sky sky={now.sky} day={data.isDay} size={52} />
      <div class="read">
        <p class="temp">{deg(data.temp)}<span class="unit">{config.units === 'metric' ? 'C' : 'F'}</span></p>
        <p class="desc">{now.label}</p>
      </div>
      <div class="facts mono">
        <span class="city">{config.city}</span>
        <span>ressenti {deg(data.feels)}</span>
        <span>{deg(data.daily[0]?.min ?? 0)} / {deg(data.daily[0]?.max ?? 0)}</span>
        <span>vent {Math.round(data.wind)} {config.units === 'metric' ? 'km/h' : 'mph'} · {data.humidity}%</span>
      </div>
    </div>
    {#if days.length}
      <ol class="days" role="list">
        {#each days as d (d.date)}
          <li title={`${describe(d.code).label} · pluie ${d.rain}%`}>
            <span class="meta">{dayName(d.date)}</span>
            <Sky sky={describe(d.code).sky} size={24} />
            <span class="mono range"><b>{deg(d.max)}</b> {deg(d.min)}</span>
          </li>
        {/each}
      </ol>
    {/if}
  {:else if error}
    <p class="muted msg">Météo indisponible ({error}).</p>
  {:else}
    <p class="muted msg">Météo de {config.city}…</p>
  {/if}
</div>

<style>
  .weather {
    container-type: inline-size;
    height: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-5);
  }
  .now {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex: none;
  }
  .temp {
    font-family: var(--font-display);
    font-size: 38px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
  }
  .unit {
    font-size: 0.42em;
    color: var(--text-muted);
    vertical-align: 0.9em;
    margin-left: 2px;
    letter-spacing: 0;
  }
  .desc {
    font-size: var(--fs-small);
    color: var(--text-secondary);
    margin-top: 4px;
  }
  .facts {
    display: grid;
    gap: 1px;
    font-size: 10.5px;
    color: var(--text-muted);
    padding-left: var(--space-4);
    border-left: 1px solid var(--border-subtle);
    white-space: nowrap;
  }
  .city {
    color: var(--wa);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .days {
    margin: 0 0 0 auto;
    padding: 0;
    list-style: none;
    display: flex;
    gap: var(--space-1);
  }
  .days li {
    display: grid;
    justify-items: center;
    gap: 3px;
    padding: 4px 8px;
    border-radius: var(--radius-md);
  }
  .days li:hover {
    background: var(--bg-elevated);
  }
  .range {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
  }
  .range b {
    color: var(--text-primary);
    font-weight: 500;
  }
  .msg {
    font-size: var(--fs-small);
  }
  @container (max-width: 560px) {
    .facts {
      display: none;
    }
  }
  @container (max-width: 380px) {
    .days {
      display: none;
    }
  }
</style>
