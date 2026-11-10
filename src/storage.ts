import { t } from './i18n/index.svelte';
// The settings and selections, under the same storage keys as v1, so an upgrade keeps them.
import type { Connection } from './protocol';

export const DEFAULT_API_ADDRESS = 'https://api.dailynomie.com/log';
export const DEFAULT_AW_API_ADDRESS = 'https://awapi.dailynomie.com';

export type Settings = {
  apiAddress: string;
  apiKey: string;
  awApiAddress: string;
  awApiKey: string;
  syncOnStart: boolean;
};

// An empty address means the default, as in v1
export const connectionFrom = (settings: Settings): Connection => ({
  apiAddress: settings.apiAddress || DEFAULT_API_ADDRESS,
  apiKey: settings.apiKey,
  awApiAddress: settings.awApiAddress || DEFAULT_AW_API_ADDRESS,
  awApiKey: settings.awApiKey,
});

export const readSettings = (get: (key: string) => unknown): Settings => ({
  apiAddress: (get('apiaddress') as string) || '',
  apiKey: (get('apikey') as string) || '',
  awApiAddress: (get('awapiaddress') as string) || '',
  awApiKey: (get('awapikey') as string) || '',
  syncOnStart: !!get('synconstart'),
});

export const SELECTION_CHOICES = [
  { value: 'none', get text() { return t('none'); } },
  { value: 'last10d', get text() { return t('last10'); } },
  { value: 'last20d', get text() { return t('last20'); } },
  { value: 'last30d', get text() { return t('last30'); } },
] as const;

// The number of days a discovery choice looks back, or 0 for none
export const discoveryDays = (selection: string): number => {
  if (selection === 'last10d') return 10;
  if (selection === 'last20d') return 20;
  if (selection === 'last30d') return 30;
  return 0;
};
