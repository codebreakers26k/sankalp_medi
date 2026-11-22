import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.warn("[dev] .env was not found; starting with the current shell environment.");
}

const windows = process.platform === "win32";
const runtimeDir = path.resolve(".dev");
const pidFile = path.join(runtimeDir, "dev.pid");
const frontendPort = process.env.FRONTEND_PORT || "3000";
const backendPort = process.env.BACKEND_PORT || process.env.PORT || "8080";
const commands = [
  {
    name: `backend on http://localhost:${backendPort}`,
    cmd: windows ? "mvn.cmd" : "mvn",
    args: ["-f", "backend/pom.xml", "spring-boot:run"],
    env: { ...process.env, PORT: backendPort },
  },
  {
    name: `frontend on http://localhost:${frontendPort}`,
    cmd: windows ? "npx.cmd" : "npx",
    args: ["next", "dev", "--port", frontendPort],
    env: { ...process.env, PORT: frontendPort },
  },
];

const children = [];
let stopping = false;

fs.mkdirSync(runtimeDir, { recursive: true });
fs.writeFileSync(pidFile, `${process.pid}\n`);

const removePidFile = () => {
  try {
    if (fs.readFileSync(pidFile, "utf8").trim() === String(process.pid)) fs.rmSync(pidFile);
  } catch {}
};

const stop = (exitCode = 0) => {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;

  for (const child of children) {
    if (child.exitCode !== null || child.killed) continue;
    try {
      if (windows) child.kill("SIGTERM");
      else process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
};

for (const { name, cmd, args, env } of commands) {
  console.log(`[dev] Starting ${name}...`);
  const child = spawn(cmd, args, {
    stdio: "inherit",
    env,
    shell: windows,
    detached: !windows,
  });

  child.on("error", (error) => {
    console.error(`[dev] Could not start ${name}: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (stopping) return;
    console.error(`[dev] ${name} stopped (${signal || `exit code ${code ?? 1}`}); stopping both servers.`);
    stop(code || 1);
  });

  children.push(child);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
process.on("SIGHUP", () => stop(0));
process.on("exit", removePidFile);

