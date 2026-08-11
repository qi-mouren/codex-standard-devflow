#!/usr/bin/env node
// _util.mjs - scripts/node 套件共享工具（仅本目录内使用）
// 参数约定：--kebab-case 与 --camelCase 均可；布尔参数不带值；数字参数按 Number 解析。
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function parseArgs(argv, specs) {
  const out = {};
  const byName = {};
  for (const s of specs) byName[s.name] = s;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    let key = a.slice(2);
    let val;
    const eq = key.indexOf("=");
    if (eq >= 0) {
      val = key.slice(eq + 1);
      key = key.slice(0, eq);
    }
    const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const spec = byName[camel] ?? byName[key];
    if (!spec) continue;
    if (spec.type === "boolean") {
      out[camel] = true;
      continue;
    }
    if (val === undefined) val = argv[++i] ?? "";
    out[camel] = spec.type === "number" ? Number(val) : val;
  }
  return out;
}

export function hostName() {
  return process.env.COMPUTERNAME || process.env.HOSTNAME || "unknown";
}

export function nowIso() {
  return new Date().toISOString();
}

export function stripBom(s) {
  return s && s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export function taskNameOk(n) {
  return /^[a-z0-9_]+$/.test(n ?? "");
}

// 锁目录保留旧名（兼容仍在跑的老会话抢同一把锁）；改名只影响展示层，不影响锁语义。
export function lockRootCandidates() {
  const c = [];
  if (process.platform === "win32") c.push("C:\\tmp\\standard-devflow-locks");
  c.push(join(tmpdir(), "standard-devflow-locks"));
  return c;
}

export function pickLockRoot() {
  for (const d of lockRootCandidates()) {
    try {
      mkdirSync(d, { recursive: true });
      return d;
    } catch {
      // 尝试下一个候选目录
    }
  }
  throw new Error("no writable lock directory");
}

export function walkFiles(root, { skipSegments = [], filter = () => true } = {}) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!skipSegments.includes(e.name)) stack.push(join(dir, e.name));
      } else if (e.isFile() && filter(join(dir, e.name), e)) {
        out.push(join(dir, e.name));
      }
    }
  }
  return out.sort();
}

export function readJsonFile(p) {
  try {
    return JSON.parse(stripBom(readFileSync(p, "utf8")));
  } catch {
    return null;
  }
}
