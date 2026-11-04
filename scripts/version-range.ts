import semver from 'semver';

/** 将市场版本声明转换为 npm 范围，避免各调用方对区间边界作不同解释。 */
export function normalizeRange(value: unknown, context = '版本范围'): string {
  const fail = (message: string): never => { throw new Error(`${context}: ${message}`); };
  if (value === undefined || value === null) {
    return '*';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return fail('版本数组不能为空');
    }
    return value.map((version) => {
      if (typeof version !== 'string' || !semver.valid(version.trim())) {
        return fail(`无效版本 ${JSON.stringify(version)}`);
      }
      return `=${semver.valid(version.trim())}`;
    }).join(' || ');
  }
  if (typeof value !== 'string' || !value.trim()) {
    return fail('必须提供非空的范围字符串或版本数组');
  }
  return value.split(';').map((part) => {
    const text = part.trim();
    if (!text) {
      return fail('区间分段不能为空');
    }
    if (/^[[(]/.test(text)) {
      const match = /^([[(])\s*([^,]*)\s*,\s*([^,]*)\s*([)\]])$/.exec(text);
      if (!match) {
        return fail(`无效区间 ${text}`);
      }
      const [, left, rawLower, rawUpper, right] = match;
      const lower = rawLower.trim();
      const upper = rawUpper.trim();
      if ((!lower && left !== '(') || (!upper && right !== ')')) {
        return fail(`无界端点必须使用圆括号: ${text}`);
      }
      if ((lower && !semver.valid(lower)) || (upper && !semver.valid(upper))) {
        return fail(`区间端点必须是有效版本: ${text}`);
      }
      if (lower && upper) {
        const order = semver.compare(lower, upper);
        if (order > 0 || (order === 0 && (left !== '[' || right !== ']'))) {
          return fail(`区间为空或边界倒置: ${text}`);
        }
      }
      return [
        lower ? `${left === '[' ? '>=' : '>'}${lower}` : '',
        upper ? `${right === ']' ? '<=' : '<'}${upper}` : '',
      ].filter(Boolean).join(' ') || '*';
    }
    if (semver.validRange(text, { includePrerelease: true }) === null) {
      return fail(`无效 SemVer 范围 ${text}`);
    }
    return text;
  }).join(' || ');
}

/** 预发布版本参与范围比较，与官方市场的兼容性判断一致。 */
export function matchesRange(value: unknown, version: string): boolean {
  return semver.satisfies(version, normalizeRange(value), { includePrerelease: true });
}

/** GitHub 提交哈希只接受字符串，避免正则隐式转换数组或数字。 */
export function validateRelationship(relation: { id: string; versions?: unknown }, context: string): void {
  if (relation.id.startsWith('github:') && typeof relation.versions === 'string'
      && /^[a-f0-9]{7,40}$/i.test(relation.versions)) {
    return;
  }
  normalizeRange(relation.versions, context);
}
