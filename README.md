# dsh-new-workspace

English | [中文](#中文)

A DeepSeek Harness **Web** plugin that replaces “click Add workspace → system folder picker” with one unified **New workspace** dialog.

The workspace name stays at the top and is focused on open. Below it, a segmented control switches between **Add local folder** and **Clone Git repository**. v0.1 supports exactly one source at a time.

This package is **not published to npm yet**. Install from this GitHub repository or a local checkout. Do not treat this draft as a formal release.

## Install and try

Build once if you are using a local checkout:

```sh
npm install
npm run typecheck
npm run test
npm run build
```

Uninstall any same-hole plugin first (see [Compatibility](#compatibility)), then install into the Web profile:

```sh
# Local checkout (official plugin channel; forwards to pnpm)
dsh plugin --profile web add "file:$PWD"

# This repository / a specific branch (preferred while unpublished)
dsh plugin --profile web add "github:wzc520pyfm/dsh-new-workspace#feat/v0.1-new-workspace-dialog"
```

Restart `dsh web` after a bundle install. Then click **Add workspace** in the sidebar or the conversation hero: the New workspace dialog should open instead of the system picker.

To remove:

```sh
dsh plugin --profile web remove dsh-new-workspace
```

Uninstalling this plugin does not disable official packages. The official `-native` / `-browse` directory flow should become active again.

If a git install asks you to allow a `prepare` build, that is pnpm’s git-dependency hook for compiling TypeScript. This repository also ships `lib/` so a prebuilt checkout can load without that allowance. Only allow builds for sources you trust, and prefer pinning a commit SHA.

## What it does

- **Local folder.** Type a workspace name and confirm to create a same-named folder under the default location, then hand that path back through the official `onPicked(path)` conversation so DSH registers the workspace and opens a session. You can type or browse a location, pick an existing folder, or (when the Host exposes a native chooser) use the system picker as an extra control. Name-only and clone do **not** depend on the system picker, so remote browsers still work.
- **Clone Git repository.** URL (HTTPS or SSH), parent directory, folder name (inferred from the URL, editable), and an optional branch. Authentication is delegated to system git (SSH agent, configured credential helpers). Interactive prompts are disabled so the process cannot hang waiting for a TTY. There is no GitHub account binding, OAuth, or token manager in this plugin.
- **Cancel leaves no trace.** Cancel, Escape, or a backdrop click does not create an empty folder, leave a partial clone, change the saved default location, or register a workspace.
- **Existing workspaces.** If the target path is already registered, the primary action is **Open existing workspace**.
- **English-first UI**, switchable to Chinese in the dialog. Paths, URLs, branch names, and raw git errors are left in their original form.

### Default location

1. A saved **New workspace location** (persisted in `$DSH_HOME/dsh-new-workspace/settings.json` under the key `newWorkspaceLocation`; `$DSH_HOME` defaults to `~/.dsh`).
2. Otherwise the parent of the official first-use workspace: `<Documents>/deepseek-harness/`, alongside `default-workspace`, not inside it.
3. If the official default workspace cannot be resolved, the same `<Documents>/deepseek-harness/` path is used.
4. If Documents itself is unavailable, the dialog asks you to choose a location. It will **not** silently write under the home directory root.

The dialog previews the full path that will be created. A missing default directory is created only after you confirm.

### Clone behavior

- Destination already exists: the clone is refused and explained. Nothing is deleted or overwritten.
- Clone first lands in a private staging directory under the system temp dir; on success it is moved to the destination; on failure the staging dir is removed.
- Cancel aborts the request, attempts to stop the git process, and cleans staging / any incomplete destination. The workspace is not registered.
- If `git` is missing on the Host PATH, the dialog reports an error and points to https://git-scm.com/downloads. It does not hang.
- The on-disk folder always uses the **repository folder name**. The display name is the top **Workspace name** field, or the folder name when that field is empty. After official adoption, the plugin best-effort renames the workspace title; if that rename fails or its timing is wrong, the workspace still exists and the title stays the folder name.

## Compatibility

The official `@deepseek-ai/dsh-client-ui-workspace` package gives “Add workspace” to two `single` holes:

- `conversation.hero.workspace.directoryFlow`
- `sidebar.workspaces.directoryFlow`

Only one occupant of a `single` hole is rendered. This plugin occupies **both** holes. It is **not additive** with other plugins that take the same holes. Uninstall these first:

- [lanfeng97/dsh-workspace-create-dialog](https://github.com/lanfeng97/dsh-workspace-create-dialog)
- [leonardoxr/dsh-workspace-git](https://github.com/leonardoxr/dsh-workspace-git)
- [wilsonchengassistant/dsh-quick-workspace](https://github.com/wilsonchengassistant/dsh-quick-workspace)
- [skylarking/dsh-plugin-workspace-multi](https://github.com/skylarking/dsh-plugin-workspace-multi)
- [WilliamShi666/dsh-wsl-workspace-picker](https://github.com/WilliamShi666/dsh-wsl-workspace-picker)
- the npm package `dsh-workspace-quick-create`
- any other plugin that occupies the same `directoryFlow` holes

The dialog shows a persistent (non-dismissible) warning when it can detect another non-official occupant, or when inventory lists a known incompatible package. If occupant identity cannot be read, the README incompatibility list is the source of truth.

**[tkwkeven/dsh-tool-github](https://github.com/tkwkeven/dsh-tool-github) can coexist.** It does not occupy `directoryFlow`. This dialog is the generic new-workspace flow; that panel is a GitHub-account-bound entry. v0.1 does not force mutual exclusion.

### Priority

Official `-native` / `-browse` registrations omit `priority`, and the official slot runtime treats a missing priority as **0**. Omitting priority here would collide with the official occupant and throw `already has a registration`. This plugin therefore registers at **priority `-110`**: lower than official `0`, and different from the common community values `-10` and `-100`, so it should shadow the official picker without a same-value throw against those typical community plugins.

If another plugin also registers at exactly `-110`, the slot runtime will throw. If another plugin registers at a still lower priority, that plugin wins; uninstall it. These outcomes are implied by the official `SlotCore.register` contract; they have not been re-validated against every community plugin in a live DSH session.

## Limits and unverified items

Do not read the following as already verified in a live product session:

- **`ctx.slots.entries(hole)` package identity.** Official entries expose an optional `registrant` and `priority`. Whether every community plugin sets `registrant` to a package name is unverified. When identity cannot be read, the warning is generic and this README lists the incompatibilities.
- **Rename timing after `onPicked(path)`.** Official adoption registers the workspace from the path only (`createWorkspace({ path })`). This plugin then tries to rename to the typed display name after the workspace appears in `useWorkspaces`. The durable moment when rename is safe is unverified. If rename fails, the workspace remains and the title falls back to the folder name.
- **Killing a Host-side git process on cancel.** The Host aborts the HTTP request, sends SIGTERM then SIGKILL to the spawned `git` process, and deletes the staging directory. Whether this always reaps a grandchild git/ssh process on every OS is unverified. Residual incomplete files should still be under the private staging dir or removed as a destination that this plugin created; already-existing destinations are never deleted.
- **Native `pick` vs in-app `list` / `createDirectory`.** Official Remote verbs require the composed directory-picker capability (`native` for pick, `browse` for list/create). A Host that only composed one backend will refuse the other verb. The dialog keeps typed paths and, when list/create are refused, falls back to Host mkdir/stat routes. The system picker is hidden or explained when unavailable (typical for remote browsers).
- Official Documents lookup uses `xdg-user-dir` on Linux and the system Documents folder elsewhere. This plugin follows that documented policy; it does not call `workspaces.initializeDefault()` just to discover the path.

Out of scope for v0.1: multiple source folders, GitHub OAuth / account binding / token management, merging dialogs with other same-hole plugins, and shipping this feature inside session-rail / dsh-worktrunk / dsh-suggest-card.

## Development

```sh
npm install
npm run typecheck
npm run test
npm run build
```

License: MIT.

---

## 中文

这是一款 DeepSeek Harness **Web** 插件：把「一点添加工作区就弹出系统选文件夹框」换成统一的 **新建工作区** 弹窗。

顶部始终是「工作区名称」，打开时自动获焦；下方用来源分段在「添加本机文件夹」与「Clone Git 仓库」之间切换。v0.1 只支持一个来源。

**尚未发布到 npm。** 请从本 GitHub 仓库或本地目录安装。不要把当前草稿当成正式发版。

### 安装与试用

若使用本地目录，请先构建：

```sh
npm install
npm run typecheck
npm run test
npm run build
```

请先卸载其他同样占用 directoryFlow 洞的插件（见上文 Compatibility），再安装到 Web profile：

```sh
dsh plugin --profile web add "file:$PWD"
dsh plugin --profile web add "github:wzc520pyfm/dsh-new-workspace#feat/v0.1-new-workspace-dialog"
```

安装 bundle 后重启 `dsh web`。点击侧栏或 hero 中的「添加工作区」，应打开本弹窗而不是系统选择框。

卸载：

```sh
dsh plugin --profile web remove dsh-new-workspace
```

卸载本插件不会主动禁用官方包，官方 `-native` / `-browse` 流程应能恢复。

### 行为摘要

- 只填名称并确认：在默认「新建位置」下创建同名文件夹，再通过官方 `onPicked(path)` 交回路径，由官方注册并打开会话。名称必须是单一路径段，不能含分隔符，不能是 `.` 或 `..`。
- 可改并保存新建位置（存储键 `newWorkspaceLocation`，文件 `$DSH_HOME/dsh-new-workspace/settings.json`）。也可选择已有文件夹；名称为空则用文件夹名，已填名称则作为显示名（注册后尽力改名，失败则标题回退为文件夹名，工作区仍在）。
- 未设定时，默认落在官方 `default-workspace` 的父目录 `<Documents>/deepseek-harness/`，与它并排而不是建在里面。解析不到再回退同一路径；连 Documents 都不可用则请你自选，不会暗默写到家目录根下。
- 取消（按钮 / Esc / 点遮罩）不留痕迹。
- Clone：仓库 URL（HTTPS / SSH）、父目录、文件夹名（默认从 URL 去掉 `.git` 推断）、可选分支。目的地已存在则拒绝，不删不覆盖。先克隆到私有暂存目录，成功再搬入目的地；失败或取消会清理暂存。认证委托系统 git；禁用交互式提示。本机没有 git 时明确报错并给出安装指引。
- 界面英文优先，可在弹窗内切到中文。路径、URL、分支名和 git 原生报错保留原文。
- 与同样占用上述两个洞的插件不兼容，不是功能叠加。请先卸载上文清单中的插件。`dsh-tool-github` 不占 directoryFlow，可以并存：本弹窗是通用新建，该面板是绑定 GitHub 账号后的入口。
- 本插件以 priority `-110` 注册，低于官方默认 `0`，并避开社区常见的 `-10` / `-100`，以免与官方同值报错。此项依据官方 slots 运行时合同，并未对每个社区插件做实机逐一核验。

待核验项（不要当成已验证）：`entries()` 是否稳定露出包名、`onPicked` 之后改显示名的稳妥时机、取消时能否可靠杀掉 Host 侧 git 子进程。做不到时已降级，并在上文英文 Limits 一节说明。
