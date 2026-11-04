import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const compiledDir = dirname(fileURLToPath(import.meta.url));

function fixture() {
  // Keep fixtures beneath the checkout so Node can resolve the installed semver.
  const root = mkdtempSync(join(compiledDir, 'aggregate-fixture-'));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'plugins'));
  writeFileSync(join(root, 'package.json'), '{"type":"module"}');
  for (const file of ['aggregate.js', 'version-range.js']) {
    copyFileSync(join(compiledDir, file), join(root, 'scripts', file));
  }
  return root;
}

function run(root: string) {
  return spawnSync(process.execPath, [join(root, 'scripts', 'aggregate.js')], {
    cwd: tmpdir(),
    encoding: 'utf8',
  });
}

test('aggregation sorts filenames, preserves descriptor fields and works outside the repo cwd', (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const first = { id: 'first', support_versions: '[1.0.0,)', custom: { keep: true } };
  const second = { id: 'second', relationship: [{ id: 'github:foo/bar', versions: 'abcdefa' }] };
  writeFileSync(join(root, 'plugins', 'z.json'), JSON.stringify(second));
  writeFileSync(join(root, 'plugins', 'a.json'), JSON.stringify(first));
  writeFileSync(join(root, 'plugins', 'ignored.txt'), 'not json');
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(root, 'plugins.json'), 'utf8'), `${JSON.stringify([first, second], null, 2)}\n`);
  assert.match(result.stdout, /Aggregated 2 plugin\(s\)/);
});

test('invalid ranges include descriptor context and do not overwrite existing output', (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'plugins', 'bad.json'), JSON.stringify({ id: 'bad', support_versions: '[2.0.0,1.0.0]' }));
  writeFileSync(join(root, 'plugins.json'), 'existing output\n');
  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Failed to parse bad\.json: bad\.support_versions:/);
  assert.equal(readFileSync(join(root, 'plugins.json'), 'utf8'), 'existing output\n');
});
