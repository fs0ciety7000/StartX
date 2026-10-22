<script lang="ts">
  import { app } from '../../lib/config/store.svelte.ts';
  import type { WidgetProps } from '../../lib/widgets/types.ts';
  import type { ClockConfig } from './index.ts';

  let { config }: WidgetProps<ClockConfig> = $props();

  let now = $state(new Date());
  $effect(() => {
    const tick = () => (now = new Date());
    // Align to the next second so minutes flip on time.
    let id: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(
      () => {
        tick();
        id = setInterval(tick, 1000);
      },
      1000 - (Date.now() % 1000),
    );
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  });

  const h24 = $derived(app.config.settings.clock24h);
  const hh = $derived(h24 ? now.getHours() : now.getHours() % 12 || 12);
  const time = $derived(`${String(hh).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  const secs = $derived(String(now.getSeconds()).padStart(2, '0'));
  const greet = $derived.by(() => {
    const h = now.getHours();
    const base = h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
    const name = app.config.settings.name.trim();
    return name ? `${base}, ${name}` : base;
  });
  const date = $derived(now.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }));
</script>

<div class="clock">
  {#if config.greeting}<p class="greet">{greet}</p>{/if}
  <p class="time" aria-live="off">
    <time datetime={now.toISOString()}>{time}</time>{#if config.seconds}<span class="s">{secs}</span>{/if}{#if !h24}<span class="ampm"
        >{now.getHours() < 12 ? 'AM' : 'PM'}</span
      >{/if}
  </p>
  {#if config.date}<p class="date meta">{date}</p>{/if}
</div>

<style>
  .clock {
    height: 100%;
    display: grid;
    align-content: center;
    gap: 2px;
    padding: var(--space-2) var(--space-1);
  }
  .greet {
    color: var(--text-secondary);
    font-size: var(--fs-ui);
  }
  .time {
    font-family: var(--font-display);
    font-size: clamp(44px, 3.4vw + 16px, 72px);
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.045em;
    font-variant-numeric: tabular-nums;
  }
  .s,
  .ampm {
    font-size: 0.32em;
    letter-spacing: 0;
    margin-left: 0.35em;
    color: var(--accent);
    vertical-align: 0.15em;
    font-family: var(--font-mono);
  }
  .date {
    margin-top: var(--space-2);
  }
</style>
