// devflow-heartbeat.js — opencode 插件（可选增强）
// 作用：主会话（primary）每次工具执行后自动写心跳。
// 已知限制：opencode 插件钩子不拦截子 agent（task 子会话）的工具调用
//           （上游 issue #5894 未关闭），子 agent 心跳必须由角色卡显式执行
//           docs/process/.opencode-heartbeat.mjs，不要依赖本插件判断子 agent 存活。
// 配置：docs/process/.devflow-heartbeat.json（总控委派前写入）

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

function loadConfig(directory) {
  const p = resolve(directory, "docs/process/.devflow-heartbeat.json");
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function beat(cfg, note) {
  const project = resolve(cfg.projectPath ?? ".");
  const ts = new Date().toISOString();
  const host = process.env.COMPUTERNAME || process.env.HOSTNAME || "unknown";
  const hbFile = resolve(project, cfg.heartbeatFile ?? "docs/process/tasks/.heartbeat");
  const logFile = resolve(project, cfg.logFile ?? "docs/process/logs/runs/run.jsonl");
  const snapshot = { project, task: cfg.taskName ?? "primary", timestamp: ts, note, host };

  mkdirSync(dirname(hbFile), { recursive: true });
  writeFileSync(hbFile, JSON.stringify(snapshot, null, 2), "utf8");

  mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, JSON.stringify({ ts, task: snapshot.task, note, host }) + "\n", "utf8");
}

export async function DevflowHeartbeat({ directory }) {
  return {
    "tool.execute.after": async (input) => {
      const cfg = loadConfig(directory);
      if (!cfg) return;
      // 显式 heartbeat.mjs 本身就是 bash 调用，跳过避免重复写。
      const tool = input?.tool ?? "unknown";
      if (tool === "bash") return;
      beat(cfg, `tool:${tool}`);
    },
  };
}

export default DevflowHeartbeat;
