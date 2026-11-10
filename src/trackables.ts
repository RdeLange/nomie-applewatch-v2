// The trackables the watch can use, as plain rules. The shapes and the order are the same as in v1.
export type Entry = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  defaultvalue: unknown;
  include: unknown;
  label: string;
  min: unknown;
  max: unknown;
  tag: string;
  type: string;
  uom: unknown;
  note: unknown;
  picks: unknown;
};

// The reply of Nomie's getTrackable: the request id and the trackable (null when Nomie does not have it)
export type Reply = { id: string; trackable: any } | null;
export type Lookup = (tag: string) => Promise<Reply>;

export const PERSON_EMOJI = '😎';

const tracker = (t: any): Omit<Entry, 'id' | 'name' | 'tag' | 'type'> => ({
  emoji: t.emoji,
  color: t.color,
  defaultvalue: t.default,
  include: t.include,
  label: t.label,
  min: t.min,
  max: t.max,
  uom: t.uom,
  note: t.note,
  picks: t.picks,
});

const PERSON_BLANKS = { color: '', defaultvalue: '', include: '', min: '', max: '', uom: '', note: '', picks: '' };

// A tracker as the discovery and the add dialog list it
export const trackerEntry = (id: string, t: any): Entry => ({
  id,
  name: t.label,
  tag: t.tag,
  type: t.type,
  ...tracker(t),
});

// A person as the add dialog lists them, tagged by username
export const personEntry = (id: string, p: { username: string; displayName: string }): Entry => ({
  id,
  name: p.displayName,
  emoji: PERSON_EMOJI,
  tag: p.username,
  type: 'person',
  label: p.displayName,
  ...PERSON_BLANKS,
});

// The custom and blacklist items are refreshed from Nomie. They carry username and displayName, as in v1.
// A custom or blacklist item, rebuilt from Nomie. The tag decides whether it is a tracker or a person.
export const refreshItem = (id: string, old: Entry, reply: { id: string; trackable: any }): Entry & { username: string; displayName: string } => {
  if (old.type === 'person') {
    const p = reply.trackable.person;
    return { id, name: p.displayName, username: reply.id, emoji: PERSON_EMOJI, displayName: p.displayName, tag: p.username, type: 'person', label: p.displayName, ...PERSON_BLANKS };
  }
  const t = reply.trackable.tracker;
  return { id, name: t.label, username: reply.id, displayName: t.label, tag: t.tag, type: t.type, ...tracker(t) };
};

// The tag Nomie is asked for: "#" for a tracker, "@" for a person, unless the tag already has one
export const lookupTag = (item: Pick<Entry, 'tag' | 'type'>): string => {
  if (item.tag.includes('#') || item.tag.includes('@')) return item.tag;
  return item.type === 'person' ? `@${item.tag}` : `#${item.tag}`;
};

// The list sent to the watch: the custom trackables first, then the discovered ones, each tag once.
// A blacklisted trackable is sent with "_blacklisted" added to its type, so the watch shows it as off.
// The entries are copied, so the saved lists keep their own types.
export const combineForSync = (custom: Entry[], discovered: Entry[], blacklist: Entry[]): Entry[] => {
  const combined: Entry[] = [];
  for (const item of [...custom, ...discovered]) {
    if (!combined.some((e) => e.tag === item.tag)) combined.push({ ...item });
  }
  for (const black of blacklist) {
    const index = combined.findIndex((e) => e.tag === black.tag);
    if (index >= 0) combined[index] = { ...combined[index], type: `${combined[index].type}_blacklisted` };
  }
  return combined;
};

// The trackables and people of the notes of the discovery period, each one looked up once
export const discover = async (
  notes: Array<{ elements: Array<{ type: string; id: string }> }>,
  lookup: Lookup,
  newId: () => string
): Promise<Entry[]> => {
  const seen = new Map<string, Entry>();
  for (const note of notes) {
    for (const element of note.elements.filter((e) => e.type === 'person' || e.type === 'tracker')) {
      if (seen.has(element.id)) continue;
      if (element.type === 'tracker') {
        const reply = await lookup(`#${element.id}`);
        if (!reply?.trackable?.tracker) continue;
        seen.set(element.id, trackerEntry(newId(), reply.trackable.tracker));
      } else {
        const reply = await lookup(`@${element.id}`);
        if (!reply?.trackable?.person) continue;
        seen.set(element.id, personEntry(newId(), { username: element.id, displayName: reply.trackable.person.displayName }));
      }
    }
  }
  return [...seen.values()];
};

// Refreshes the custom or blacklist items from Nomie. An item Nomie does not answer for is kept as it is.
export const refreshItems = async (items: Entry[], lookup: Lookup, newId: () => string) =>
  Promise.all(
    items.map(async (item) => {
      const reply = await lookup(lookupTag(item));
      return reply?.trackable ? refreshItem(newId(), item, reply as { id: string; trackable: any }) : item;
    })
  );
