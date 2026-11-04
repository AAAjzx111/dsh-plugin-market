import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesRange, normalizeRange, validateRelationship } from './version-range.js';

test('多个区间取并集并保留端点与间隙', () => {
  const range = '[0.1.0-rc.6,0.2.0-rc.1);[0.2.1-rc.4,)';
  assert.equal(normalizeRange(range), '>=0.1.0-rc.6 <0.2.0-rc.1 || >=0.2.1-rc.4');
  for (const version of ['0.1.0-rc.6', '0.1.5-rc.1', '0.2.1-rc.4', '0.3.0']) {
    assert.equal(matchesRange(range, version), true, version);
  }
  for (const version of ['0.1.0-rc.5', '0.2.0-rc.1', '0.2.0', '0.2.1-rc.3']) {
    assert.equal(matchesRange(range, version), false, version);
  }
});

test('开闭端点、无界端点和空白按范围解释', () => {
  assert.equal(matchesRange(' ( , 1.2.0 ] ; ( 2.0.0 , ) ', '1.2.0'), true);
  assert.equal(matchesRange('(2.0.0,)', '2.0.0'), false);
  assert.equal(matchesRange('[2.0.0,2.0.0]', '2.0.0'), true);
  assert.equal(matchesRange('(,)', '0.0.0-alpha.1'), true);
});

test('原有范围和版本数组仍能匹配预发布版本', () => {
  assert.equal(matchesRange('>=0.1.0-rc.6 <0.2.0-rc.1', '0.1.7-rc.2'), true);
  assert.equal(matchesRange('^1.2.0 || ~2.0.0', '2.0.4'), true);
  assert.equal(matchesRange(['1.0.0', '2.0.0-rc.1'], '2.0.0-rc.1'), true);
  assert.equal(matchesRange(['1.0.0', '2.0.0-rc.1'], '1.5.0'), false);
  assert.equal(matchesRange(undefined, '2.0.0-alpha.1'), true);
});

test('非法声明包含插件与字段上下文', () => {
  for (const value of ['', ';', '[1.0.0,2.0.0);', '[2.0.0,1.0.0]', '(1.0.0,1.0.0]', '[foo,)', '[,2.0.0)', '(1.0.0,]', [], ['foo'], 1]) {
    assert.throws(() => normalizeRange(value, 'foo.support_versions'), /foo\.support_versions/);
  }
});

test('关联版本的哈希声明严格区分字符串和其他类型', () => {
  validateRelationship({ id: 'github:foo/bar', versions: 'abcdefa' }, 'foo.relationship[0].versions');
  for (const versions of [1234567, ['abcdefa']]) {
    assert.throws(() => validateRelationship({ id: 'github:foo/bar', versions }, 'foo.relationship[0].versions'), /foo\.relationship\[0\]\.versions/);
  }
  validateRelationship({ id: 'foo', versions: ['1.0.0'] }, 'foo.relationship[0].versions');
});
