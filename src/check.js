// A run: read the file, look for seeds and keys, read the configuration, run the checks and build the report object
// that the formats write.

import { analyzeConfig } from './analyze.js';
import { LEVELS, NOTICE, POINTS, pointPage } from './data.js';
import { FILE_LIMITS, InputError, displayPath, locateConfig, readConfigText } from './files.js';
import { JsonError, readJson } from './json.js';
import { readConfig } from './config.js';
import { RULES, decide, ruleById } from './rules.js';
import { findSecrets } from './secrets.js';
import { safeText } from './text.js';

export const LIMITS = { ...FILE_LIMITS };

export { InputError };

const clean = (t, max = 900) => safeText(t, max);

const ORDER = { error: 0, warning: 1, info: 2 };

// The basis of a rule: the points with their pages.
function basisOf(rule) {
  return rule.basis.map((id) => {
    const page = pointPage(id);
    return { text: POINTS[id].text, source: page.title, url: page.url };
  });
}

// The findings of a text, with no file system: { config, analysis, findings, notes }. config is null when the text is not
// a JSON object, and findings then holds one config-unreadable finding with its line.
export function checkText(text) {
  let root;
  try {
    root = readJson(text);
  } catch (error) {
    if (!(error instanceof JsonError)) throw error;
    return { config: null, analysis: null, findings: [{ id: 'config-unreadable', line: error.line, column: error.column, message: `The file is not JSON the reader can follow: ${error.message}. Nothing in the file was checked.` }], notes: ['the configuration was not checked, because the file is not JSON the reader can follow'] };
  }
  const secrets = findSecrets(root);
  const read = readConfig(root);
  if (!read.config) return { config: null, analysis: null, findings: [...secrets, ...read.findings], notes: ['the configuration was not checked, because the file holds no configuration object'] };
  const analysis = analyzeConfig(read.config);
  return { config: read.config, analysis, findings: [...secrets, ...read.findings, ...analysis.findings], notes: [...read.notes, ...analysis.notes] };
}

const lineCount = (text) => {
  const parts = text === '' ? [] : text.split(/\r\n|\r|\n/);
  return parts.length > 0 && parts.at(-1) === '' ? parts.length - 1 : parts.length;
};

// The wallet and its entries as the report shows them.
function walletOf(config) {
  if (!config) return null;
  const coins = [...new Set(config.entries.map((e) => (e.coin ? e.coin.id : e.coinText)).filter((c) => c !== null))];
  const networks = [...new Set(config.entries.map((e) => e.network).filter((n) => n !== null))];
  return { name: config.wallet === null ? null : clean(config.wallet, 200), entries: config.entries.length, coins: coins.map((c) => clean(c, 80)), networks };
}

// The table of entries.
function tableOf(analysis) {
  if (!analysis) return null;
  return analysis.rows.map((r) => ({
    entry: clean(r.entry, 120),
    coin: r.coin === null ? null : clean(r.coin, 80),
    network: r.network,
    addressType: r.addressType,
    path: r.path === null ? null : clean(r.path, 300),
    gapLimit: r.gapLimit
  }));
}

// The report object for the findings of a file.
export function buildReport({ file, checked, version, minSeverity = 'info', failOn = 'error' }) {
  const all = checked.findings.map((f) => {
    const rule = ruleById(f.id);
    return {
      id: f.id,
      severity: rule.severity,
      message: clean(f.message),
      file: file.file,
      line: f.line,
      column: f.column,
      at: `${file.file}:${f.line}`,
      entry: f.entry == null ? null : clean(f.entry, 120),
      fix: rule.fix,
      kind: rule.kind,
      basis: basisOf(rule),
      own: rule.own ?? null
    };
  });
  all.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.line - b.line || a.column - b.column || a.id.localeCompare(b.id, 'en'));
  const shown = all.filter((f) => LEVELS.indexOf(f.severity) >= LEVELS.indexOf(minSeverity));
  const byLevel = { error: 0, warning: 0, info: 0 };
  for (const f of shown) byLevel[f.severity] += 1;
  const allByLevel = { error: 0, warning: 0, info: 0 };
  for (const f of all) allByLevel[f.severity] += 1;
  return {
    tool: 'wallet-derivation-check',
    version,
    input: { file: file.file, bytes: file.bytes, lines: file.lines },
    wallet: walletOf(checked.config),
    totals: { findings: shown.length, byLevel, hidden: all.length - shown.length },
    rules: RULES.map((r) => ({ id: r.id, level: r.severity, kind: r.kind, findings: shown.filter((f) => f.id === r.id).length })),
    config: { minSeverity, failOn },
    findings: shown,
    table: tableOf(checked.analysis),
    notes: checked.notes.map((n) => clean(n)),
    notice: NOTICE,
    result: decide(allByLevel, failOn)
  };
}

export async function checkFile({ path, minSeverity = 'info', failOn = 'error', version, limits = LIMITS, base = process.cwd() }) {
  const absolute = await locateConfig(path, base);
  const { text, bytes } = await readConfigText(absolute, base, limits);
  const checked = checkText(text);
  const file = { file: displayPath(absolute, base), bytes, lines: lineCount(text) };
  return buildReport({ file, checked, version, minSeverity, failOn });
}
