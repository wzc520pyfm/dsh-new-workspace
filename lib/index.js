// src/host/plugin.ts
import { randomUUID } from "node:crypto";

// src/shared/types.ts
var PLUGIN_ID = "dsh-new-workspace";
var API_PREFIX = "/api/dsh-new-workspace";
var DEFAULT_WORKSPACE_DIRECTORY = "default-workspace";
var SETTINGS_LOCATION_KEY = "newWorkspaceLocation";
var SETTINGS_LOCALE_KEY = "locale";

// src/shared/paths.ts
function isSinglePathSegment(name2) {
  const value = name2.trim();
  if (!value) return false;
  if (value === "." || value === "..") return false;
  if (/[/\\]/.test(value) || value.includes("\0")) return false;
  return true;
}
function looksFullyQualified(path) {
  const value = path.trim();
  if (!value) return false;
  if (value.startsWith("/")) return true;
  if (/^[A-Za-z]:[\\/]/.test(value)) return true;
  if (value.startsWith("\\\\")) return true;
  return false;
}

// src/host/documents.ts
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
async function resolveDocumentsPath() {
  const platform = process.platform;
  if (platform === "darwin") {
    return existingDir(join(homedir(), "Documents"));
  }
  if (platform === "win32") {
    const userProfile = process.env.USERPROFILE || homedir();
    const candidates = [
      process.env.USERPROFILE ? join(process.env.USERPROFILE, "Documents") : void 0,
      join(userProfile, "Documents"),
      process.env.PUBLIC ? join(process.env.PUBLIC, "Documents") : void 0
    ];
    for (const candidate of candidates) {
      const found = existingDir(candidate);
      if (found) return found;
    }
    return void 0;
  }
  const xdg = process.env.XDG_DOCUMENTS_DIR?.trim();
  if (xdg) return existingDir(xdg);
  try {
    const { stdout } = await execFileAsync("xdg-user-dir", ["DOCUMENTS"], { timeout: 3e3, windowsHide: true });
    const path = stdout.trim();
    if (path && path !== homedir()) return existingDir(path);
  } catch {
  }
  return existingDir(join(homedir(), "Documents"));
}
function existingDir(path) {
  if (!path) return void 0;
  try {
    if (existsSync(path)) return path;
  } catch {
    return void 0;
  }
  return void 0;
}
function defaultHarnessParent(documentsPath) {
  return join(documentsPath, "deepseek-harness");
}

// src/host/git-clone.ts
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as join2 } from "node:path";

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

// src/host/git-clone.ts
var CloneError = class extends Error {
  constructor(code, message, raw) {
    super(message);
    this.code = code;
    this.raw = raw;
    this.name = "CloneError";
  }
};
var GIT_ENV = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GIT_ASKPASS: "echo",
  SSH_ASKPASS: "echo",
  GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? "ssh -o BatchMode=yes",
  LC_ALL: process.env.LC_ALL ?? "C"
};
async function gitAvailable() {
  try {
    await runGit(["--version"], void 0, 8e3);
    return true;
  } catch {
    return false;
  }
}
async function pathStat(path) {
  try {
    const info = await stat(path);
    return { exists: true, isDirectory: info.isDirectory() };
  } catch (error) {
    const code = error.code;
    if (code === "ENOENT") return { exists: false, isDirectory: false };
    throw error;
  }
}
async function ensureDirectory(path) {
  if (!looksFullyQualified(path)) {
    throw new CloneError("invalid_path", "The directory path must be fully qualified.");
  }
  await mkdir(path, { recursive: true });
}
async function cloneRepository(options) {
  const url = options.url.trim();
  const parent = options.parentDirectory.trim();
  const folderName = options.folderName.trim();
  const branch = options.branch?.trim() || void 0;
  if (!isGitUrl(url)) throw new CloneError("invalid_url", "A valid HTTPS or SSH Git URL is required.");
  if (!looksFullyQualified(parent)) throw new CloneError("invalid_path", "The parent directory must be a fully qualified path.");
  if (!isSinglePathSegment(folderName)) {
    throw new CloneError("invalid_folder", "The repository folder name must be a single path segment, and cannot be . or ..");
  }
  if (inferFolderFromGitUrl(url) === null && !folderName) {
    throw new CloneError("invalid_url", "Could not infer a folder name from the repository URL.");
  }
  const destination = join2(parent, folderName);
  const existing = await pathStat(destination);
  if (existing.exists) {
    throw new CloneError("destination_exists", `The destination already exists: ${destination}`);
  }
  if (!await gitAvailable()) {
    throw new CloneError(
      "git_missing",
      "git was not found on the Host PATH. Install Git (https://git-scm.com/downloads) and restart DSH."
    );
  }
  const stagingRoot = await mkdtemp(join2(tmpdir(), "dsh-new-workspace-"));
  const stagingPath = join2(stagingRoot, folderName);
  let moved = false;
  const onAbort = () => {
  };
  options.signal?.addEventListener("abort", onAbort);
  try {
    const cloneArgs = ["clone"];
    if (branch) cloneArgs.push("--branch", branch);
    cloneArgs.push("--", url, stagingPath);
    await runGit(cloneArgs, options.signal);
    await ensureDirectory(parent);
    const destNow = await pathStat(destination);
    if (destNow.exists) {
      throw new CloneError("destination_exists", `The destination already exists: ${destination}`);
    }
    try {
      await rename(stagingPath, destination);
    } catch (error) {
      const code = error.code;
      if (code === "EXDEV") {
        const { cp } = await import("node:fs/promises");
        await cp(stagingPath, destination, { recursive: true, errorOnExist: true });
        await rm(stagingPath, { recursive: true, force: true });
      } else {
        throw error;
      }
    }
    moved = true;
    return destination;
  } catch (error) {
    if (!moved) {
      await rm(destination, { recursive: true, force: true }).catch(() => void 0);
    }
    if (options.signal?.aborted) {
      throw new CloneError("aborted", "The clone was cancelled.");
    }
    throw error;
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    await rm(stagingRoot, { recursive: true, force: true }).catch(() => void 0);
  }
}
function runGit(args, signal, timeoutMs = 10 * 6e4) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn("git", args, {
        env: GIT_ENV,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
    } catch (error) {
      reject(new CloneError(
        "git_missing",
        "git was not found on the Host PATH. Install Git (https://git-scm.com/downloads) and restart DSH.",
        error instanceof Error ? error.message : String(error)
      ));
      return;
    }
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      killGit(child);
      reject(new CloneError("git_timeout", "The git process timed out.", stderr || stdout));
    }, timeoutMs);
    const abort = () => {
      killGit(child);
    };
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort);
    child.on("error", (error) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      const missing = error.code === "ENOENT";
      reject(new CloneError(
        missing ? "git_missing" : "git_failed",
        missing ? "git was not found on the Host PATH. Install Git (https://git-scm.com/downloads) and restart DSH." : error.message || "Failed to start git.",
        error.message
      ));
    });
    child.on("close", (code, name2) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (signal?.aborted) {
        reject(new CloneError("aborted", "The clone was cancelled.", stderr || stdout));
        return;
      }
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const raw = (stderr || stdout || name2 || `exit ${code}`).trim();
      reject(new CloneError("git_failed", raw || `git exited with code ${code}.`, raw));
    });
  });
}
function killGit(child) {
  if (child.killed || child.exitCode !== null) return;
  try {
    if (process.platform !== "win32" && child.pid) {
      try {
        process.kill(child.pid, "SIGTERM");
      } catch {
      }
    } else {
      child.kill("SIGTERM");
    }
  } catch {
  }
  setTimeout(() => {
    if (child.killed || child.exitCode !== null) return;
    try {
      child.kill("SIGKILL");
    } catch {
    }
  }, 2e3);
}

// src/host/http.ts
var HttpError = class extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "HttpError";
  }
};
function header(headers, name2) {
  const raw = headers[name2] ?? headers[name2.toLowerCase()];
  if (Array.isArray(raw)) return raw.join(",");
  return raw ?? "";
}
function isSameOrigin(headers) {
  const origin = header(headers, "origin").trim();
  if (!origin) return true;
  const host = header(headers, "host").trim();
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
function sendError(res, status, code, message) {
  sendJson(res, status, { ok: false, error: { code, message } });
}
async function readJsonBody(req, limit = 1e6) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > limit) throw new HttpError(413, "payload_too_large", "Request body is too large");
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected a JSON object");
    }
    return parsed;
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be a JSON object");
  }
}

// src/host/settings.ts
import { mkdir as mkdir2, readFile, writeFile } from "node:fs/promises";
import { homedir as homedir2 } from "node:os";
import { join as join3 } from "node:path";
function dshHome() {
  return process.env.DSH_HOME?.trim() || join3(homedir2(), ".dsh");
}
function settingsPath() {
  return join3(dshHome(), "dsh-new-workspace", "settings.json");
}
async function readSettings() {
  try {
    const raw = await readFile(settingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const record = parsed;
    const location = record[SETTINGS_LOCATION_KEY];
    const locale = record[SETTINGS_LOCALE_KEY];
    return {
      ...typeof location === "string" && location.trim() ? { newWorkspaceLocation: location.trim() } : {},
      ...locale === "en" || locale === "zh" ? { locale } : {}
    };
  } catch {
    return {};
  }
}
async function writeSettings(patch) {
  const current = await readSettings();
  const next = { ...current };
  if ("newWorkspaceLocation" in patch) {
    const value = patch.newWorkspaceLocation?.trim();
    if (value) next.newWorkspaceLocation = value;
    else delete next.newWorkspaceLocation;
  }
  if ("locale" in patch) {
    if (patch.locale === "en" || patch.locale === "zh") next.locale = patch.locale;
    else delete next.locale;
  }
  const dir = join3(dshHome(), "dsh-new-workspace");
  await mkdir2(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(next, null, 2)}
`, "utf8");
  return next;
}

// src/host/plugin.ts
var name = PLUGIN_ID;
var inject = ["webServer"];
var jobs = /* @__PURE__ */ new Map();
function apply(ctx) {
  const register = () => {
    if (!ctx.webServer?.register) return () => void 0;
    return ctx.webServer.register({
      kind: "prefix",
      path: API_PREFIX,
      handler: (req, res) => route(ctx, req, res)
    });
  };
  if (ctx.effect) ctx.effect(register, "dsh-new-workspace: routes");
  else register();
}
async function route(ctx, req, res) {
  if (!isSameOrigin(req.headers)) {
    sendError(res, 403, "cross_origin", "Cross-origin requests are refused");
    return;
  }
  if (String(req.method ?? "").toUpperCase() !== "POST") {
    sendError(res, 405, "method_not_allowed", "Only POST is supported");
    return;
  }
  if (!/^application\/json(?:\s*;|$)/i.test(header(req.headers, "content-type"))) {
    sendError(res, 415, "json_required", "Content-Type must be application/json");
    return;
  }
  try {
    const url = new URL(req.url ?? "/", "http://dsh.local");
    const body = await readJsonBody(req);
    const signal = abortOnClose(req);
    if (url.pathname === `${API_PREFIX}/defaults`) {
      sendJson(res, 200, { ok: true, data: await defaults(ctx) });
      return;
    }
    if (url.pathname === `${API_PREFIX}/settings`) {
      sendJson(res, 200, { ok: true, data: await updateSettings(body) });
      return;
    }
    if (url.pathname === `${API_PREFIX}/stat`) {
      const path = stringField(body, "path");
      if (!path || !looksFullyQualified(path)) throw new HttpError(400, "invalid_path", "A fully qualified path is required");
      sendJson(res, 200, { ok: true, data: await pathStat(path) });
      return;
    }
    if (url.pathname === `${API_PREFIX}/mkdir`) {
      const path = stringField(body, "path");
      if (!path || !looksFullyQualified(path)) throw new HttpError(400, "invalid_path", "A fully qualified path is required");
      await ensureDirectory(path);
      sendJson(res, 200, { ok: true, data: { path } });
      return;
    }
    if (url.pathname === `${API_PREFIX}/clone`) {
      const request = parseClone(body);
      const controller = new AbortController();
      const jobId = randomUUID();
      jobs.set(jobId, controller);
      const combined = anySignal(controller.signal, signal);
      try {
        const path = await cloneRepository({ ...request, signal: combined });
        sendJson(res, 200, { ok: true, data: { path, jobId } });
      } finally {
        jobs.delete(jobId);
      }
      return;
    }
    if (url.pathname === `${API_PREFIX}/abort`) {
      const jobId = stringField(body, "jobId");
      if (jobId) jobs.get(jobId)?.abort();
      sendJson(res, 200, { ok: true, data: { aborted: true } });
      return;
    }
    sendError(res, 404, "route_not_found", "Route was not found");
  } catch (error) {
    if (error instanceof HttpError) {
      sendError(res, error.status, error.code, error.message);
      return;
    }
    if (error instanceof CloneError) {
      const status = error.code === "aborted" ? 499 : error.code === "destination_exists" || error.code === "invalid_url" || error.code === "invalid_path" || error.code === "invalid_folder" ? 409 : 500;
      sendError(res, status === 499 ? 409 : status, error.code, error.raw ? `${error.message}` : error.message);
      return;
    }
    sendError(res, 500, "host_failed", error instanceof Error ? error.message : "The host request failed");
  }
}
async function defaults(ctx) {
  const settings = await readSettings();
  const documentsPath = await resolveDocumentsPath() ?? null;
  const workspaces = safeList(ctx);
  const defaultWorkspace = workspaces.find((item) => typeof item.path === "string" && item.path.split(/[\\/]/).pop() === DEFAULT_WORKSPACE_DIRECTORY);
  const defaultWorkspacePath = defaultWorkspace?.path ?? null;
  let location = null;
  let locationSource = "unset";
  if (settings.newWorkspaceLocation?.trim()) {
    location = settings.newWorkspaceLocation.trim();
    locationSource = "saved";
  } else if (defaultWorkspacePath) {
    const parent = defaultWorkspacePath.replace(/[\\/]+$/, "").replace(/[\\/]default-workspace$/i, "");
    if (parent && parent !== defaultWorkspacePath) {
      location = parent;
      locationSource = "default-workspace-parent";
    }
  }
  if (!location && documentsPath) {
    location = defaultHarnessParent(documentsPath);
    locationSource = "documents-harness";
  }
  let nativePickAvailable = false;
  try {
    nativePickAvailable = ctx.directoryPicker?.capability()?.kind === "native";
  } catch {
    nativePickAvailable = false;
  }
  return {
    location,
    locationSource,
    documentsPath,
    documentsAvailable: Boolean(documentsPath),
    defaultWorkspacePath,
    homePath: null,
    nativePickAvailable,
    gitAvailable: await gitAvailable(),
    locale: settings.locale
  };
}
async function updateSettings(body) {
  const patch = {};
  if ("newWorkspaceLocation" in body) {
    const value = body.newWorkspaceLocation;
    if (value === null || value === "") patch.newWorkspaceLocation = void 0;
    else if (typeof value === "string" && looksFullyQualified(value.trim())) patch.newWorkspaceLocation = value.trim();
    else throw new HttpError(400, "invalid_path", "newWorkspaceLocation must be a fully qualified path or empty");
  }
  if ("locale" in body) {
    const value = body.locale;
    if (value === "en" || value === "zh" || value === null || value === "") {
      patch.locale = value === "en" || value === "zh" ? value : void 0;
    } else {
      throw new HttpError(400, "invalid_locale", "locale must be en or zh");
    }
  }
  return writeSettings(patch);
}
function parseClone(body) {
  const url = stringField(body, "url");
  const parentDirectory = stringField(body, "parentDirectory");
  const folderName = stringField(body, "folderName");
  const branch = stringField(body, "branch");
  if (!url || !parentDirectory || !folderName) {
    throw new HttpError(400, "invalid_clone", "url, parentDirectory, and folderName are required");
  }
  return { url, parentDirectory, folderName, ...branch ? { branch } : {} };
}
function stringField(body, key) {
  const value = body[key];
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed || void 0;
}
function safeList(ctx) {
  try {
    const list = ctx.workspaceRegistry?.list?.();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function abortOnClose(req) {
  const controller = new AbortController();
  req.on?.("close", () => controller.abort());
  req.on?.("aborted", () => controller.abort());
  return controller.signal;
}
function anySignal(...signals) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", abort);
  }
  return controller.signal;
}
export {
  apply,
  inject,
  name
};
