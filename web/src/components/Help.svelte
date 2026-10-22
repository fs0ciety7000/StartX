<script lang="ts">
  import Dialog from './Dialog.svelte';
  import { ui } from '../lib/config/store.svelte.ts';

  const groups: [string, [string[], string][]][] = [
    [
      'Partout',
      [
        [['/'], 'Rechercher (ou tape directement)'],
        [['e'], 'Mode édition'],
        [[','], 'Réglages'],
        [['?'], 'Cette aide'],
        [['Échap'], 'Fermer, quitter l’édition'],
        [['Ctrl', 'Z'], 'Annuler · avec Maj : rétablir'],
      ],
    ],
    [
      'Pages',
      [
        [['Alt', '1…9'], 'Aller à la page n'],
        [['[', ']'], 'Page précédente / suivante'],
        [['Ctrl', 'B', 'puis 1…9'], 'Préfixe tmux : page n'],
        [['Ctrl', 'B', 'n / p'], 'Suivante / précédente'],
        [['Ctrl', 'B', 'c'], 'Nouvelle page'],
        [['Ctrl', 'B', ','], 'Renommer la page'],
        [['Ctrl', 'B', 'x'], 'Fermer la page'],
      ],
    ],
    [
      'Recherche',
      [
        [['↓', 'Tab'], 'Choisir un favori proposé'],
        [['↵'], 'Chercher, ou ouvrir l’adresse tapée'],
        [['Ctrl', '↵'], 'Dans un nouvel onglet'],
        [['!g', '!gh', '!y'], 'Bang : un autre moteur pour une recherche'],
      ],
    ],
  ];
</script>

<Dialog open={ui.help} onclose={() => (ui.help = false)} title="Raccourcis clavier" wide>
  <div class="groups">
    {#each groups as [title, rows] (title)}
      <section>
        <h3 class="meta">{title}</h3>
        <dl>
          {#each rows as [ks, label] (label)}
            <dt>
              {#each ks as k (k)}<kbd>{k}</kbd>{/each}
            </dt>
            <dd>{label}</dd>
          {/each}
        </dl>
      </section>
    {/each}
  </div>
</Dialog>

<style>
  .groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--space-6);
  }
  h3 {
    color: var(--accent);
    margin-bottom: var(--space-3);
  }
  dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-3) var(--space-4);
    align-items: center;
  }
  dt {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  dd {
    margin: 0;
    font-size: var(--fs-small);
    color: var(--text-secondary);
  }
</style>
