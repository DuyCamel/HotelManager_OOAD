/** Pool SQL Server dùng cho web; không dùng JDBC hoặc Java. */
const sql = require("mssql");
const config = require("../config/env");
let pool;
async function connect() {
  if (!pool) {
    pool = await new sql.ConnectionPool(config.sql).connect();
    pool.on("error", (e) => console.error("SQL pool:", e.code || e.message));
    const result = await pool
      .request()
      .query("SELECT MAX(VersionNo) v FROM dbo.SchemaVersion");
    if (result.recordset[0].v !== 11) {
      await pool.close();
      pool = null;
      throw new Error(
        "Schema web chưa sẵn sàng. Chạy 001 -> 002 -> 003 của bản web.",
      );
    }
    const settings = await pool
      .request()
      .query("SELECT COUNT(*) n FROM dbo.HotelSetting");
    if (settings.recordset[0].n !== 1) {
      await pool.close();
      pool = null;
      throw new Error(
        "Chưa có cấu hình khách sạn. Chạy 003_seed_demo_data.sql để khởi tạo dữ liệu đồ án.",
      );
    }
  }
  return pool;
}
module.exports = {
  sql,
  connect,
  close: async () => {
    if (pool) await pool.close();
    pool = null;
  },
};
