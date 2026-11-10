<script lang="ts">
  import { t, setLanguage } from './i18n/index.svelte';
  import { onMount } from 'svelte';
  import { sync, load, changeSelection, addTrackables, removeItem, saveSelection, saveAndSync, saveSettings, launchSync } from './sync.svelte';
  import { SELECTION_CHOICES } from './storage';
  import { paletteFrom, glassFrom, type Palette, type Glass } from './palette';
  import { offerTracker } from './tracker-offer';
  import { onPrefsChange } from './prefs-live';


  const PLUGIN_USES = ['selectTrackables', 'searchNotes', 'getTrackable', 'onLaunch', 'getStorageItem', 'setStorageItem', 'alert', 'confirm', 'getTrackableUsage'];

  let view = $state<'main' | 'settings' | 'info'>('main');
  let palette = $state<Palette>(paletteFrom(undefined));
  let glass = $state<Glass>(glassFrom(undefined));
  let scale = $state(1);

  const applyNomieValues = (plugin: any) => {
    if (!plugin?.prefs) return;
    palette = paletteFrom(plugin.prefs);
    setLanguage(plugin.prefs?.language);
    glass = glassFrom(plugin.prefs);
    scale = plugin.prefs.fontScale || 1;
  };

  onMount(() => {
    const plugin = new NomiePlugin({
      name: 'Nomie Apple Watch',
      emoji: '⌚️',
      description: 'Apple Watch Hub Plugin to sync data to the Apple Watch App',
      uses: PLUGIN_USES,
      version: '2.0',
      addToCaptureMenu: true,
      addToMoreMenu: true,
      addToWidgets: false,
    });
    onPrefsChange(plugin, () => applyNomieValues(plugin));
  plugin.onRegistered(async () => {
      applyNomieValues(plugin);
      await load(plugin);
    });
    plugin.onUIOpened(async () => {
      view = 'main';
      applyNomieValues(plugin);
      offerTracker(plugin, { tag: 'watch', label: 'Apple Watch', emoji: '⌚️', color: '#8E8E93' });
      if (sync.ready) await changeSelection(sync.selection);
    });
    plugin.onLaunch(async () => {
      if (!sync.ready) await load(plugin);
      await launchSync();
    });
  });

</script>

<div class="card" style="--page: {palette.page}; --card: {palette.card}; --text: {palette.text}; --muted: {palette.textSecondary}; --line: {palette.separator}; --fill: {palette.fill}; --tint: {palette.tint}; --on-tint: {palette.onTint}; --tint-soft: {palette.tintSoft}; --good: {palette.good}; --glass-fill: {glass.fill}; --glass-edge: {glass.edge}; --glass-blur: {glass.blur}; --glass-shadow: {glass.shadow}; --scale: {scale};">
  <header class="top">
    <h1>⌚️ Apple Watch</h1>
    <nav class="tabs">
      <button class:on={view === 'main'} onclick={() => (view = 'main')}>{t('tabTrackables')}</button>
      <button class:on={view === 'settings'} onclick={() => (view = 'settings')}>{t('tabSettings')}</button>
      <button class:on={view === 'info'} onclick={() => (view = 'info')}>{t('tabInfo')}</button>
    </nav>
  </header>

  {#if sync.message}<p class="notice">{sync.message}</p>{/if}

  {#if view === 'main'}
    <section class="panel">
      <p class="label">{t('discovered')}</p>
      <div class="segments">
        {#each SELECTION_CHOICES as choice (choice.value)}
          <button class:on={sync.selection === choice.value} onclick={() => changeSelection(choice.value)}>{choice.text}</button>
        {/each}
      </div>
      <ul class="rows">
        {#each sync.discovered as item (item.tag)}
          <li>{item.emoji} {item.name}</li>
        {:else}
          <li class="muted">{t('nothingFound')}</li>
        {/each}
      </ul>
    </section>

    <section class="panel">
      <div class="head"><p class="label">{t('alwaysSync')}</p>
        <span class="actions">
          <button class="small" onclick={() => addTrackables('tracker', false)}>{t('addTrackable')}</button>
          <button class="small" onclick={() => addTrackables('person', false)}>{t('addPerson')}</button>
        </span>
      </div>
      <ul class="rows">
        {#each sync.custom as item (item.id)}
          <li><span>{item.emoji} {item.name}</span><button class="x" aria-label={t('removeName', { name: item.name })} onclick={() => removeItem(item.id, false)}>×</button></li>
        {:else}
          <li class="muted">{t('addHint')}</li>
        {/each}
      </ul>
    </section>

    <section class="panel">
      <div class="head"><p class="label">{t('neverSync')}</p>
        <span class="actions">
          <button class="small" onclick={() => addTrackables('tracker', true)}>{t('addTrackable')}</button>
          <button class="small" onclick={() => addTrackables('person', true)}>{t('addPerson')}</button>
        </span>
      </div>
      <ul class="rows">
        {#each sync.blacklist as item (item.id)}
          <li><span>{item.emoji} {item.name}</span><button class="x" aria-label={t('removeName', { name: item.name })} onclick={() => removeItem(item.id, true)}>×</button></li>
        {:else}
          <li class="muted">{t('nothingBlacklisted')}</li>
        {/each}
      </ul>
    </section>

    <div class="buttons">
      <button class="ghost" onclick={saveSelection} disabled={sync.busy}>{t('save')}</button>
      <button class="primary" onclick={() => saveAndSync()} disabled={sync.busy}>{sync.busy ? t('syncing') : t('saveSync')}</button>
    </div>
  {:else if view === 'settings'}
    <section class="panel fields">
      <p class="label">{t('apiHead')}</p>
      <label>{t('apiAddress')}<input bind:value={sync.settings.apiAddress} placeholder={t('apiAddressPh')} /></label>
      <label>{t('apiKey')}<input bind:value={sync.settings.apiKey} placeholder={t('apiKeyPh')} /></label>
      <p class="label">{t('awHead')}</p>
      <label>{t('awDomain')}<input bind:value={sync.settings.awApiAddress} placeholder={t('apiAddressPh')} /></label>
      <label>{t('awKey')}<input bind:value={sync.settings.awApiKey} placeholder={t('awKeyPh')} /></label>
      <label class="switch"><span>{t('syncOnStart')}</span><input type="checkbox" bind:checked={sync.settings.syncOnStart} /></label>
      <button class="primary" onclick={saveSettings}>{t('saveSettings')}</button>
    </section>
  {:else}
    <section class="panel">
      <p>{t('infoP1')}</p>
      <p class="muted">{t('infoP2')}</p>
    </section>
  {/if}
</div>

<style>
  .card { box-sizing: border-box; min-height: 100vh; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif; background: var(--page); color: var(--text); font-size: calc(16px * var(--scale)); line-height: 1.4; }
  /* the plugin page fills the frame, so the glass bar sits at the top edge */
  /* the app's text: its iOS font stack (main.css --ios-font), with the app's smoothing */
  :global(body) { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif; -webkit-font-smoothing: antialiased; --ios-font-rounded: ui-rounded, -apple-system, system-ui, sans-serif; }
  /* the header is a Liquid Glass bar (D-glass): the title and the tabs stay at the top, and the content scrolls under them */
  .top { position: sticky; top: 0; z-index: 2; display: flex; flex-direction: column; gap: 10px; margin: -16px -16px 12px; padding: 16px 16px 10px; background: var(--glass-fill); -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur); border-bottom: 1px solid var(--glass-edge); }
  h1 { margin: 0; font-size: calc(26px * var(--scale)); font-weight: 700; }
  .tabs { display: flex; gap: 6px; }
  .tabs button, .segments button, .small { padding: 8px 12px; border: 0; border-radius: 10px; background: var(--fill); color: var(--text); font: inherit; cursor: pointer; }
  .tabs button.on, .segments button.on { background: var(--tint-soft); color: var(--tint); font-weight: 600; }
  .panel { padding: 14px; border-radius: 16px; background: var(--card); margin-bottom: 12px; }
  .label { margin: 0 0 8px; font-size: calc(13px * var(--scale)); font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .head { display: flex; justify-content: space-between; align-items: center; }
  .head .label { margin: 0; }
  .actions { display: flex; gap: 6px; }
  .segments { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .rows { list-style: none; margin: 0; padding: 0; }
  .rows li { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-top: 1px solid var(--line); }
  .rows li:first-child { border-top: 0; }
  .x { border: 0; background: transparent; color: var(--muted); font-size: 20px; cursor: pointer; }
  .muted { color: var(--muted); }
  .notice { padding: 10px 14px; border-radius: 12px; background: var(--tint-soft); color: var(--tint); }
  .buttons { display: flex; gap: 8px; }
  .primary, .ghost { flex: 1; padding: 12px; border: 0; border-radius: 12px; font: inherit; font-weight: 600; cursor: pointer; }
  .primary { background: var(--tint); color: var(--on-tint); }
  .ghost { background: var(--fill); color: var(--text); }
  button:disabled { opacity: 0.45; cursor: default; }
  .fields label { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; font-size: calc(14px * var(--scale)); color: var(--muted); }
  .fields input { padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--page); color: var(--text); font: inherit; }
  .switch { flex-direction: row !important; justify-content: space-between; align-items: center; }
</style>
