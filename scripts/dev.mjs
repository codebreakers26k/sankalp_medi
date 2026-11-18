import { spawn } from "node:child_process";

const windows = process.platform === "win32";
const commands = [
  [windows ? "mvn.cmd" : "mvn", ["-f", "backend/pom.xml", "spring-boot:run"]],
  [windows ? "npx.cmd" : "npx", ["next", "dev"]],
];

const children = commands.map(([command, args]) =>
  spawn(command, args, { stdio: "inherit", env: process.env }),
);

const stop = () => {
  for (const child of children) child.kill("SIGTERM");
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
}
