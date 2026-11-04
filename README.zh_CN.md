<div align="center">

![Banner](./docs/banner.png)

# dsh-plugin-market

**DeepSeek Harness 结构化插件市场 —— 每个插件以 JSON 描述，自动聚合为单一 `plugins.json` 供 dsh-plugins.github.io 站点消费。**

[English](README.md) | 简体中文

</div>

## 目录结构

```
plugins/                  # 每个插件一个 JSON 描述文件
  dsh-plugins-<id>.json
scripts/
  aggregate.ts           # 聚合脚本：plugins/*.json → plugins.json
plugins.json              # 聚合产物（由 workflow 自动维护）
.github/workflows/
  aggregate.yml           # push 到 plugins/ 时聚合 + 通知站点仓库
```

## 插件描述格式

```jsonc
{
  "id": "@dsh-plugin/dsh-auxiliary",        // 插件唯一 id（npm 包名或 github:owner/repo）
  "name": "DSH Auxiliary",                  // 展示名
  "description": [                          // 多语言描述（可省略，或直接给字符串）
    { "language": "en-US", "content": "..." },
    { "language": "zh-CN", "content": "..." }
  ],
  "support_versions": ">=0.1.0-rc.6",       // 支持的 dsh 版本（semver range 或版本数组）
  "urls": {                                 // 项目链接（可省略）
    "homepage": "https://github.com/dsh-plugins/dsh-auxiliary",
    "repository": "https://github.com/dsh-plugins/dsh-auxiliary",
    "issues": "https://github.com/dsh-plugins/dsh-auxiliary/issues"
  },
  "relationship": [                         // 依赖/冲突关系（可省略）
    { "type": "dependency", "id": "@dsh-plugin/dsh-loader", "versions": ">=1.3.0" },
    { "type": "incompatibility", "id": "@dsh-plugin/dsh-auxiliary", "versions": "*" }
  ]
}
```

### 字段说明

- `id` — **必填**。插件唯一标识：npm 包名（`@scope/name`）或
  `github:owner/repo`。
- `name` — **必填**。人类可读的插件名。
- `description` — 可选。字符串或 `{language, content}[]` 多语言数组。
- `support_versions` — 可选。semver range 字符串（`>=0.1.0-rc.6`）、
  interval（`[0.1.0-rc.6, 0.1.1)`）或版本数组（`["0.1.0-rc.6","0.1.0-rc.7"]`）。
  缺省表示任意版本。
- `urls` — 可选。`{homepage, repository, issues}` 链接。
- `relationship` — 可选。`{type, id, versions}[]`，`type` ∈
  `dependency` | `incompatibility`，`versions` 为 semver range，
  `*` 表示任意版本。

### 版本号规则

`support_versions` 声明 DSH 版本，`relationship[].versions` 声明关联插件的版本。
两个字段均支持 SemVer 范围、精确版本数组和区间写法。GitHub 关联插件也可使用提交哈希。

多个区间必须使用 `;` 分隔，各区间取并集。例如
`[0.1.0-rc.6,0.2.0-rc.1);[0.2.1-rc.4,)` 表示支持第一段范围以及从
`0.2.1-rc.4` 开始的所有版本。`[`、`]` 包含端点，`(`、`)` 排除端点；
省略端点表示无界，无界端点必须使用圆括号。区间及端点两侧允许空白。
版本按 SemVer 顺序比较，预发布版本参与比较。

必须填写有效端点，禁止倒置边界、空区间和空分段；聚合时会报告插件与字段位置。
省略 `support_versions` 或使用 `*` 表示任意版本。

网站提供 `/api/dsh-plugins.json` 官方格式索引。网站每三小时读取市场目录、npm
发布标签和 GitHub 版本标签，更新精确安装版本；多区间转换为使用 `||` 的标准范围。
本地执行 `pnpm test` 和 `pnpm build` 验证并重新聚合目录。

## 工作流

1. 向 `plugins/` 新增或修改插件 JSON 并 push 到 `main`；
2. `aggregate.yml` 自动聚合出 `plugins.json` 并提交回仓库；
3. 通过 `repository_dispatch`（事件类型 `plugins-updated`）通知
   `dsh-plugins/dsh-plugins.github.io`；
4. 站点仓库的 `sync-plugins.yml` 拉取 `plugins.json`，生成两种格式的目录，
   并直接部署到 GitHub Pages。

> 通知站点仓库需要 `PLUGIN_MARKET_PAT`（一个拥有 `dsh-plugins.github.io`
> 仓库 `contents: write` 权限的 Personal Access Token），配置在仓库
> Settings → Secrets and variables → Actions。
>
> 创建步骤：GitHub → Settings → Developer settings → Personal access
> tokens → Fine-grained tokens → Generate new token → 仅勾选
> `dsh-plugins/dsh-plugins.github.io` 仓库，Repository permissions 里
> `Contents: Read and write` → 生成后复制 token → 在本仓库
> Settings → Secrets and variables → Actions → New repository secret
> 命名为 `PLUGIN_MARKET_PAT` 粘贴保存。
>
> 配置 `PLUGIN_MARKET_PAT` 后，每次向 `plugins/` 推送，站点仓库会自动
> 同步并部署，无需手动触发。

## 本地开发

使用 Node.js 22 或更新版本，以及 `package.json` 中指定的 pnpm 版本。

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

脚本与测试使用严格模式的 TypeScript，编译产物位于被 Git 忽略的 `dist/`
目录。`pnpm build` 仍将 `plugins.json` 写入仓库根目录，发布流程保持不变。
