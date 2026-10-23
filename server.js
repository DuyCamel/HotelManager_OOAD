/** Entrypoint: npm run dev / npm start / VS Code F5. */
const repo = require("./backend/database");
const config = require("./backend/config/env");
(async () => {
  await repo.init();
  const services = require("./backend/service")(repo);
  await services.booking.expire();
  const app = require("./backend/app")(repo, services);
  const server = app.listen(config.port, () =>
    console.log(
      `Aurora Hotel: http://localhost:${config.port} | database: ${repo.mode}`,
    ),
  );
  const timer = setInterval(
    () =>
      services.booking
        .expire()
        .catch((e) => console.error("Hết hạn giữ phòng:", e.message)),
    60000,
  );
  timer.unref();
  async function stop() {
    clearInterval(timer);
    server.close(async () => {
      await repo.close();
      process.exit(0);
    });
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
})().catch((e) => {
  console.error("Không thể khởi động:", e.message);
  process.exit(1);
});
