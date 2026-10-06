// Reading a wallet configuration from the nodes of the JSON reader. Every field is read with the line and column of its
// key, so a finding can point at it. A field that is missing, of the wrong type or unknown is a finding of its own, and
// the value is left out of the checks that need it; nothing that was not read is taken for a value that is fine. Keys of
// the file are only compared with the names below; no object is built with a key from the file. A value that
// src/secrets.js marked as a seed or a key is left out as if it were not there, and never shown.

import { isArray, isNumber, isObject, isString } from './json.js';
import { ADDRESS_TYPES, NETWORKS, addressTypeOf, coinOf } from './coins.js';

export const CONFIG_LIMITS = { maxEntries: 1000, maxGapLimit: 1000000 };

export const TOP_KEYS = ['wallet', 'entries', 'notes'];
export const ENTRY_KEYS = ['name', 'coin', 'network', 'path', 'addressType', 'gapLimit', 'notes'];

const where = (e) => ({ line: e.line, column: e.column });

// A text from the file as a message names it: cut at a length, so that a long value does not fill a report.
export const cut = (text, max = 120) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);

// A known key that an unknown one is probably meant to be: the same letters in another case, or one that starts with the
// other.
export function suggestKey(key, known) {
  const k = key.toLowerCase();
  if (k.length < 3) return null;
  return known.find((n) => n.toLowerCase() === k) ?? known.find((n) => n.toLowerCase().startsWith(k) || k.startsWith(n.toLowerCase())) ?? null;
}

const describe = (node) => (node.secret ? 'a value that is not shown' : node.kind === 'object' ? 'an object' : node.kind === 'array' ? 'a list' : node.kind === 'null' ? 'null' : node.kind === 'boolean' ? `${node.value}` : node.kind === 'number' ? `the number ${node.raw.length > 40 ? `${node.raw.slice(0, 37)}...` : node.raw}` : 'text');

// Reads the configuration from the root node: { config, findings, notes }.
export function readConfig(root, limits = CONFIG_LIMITS) {
  const findings = [];
  const notes = [];
  const add = (id, at, message, extra = {}) => findings.push({ id, line: at.line, column: at.column, message, ...extra });

  // The entries of an object, with a field-unknown finding for each key that is not in known, and the first entry of each
  // known key in a map. A key that names a seed or a key was reported by src/secrets.js and is passed over.
  function fields(obj, known, label) {
    const map = new Map();
    for (const e of obj.entries) {
      if (e.secret) continue;
      if (known.includes(e.key)) map.set(e.key, e);
      else {
        const near = suggestKey(e.key, known);
        add('field-unknown', where(e), `The key "${cut(e.key)}" of ${label} is not one the tool reads, so its value was left out of every check.${near ? ` Did you mean "${near}"?` : ''} The keys of ${label} are ${known.join(', ')}.`);
      }
    }
    return map;
  }

  // A text field: null when it is missing, empty, of another type or marked as a secret.
  function text(map, key, at, label, required, of = label) {
    const e = map.get(key);
    if (!e) {
      if (required) add('field-missing', at, `${label} has no ${key}.`);
      return { value: null, entry: null };
    }
    if (e.value.secret) return { value: null, entry: e };
    if (!isString(e.value)) {
      add('field-invalid', where(e), `The ${key} of ${of} is ${describe(e.value)}; it must be text.`);
      return { value: null, entry: e };
    }
    if (e.value.value.trim() === '') {
      add('field-invalid', where(e), `The ${key} of ${of} is empty.`);
      return { value: null, entry: e };
    }
    return { value: e.value.value, entry: e };
  }

  function readEntry(node, index) {
    const label = `entry ${index + 1}`;
    const map = fields(node, ENTRY_KEYS, label);
    const at = where(node);
    const Label = `Entry ${index + 1}`;
    const name = text(map, 'name', at, Label, true, label);
    const entry = { index, name: name.value, nameEntry: name.entry, title: name.value === null ? label : cut(name.value), line: node.line, column: node.column };
    const of = `entry ${entry.title}`;

    const coin = text(map, 'coin', at, Label, true, of);
    entry.coinText = coin.value;
    entry.coinEntry = coin.entry;
    entry.coin = coin.value === null ? null : coinOf(coin.value);

    const network = text(map, 'network', at, Label, true, of);
    entry.networkEntry = network.entry;
    entry.network = null;
    if (network.value !== null) {
      const v = network.value.trim().toLowerCase();
      if (NETWORKS.includes(v)) entry.network = v;
      else add('field-invalid', where(network.entry), `The network of ${of} is "${cut(network.value)}"; it must be ${NETWORKS.join(' or ')}.`);
    }

    const path = text(map, 'path', at, Label, true, of);
    entry.pathText = path.value;
    entry.pathEntry = path.entry;

    const type = text(map, 'addressType', at, Label, true, of);
    entry.addressTypeEntry = type.entry;
    entry.addressType = null;
    if (type.value !== null) {
      entry.addressType = addressTypeOf(type.value);
      if (!entry.addressType) add('field-invalid', where(type.entry), `The addressType of ${of} is "${cut(type.value)}", not one the tool knows; it must be one of ${ADDRESS_TYPES.map((t) => t.id).join(', ')}.`);
    }

    entry.gapLimit = null;
    entry.gapLimitEntry = map.get('gapLimit') ?? null;
    const g = entry.gapLimitEntry;
    if (g && !g.value.secret) {
      if (!isNumber(g.value) || !/^(?:0|[1-9][0-9]{0,6})$/.test(g.value.raw) || Number(g.value.raw) > limits.maxGapLimit) add('field-invalid', where(g), `The gapLimit of ${of} is ${describe(g.value)}; it must be a whole number from 0 to ${limits.maxGapLimit}.`);
      else entry.gapLimit = Number(g.value.raw);
    }

    const notesEntry = map.get('notes');
    if (notesEntry && !notesEntry.value.secret && !isString(notesEntry.value)) add('field-invalid', where(notesEntry), `The notes of ${of} are ${describe(notesEntry.value)}; they must be text.`);
    return entry;
  }

  if (!isObject(root)) {
    add('config-unreadable', root, `The file holds ${describe(root)}, not a wallet configuration; a configuration is one JSON object (docs/inputs.md). Nothing in the file was checked.`);
    return { config: null, findings, notes };
  }

  const top = fields(root, TOP_KEYS, 'the configuration');
  const start = where(root);
  const wallet = text(top, 'wallet', start, 'The configuration', true, 'the configuration');
  const config = { wallet: wallet.value, entries: [], entriesEntry: null, line: root.line, column: root.column };
  const notesEntry = top.get('notes');
  if (notesEntry && !notesEntry.value.secret && !isString(notesEntry.value)) add('field-invalid', where(notesEntry), `The notes of the configuration are ${describe(notesEntry.value)}; they must be text.`);

  const ee = top.get('entries');
  if (!ee) add('field-missing', start, 'The configuration has no entries; give the list of the accounts the wallet derives (docs/inputs.md).');
  else if (!isArray(ee.value)) add('field-invalid', where(ee), `The entries of the configuration are ${describe(ee.value)}; they must be a list of objects.`);
  else if (ee.value.items.length === 0) add('field-missing', where(ee), 'The entries of the configuration are an empty list; give at least one entry.');
  else {
    config.entriesEntry = ee;
    const items = ee.value.items;
    if (items.length > limits.maxEntries) add('field-invalid', where(ee), `The configuration has ${items.length} entries, more than the limit of ${limits.maxEntries}; only the first ${limits.maxEntries} were read.`);
    const seen = new Map();
    items.slice(0, limits.maxEntries).forEach((node, index) => {
      if (!isObject(node)) {
        add('field-invalid', node, `Entry ${index + 1} of the entries is ${describe(node)}; an entry is an object with a name, a coin, a network, a path and an addressType.`);
        return;
      }
      const entry = readEntry(node, index);
      if (entry.name !== null) {
        const key = entry.name.trim().toLowerCase();
        const first = seen.get(key);
        if (first) add('entry-duplicate', where(entry.nameEntry), `Entry ${index + 1} is named ${entry.title}, as is entry ${first.index + 1} at line ${first.nameEntry.line}; a finding cannot be traced to one of them.`, { entry: entry.name });
        else seen.set(key, entry);
      }
      config.entries.push(entry);
    });
  }
  return { config, findings, notes };
}
