const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const listenerArgs = (port) => ["webhook", "listen", "--forward", `localhost:${port}/api/webhooks/sepay`];

function startDev() {
  const { port, root } = require("../src/config/env");
  const children = [];
  let closing = false;
  const stop = (code = 0) => {
    if (closing) return;
    closing = true;
    for (const child of children) {
      if (!child?.pid || child.exitCode !== null) continue;
      if (process.platform === "win32")
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else child.kill("SIGTERM");
    }
    process.exitCode = code;
  };
  const baseOptions = { cwd: root, stdio: "inherit" };
  const app = spawn(process.execPath, ["--watch", path.join(root, "src/server.js")], baseOptions);
  children.push(app);
  const sepay = spawn("sepay", listenerArgs(port), {
    ...baseOptions,
    shell: process.platform === "win32",
  });
  children.push(sepay);

  app.on("error", (error) => {
    console.error("Không khởi động được ứng dụng: " + error.message);
    stop(1);
  });
  sepay.on("error", (error) => {
    console.error("Không khởi động được SePay CLI: " + error.message);
    console.error("Cài SePay CLI, đăng nhập bằng `sepay login`, rồi mở terminal mới.");
    stop(1);
  });
  app.on("exit", (code) => { if (!closing) stop(code || 0); });
  sepay.on("exit", (code) => {
    if (!closing) {
      console.error(`SePay webhook listener đã dừng (code ${code ?? "không xác định"}).`);
      stop(code || 1);
    }
  });
  console.log(`SePay CLI sẽ chuyển webhook tới http://localhost:${port}/api/webhooks/sepay`);
  console.log("Giữ terminal này mở trong lúc phát triển; Ctrl+C sẽ dừng cả ứng dụng và listener.");
  process.once("SIGINT", () => stop());
  process.once("SIGTERM", () => stop());
  process.once("exit", () => stop());
}

if (require.main === module) startDev();
module.exports = { listenerArgs, startDev };
