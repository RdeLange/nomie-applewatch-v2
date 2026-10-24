import { describe, expect, it } from 'vitest';
import { combineForSync, discover, lookupTag, personEntry, refreshItems, trackerEntry, type Entry } from '../trackables';

let n = 0;
const newId = () => `id${++n}`;
const tracker = (tag: string, type = 'tick') => ({ tag, label: tag.toUpperCase(), emoji: '⭐', type, color: '#fff', include: '', uom: 'num', min: '', max: '', default: 1, note: '', picks: '' });
const entry = (tag: string, type = 'tick'): Entry => trackerEntry('x', tracker(tag, type));

describe('the list sent to the watch', () => {
  it('lists the custom trackables first, then the discovered ones, each tag once', () => {
    const custom = [entry('mood'), entry('sleep')];
    const discovered = [entry('sleep'), entry('walk')];
    expect(combineForSync(custom, discovered, []).map((e) => e.tag)).toEqual(['mood', 'sleep', 'walk']);
  });

  it('adds _blacklisted to a blacklisted trackable, and leaves the others alone', () => {
    const combined = combineForSync([entry('mood')], [entry('walk')], [entry('walk')]);
    expect(combined.find((e) => e.tag === 'walk')!.type).toBe('tick_blacklisted');
    expect(combined.find((e) => e.tag === 'mood')!.type).toBe('tick');
  });

  it('does not change the saved entries when it adds the suffix', () => {
    const custom = [entry('mood')];
    combineForSync(custom, [], [entry('mood')]);
    expect(custom[0].type).toBe('tick');
  });

  it('ignores a blacklisted trackable that is not in the list', () => {
    expect(combineForSync([], [], [entry('gone')])).toEqual([]);
  });
});

describe('the tags Nomie is asked for', () => {
  it('uses # for a tracker and @ for a person, and keeps a tag that has one', () => {
    expect(lookupTag({ tag: 'mood', type: 'tick' })).toBe('#mood');
    expect(lookupTag({ tag: 'anna', type: 'person' })).toBe('@anna');
    expect(lookupTag({ tag: '#mood', type: 'tick' })).toBe('#mood');
  });
});

describe('the people and trackables of the notes', () => {
  it('makes a person entry tagged by username, with the smiley', () => {
    expect(personEntry('p', { username: 'anna', displayName: 'Anna' })).toMatchObject({ tag: 'anna', type: 'person', emoji: '😎', name: 'Anna' });
  });

  it('discovers each trackable once, from the notes of the period', async () => {
    const notes = [{ elements: [{ type: 'tracker', id: 'mood' }, { type: 'person', id: 'anna' }] }, { elements: [{ type: 'tracker', id: 'mood' }] }];
    const lookups: string[] = [];
    const lookup = async (tag: string) => {
      lookups.push(tag);
      if (tag === '#mood') return { id: 'r1', trackable: { tracker: tracker('mood') } };
      return { id: 'r2', trackable: { person: { username: 'anna', displayName: 'Anna' } } };
    };
    const found = await discover(notes, lookup, newId);
    expect(lookups).toEqual(['#mood', '@anna']);
    expect(found.map((e) => e.tag)).toEqual(['mood', 'anna']);
  });
});

describe('refreshing the saved lists', () => {
  it('keeps an item Nomie does not answer for', async () => {
    const items = [entry('mood')];
    const result = await refreshItems(items, async () => null, newId);
    expect(result).toEqual(items);
  });

  it('rebuilds a tracker item from Nomie, with the username and displayName fields v1 wrote', async () => {
    const [item] = await refreshItems([entry('mood')], async () => ({ id: 'req', trackable: { tracker: tracker('mood') } }), newId);
    expect(item).toMatchObject({ username: 'req', displayName: 'MOOD', tag: 'mood', name: 'MOOD' });
  });
});
