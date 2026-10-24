/** Pool SQL Server. Không đặt truy vấn nghiệp vụ hoặc SQL tại config. TODO TV3 C1: nghiệm thu kết nối thật. */
const sql = require("mssql"),
  config = require("./env");
let pool, pending;
async function connect() {
  if (pool?.connected) return pool;
  if (!pending)
    pending = new sql.ConnectionPool(config.sql)
      .connect()
      .then((p) => {
        pool = p;
        p.on("error", (e) => console.error("SQL pool:", e.code || e.message));
        return p;
      })
      .finally(() => {
        pending = null;
      });
  return pending;
}
async function close() {
  if (pool) await pool.close();
  pool = null;
}
module.exports = { sql, connect, close };
