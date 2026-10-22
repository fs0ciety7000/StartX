<script lang="ts">
  import Footer from './components/Footer.svelte';
  import Help from './components/Help.svelte';
  import PageGrid from './components/PageGrid.svelte';
  import Picker from './components/Picker.svelte';
  import Settings from './components/Settings.svelte';
  import TmuxBar from './components/TmuxBar.svelte';
  import Toast from './components/Toast.svelte';
  import Topbar from './components/Topbar.svelte';
  import WidgetDrawer from './components/WidgetDrawer.svelte';
  import { activePage, app, ui } from './lib/config/store.svelte.ts';
  import { onGlobalKey, onTypeAhead } from './lib/keys.svelte.ts';

  $effect(() => {
    document.title = `${activePage().name} · StartX`;
  });
  $effect(() => {
    // Leaving edit mode closes what belongs to it.
    if (!ui.editing) ui.editingWidget = null;
  });
</script>

<svelte:window onkeydown={onGlobalKey} onkeydowncapture={() => {}} onkeyup={() => {}} />
<svelte:document onkeydown={onTypeAhead} />

<div class="app" class:bar={app.config.settings.statusBar}>
  <Topbar />
  <PageGrid />
  {#if app.config.settings.footer}<Footer />{/if}
</div>

{#if app.config.settings.statusBar}<TmuxBar />{/if}

<WidgetDrawer />
<Settings />
<Picker />
<Help />
<Toast />

<style>
  .app {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }
  .app.bar {
    padding-bottom: var(--bar-h);
  }
</style>
