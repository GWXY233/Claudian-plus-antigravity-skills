# Antigravity Skill dropdown / 技能下拉菜单

Community fork based on upstream Claudian Plus **3.0.3**, commit
`43f370c2d4bcad0c68aafb3e21a3a910651e194a`. Fork release: **3.0.4**.
All upstream authorship and license notices are retained.

## 安装

1. 在 Obsidian 中安装并启用 BRAT。
2. 如果已经订阅 `wuyifan-code/Claudian-plus`，先在 BRAT 中移除该订阅。
   不需要卸载 Plus 或删除插件数据。
3. 添加仓库 `GWXY233/Claudian-plus-antigravity-skills`，选择 `3.0.4` 或 latest。
4. 重新加载 Claudian Plus，选择 Antigravity，并配置已登录的官方 `agy` CLI。

也可从 Releases 下载 `main.js`、`manifest.json`、`styles.css`，放入笔记库的
`.obsidian/plugins/claudian-plus/`，然后重新加载插件。
插件 ID 保持 `claudian-plus`，以便继续使用已有配置和会话。

## 使用

在 Antigravity 输入框输入 `/` 即可打开菜单。继续输入技能名或描述可筛选；
鼠标点击或方向键选择后，Enter / Tab 插入命令，再输入任务并发送。
选择技能本身不会发送消息。菜单沿用 Plus 的内置命令，技能也显示在同一列表中。

技能目录：

```text
<vault>/.agents/skills/<skill-name>/SKILL.md
<vault>/.agent/skills/<skill-name>/SKILL.md   # legacy
```

同名技能优先使用 `.agents`。`SKILL.md` 使用 YAML frontmatter，至少包含
`name`、`description` 和非空正文；名称应与目录匹配。
`user-invocable: false` 的技能不显示。读取失败或格式错误的技能会跳过。
仅放在 `.claude/skills` 中的技能不会列入 Antigravity 菜单。
添加或修改技能后，新建聊天标签或重新加载插件以刷新菜单缓存。

示例：

```markdown
---
name: note-helper
description: Organize an Obsidian note
---
Read the requested note and follow the user's instructions.
```

本补丁只扫描仓库技能目录，并插入 `/skill-name`。
技能展开和执行交给官方 CLI；没有新增账号登录或代理接口。

## Validation

- Official `agy` 1.3.2 on Windows: a test skill and `/obsidian-markdown` produced
  `expanded_commands` entries with type `skill` and successful responses.
- Obsidian 1.14.4: nine vault skills appeared; filtering and Enter insertion worked.
- Antigravity unit tests: 349 passed.
- Shared dropdown tests: 39 passed.
- TypeScript: passed; ESLint: zero errors (14 existing warnings).
- Architecture boundary checks: six passed; production build: passed.

## Build

Use Node.js 24 and the repository lockfile:

```sh
npm ci
npm run typecheck
npm run lint
node scripts/run-jest.js --runInBand tests/unit/providers/antigravity
node scripts/run-jest.js --runInBand --runTestsByPath tests/unit/shared/components/SlashCommandDropdown.test.ts tests/unit/shared/components/SlashCommandDropdown.provider.test.ts
npm run build
```

The generated `main.js`, `manifest.json`, and `styles.css` are the release assets.

## Updates

This fork publishes its own releases. BRAT latest checks this repository's releases;
it does not automatically incorporate upstream code changes. Switching back to
upstream releases removes this skill dropdown unless upstream has adopted it.
