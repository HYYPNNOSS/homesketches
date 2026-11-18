import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createConnection } from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const backend = fileURLToPath(new URL("../../sketchback/", import.meta.url));
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(root);
const api = new URL(process.env.BACKEND_API_URL ?? "http://127.0.0.1:4000/api");
const local = ["localhost", "127.0.0.1", "[::1]"].includes(api.hostname);
const port = Number(api.port || (api.protocol === "https:" ? 443 : 80));
const running = local && await new Promise(resolve => {
  const socket = createConnection({ port, host: api.hostname.replace(/[\[\]]/g, "") });
  socket.setTimeout(1000);
  socket.on("connect", () => { socket.destroy(); resolve(true); });
  socket.on("error", () => resolve(false));
  socket.on("timeout", () => { socket.destroy(); resolve(false); });
});
const children = [];
const detached = process.platform !== "win32";
if (local && !running) children.push(spawn(process.execPath, ["node_modules/@nestjs/cli/bin/nest.js", "start", "--watch"], {
  cwd: backend, stdio: "inherit", detached, env: { ...process.env, PORT: String(port) },
}));
children.push(spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)], { cwd: root, stdio: "inherit", detached }));
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    try {
      if (detached && child.pid) process.kill(-child.pid, "SIGTERM");
      else child.kill("SIGTERM");
    } catch { /* Child already stopped. */ }
  }
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
children.forEach(child => {
  child.on("error", error => { console.error(error.message); stop(1); });
  child.on("exit", code => stop(code ?? 0));
});
