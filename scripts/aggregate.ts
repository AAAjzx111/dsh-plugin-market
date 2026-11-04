// Aggregates every plugin descriptor in plugins/*.json into plugins.json.
// Descriptors are sorted by filename so output order is deterministic.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeRange, validateRelationship } from './version-range.js';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginsDir = join(repoRoot, 'plugins');
const outFile = join(repoRoot, 'plugins.json');

const files = readdirSync(pluginsDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

const plugins = files.map((f) => {
  const raw = readFileSync(join(pluginsDir, f), 'utf8');
  try {
    const plugin = JSON.parse(raw) as {
      id: string;
      support_versions?: unknown;
      relationship?: { id: string; versions?: unknown }[];
    };
    normalizeRange(plugin.support_versions, `${plugin.id}.support_versions`);
    for (const [index, relation] of (plugin.relationship ?? []).entries()) {
      validateRelationship(relation, `${plugin.id}.relationship[${index}].versions`);
    }
    return plugin;
  } catch (error) {
    throw new Error(`Failed to parse ${f}: ${error instanceof Error ? error.message : String(error)}`);
  }
});

writeFileSync(outFile, `${JSON.stringify(plugins, null, 2)}\n`, 'utf8');
console.log(`Aggregated ${plugins.length} plugin(s) into plugins.json`);
