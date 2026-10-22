<script lang="ts">
  import Mark from './Mark.svelte';
  let { onclick }: { onclick?: () => void } = $props();
</script>

<button type="button" class="brand" aria-label="StartX, première page" {onclick}>
  <span class="mark"><Mark size={20} /></span>
  <span class="word" aria-hidden="true">STARTX</span>
</button>

<style>
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--text-primary);
    height: 36px;
  }
  .mark {
    color: var(--accent);
    display: grid;
    transition: transform var(--motion-base) var(--ease-emphasized);
  }
  .brand:hover .mark {
    transform: rotate(-90deg);
  }
  .word {
    font-family: var(--font-display);
    font-weight: 500;
    font-size: 13px;
    letter-spacing: 0.28em;
    margin-right: -0.28em;
  }
</style>
