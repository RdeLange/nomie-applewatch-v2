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
  { value: 'none', text: 'None' },
  { value: 'last10d', text: 'Last 10 Days' },
  { value: 'last20d', text: 'Last 20 Days' },
  { value: 'last30d', text: 'Last 30 Days' },
] as const;

// The number of days a discovery choice looks back, or 0 for none
export const discoveryDays = (selection: string): number => {
  if (selection === 'last10d') return 10;
  if (selection === 'last20d') return 20;
  if (selection === 'last30d') return 30;
  return 0;
};
