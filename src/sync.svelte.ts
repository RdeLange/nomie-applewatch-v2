// The state and the actions of the Apple Watch plugin. The screen only shows them.
import { syncApiKey, syncTrackables, type FetchFn } from './protocol';
import { connectionFrom, discoveryDays, readSettings, type Settings } from './storage';
import { combineForSync, discover, refreshItems, type Entry, type Lookup } from './trackables';

type Plugin = any;

class Sync {
  plugin: Plugin = null;
  settings = $state<Settings>({ apiAddress: '', apiKey: '', awApiAddress: '', awApiKey: '', syncOnStart: false });
  selection = $state('none');
  custom = $state<Entry[]>([]);
  blacklist = $state<Entry[]>([]);
  discovered = $state<Entry[]>([]);
  message = $state('');
  busy = $state(false);
  ready = $state(false);
}

export const sync = new Sync();

let counter = 0;
const newId = () => `aw${Date.now().toString(36)}${(counter++).toString(36)}`;
const lookupOf = (plugin: Plugin): Lookup => (tag) => plugin.getTrackable(tag);

// The entries as they are stored: the ids and the fields as v1 stored them
const save = () =>
  Promise.all([
    sync.plugin.storage.setItem('selection', sync.selection),
    sync.plugin.storage.setItem('custom', $state.snapshot(sync.custom)),
    sync.plugin.storage.setItem('blacklist', $state.snapshot(sync.blacklist)),
  ]);

export const saveSettings = async () => {
  const s = $state.snapshot(sync.settings);
  await Promise.all([
    sync.plugin.storage.setItem('apiaddress', s.apiAddress),
    sync.plugin.storage.setItem('apikey', s.apiKey),
    sync.plugin.storage.setItem('awapiaddress', s.awApiAddress),
    sync.plugin.storage.setItem('awapikey', s.awApiKey),
    sync.plugin.storage.setItem('synconstart', s.syncOnStart),
  ]);
  sync.message = 'Settings saved.';
};

export const load = async (plugin: Plugin) => {
  sync.plugin = plugin;
  await plugin.storage.init();
  const get = (key: string) => plugin.storage.getItem(key);
  sync.settings = readSettings(get);
  sync.selection = get('selection') || 'none';
  sync.custom = get('custom') || [];
  sync.blacklist = get('blacklist') || [];
  sync.ready = true;
  await recomputeDiscovery();
};

// The trackables of the notes in the chosen period. Nothing is discovered for "None".
export const recomputeDiscovery = async () => {
  const days = discoveryDays(sync.selection);
  if (!days) {
    sync.discovered = [];
    return;
  }
  const notes = await sync.plugin.searchNotes('', new Date(), days);
  const withItems = (notes || []).filter((note: any) => note.elements.some((e: any) => e.type === 'person' || e.type === 'tracker'));
  sync.discovered = await discover(withItems, lookupOf(sync.plugin), newId);
};

export const changeSelection = async (value: string) => {
  sync.selection = value;
  await recomputeDiscovery();
};

// Adds the trackables or people the user picks, unless the tag is already listed
const addTo = (list: Entry[], picked: Entry[]) => {
  for (const item of picked) if (!list.some((e) => e.tag === item.tag)) list.push(item);
  return list;
};

export const addTrackables = async (kind: 'tracker' | 'person', blacklisted: boolean) => {
  const picked = await sync.plugin.selectTrackables(kind);
  const items: Entry[] = (picked || []).map((p: any) =>
    kind === 'person'
      ? { id: newId(), name: p.person.displayName, emoji: '😎', tag: p.person.username, type: 'person', color: '', label: p.person.displayName, include: '', uom: '', min: '', max: '', defaultvalue: '', note: '', picks: '' }
      : { id: newId(), name: p.tracker.label, emoji: p.tracker.emoji, tag: p.tracker.tag, type: p.tracker.type, color: p.tracker.color, label: p.tracker.label, include: p.tracker.include, uom: p.tracker.uom, min: p.tracker.min, max: p.tracker.max, defaultvalue: p.tracker.default, note: p.tracker.note, picks: p.tracker.picks }
  );
  if (blacklisted) sync.blacklist = addTo([...sync.blacklist], items);
  else sync.custom = addTo([...sync.custom], items);
};

export const removeItem = (id: string, blacklisted: boolean) => {
  if (blacklisted) sync.blacklist = sync.blacklist.filter((e) => e.id !== id);
  else sync.custom = sync.custom.filter((e) => e.id !== id);
};

// Rebuilds the custom and blacklist items from Nomie, so their names and icons are current
export const refreshLists = async () => {
  sync.custom = await refreshItems(sync.custom, lookupOf(sync.plugin), newId);
  sync.blacklist = await refreshItems(sync.blacklist, lookupOf(sync.plugin), newId);
};

// Save only: the choices are stored, nothing is sent to the watch
export const saveSelection = async () => {
  await save();
  await recomputeDiscovery();
  await refreshLists();
  sync.message = 'Saved.';
};

// Sends the Nomie key to the Apple Watch API server, then the list of trackables, as v1 did
export const saveAndSync = async (fetchFn?: FetchFn) => {
  sync.busy = true;
  try {
    await save();
    await pushToWatch(fetchFn);
    sync.message = 'Saved & synced.';
  } catch (error) {
    sync.message = `The Apple Watch API server could not be reached. ${(error as Error).message}`;
  } finally {
    sync.busy = false;
  }
};

const pushToWatch = async (fetchFn?: FetchFn) => {
  const connection = connectionFrom($state.snapshot(sync.settings));
  await syncApiKey(connection, fetchFn);
  const trackables = combineForSync($state.snapshot(sync.custom), $state.snapshot(sync.discovered), $state.snapshot(sync.blacklist));
  await syncTrackables(connection, trackables, fetchFn);
};

// On launch, when sync on start is on: refresh, then save and sync
export const launchSync = async () => {
  if (!sync.ready) return;
  if (!sync.settings.syncOnStart) return;
  await recomputeDiscovery();
  await refreshLists();
  await saveAndSync();
};
