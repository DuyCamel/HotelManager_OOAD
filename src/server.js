/** Entrypoint: npm run dev / npm start / VS Code F5. */
const repo = require("./models/_shared/store");
const config = require("./config/env");
(async () => {
  await repo.init();
  const models = require("./models")(repo);
  await models.bookings.expire();
  const app = require("./app")(repo, models);
  const server = app.listen(config.port, () =>
    console.log(
      `Aurora Hotel: http://localhost:${config.port} | database: ${repo.mode}`,
    ),
  );
  const timer = setInterval(
    () =>
      models.bookings
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
