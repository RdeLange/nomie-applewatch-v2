import { describe, expect, it } from 'vitest';
import { syncApiKey, syncTrackables, type Connection } from '../protocol';
import { connectionFrom, discoveryDays, readSettings } from '../storage';

const connection: Connection = { awApiAddress: 'https://awapi.example', awApiKey: 'aw-key', apiAddress: 'https://api.example/log', apiKey: 'nomie-key' };

// Records every request, so the tests can check the exact paths and bodies
const recorder = () => {
  const calls: Array<{ url: string; method: string; body: any; headers: any }> = [];
  const fetchFn = async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method!, body: JSON.parse(init.body as string), headers: init.headers });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  return { calls, fetchFn: fetchFn as any };
};

describe('the calls to the Apple Watch API server', () => {
  it('sends the Nomie key and address, with the key encoded as v1 did', async () => {
    const { calls, fetchFn } = recorder();
    await syncApiKey(connection, fetchFn);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://awapi.example/awsets4eapi');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers).toEqual({ 'content-type': 'application/json' });
    expect(calls[0].body).toEqual({
      api_key: 'aw-key',
      s4eapi_key: btoa('nomie-key'),
      s4eapi_url: 'https://api.example/log',
    });
  });

  it('sends the list of trackables, with the watch key', async () => {
    const { calls, fetchFn } = recorder();
    await syncTrackables(connection, [{ tag: 'mood' }], fetchFn);
    expect(calls[0].url).toBe('https://awapi.example/awsettrackable');
    expect(calls[0].body).toEqual({ api_key: 'aw-key', trackables: [{ tag: 'mood' }] });
  });
});

describe('the settings', () => {
  it('uses the default addresses when they are empty, as v1 did', () => {
    const settings = readSettings(() => '');
    const c = connectionFrom(settings);
    expect(c.apiAddress).toBe('https://api.dailynomie.com/log');
    expect(c.awApiAddress).toBe('https://awapi.dailynomie.com');
  });

  it('reads the same storage keys as v1', () => {
    const values: Record<string, unknown> = { apiaddress: 'a', apikey: 'k', awapiaddress: 'w', awapikey: 'wk', synconstart: true };
    expect(readSettings((key) => values[key])).toEqual({ apiAddress: 'a', apiKey: 'k', awApiAddress: 'w', awApiKey: 'wk', syncOnStart: true });
  });

  it('turns the discovery choice into days', () => {
    expect(discoveryDays('last10d')).toBe(10);
    expect(discoveryDays('last30d')).toBe(30);
    expect(discoveryDays('none')).toBe(0);
  });
});
