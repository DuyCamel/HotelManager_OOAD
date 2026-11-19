/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C1, C4, C5
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Nghiệm thu transaction/rollback, OUTPUT INTO trên bảng có trigger và kiểu ngày/tiền/tham số trên SQL Server thật.
 * C5: bổ sung truy vấn tham số hóa có lọc/phân trang/tổng hợp cho A3/C4/A6; không ghép raw tên cột hoặc điều kiện từ client.
 * Chốt interface trước với TV1/TV2; giữ chống tranh chấp khi hai máy cùng đặt/thu tiền.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Repository SQL tham số hóa. Mỗi nghiệp vụ giữ application lock trong transaction để tránh race/lost update. */
const { defs, computed } = require("./definitions");
const { sql, connect } = require("../../config/db");
const { ensure } = require("../../core/errors/AppError");
const dateKeys = new Set([
  "createdAt",
  "expiresAt",
  "startAt",
  "endAt",
  "holdUntil",
  "checkInAt",
  "checkOutAt",
  "fromAt",
  "toAt",
  "usedAt",
  "issuedAt",
  "paidAt",
  "checkoutAt",
  "deadlineAt",
  "completedAt",
  "reportedAt",
  "backupAt",
  "eventAt",
]);
const timeKeys = new Set(["checkInTime", "checkOutTime", "lateFeeFrom"]);
const numericKeys = new Set([
  "capacity",
  "beds",
  "guests",
  "points",
  "authVersion",
  "quantity",
  "percent",
  "lateFeePercent",
]);
function bind(request, key, value, idx) {
  const p = "p" + idx;
  let type = sql.NVarChar(sql.MAX);
  if (value !== null && value !== undefined) {
    if (dateKeys.has(key)) {
      type = sql.DateTime2;
      value = new Date(value);
    } else if (timeKeys.has(key)) {
      type = sql.Time;
      value = new Date(
        "1970-01-01T" +
          value.slice(0, 8) +
          (value.length === 5 ? ":00" : "") +
          "Z",
      );
    } else if (["startDate", "endDate"].includes(key)) {
      type = sql.Date;
      value = new Date(value.slice(0, 10) + "T00:00:00Z");
    } else if (typeof value === "boolean") {
      type = sql.Bit;
    } else if (typeof value === "number" || numericKeys.has(key)) {
      type = sql.Decimal(18, 2);
      value = Number(value);
    }
  }
  request.input(p, type, value === undefined ? null : value);
  return "@" + p;
}
function convert(row) {
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date)
      row[key] = timeKeys.has(key)
        ? value.toISOString().slice(11, 19)
        : value.toISOString();
  }
  return row;
}
function client(owner) {
  return {
    async list(entity) {
      ensure(defs[entity], "Loại dữ liệu không hợp lệ.");
      const [table, pk, fields] = defs[entity];
      const select = [
        `[${pk}] AS [id]`,
        ...Object.entries(fields).map(([k, v]) => `[${v}] AS [${k}]`),
      ];
      const r = await new sql.Request(owner).query(
        `SELECT ${select.join(",")} FROM dbo.[${table}]`,
      );
      const rows = r.recordset.map(convert);
      if (entity === "types") {
        const links = await this.listRoomTypeServices();
        for (const row of rows)
          row.serviceConfig = links
            .filter((link) => link.roomTypeId === row.id)
            .map(({ serviceId, included }) => ({ serviceId, included }));
      }
      return rows;
    },
    async find(entity, id) {
      const rows = await this.list(entity);
      return rows.find((r) => String(r.id) === String(id)) || null;
    },
    async insert(entity, row) {
      const [table, pk, fields, auto] = defs[entity];
      const data = Object.entries(row).filter(
        ([k, v]) =>
          v !== undefined &&
          !computed.has(k) &&
          ((k === "id" && !auto) || fields[k]),
      );
      const req = new sql.Request(owner);
      const cols = data.map(([k]) => `[${k === "id" ? pk : fields[k]}]`);
      const vals = data.map(([k, v], i) => bind(req, k, v, i));
      const result = await req.query(
        `DECLARE @New TABLE(id nvarchar(100)); INSERT dbo.[${table}] (${cols.join(",")}) OUTPUT inserted.[${pk}] INTO @New VALUES (${vals.join(",")}); SELECT id FROM @New;`,
      );
      const persisted = Object.fromEntries(data);
      return { ...persisted, id: result.recordset[0].id };
    },
    async update(entity, id, changes) {
      const [table, pk, fields] = defs[entity];
      const data = Object.entries(changes).filter(
        ([k, v]) => fields[k] && v !== undefined && !computed.has(k),
      );
      if (!data.length) return;
      const req = new sql.Request(owner);
      const assigns = data.map(
        ([k, v], i) => `[${fields[k]}]=${bind(req, k, v, i)}`,
      );
      const key = bind(req, "id", id, data.length);
      await req.query(
        `UPDATE dbo.[${table}] SET ${assigns.join(",")} WHERE [${pk}]=${key}`,
      );
    },
    async finalizeInvoice(id) {
      const req = new sql.Request(owner);
      req.input("invoiceId", sql.VarChar(20), String(id));
      await req.query(`
        DECLARE @Status varchar(10);
        SELECT @Status = StatusCode
        FROM dbo.Invoice WITH (UPDLOCK, HOLDLOCK)
        WHERE InvoiceId = @invoiceId;

        IF @Status IS NULL
          THROW 51501, N'Không tìm thấy hóa đơn.', 1;
        IF @Status NOT IN ('DRAFT', 'PAID')
          THROW 51502, N'Hóa đơn không thể hoàn tất.', 1;

        UPDATE dbo.Invoice SET StatusCode = 'PAID'
        WHERE InvoiceId = @invoiceId AND StatusCode = 'DRAFT';

        IF EXISTS (
          SELECT 1
          FROM dbo.Invoice i
          JOIN dbo.Membership m
            ON m.CustomerId = i.CustomerId AND m.IsActive = 1
          WHERE i.InvoiceId = @invoiceId
            AND NOT EXISTS (
              SELECT 1 FROM dbo.MembershipPointEntry p
              WHERE p.InvoiceId = i.InvoiceId
            )
        )
          THROW 51503, N'Không thể ghi sổ điểm thành viên.', 1;
      `);
    },
    async listRoomTypeServices(roomTypeId = null) {
      const req = new sql.Request(owner);
      let where = "";
      if (roomTypeId !== null && roomTypeId !== undefined) {
        req.input("roomTypeId", sql.VarChar(20), String(roomTypeId));
        where = " WHERE RoomTypeId = @roomTypeId";
      }
      const result = await req.query(`
        SELECT RoomTypeId AS roomTypeId,
               ServiceId AS serviceId,
               IsIncluded AS included
        FROM dbo.RoomTypeService${where}
        ORDER BY RoomTypeId, ServiceId;
      `);
      return result.recordset.map((row) => ({
        roomTypeId: row.roomTypeId,
        serviceId: row.serviceId,
        included: Boolean(row.included),
      }));
    },
    async replaceRoomTypeServices(roomTypeId, rows) {
      ensure(Array.isArray(rows), "Cấu hình dịch vụ không hợp lệ.");
      const remove = new sql.Request(owner);
      remove.input("roomTypeId", sql.VarChar(20), String(roomTypeId));
      await remove.query(
        "DELETE dbo.RoomTypeService WHERE RoomTypeId = @roomTypeId;",
      );
      for (const row of rows) {
        const insert = new sql.Request(owner);
        insert.input("roomTypeId", sql.VarChar(20), String(roomTypeId));
        insert.input("serviceId", sql.VarChar(20), String(row.serviceId));
        insert.input("included", sql.Bit, Boolean(row.included));
        await insert.query(`
          INSERT dbo.RoomTypeService (RoomTypeId, ServiceId, IsIncluded)
          VALUES (@roomTypeId, @serviceId, @included);
        `);
      }
    },
  };
}
module.exports = {
  mode: "sqlserver",
  async init() {
    const pool = await connect();
    try {
      const version = await pool
        .request()
        .query("SELECT MAX(VersionNo) v FROM dbo.SchemaVersion");
      if (version.recordset[0].v !== 5)
        throw new Error(
          "Schema 5 required. For schema 4, run only the BEGIN SEPAY SCHEMA V5 block in database/HotelManagerOOAD.sql.",
        );
      const settings = await pool
        .request()
        .query("SELECT COUNT(*) n FROM dbo.HotelSetting");
      if (settings.recordset[0].n !== 1)
        throw new Error(
          "Chạy database/HotelManagerOOAD.sql để khởi tạo dữ liệu và cấu hình khách sạn.",
        );
    } catch (e) {
      await require("../../config/db").close();
      throw e;
    }
  },
  async list(entity) {
    return client(await connect()).list(entity);
  },
  async find(entity, id) {
    return client(await connect()).find(entity, id);
  },
  async listRoomTypeServices(roomTypeId = null) {
    return client(await connect()).listRoomTypeServices(roomTypeId);
  },
  async transaction(work) {
    const tx = new sql.Transaction(await connect());
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      await new sql.Request(tx).query(
        "SET ANSI_NULLS ON;SET QUOTED_IDENTIFIER ON;SET ANSI_PADDING ON;SET ANSI_WARNINGS ON;SET ARITHABORT ON;SET CONCAT_NULL_YIELDS_NULL ON;SET NUMERIC_ROUNDABORT OFF;DECLARE @r int;EXEC @r=sys.sp_getapplock @Resource=N'HotelManager.WebWrite',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;IF @r<0 THROW 51500,N'Hệ thống đang xử lý, hãy thử lại.',1;",
      );
      const result = await work(client(tx));
      await tx.commit();
      return result;
    } catch (e) {
      try {
        await tx.rollback();
      } catch {}
      throw e;
    }
  },
  close: require("../../config/db").close,
};
