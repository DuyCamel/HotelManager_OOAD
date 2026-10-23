/** Chọn adapter một lần lúc khởi động; SQL lỗi không âm thầm chuyển sang demo. */
const config = require("../config/env");
module.exports =
  config.mode === "sqlserver"
    ? require("./repositories/sqlRepository")
    : require("./repositories/demoRepository");
