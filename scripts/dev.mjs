import { spawn } from "node:child_process";

const windows = process.platform === "win32";
const commands = [
  { name: "backend", cmd: windows ? "mvn.cmd" : "mvn", args: ["-f", "backend/pom.xml", "spring-boot:run"] },
  { name: "frontend", cmd: windows ? "npx.cmd" : "npx", args: ["next", "dev"] },
];

const children = [];

for (const { name, cmd, args } of commands) {
  try {
    const child = spawn(cmd, args, { stdio: "inherit", env: process.env, shell: windows });
    child.on("error", (err) => {
      console.warn(`[dev] Note: ${name} process (${cmd}) could not be started: ${err.message}`);
    });
    child.on("exit", (code) => {
      if (code && code !== 0) {
        console.warn(`[dev] ${name} process exited with code ${code}.`);
      }
    });
    children.push(child);
  } catch (err) {
    console.warn(`[dev] Failed to spawn ${name}:`, err.message);
  }
}

const stop = () => {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

