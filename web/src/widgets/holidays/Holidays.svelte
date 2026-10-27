<script lang="ts">
  import type { WidgetProps } from '../../lib/widgets/types.ts';
  import { daysUntil, upcoming, type Holiday } from './api.ts';
  import type { HolidaysConfig } from './index.ts';

  let { config }: WidgetProps<HolidaysConfig> = $props();

  let all = $state<Holiday[]>([]);
  let error = $state('');
  let now = $state(new Date());

  $effect(() => {
    const country = config.country;
    let alive = true;
    error = '';
    upcoming(country)
      .then((h) => alive && (all = h))
      .catch((e: Error) => alive && (error = e.message));
    // Re-evaluate the countdown after midnight.
    const id = setInterval(() => (now = new Date()), 30 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  });

  const list = $derived(all.filter((h) => (config.bank || h.public) && daysUntil(h.date, now) >= 0));
  const next = $derived(list[0]);
  const rest = $derived(list.slice(1, 1 + config.count));
  const long = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' });
  const short = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  const until = (n: number) => (n === 0 ? 'aujourd’hui' : n === 1 ? 'demain' : `dans ${n} jours`);
</script>

<div class="hol">
  {#if next}
    {@const n = daysUntil(next.date, now)}
    <div class="next" class:today={n === 0}>
      <p class="count">
        <span class="num">{n === 0 ? 'Aujourd’hui' : n}</span>{#if n > 0}<span class="unit">{n === 1 ? 'jour' : 'jours'}</span>{/if}
      </p>
      <p class="name">
        {next.name}{#if next.regional}<span class="tag">régional</span>{/if}
      </p>
      <p class="meta">{long(next.date)}{n > 0 ? ` · ${until(n)}` : ''}</p>
    </div>
    {#if rest.length}
      <ol class="list" role="list">
        {#each rest as h (h.date + h.name)}
          <li>
            <span class="d mono">{short(h.date)}</span>
            <span class="nm"
              >{h.name}{#if !h.public}<span class="tag">banque</span>{/if}{#if h.regional}<span class="tag">régional</span>{/if}</span
            >
            <span class="in mono">{daysUntil(h.date, now)} j</span>
          </li>
        {/each}
      </ol>
    {/if}
  {:else if error}
    <p class="muted msg">Jours fériés indisponibles ({error}).</p>
  {:else}
    <p class="muted msg">Chargement…</p>
  {/if}
</div>

<style>
  .hol {
    display: grid;
    gap: var(--space-4);
    align-content: start;
  }
  .next {
    display: grid;
    gap: 2px;
  }
  .count {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }
  .num {
    font-family: var(--font-display);
    font-size: 44px;
    line-height: 1;
    font-weight: 500;
    letter-spacing: -0.04em;
    color: var(--wa);
    font-variant-numeric: tabular-nums;
  }
  .today .num {
    font-size: 30px;
  }
  .unit {
    color: var(--text-secondary);
    font-size: var(--fs-small);
  }
  .name {
    font-size: var(--fs-ui-lg);
    font-weight: 550;
    margin-top: var(--space-1);
  }
  .tag {
    margin-left: 6px;
    padding: 0 6px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border-strong);
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
    vertical-align: 2px;
  }
  .list {
    margin: 0;
    padding: var(--space-3) 0 0;
    list-style: none;
    display: grid;
    gap: var(--space-2);
    border-top: 1px solid var(--border-subtle);
  }
  .list li {
    display: grid;
    grid-template-columns: 9ch 1fr auto;
    gap: var(--space-3);
    align-items: baseline;
    font-size: var(--fs-small);
  }
  .d,
  .in {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
  }
  .nm {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .msg {
    font-size: var(--fs-small);
  }
</style>
