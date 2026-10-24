/** Kiểm tra đúng database + phiên bản schema, không in mật khẩu. */
const repo = require("../src/models/_shared/store");
(async () => {
  try {
    await repo.init();
    console.log(
      "Kết nối thành công. Chế độ:",
      repo.mode,
      "| Phòng:",
      (await repo.list("rooms")).length,
    );
  } catch (e) {
    console.error("Kết nối thất bại:", e.message);
    process.exitCode = 1;
  } finally {
    await repo.close();
  }
})();
