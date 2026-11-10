window.__ModuleLoader__.load({
  id: "dsh-new-workspace",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    "use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/entry.tsx
var entry_exports = {};
__export(entry_exports, {
  apply: () => apply,
  detectConflicts: () => detectConflicts,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(entry_exports);
var import_react3 = __toESM(require("react"), 1);

// src/shared/types.ts
var PLUGIN_ID = "dsh-new-workspace";
var API_PREFIX = "/api/dsh-new-workspace";
var DIRECTORY_FLOW_PRIORITY = -110;
var DIRECTORY_FLOW_HOLES = [
  "conversation.hero.workspace.directoryFlow",
  "sidebar.workspaces.directoryFlow"
];
var INCOMPATIBLE_PACKAGES = [
  "dsh-workspace-create-dialog",
  "dsh-workspace-git",
  "dsh-quick-workspace",
  "dsh-plugin-workspace-multi",
  "dsh-wsl-workspace-picker",
  "dsh-workspace-quick-create"
];

// src/client/dialog.tsx
var import_react2 = __toESM(require("react"), 1);

// src/shared/paths.ts
function hostSep(samplePath) {
  if (/^[A-Za-z]:[\\/]/.test(samplePath) || samplePath.includes("\\") && !samplePath.includes("/")) return "\\";
  if (samplePath.includes("\\") && /^[A-Za-z]:/.test(samplePath)) return "\\";
  return "/";
}
function trimTrailingSeps(value) {
  return value.replace(/[\\/]+$/, "");
}
function joinHostPath(parent, name2) {
  const trimmed = trimTrailingSeps(parent);
  if (!trimmed) return name2;
  return `${trimmed}${hostSep(parent)}${name2}`;
}
function baseName(path) {
  const trimmed = trimTrailingSeps(path);
  const parts = trimmed.split(/[\\/]/);
  return parts[parts.length - 1] ?? trimmed;
}
function isSinglePathSegment(name2) {
  const value = name2.trim();
  if (!value) return false;
  if (value === "." || value === "..") return false;
  if (/[/\\]/.test(value) || value.includes("\0")) return false;
  return true;
}
function validateWorkspaceName(raw) {
  const name2 = raw.trim();
  if (!name2) return { ok: false, reason: "empty" };
  if (name2 === "." || name2 === "..") return { ok: false, reason: "dot" };
  if (/[/\\]/.test(name2) || name2.includes("\0")) return { ok: false, reason: "separator" };
  return { ok: true, name: name2 };
}
function pathsRoughlyEqual(left, right) {
  const norm = (value) => {
    const trimmed = trimTrailingSeps(value.replace(/\\/g, "/"));
    if (/^[A-Za-z]:/.test(trimmed)) return trimmed.toLowerCase();
    return trimmed;
  };
  return norm(left) === norm(right);
}
function looksFullyQualified(path) {
  const value = path.trim();
  if (!value) return false;
  if (value.startsWith("/")) return true;
  if (/^[A-Za-z]:[\\/]/.test(value)) return true;
  if (value.startsWith("\\\\")) return true;
  return false;
}

// src/shared/git-url.ts
var HTTPS = /^(https?|git|ssh):\/\//i;
var SCP = /^(?:git@|[^@\s]+@)[^:\s]+:\S+$/;
function isGitUrl(raw) {
  const value = raw.trim();
  if (!value) return false;
  if (HTTPS.test(value)) return true;
  if (SCP.test(value)) return true;
  return false;
}
function inferFolderFromGitUrl(raw) {
  const value = raw.trim();
  if (!value) return null;
  let rest = value.replace(/\/+$/, "");
  if (SCP.test(rest) && !HTTPS.test(rest)) {
    const colon = rest.indexOf(":");
    rest = colon >= 0 ? rest.slice(colon + 1) : rest;
  } else {
    try {
      const parsed = new URL(rest);
      rest = parsed.pathname;
    } catch {
      const cut = rest.replace(/^[a-z]+:\/\//i, "");
      const slash = cut.indexOf("/");
      rest = slash >= 0 ? cut.slice(slash + 1) : cut;
    }
  }
  rest = rest.replace(/\/+$/, "");
  if (rest.endsWith(".git")) rest = rest.slice(0, -4);
  rest = rest.replace(/\/+$/, "");
  const segments = rest.split(/[\\/]/).filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return null;
  let name2 = last;
  try {
    name2 = decodeURIComponent(last);
  } catch {
  }
  if (!isSinglePathSegment(name2)) return null;
  return name2;
}

// src/client/api.ts
var HostApiError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "HostApiError";
  }
};
async function post(path, payload = {}, signal) {
  const response = await fetch(`${API_PREFIX}/${path}`, {
    method: "POST",
    credentials: "same-origin",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  let value;
  try {
    value = await response.json();
  } catch {
    throw new HostApiError("invalid_response", `Request failed (${response.status})`);
  }
  if (!response.ok || !value.ok) {
    const error = value.ok ? void 0 : value.error;
    throw new HostApiError(error?.code ?? "request_failed", error?.message ?? `Request failed (${response.status})`);
  }
  return value.data;
}
var fetchDefaults = (signal) => post("defaults", {}, signal);
var fetchStat = (path, signal) => post("stat", { path }, signal);
var createHostDirectory = (path, signal) => post("mkdir", { path }, signal);
var saveSettings = (patch, signal) => post("settings", patch, signal);
var cloneRepository = (request, signal) => post("clone", request, signal);

// src/client/browse.tsx
var import_react = __toESM(require("react"), 1);

// src/client/i18n.ts
var en = {
  title: "New workspace",
  workspaceName: "Workspace name",
  workspaceNamePlaceholder: "Name this workspace",
  source: "Source",
  sourceLocal: "Add local folder",
  sourceClone: "Clone Git repository",
  location: "New workspace location",
  locationHelp: "Name-only workspaces are created here, alongside default-workspace \u2014 not inside it.",
  chooseLocation: "Browse\u2026",
  pickNative: "System picker\u2026",
  typePath: "Path",
  typePathPlaceholder: "Fully qualified directory path",
  useFolder: "Use existing folder",
  preview: "Will create",
  previewOpen: "Will open existing workspace",
  previewUseFolder: "Will add existing folder",
  locationMissing: "This location does not exist yet. It will be created only after you confirm.",
  documentsMissing: "The Documents folder could not be resolved. Choose a location \u2014 the plugin will not write under the home directory root.",
  nameInvalidSeparator: "The workspace name must be a single path segment and cannot contain / or \\.",
  nameInvalidDot: "The workspace name cannot be . or ..",
  nameRequired: "Enter a workspace name, or choose an existing folder.",
  create: "Create workspace",
  openExisting: "Open existing workspace",
  cloneAndAdd: "Clone and add",
  cancel: "Cancel",
  close: "Close",
  repoUrl: "Repository URL",
  repoUrlPlaceholder: "https://github.com/org/repo.git or git@github.com:org/repo.git",
  parentDirectory: "Parent directory",
  folderName: "Folder name",
  branch: "Branch (optional)",
  branchPlaceholder: "Leave empty to use the default branch",
  destPreview: "Clone destination",
  destExists: "The destination already exists. Choose a different folder name or parent directory. Existing files will not be deleted or overwritten.",
  urlRequired: "A repository URL is required.",
  urlInvalid: "Enter an HTTPS or SSH Git URL.",
  folderRequired: "A repository folder name is required.",
  parentRequired: "A parent directory is required.",
  cloning: "Cloning\u2026",
  creating: "Creating\u2026",
  gitMissing: "git was not found on the Host PATH. Install Git (https://git-scm.com/downloads) and restart DSH.",
  conflictTitle: "Another plugin is occupying Add workspace",
  conflictBody: "This plugin is incompatible with other plugins that take over the same directoryFlow holes. Uninstall them first, otherwise only the lowest-priority occupant is shown. This is not an additive combination.",
  conflictUnknown: "Another occupant was detected on the Add workspace holes, but its package name could not be read. Check the README incompatibility list and uninstall other directoryFlow plugins.",
  language: "Language",
  english: "English",
  chinese: "\u4E2D\u6587",
  browseTitle: "Choose a folder",
  browseHome: "Home",
  browseOpen: "Select",
  browseCancel: "Back",
  browseNewFolder: "New folder",
  browseCreate: "Create",
  browseLoading: "Loading\u2026",
  browseTruncated: "Too many folders to list; only the beginning is shown.",
  browseShowHidden: "Show hidden folders",
  browseEditPath: "Go",
  browseError: "This directory could not be listed.",
  browseCreateError: "The folder could not be created.",
  saveLocation: "Save as default location",
  locationSaved: "Default location saved.",
  nativeUnavailable: "The system folder picker is unavailable in this session (typical for remote browsers). Type a path or use in-dialog browse.",
  cancelled: "Cancelled.",
  genericError: "Something went wrong."
};
var zh = {
  title: "\u65B0\u5EFA\u5DE5\u4F5C\u533A",
  workspaceName: "\u5DE5\u4F5C\u533A\u540D\u79F0",
  workspaceNamePlaceholder: "\u4E3A\u5DE5\u4F5C\u533A\u547D\u540D",
  source: "\u6765\u6E90",
  sourceLocal: "\u6DFB\u52A0\u672C\u673A\u6587\u4EF6\u5939",
  sourceClone: "Clone Git \u4ED3\u5E93",
  location: "\u65B0\u5EFA\u4F4D\u7F6E",
  locationHelp: "\u53EA\u586B\u540D\u79F0\u65F6\uFF0C\u65B0\u6587\u4EF6\u5939\u4F1A\u5EFA\u5728\u6B64\u76EE\u5F55\u4E0B\uFF0C\u4E0E default-workspace \u5E76\u6392\uFF0C\u800C\u4E0D\u662F\u5EFA\u5728\u5B83\u91CC\u9762\u3002",
  chooseLocation: "\u6D4F\u89C8\u2026",
  pickNative: "\u7CFB\u7EDF\u9009\u62E9\u6846\u2026",
  typePath: "\u8DEF\u5F84",
  typePathPlaceholder: "\u5B8C\u6574\u7684\u7EDD\u5BF9\u8DEF\u5F84",
  useFolder: "\u4F7F\u7528\u5DF2\u6709\u6587\u4EF6\u5939",
  preview: "\u5C06\u521B\u5EFA",
  previewOpen: "\u5C06\u6253\u5F00\u5DF2\u6709\u5DE5\u4F5C\u533A",
  previewUseFolder: "\u5C06\u6DFB\u52A0\u5DF2\u6709\u6587\u4EF6\u5939",
  locationMissing: "\u8BE5\u4F4D\u7F6E\u5C1A\u4E0D\u5B58\u5728\u3002\u53EA\u6709\u5728\u4F60\u786E\u8BA4\u4E4B\u540E\u624D\u4F1A\u521B\u5EFA\u3002",
  documentsMissing: "\u65E0\u6CD5\u89E3\u6790 Documents \u76EE\u5F55\u3002\u8BF7\u81EA\u884C\u9009\u62E9\u4F4D\u7F6E\u2014\u2014\u63D2\u4EF6\u4E0D\u4F1A\u6697\u9ED8\u5199\u5230\u5BB6\u76EE\u5F55\u6839\u4E0B\u3002",
  nameInvalidSeparator: "\u5DE5\u4F5C\u533A\u540D\u79F0\u5FC5\u987B\u662F\u5355\u4E00\u8DEF\u5F84\u6BB5\uFF0C\u4E0D\u80FD\u5305\u542B / \u6216 \\\u3002",
  nameInvalidDot: "\u5DE5\u4F5C\u533A\u540D\u79F0\u4E0D\u80FD\u662F . \u6216 ..",
  nameRequired: "\u8BF7\u586B\u5199\u5DE5\u4F5C\u533A\u540D\u79F0\uFF0C\u6216\u9009\u62E9\u4E00\u4E2A\u5DF2\u6709\u6587\u4EF6\u5939\u3002",
  create: "\u521B\u5EFA\u5DE5\u4F5C\u533A",
  openExisting: "\u6253\u5F00\u5DF2\u6709\u5DE5\u4F5C\u533A",
  cloneAndAdd: "\u514B\u9686\u5E76\u6DFB\u52A0",
  cancel: "\u53D6\u6D88",
  close: "\u5173\u95ED",
  repoUrl: "\u4ED3\u5E93 URL",
  repoUrlPlaceholder: "https://github.com/org/repo.git \u6216 git@github.com:org/repo.git",
  parentDirectory: "\u7236\u76EE\u5F55",
  folderName: "\u6587\u4EF6\u5939\u540D",
  branch: "\u5206\u652F\uFF08\u53EF\u9009\uFF09",
  branchPlaceholder: "\u7559\u7A7A\u5219\u4F7F\u7528\u4ED3\u5E93\u9ED8\u8BA4\u5206\u652F",
  destPreview: "\u514B\u9686\u76EE\u7684\u5730",
  destExists: "\u76EE\u7684\u5730\u5DF2\u5B58\u5728\u3002\u8BF7\u6539\u7528\u5176\u4ED6\u6587\u4EF6\u5939\u540D\u6216\u7236\u76EE\u5F55\u3002\u4E0D\u4F1A\u5220\u9664\u6216\u8986\u76D6\u5DF2\u6709\u6587\u4EF6\u3002",
  urlRequired: "\u8BF7\u586B\u5199\u4ED3\u5E93 URL\u3002",
  urlInvalid: "\u8BF7\u8F93\u5165 HTTPS \u6216 SSH Git URL\u3002",
  folderRequired: "\u8BF7\u586B\u5199\u4ED3\u5E93\u6587\u4EF6\u5939\u540D\u3002",
  parentRequired: "\u8BF7\u586B\u5199\u7236\u76EE\u5F55\u3002",
  cloning: "\u6B63\u5728\u514B\u9686\u2026",
  creating: "\u6B63\u5728\u521B\u5EFA\u2026",
  gitMissing: "Host \u7684 PATH \u4E0A\u627E\u4E0D\u5230 git\u3002\u8BF7\u5B89\u88C5 Git\uFF08https://git-scm.com/downloads\uFF09\u540E\u91CD\u542F DSH\u3002",
  conflictTitle: "\u53E6\u4E00\u4E2A\u63D2\u4EF6\u6B63\u5728\u5360\u7528\u300C\u6DFB\u52A0\u5DE5\u4F5C\u533A\u300D",
  conflictBody: "\u672C\u63D2\u4EF6\u4E0E\u5176\u4ED6\u540C\u6837\u63A5\u7BA1 directoryFlow \u6D1E\u7684\u63D2\u4EF6\u4E0D\u517C\u5BB9\u3002\u8BF7\u5148\u5378\u8F7D\u5B83\u4EEC\uFF0C\u5426\u5219\u53EA\u4F1A\u663E\u793A\u4F18\u5148\u7EA7\u6700\u4F4E\u7684\u90A3\u4E00\u4E2A\u3002\u8FD9\u4E0D\u662F\u529F\u80FD\u53E0\u52A0\u3002",
  conflictUnknown: "\u68C0\u6D4B\u5230\u300C\u6DFB\u52A0\u5DE5\u4F5C\u533A\u300D\u6D1E\u4E0A\u8FD8\u6709\u5176\u4ED6\u5360\u5EA7\u8005\uFF0C\u4F46\u65E0\u6CD5\u8BFB\u51FA\u5176\u5305\u540D\u3002\u8BF7\u5BF9\u7167 README \u7684\u4E0D\u517C\u5BB9\u6E05\u5355\u5378\u8F7D\u5176\u4ED6 directoryFlow \u63D2\u4EF6\u3002",
  language: "\u8BED\u8A00",
  english: "English",
  chinese: "\u4E2D\u6587",
  browseTitle: "\u9009\u62E9\u6587\u4EF6\u5939",
  browseHome: "\u4E3B\u76EE\u5F55",
  browseOpen: "\u9009\u62E9",
  browseCancel: "\u8FD4\u56DE",
  browseNewFolder: "\u65B0\u5EFA\u6587\u4EF6\u5939",
  browseCreate: "\u521B\u5EFA",
  browseLoading: "\u52A0\u8F7D\u4E2D\u2026",
  browseTruncated: "\u6587\u4EF6\u5939\u8FC7\u591A\uFF0C\u4EC5\u663E\u793A\u5F00\u5934\u90E8\u5206\u3002",
  browseShowHidden: "\u663E\u793A\u9690\u85CF\u6587\u4EF6\u5939",
  browseEditPath: "\u8F6C\u5230",
  browseError: "\u65E0\u6CD5\u5217\u51FA\u8BE5\u76EE\u5F55\u3002",
  browseCreateError: "\u65E0\u6CD5\u521B\u5EFA\u8BE5\u6587\u4EF6\u5939\u3002",
  saveLocation: "\u4FDD\u5B58\u4E3A\u9ED8\u8BA4\u65B0\u5EFA\u4F4D\u7F6E",
  locationSaved: "\u5DF2\u4FDD\u5B58\u9ED8\u8BA4\u4F4D\u7F6E\u3002",
  nativeUnavailable: "\u5F53\u524D\u4F1A\u8BDD\u65E0\u6CD5\u4F7F\u7528\u7CFB\u7EDF\u9009\u62E9\u6846\uFF08\u8FDC\u7A0B\u6D4F\u89C8\u5668\u4E0A\u5E38\u89C1\uFF09\u3002\u8BF7\u624B\u586B\u8DEF\u5F84\u6216\u4F7F\u7528\u7A97\u5185\u6D4F\u89C8\u3002",
  cancelled: "\u5DF2\u53D6\u6D88\u3002",
  genericError: "\u51FA\u73B0\u95EE\u9898\u3002"
};
var dict = { en, zh };
function translate(locale, key) {
  return dict[locale][key] ?? dict.en[key];
}

// src/client/browse.tsx
function DirectoryBrowser(props) {
  const t = (key) => translate(props.locale, key);
  const [path, setPath] = (0, import_react.useState)(props.initialPath ?? "");
  const [typed, setTyped] = (0, import_react.useState)(props.initialPath ?? "");
  const [listing, setListing] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [showHidden, setShowHidden] = (0, import_react.useState)(false);
  const [newName, setNewName] = (0, import_react.useState)("");
  const [selected, setSelected] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const request = looksFullyQualified(path) ? path : void 0;
    void (async () => {
      try {
        if (!props.listDirectory) throw new Error(t("browseError"));
        const result = await props.listDirectory(request, controller.signal);
        if (controller.signal.aborted) return;
        setListing(result);
        setPath(result.path);
        setTyped(result.path);
        setSelected(result.path);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setListing(null);
        setError(reason instanceof Error ? reason.message : t("browseError"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [path, props.listDirectory]);
  const entries = (listing?.entries ?? []).filter((entry) => showHidden || !entry.hidden);
  async function createFolder() {
    const name2 = newName.trim();
    if (!isSinglePathSegment(name2) || !listing?.path) return;
    setError(null);
    try {
      let created;
      if (props.createDirectory) created = await props.createDirectory(listing.path, name2);
      else if (props.mkdir) {
        created = joinHostPath(listing.path, name2);
        await props.mkdir(created);
      } else throw new Error(t("browseCreateError"));
      setNewName("");
      setPath(created);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("browseCreateError"));
    }
  }
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "dnw-source" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "dnw-label" }, t("browseTitle")), /* @__PURE__ */ import_react.default.createElement("div", { className: "dnw-crumbs" }, listing?.home ? /* @__PURE__ */ import_react.default.createElement("button", { type: "button", onClick: () => setPath(listing.home) }, t("browseHome")) : null, (listing?.crumbs ?? []).map((crumb) => /* @__PURE__ */ import_react.default.createElement("span", { key: crumb.path }, /* @__PURE__ */ import_react.default.createElement("span", { "aria-hidden": "true" }, " / "), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", onClick: () => setPath(crumb.path) }, crumb.name)))), /* @__PURE__ */ import_react.default.createElement("div", { className: "dnw-row" }, /* @__PURE__ */ import_react.default.createElement("input", { className: "dnw-input", value: typed, onChange: (event) => setTyped(event.target.value), spellCheck: false, "aria-label": t("typePath") }), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "dnw-btn", onClick: () => looksFullyQualified(typed) ? setPath(typed.trim()) : setError(t("browseError")) }, t("browseEditPath"))), loading ? /* @__PURE__ */ import_react.default.createElement("div", { className: "dnw-hint" }, t("browseLoading")) : null, error ? /* @__PURE__ */ import_react.default.createElement("div", { className: "dnw-alert dnw-alert-error" }, error) : null, /* @__PURE__ */ import_react.default.createElement("div", { className: "dnw-list", role: "listbox" }, entries.map((entry) => /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      key: entry.path,
      type: "button",
      className: entry.hidden ? "dnw-hidden" : void 0,
      "aria-selected": selected === entry.path,
      onClick: () => setSelected(entry.path),
      onDoubleClick: () => setPath(entry.path)
    },
    entry.name
  ))), listing?.truncated ? /* @__PURE__ */ import_react.default.createElement("div", { className: "dnw-hint" }, t("browseTruncated")) : null, /* @__PURE__ */ import_react.default.createElement("label", { className: "dnw-hint" }, /* @__PURE__ */ import_react.default.createElement("input", { type: "checkbox", checked: showHidden, onChange: (event) => setShowHidden(event.target.checked) }), " ", t("browseShowHidden")), /* @__PURE__ */ import_react.default.createElement("div", { className: "dnw-row" }, /* @__PURE__ */ import_react.default.createElement("input", { className: "dnw-input", value: newName, onChange: (event) => setNewName(event.target.value), placeholder: t("browseNewFolder") }), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "dnw-btn", onClick: () => void createFolder(), disabled: !isSinglePathSegment(newName) }, t("browseCreate"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "dnw-footer" }, /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "dnw-btn", onClick: props.onCancel }, t("browseCancel")), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "dnw-btn dnw-btn-primary", onClick: () => selected && props.onSelect(selected), disabled: !selected }, t("browseOpen"))));
}

// src/client/workspaces.ts
function normalizeWorkspaces(snapshot) {
  if (!snapshot) return [];
  const rows = [];
  if (Array.isArray(snapshot)) rows.push(...snapshot);
  else if (typeof snapshot === "object") {
    const obj = snapshot;
    if (Array.isArray(obj.workspaces)) rows.push(...obj.workspaces);
    else if (Array.isArray(obj.items)) rows.push(...obj.items);
    else if (obj.byId && typeof obj.byId === "object") rows.push(...Object.values(obj.byId));
    else {
      for (const value of Object.values(obj)) {
        if (value && typeof value === "object" && ("path" in value || "directory" in value)) rows.push(value);
      }
    }
  }
  return rows.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const rec = item;
    const path = typeof rec.path === "string" ? rec.path : typeof rec.directory === "string" ? rec.directory : "";
    if (!path) return [];
    const id = typeof rec.id === "string" ? rec.id : typeof rec.workspaceId === "string" ? rec.workspaceId : path;
    return [{ id, path, title: typeof rec.title === "string" ? rec.title : void 0 }];
  });
}
function findWorkspace(rows, path) {
  return rows.find((row) => pathsRoughlyEqual(row.path, path));
}

// src/client/dialog.tsx
function NewWorkspaceDialog(props) {
  const [locale, setLocale] = (0, import_react2.useState)("en");
  const [source, setSource] = (0, import_react2.useState)("local");
  const [name2, setName] = (0, import_react2.useState)("");
  const [location, setLocation] = (0, import_react2.useState)("");
  const [existingFolder, setExistingFolder] = (0, import_react2.useState)(null);
  const [repoUrl, setRepoUrl] = (0, import_react2.useState)("");
  const [parentDirectory, setParentDirectory] = (0, import_react2.useState)("");
  const [folderName, setFolderName] = (0, import_react2.useState)("");
  const [folderTouched, setFolderTouched] = (0, import_react2.useState)(false);
  const [branch, setBranch] = (0, import_react2.useState)("");
  const [defaults, setDefaults] = (0, import_react2.useState)(null);
  const [status, setStatus] = (0, import_react2.useState)("idle");
  const [message, setMessage] = (0, import_react2.useState)(null);
  const [savedNote, setSavedNote] = (0, import_react2.useState)(null);
  const [browse, setBrowse] = (0, import_react2.useState)(null);
  const [locationExists, setLocationExists] = (0, import_react2.useState)(null);
  const [existingExists, setExistingExists] = (0, import_react2.useState)(null);
  const [parentExists, setParentExists] = (0, import_react2.useState)(null);
  const [destExists, setDestExists] = (0, import_react2.useState)(false);
  const [nativeHint, setNativeHint] = (0, import_react2.useState)(false);
  const nameRef = (0, import_react2.useRef)(null);
  const abortRef = (0, import_react2.useRef)(null);
  const opened = (0, import_react2.useRef)(false);
  const t = (key) => translate(locale, key);
  (0, import_react2.useEffect)(() => {
    if (!props.open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setStatus("idle");
      setBrowse(null);
      opened.current = false;
      return;
    }
    if (opened.current) return;
    opened.current = true;
    setSource("local");
    setName("");
    setExistingFolder(null);
    setRepoUrl("");
    setFolderName("");
    setFolderTouched(false);
    setBranch("");
    setMessage(null);
    setSavedNote(null);
    setStatus("idle");
    const controller = new AbortController();
    void fetchDefaults(controller.signal).then((value) => {
      setDefaults(value);
      if (value.locale === "en" || value.locale === "zh") setLocale(value.locale);
      setLocation(value.location ?? "");
      setParentDirectory(value.location ?? "");
    }).catch((error) => {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : t("genericError") });
    });
    const timer = window.setTimeout(() => nameRef.current?.focus(), 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [props.open]);
  (0, import_react2.useEffect)(() => {
    if (!props.open) return;
    const onKey = (event) => {
      if (event.key === "Escape" && status === "idle") {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, status]);
  (0, import_react2.useEffect)(() => {
    const inferred = inferFolderFromGitUrl(repoUrl);
    if (!folderTouched) setFolderName(inferred ?? "");
  }, [repoUrl, folderTouched]);
  (0, import_react2.useEffect)(() => {
    void statPath(location, setLocationExists);
  }, [location]);
  (0, import_react2.useEffect)(() => {
    void statPath(existingFolder, setExistingExists);
  }, [existingFolder]);
  (0, import_react2.useEffect)(() => {
    void statPath(parentDirectory, setParentExists);
  }, [parentDirectory]);
  (0, import_react2.useEffect)(() => {
    const dest = source === "clone" && parentDirectory && folderName ? joinHostPath(parentDirectory, folderName) : "";
    void statPath(dest || null, (exists) => setDestExists(Boolean(exists)));
  }, [source, parentDirectory, folderName]);
  const workspaces = props.workspaces;
  const localTarget = existingFolder || (name2.trim() && location ? joinHostPath(location, name2.trim()) : "");
  const registered = localTarget ? findWorkspace(workspaces, localTarget) : void 0;
  const cloneDest = source === "clone" && parentDirectory && folderName ? joinHostPath(parentDirectory, folderName) : "";
  const nameError = (0, import_react2.useMemo)(() => {
    if (!name2.trim()) return existingFolder ? null : source === "local" ? "nameRequired" : null;
    const result = validateWorkspaceName(name2);
    if (result.ok) return null;
    return result.reason === "dot" ? "nameInvalidDot" : result.reason === "separator" ? "nameInvalidSeparator" : "nameRequired";
  }, [name2, existingFolder, source]);
  if (!props.open) return null;
  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    props.onCancel();
  }
  async function persistLocation(path) {
    if (!looksFullyQualified(path)) return;
    try {
      await saveSettings({ newWorkspaceLocation: path });
    } catch {
    }
  }
  async function onPrimary() {
    setMessage(null);
    setSavedNote(null);
    if (source === "clone") {
      await runClone();
      return;
    }
    await runLocal();
  }
  async function runLocal() {
    if (existingFolder) {
      if (!looksFullyQualified(existingFolder)) {
        setMessage({ kind: "error", text: t("nameRequired") });
        return;
      }
      if (name2.trim()) {
        const result2 = validateWorkspaceName(name2);
        if (!result2.ok) {
          setMessage({ kind: "error", text: t(nameError ?? "nameInvalidSeparator") });
          return;
        }
      }
      finish(existingFolder, name2.trim() || baseName(existingFolder));
      return;
    }
    const result = validateWorkspaceName(name2);
    if (!result.ok) {
      setMessage({ kind: "error", text: t(nameError ?? "nameRequired") });
      return;
    }
    if (!looksFullyQualified(location)) {
      setMessage({ kind: "error", text: t("documentsMissing") });
      return;
    }
    setStatus("working");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const dest = joinHostPath(location, result.name);
      const already = await fetchStat(dest, controller.signal);
      if (already.exists && !already.isDirectory) {
        throw new Error(`The path exists and is not a directory: ${dest}`);
      }
      if (!already.exists) {
        if (locationExists === false) await createHostDirectory(location, controller.signal);
        if (props.createDirectory && locationExists !== false) {
          try {
            await props.createDirectory(location, result.name);
          } catch {
            await createHostDirectory(dest, controller.signal);
          }
        } else {
          await createHostDirectory(dest, controller.signal);
        }
      }
      await persistLocation(location);
      finish(dest, result.name);
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus("idle");
      setMessage({ kind: "error", text: error instanceof Error ? error.message : t("genericError") });
    }
  }
  async function runClone() {
    if (!repoUrl.trim()) {
      setMessage({ kind: "error", text: t("urlRequired") });
      return;
    }
    if (!isGitUrl(repoUrl)) {
      setMessage({ kind: "error", text: t("urlInvalid") });
      return;
    }
    if (!looksFullyQualified(parentDirectory)) {
      setMessage({ kind: "error", text: t("parentRequired") });
      return;
    }
    if (!isSinglePathSegment(folderName)) {
      setMessage({ kind: "error", text: t("folderRequired") });
      return;
    }
    if (destExists) {
      setMessage({ kind: "error", text: t("destExists") });
      return;
    }
    if (name2.trim()) {
      const result = validateWorkspaceName(name2);
      if (!result.ok) {
        setMessage({ kind: "error", text: t(nameError ?? "nameInvalidSeparator") });
        return;
      }
    }
    if (defaults && defaults.gitAvailable === false) {
      setMessage({ kind: "error", text: t("gitMissing") });
      return;
    }
    setStatus("working");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const cloned = await cloneRepository({
        url: repoUrl.trim(),
        parentDirectory: parentDirectory.trim(),
        folderName: folderName.trim(),
        ...branch.trim() ? { branch: branch.trim() } : {}
      }, controller.signal);
      await persistLocation(parentDirectory.trim());
      finish(cloned.path, name2.trim() || folderName.trim());
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus("idle");
      const text = error instanceof HostApiError && error.code === "git_missing" ? t("gitMissing") : error instanceof HostApiError && error.code === "destination_exists" ? t("destExists") : error instanceof Error ? error.message : t("genericError");
      setMessage({ kind: "error", text });
    }
  }
  function finish(path, displayName) {
    const registeredNow = findWorkspace(workspaces, path);
    props.onPicked(path);
    if (displayName && displayName !== baseName(path)) {
      void renameAfter(path, displayName, registeredNow);
    }
    setStatus("idle");
  }
  async function renameAfter(path, title, known) {
    if (!props.renameWorkspace) return;
    const started = Date.now();
    let row = known ?? findWorkspace(props.workspaces, path);
    while (!row && Date.now() - started < 8e3) {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      row = findWorkspace(normalizeWorkspaces(props.workspaces), path) ?? findWorkspace(props.workspaces, path);
    }
    if (!row?.id) return;
    try {
      await props.renameWorkspace(row.id, title);
    } catch {
    }
  }
  async function pickNative(target) {
    if (!props.pickDirectory) {
      setNativeHint(true);
      return;
    }
    try {
      const path = await props.pickDirectory();
      if (!path) return;
      applyBrowse(target ?? "location", path);
    } catch {
      setNativeHint(true);
    }
  }
  function applyBrowse(target, path) {
    setBrowse(null);
    if (target === "existing") setExistingFolder(path);
    else if (target === "parent") setParentDirectory(path);
    else {
      setLocation(path);
      setParentDirectory((prev) => prev || path);
      setExistingFolder(null);
    }
  }
  async function saveDefault() {
    const path = source === "clone" ? parentDirectory : location;
    if (!looksFullyQualified(path)) return;
    try {
      await saveSettings({ newWorkspaceLocation: path, locale });
      setSavedNote(t("locationSaved"));
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : t("genericError") });
    }
  }
  const working = status === "working" || props.busy;
  const primaryLabel = source === "clone" ? t("cloneAndAdd") : registered ? t("openExisting") : t("create");
  const previewPath = source === "clone" ? cloneDest : localTarget;
  const previewKind = registered ? "previewOpen" : existingFolder && existingExists ? "previewUseFolder" : "preview";
  return /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-root", role: "presentation" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-backdrop", onClick: () => {
    if (!working) cancel();
  } }), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "dnw-title", onClick: (event) => event.stopPropagation() }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-header" }, /* @__PURE__ */ import_react2.default.createElement("h2", { className: "dnw-title", id: "dnw-title" }, t("title")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-header-actions" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-lang", role: "group", "aria-label": t("language") }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", "aria-pressed": locale === "en", onClick: () => setLocale("en") }, t("english")), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", "aria-pressed": locale === "zh", onClick: () => setLocale("zh") }, t("chinese"))), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "dnw-icon-btn", onClick: () => {
    if (!working) cancel();
  }, "aria-label": t("close") }, "\xD7"))), props.conflictLabels.length > 0 || props.conflictUnknown ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-alert", role: "status" }, /* @__PURE__ */ import_react2.default.createElement("strong", null, t("conflictTitle")), props.conflictLabels.length > 0 ? `${t("conflictBody")} ${props.conflictLabels.join(", ")}` : t("conflictUnknown")) : null, /* @__PURE__ */ import_react2.default.createElement("label", { className: "dnw-field" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "dnw-label" }, t("workspaceName")), /* @__PURE__ */ import_react2.default.createElement("input", { ref: nameRef, className: "dnw-input", value: name2, onChange: (event) => setName(event.target.value), placeholder: t("workspaceNamePlaceholder"), disabled: working, autoFocus: true })), browse ? /* @__PURE__ */ import_react2.default.createElement(
    DirectoryBrowser,
    {
      locale,
      listDirectory: props.listDirectory,
      createDirectory: props.createDirectory,
      mkdir: async (path, signal) => {
        await createHostDirectory(path, signal);
      },
      initialPath: browse === "parent" ? parentDirectory : browse === "existing" ? existingFolder : location,
      onSelect: (path) => applyBrowse(browse, path),
      onCancel: () => setBrowse(null)
    }
  ) : /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-field" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "dnw-label" }, t("source")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-seg", role: "group" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", "aria-pressed": source === "local", disabled: working, onClick: () => setSource("local") }, t("sourceLocal")), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", "aria-pressed": source === "clone", disabled: working, onClick: () => setSource("clone") }, t("sourceClone")))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-source" }, source === "local" ? /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, existingFolder ? /* @__PURE__ */ import_react2.default.createElement("label", { className: "dnw-field" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "dnw-label" }, t("useFolder")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-row" }, /* @__PURE__ */ import_react2.default.createElement("input", { className: "dnw-input", value: existingFolder, onChange: (event) => setExistingFolder(event.target.value), spellCheck: false, disabled: working }), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "dnw-btn", disabled: working, onClick: () => setExistingFolder(null) }, t("cancel")))) : /* @__PURE__ */ import_react2.default.createElement("label", { className: "dnw-field" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "dnw-label" }, t("location")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-row" }, /* @__PURE__ */ import_react2.default.createElement("input", { className: "dnw-input", value: location, onChange: (event) => setLocation(event.target.value), placeholder: t("typePathPlaceholder"), spellCheck: false, disabled: working }), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "dnw-btn", disabled: working, onClick: () => setBrowse("location") }, t("chooseLocation")), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "dnw-btn", disabled: working, onClick: () => void pickNative("location") }, t("pickNative"))), /* @__PURE__ */ import_react2.default.createElement("span", { className: "dnw-help" }, t("locationHelp"))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-row" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "dnw-btn", disabled: working, onClick: () => setBrowse("existing") }, t("useFolder")), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "dnw-btn", disabled: working || !looksFullyQualified(location), onClick: () => void saveDefault() }, t("saveLocation"))), !existingFolder && location && locationExists === false ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-hint" }, t("locationMissing")) : null, !location && defaults && !defaults.documentsAvailable ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-alert" }, t("documentsMissing")) : null) : /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement("label", { className: "dnw-field" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "dnw-label" }, t("repoUrl")), /* @__PURE__ */ import_react2.default.createElement("input", { className: "dnw-input", value: repoUrl, onChange: (event) => setRepoUrl(event.target.value), placeholder: t("repoUrlPlaceholder"), spellCheck: false, disabled: working })), /* @__PURE__ */ import_react2.default.createElement("label", { className: "dnw-field" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "dnw-label" }, t("parentDirectory")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-row" }, /* @__PURE__ */ import_react2.default.createElement("input", { className: "dnw-input", value: parentDirectory, onChange: (event) => setParentDirectory(event.target.value), placeholder: t("typePathPlaceholder"), spellCheck: false, disabled: working }), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "dnw-btn", disabled: working, onClick: () => setBrowse("parent") }, t("chooseLocation")), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "dnw-btn", disabled: working, onClick: () => void pickNative("parent") }, t("pickNative")))), /* @__PURE__ */ import_react2.default.createElement("label", { className: "dnw-field" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "dnw-label" }, t("folderName")), /* @__PURE__ */ import_react2.default.createElement("input", { className: "dnw-input", value: folderName, onChange: (event) => {
    setFolderTouched(true);
    setFolderName(event.target.value);
  }, disabled: working })), /* @__PURE__ */ import_react2.default.createElement("label", { className: "dnw-field" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "dnw-label" }, t("branch")), /* @__PURE__ */ import_react2.default.createElement("input", { className: "dnw-input", value: branch, onChange: (event) => setBranch(event.target.value), placeholder: t("branchPlaceholder"), spellCheck: false, disabled: working })), parentDirectory && parentExists === false ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-hint" }, t("locationMissing")) : null, destExists ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-alert dnw-alert-error" }, t("destExists")) : null, defaults && defaults.gitAvailable === false ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-alert dnw-alert-error" }, t("gitMissing")) : null), nativeHint ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-hint" }, t("nativeUnavailable")) : null, previewPath ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-preview" }, t(previewKind), ": ", /* @__PURE__ */ import_react2.default.createElement("code", null, previewPath)) : null, savedNote ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-hint" }, savedNote) : null)), message ? /* @__PURE__ */ import_react2.default.createElement("div", { className: `dnw-alert ${message.kind === "error" ? "dnw-alert-error" : ""}` }, message.text) : null, browse ? null : /* @__PURE__ */ import_react2.default.createElement("div", { className: "dnw-footer" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "dnw-btn", onClick: cancel }, t("cancel")), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "dnw-btn dnw-btn-primary", onClick: () => void onPrimary(), disabled: working }, working ? source === "clone" ? t("cloning") : t("creating") : primaryLabel))));
}
async function statPath(path, setter) {
  if (!path || !looksFullyQualified(path)) {
    setter(null);
    return;
  }
  try {
    const result = await fetchStat(path);
    setter(result.exists);
  } catch {
    setter(null);
  }
}

// src/client/styles.ts
var STYLE_ID = "dsh-new-workspace-styles";
function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.dnw-root { position: fixed; inset: 0; z-index: 2147483000; display: flex; align-items: center; justify-content: center; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 14px; line-height: 1.45; color: #111; }
.dnw-backdrop { position: absolute; inset: 0; background: rgba(16, 18, 21, 0.45); }
.dnw-dialog { position: relative; width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto; background: #fff; border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,.22); padding: 18px 20px 16px; display: flex; flex-direction: column; gap: 12px; }
.dnw-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dnw-title { margin: 0; font-size: 18px; font-weight: 650; }
.dnw-header-actions { display: flex; align-items: center; gap: 8px; }
.dnw-lang { display: inline-flex; border: 1px solid #d0d4da; border-radius: 8px; overflow: hidden; }
.dnw-lang button, .dnw-icon-btn, .dnw-btn, .dnw-seg button { font: inherit; cursor: pointer; background: #fff; color: inherit; border: 0; }
.dnw-lang button { padding: 3px 8px; font-size: 12px; }
.dnw-lang button[aria-pressed="true"] { background: #111; color: #fff; }
.dnw-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid transparent; }
.dnw-icon-btn:hover { background: #f2f3f5; }
.dnw-field { display: flex; flex-direction: column; gap: 4px; }
.dnw-label { font-weight: 600; }
.dnw-help, .dnw-preview, .dnw-hint { color: #4b5563; font-size: 12px; }
.dnw-preview code, .dnw-path { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; }
.dnw-input, .dnw-select { width: 100%; box-sizing: border-box; border: 1px solid #c9ced6; border-radius: 8px; padding: 8px 10px; font: inherit; background: #fff; }
.dnw-input:focus, .dnw-select:focus { outline: 2px solid #111; outline-offset: 1px; }
.dnw-input:disabled { background: #f6f7f8; }
.dnw-row { display: flex; gap: 8px; align-items: stretch; }
.dnw-row .dnw-input { flex: 1; }
.dnw-seg { display: flex; border: 1px solid #c9ced6; border-radius: 8px; overflow: hidden; }
.dnw-seg button { flex: 1; padding: 8px 10px; background: #fff; }
.dnw-seg button[aria-pressed="true"] { background: #111; color: #fff; }
.dnw-source { border: 1px solid #e2e5ea; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.dnw-footer { display: flex; justify-content: space-between; gap: 8px; margin-top: 4px; }
.dnw-btn { border-radius: 8px; padding: 8px 14px; border: 1px solid #c9ced6; }
.dnw-btn-primary { background: #111; color: #fff; border-color: #111; }
.dnw-btn-primary:disabled { opacity: .55; cursor: default; }
.dnw-btn:hover:not(:disabled) { filter: brightness(1.05); }
.dnw-alert { border: 1px solid #e3b341; background: #fff8e4; color: #3b2f0a; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
.dnw-alert-error { border-color: #e3a3a3; background: #fff1f1; color: #6b1212; }
.dnw-alert strong { display: block; margin-bottom: 2px; }
.dnw-crumbs { display: flex; flex-wrap: wrap; gap: 4px; font-size: 12px; }
.dnw-crumbs button { border: 0; background: none; color: #155eef; cursor: pointer; font: inherit; padding: 0; }
.dnw-list { border: 1px solid #e2e5ea; border-radius: 8px; max-height: 220px; overflow: auto; }
.dnw-list button { display: block; width: 100%; text-align: left; padding: 7px 10px; border: 0; border-bottom: 1px solid #f0f1f3; background: #fff; cursor: pointer; font: inherit; }
.dnw-list button:last-child { border-bottom: 0; }
.dnw-list button:hover, .dnw-list button[aria-selected="true"] { background: #f3f5f8; }
.dnw-hidden { opacity: .7; }
@media (prefers-reduced-motion: reduce) {
  .dnw-dialog, .dnw-backdrop { transition: none; }
}
`;
  document.head.appendChild(style);
}

// src/client/entry.tsx
var inject = ["slots", "uiWorkspace", "locale", "remote"];
var name = PLUGIN_ID;
var pluginContext = null;
function apply(ctx) {
  pluginContext = ctx;
  ensureStyles();
  const register = () => {
    ctx.slots.inject("conversation.hero.workspace.directoryFlow", () => ctx.slots.inject("sidebar.workspaces.directoryFlow", function* () {
      yield ctx.slots.register({
        name: "conversation.hero.workspace.directoryFlow",
        priority: DIRECTORY_FLOW_PRIORITY,
        registrant: PLUGIN_ID
      }, DirectoryFlow);
      yield ctx.slots.register({
        name: "sidebar.workspaces.directoryFlow",
        priority: DIRECTORY_FLOW_PRIORITY,
        registrant: PLUGIN_ID
      }, DirectoryFlow);
    }));
  };
  if (ctx.inject) ctx.inject(["slots", "uiWorkspace", "remote"], register);
  else register();
}
function DirectoryFlow(props) {
  const snapshot = props.useWorkspaces?.((value) => value);
  const workspaces = (0, import_react3.useMemo)(() => normalizeWorkspaces(snapshot), [snapshot]);
  const [conflicts, setConflicts] = (0, import_react3.useState)({ labels: [], unknown: false });
  (0, import_react3.useEffect)(() => {
    if (!props.open || !pluginContext) return;
    void detectConflicts(pluginContext).then(setConflicts);
  }, [props.open]);
  const api = bindServices(pluginContext);
  if (!props.open) return null;
  return /* @__PURE__ */ import_react3.default.createElement(
    NewWorkspaceDialog,
    {
      open: props.open,
      busy: props.busy,
      onPicked: props.onPicked,
      onCancel: props.onCancel,
      onError: props.onError,
      listDirectory: api.listDirectory,
      createDirectory: api.createDirectory,
      pickDirectory: api.pickDirectory,
      renameWorkspace: api.renameWorkspace,
      workspaces,
      conflictLabels: conflicts.labels,
      conflictUnknown: conflicts.unknown
    }
  );
}
function bindServices(ctx) {
  const listDirectory = ctx?.uiWorkspace?.listDirectory ?? ctx?.remote?.directoryPicker?.list;
  const createDirectory = ctx?.uiWorkspace?.createDirectory ?? ctx?.remote?.directoryPicker?.createDirectory;
  const picker = ctx?.uiWorkspace?.pickDirectory ?? ctx?.remote?.directoryPicker?.pick;
  const rename = ctx?.remote?.workspace?.rename;
  return {
    listDirectory: listDirectory ? (path, signal) => listDirectory.call(ctx?.uiWorkspace ?? ctx?.remote?.directoryPicker, path, signal) : void 0,
    createDirectory: createDirectory ? (path, name2) => createDirectory.call(ctx?.uiWorkspace ?? ctx?.remote?.directoryPicker, path, name2) : void 0,
    pickDirectory: picker ? () => picker.call(ctx?.uiWorkspace ?? ctx?.remote?.directoryPicker) : void 0,
    renameWorkspace: rename ? async (workspaceId, title) => {
      try {
        await rename({ workspaceId, title });
      } catch {
        await rename({ id: workspaceId, title });
      }
    } : void 0
  };
}
async function detectConflicts(ctx) {
  const labels = /* @__PURE__ */ new Set();
  let unknown = false;
  for (const hole of DIRECTORY_FLOW_HOLES) {
    let entries = [];
    try {
      entries = ctx.slots.entries?.(hole) ?? [];
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      const registrant = entry.registrant ?? entry.options?.id ?? entry.options?.name;
      const priority = entry.priority ?? entry.options?.priority ?? 0;
      if (isSelf(registrant)) continue;
      if (isOfficial(registrant, priority)) continue;
      if (registrant) labels.add(String(registrant));
      else unknown = true;
    }
  }
  try {
    const listed = await ctx.remote?.pluginInventory?.list?.();
    const items = Array.isArray(listed) ? listed : listed?.entries ?? [];
    for (const item of items) {
      const candidates = [item.moduleName, item.name, item.packageName, item.entryId, item.id].filter(Boolean);
      if (candidates.some(isSelf)) continue;
      const hit = candidates.find((value) => INCOMPATIBLE_PACKAGES.some((pkg) => value.includes(pkg)));
      if (hit) labels.add(hit);
    }
  } catch {
  }
  return { labels: [...labels], unknown: unknown && labels.size === 0 };
}
function isSelf(value) {
  return Boolean(value && (value === PLUGIN_ID || value.includes("dsh-new-workspace")));
}
function isOfficial(value, priority) {
  if (!value) return priority === 0;
  return /@deepseek-ai\//.test(value) || /directory-picker-(native|browse)/.test(value) || /ui-directory-picker/.test(value);
}

    return module.exports;
  }
});
