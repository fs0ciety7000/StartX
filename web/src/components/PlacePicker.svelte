<script lang="ts">
  import { geocode, type GeoResult, type Place } from '../lib/geo.ts';

  let { place, onpick }: { place: Place; onpick: (p: Place) => void } = $props();

  let q = $state('');
  let results = $state<GeoResult[]>([]);
  let busy = $state(false);
  let error = $state('');

  async function find(e: SubmitEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    busy = true;
    error = '';
    try {
      results = await geocode(q.trim());
      if (!results.length) error = 'Aucune ville trouvée';
    } catch (err) {
      error = (err as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<p class="meta">Lieu · {place.city}{place.country ? `, ${place.country}` : ''}</p>
<form class="find" onsubmit={find}>
  <input bind:value={q} placeholder="Chercher une ville" aria-label="Chercher une ville" />
  <button class="btn btn-ghost" type="submit" disabled={busy}>Chercher</button>
</form>
{#if error}<p class="hint">{error}</p>{/if}
{#if results.length}
  <ul class="results" role="list">
    {#each results as r (r.lat + ',' + r.lon)}
      <li>
        <button
          type="button"
          onclick={() => {
            onpick({ city: r.city, country: r.country, lat: r.lat, lon: r.lon });
            results = [];
            q = '';
          }}
        >
          <span>{r.city}</span><span class="muted">{[r.admin, r.country].filter(Boolean).join(', ')}</span>
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .find {
    display: flex;
    gap: var(--space-2);
  }
  .find input {
    flex: 1;
    min-width: 0;
  }
  .results {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 2px;
  }
  .results button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    text-align: left;
    font-size: var(--fs-small);
  }
  .results button:hover {
    background: var(--bg-elevated);
  }
</style>
