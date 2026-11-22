import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const command = process.argv[2] || "status";
const root = process.cwd();
const sessionName = "sankalp_medi_dev";
const runtimeDir = path.join(root, ".dev");
const logFile = path.join(runtimeDir, "dev.log");
const pidFile = path.join(runtimeDir, "dev.pid");
const frontendPort = Number(process.env.FRONTEND_PORT || 3000);
const backendPort = Number(process.env.BACKEND_PORT || process.env.PORT || 8080);

const run = (program, args, options = {}) =>
  spawnSync(program, args, { encoding: "utf8", ...options });

const screenAvailable = () => !run("screen", ["-ls"]).error;

const sessionRunning = () => {
  const result = run("screen", ["-ls"]);
  return new RegExp(`\\d+\\.${sessionName}\\s`).test(`${result.stdout || ""}${result.stderr || ""}`);
};

const portOpen = (port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    const closed = () => {
      socket.destroy();
      resolve(false);
    };
    socket.once("error", closed);
    socket.once("timeout", closed);
  });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const launcherPid = () => {
  try {
    const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
};

const processRunning = (pid) => {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const shellQuote = (value) => `'${value.replaceAll("'", `'\\''`)}'`;

const mobileAddress = () => {
  const result = run("ifconfig", []);
  const match = result.stdout?.match(/\binet (100\.\d+\.\d+\.\d+)\b/);
  return match?.[1];
};

const printAddresses = () => {
  console.log(`[dev] Local:  http://localhost:${frontendPort}`);
  const address = mobileAddress();
  if (address) console.log(`[dev] Mobile: http://${address}:${frontendPort}`);
};

const status = async (verbose = true) => {
  const [frontend, backend] = await Promise.all([portOpen(frontendPort), portOpen(backendPort)]);
  if (verbose) {
    console.log(`[dev] Managed session: ${sessionRunning() ? "running" : "stopped"}`);
    console.log(`[dev] Frontend (${frontendPort}): ${frontend ? "running" : "stopped"}`);
    console.log(`[dev] Backend  (${backendPort}): ${backend ? "running" : "stopped"}`);
    if (frontend) printAddresses();
  }
  return frontend && backend;
};

const start = async () => {
  if (!screenAvailable()) {
    console.error("[dev] The macOS 'screen' command is required but was not found.");
    process.exitCode = 1;
    return;
  }

  if (sessionRunning()) {
    console.log("[dev] Both servers are already managed in the background.");
    await status();
    return;
  }

  const [frontendBusy, backendBusy] = await Promise.all([portOpen(frontendPort), portOpen(backendPort)]);
  if (frontendBusy || backendBusy) {
    console.error(`[dev] Cannot start: port${frontendBusy && backendBusy ? "s" : ""} ${[
      frontendBusy ? frontendPort : null,
      backendBusy ? backendPort : null,
    ].filter(Boolean).join(" and ")} already in use.`);
    console.error("[dev] Stop the existing foreground command with Ctrl+C, then run npm run dev:up.");
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(logFile, "");
  const launch = `cd ${shellQuote(root)} && exec caffeinate -i npm run dev >> ${shellQuote(logFile)} 2>&1`;
  const result = run("screen", ["-dmS", sessionName, "zsh", "-lc", launch]);
  if (result.status !== 0) {
    console.error(`[dev] Could not create the background session: ${(result.stderr || result.stdout).trim()}`);
    process.exitCode = 1;
    return;
  }

  console.log("[dev] Starting both servers in the background...");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await status(false)) {
      await status();
      console.log(`[dev] Logs: ${logFile}`);
      return;
    }
    if (!sessionRunning()) break;
    await sleep(1000);
  }

  console.error(`[dev] Startup did not complete. Check: npm run dev:logs`);
  process.exitCode = 1;
};

const stop = async () => {
  const pid = launcherPid();
  if (!sessionRunning() && !processRunning(pid)) {
    console.log("[dev] No managed background session is running.");
    await status();
    return;
  }

  if (processRunning(pid)) process.kill(pid, "SIGTERM");
  else run("screen", ["-S", sessionName, "-X", "stuff", "\u0003"]);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const [frontend, backend] = await Promise.all([portOpen(frontendPort), portOpen(backendPort)]);
    if (!frontend && !backend && !processRunning(pid)) break;
    await sleep(500);
  }
  if (sessionRunning()) run("screen", ["-S", sessionName, "-X", "quit"]);
  if (!processRunning(pid)) fs.rmSync(pidFile, { force: true });
  console.log("[dev] Background servers stopped.");
  const [frontend, backend] = await Promise.all([portOpen(frontendPort), portOpen(backendPort)]);
  await status();
  if (frontend || backend) {
    console.error("[dev] One or more ports are still occupied by another process.");
    process.exitCode = 1;
  }
};

const logs = () => {
  if (!fs.existsSync(logFile)) {
    console.error("[dev] No log file yet. Start the servers with: npm run dev:up");
    process.exitCode = 1;
    return;
  }
  const tail = spawn("tail", ["-n", "100", "-f", logFile], { stdio: "inherit" });
  const close = () => tail.kill("SIGTERM");
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
};

if (command === "start") await start();
else if (command === "stop") await stop();
else if (command === "restart") {
  await stop();
  await start();
} else if (command === "status") await status();
else if (command === "logs") logs();
else {
  console.error("Usage: node scripts/dev-control.mjs start|stop|restart|status|logs");
  process.exitCode = 1;
}
