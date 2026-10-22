<script lang="ts">
  import Brand from './Brand.svelte';
  import { exportConfig, goToPage, ui } from '../lib/config/store.svelte.ts';

  let art: HTMLElement | undefined = $state();
  let lantern = $state(false);
  const hover = window.matchMedia('(hover: hover)').matches;

  // As on portico.dessenius.be: a warm light follows the pointer over the engraving.
  function move(e: PointerEvent) {
    if (!art || !hover) return;
    const r = art.getBoundingClientRect();
    art.style.setProperty('--lx', `${((e.clientX - r.left) / r.width) * 100}%`);
    art.style.setProperty('--ly', `${((e.clientY - r.top) / r.height) * 100}%`);
    lantern = true;
  }
</script>

<footer class="footer">
  <div class="wrap top">
    <div class="about">
      <Brand onclick={() => goToPage(0)} />
      <p class="tagline">Ta page de départ. Locale, sans compte, entièrement paramétrable.</p>
    </div>
    <nav class="cols" aria-label="Pied de page">
      <div class="col">
        <h3 class="meta">Page</h3>
        <ul role="list">
          <li><button type="button" onclick={() => (ui.editing = true)}>Modifier</button></li>
          <li><button type="button" onclick={() => (ui.picker = true)}>Ajouter un widget</button></li>
          <li><button type="button" onclick={() => (ui.help = true)}>Raccourcis</button></li>
        </ul>
      </div>
      <div class="col">
        <h3 class="meta">Données</h3>
        <ul role="list">
          <li><button type="button" onclick={exportConfig}>Exporter (JSON)</button></li>
          <li><button type="button" onclick={() => (ui.settings = 'data')}>Importer</button></li>
          <li><button type="button" onclick={() => (ui.settings = 'general')}>Réglages</button></li>
        </ul>
      </div>
      <div class="col">
        <h3 class="meta">Code</h3>
        <ul role="list">
          <li><a href="https://github.com/fs0ciety7000/StartX" rel="noopener">Dépôt StartX</a></li>
          <li><a href="https://github.com/fs0ciety7000/StartX/blob/main/docs/WIDGETS.md" rel="noopener">Écrire un widget</a></li>
          <li><a href="https://github.com/fs0ciety7000/StartX/blob/main/docs/CONFIG.md" rel="noopener">Format de config</a></li>
        </ul>
      </div>
    </nav>
  </div>

  <div class="wrap credit">
    <a class="studio" href="https://interactive.cardormedia.com" rel="noopener">
      <span class="dragon" aria-hidden="true"></span>
      <span class="who">
        <span class="meta">Conçu et développé par</span>
        <span class="name"
          >Nicolas Dessenius<span class="sep" aria-hidden="true"> · </span><span class="studio-name">Cardor Interactive</span></span
        >
      </span>
    </a>
    <div class="legal meta">
      <span>© 2026 StartX</span>
      <span>Données stockées dans ce navigateur</span>
    </div>
  </div>

  <div
    class="art"
    class:lantern
    bind:this={art}
    role="img"
    aria-label="Gravure : un carrefour la nuit ; un voyageur lève les yeux vers un poteau indicateur aux flèches multiples, éclairé par une lanterne. Au loin, des montagnes, une ville à coupole et un phare."
    onpointermove={move}
    onpointerleave={() => (lantern = false)}
  ></div>
</footer>

<style>
  .footer {
    position: relative;
    margin-top: clamp(48px, 6vw, 96px);
    padding-top: clamp(48px, 6vw, 88px);
    border-top: 1px solid var(--border-subtle);
    background: var(--bg-base);
    overflow: hidden;
  }
  .wrap {
    max-width: var(--maxw);
    margin-inline: auto;
    padding-inline: var(--gutter);
    position: relative;
    z-index: 1;
  }
  .top {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: var(--space-7);
  }
  .about {
    display: grid;
    gap: var(--space-4);
    align-content: start;
    justify-items: start;
  }
  .tagline {
    font-family: var(--font-display);
    font-size: clamp(20px, 1.2vw + 10px, 26px);
    line-height: 1.25;
    letter-spacing: -0.02em;
    color: var(--text-secondary);
    max-width: 26ch;
    text-wrap: balance;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-5);
  }
  .col h3 {
    color: var(--accent);
    margin-bottom: var(--space-4);
  }
  .col ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--space-3);
  }
  .col a,
  .col button {
    color: var(--text-secondary);
    font-size: var(--fs-ui-sm);
    text-align: left;
    transition: color var(--motion-fast) var(--ease-standard);
  }
  .col a:hover,
  .col button:hover {
    color: var(--text-primary);
  }
  .credit {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: var(--space-5);
    margin-top: clamp(48px, 6vw, 88px);
    padding-block: var(--space-5);
    border-block: 1px solid var(--border-subtle);
  }
  .studio {
    display: inline-flex;
    align-items: center;
    gap: var(--space-4);
  }
  .dragon {
    width: 44px;
    height: 36px;
    flex: none;
    background: var(--text-secondary);
    -webkit-mask: url('/brand/cardor-interactive.svg') center / contain no-repeat;
    mask: url('/brand/cardor-interactive.svg') center / contain no-repeat;
    transition: background-color var(--motion-base) var(--ease-standard);
  }
  .studio:hover .dragon {
    background: var(--text-primary);
  }
  .who {
    display: grid;
    gap: 2px;
  }
  .name {
    font-size: var(--fs-ui);
    font-weight: 550;
  }
  .studio-name {
    color: var(--text-secondary);
    font-weight: 450;
  }
  .sep {
    color: var(--text-meta);
  }
  .legal {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-5);
  }

  /*
   * Same technique as Portico's footer, StartX's own engraving (design/): the image is a
   * luminance mask, so its lines take the theme's colours. Muted sky and horizon, secondary
   * foreground, the accent where the light is: the lantern on the signpost, the lighthouse,
   * the city's dome. The element keeps the image's ratio so these positions stay on target.
   */
  .art {
    --lx: 50%;
    --ly: 60%;
    position: relative;
    width: 100%;
    aspect-ratio: 1536 / 883;
    min-height: 300px;
    margin-top: var(--space-5);
    margin-bottom: var(--bar-h);
    background:
      radial-gradient(ellipse 7% 12% at 70.5% 55%, var(--accent-strong) 0, var(--accent) 40%, transparent 100%),
      radial-gradient(ellipse 5% 3% at 91% 38%, var(--accent-strong) 0, transparent 100%),
      radial-gradient(ellipse 4% 3% at 49.5% 38%, var(--accent) 0, transparent 100%),
      linear-gradient(to bottom, var(--text-muted) 25%, var(--text-meta) 45%, var(--text-secondary) 85%);
    mask: url('/footer-startx-1536.webp') 50% 100% / cover no-repeat luminance;
  }
  @supports not (mask-mode: luminance) {
    .art {
      background: url('/footer-startx-1536.webp') 50% 100% / cover no-repeat;
      mix-blend-mode: screen;
      opacity: 0.7;
    }
  }
  .art::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle 240px at var(--lx) var(--ly),
      color-mix(in srgb, var(--accent-strong) 85%, transparent),
      transparent 70%
    );
    opacity: 0;
    transition: opacity var(--motion-slow) var(--ease-standard);
  }
  .art.lantern::after {
    opacity: 1;
  }
  @media (max-width: 900px) {
    .art {
      mask-image: url('/footer-startx-960.webp');
    }
  }
  @media (max-width: 1000px) {
    .top {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 560px) {
    .cols {
      grid-template-columns: 1fr 1fr;
      row-gap: var(--space-6);
    }
  }
</style>
