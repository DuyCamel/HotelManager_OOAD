/** Kiểm tra database ứng dụng chuẩn; không in chuỗi kết nối hoặc mật khẩu. */
const config = require("../src/config/env");
const { connect, close } = require("../src/config/db");

const DATABASE = config.sql.database;
const VERSION = 5;
const requiredColumns = [
  "Booking.CreatedBy",
  "Stay.CreatedBy",
  "Invoice.CustomerId",
  "Invoice.CreatedBy",
  "Invoice.CustomerNameSnapshot",
  "Invoice.RoomNameSnapshot",
  "Invoice.HotelNameSnapshot",
  "Invoice.PaymentReferenceSnapshot",
  "Payment.CreatedBy",
  "PaymentIntent.IntentId",
  "PaymentIntent.IntentKind",
  "PaymentIntent.BookingId",
  "PaymentIntent.StayId",
  "PaymentIntent.Amount",
  "PaymentIntent.Fingerprint",
  "PaymentIntent.AccountNo",
  "PaymentIntent.StatusCode",
  "PaymentIntent.ExpiresAt",
  "PaymentIntent.CreatedAt",
  "PaymentIntent.CreatedBy",
  "PaymentIntent.InvoiceId",
  "SepayReceipt.ReceiptId",
  "SepayReceipt.IntentId",
  "SepayReceipt.Amount",
  "SepayReceipt.AccountNo",
  "SepayReceipt.Code",
  "SepayReceipt.Outcome",
  "SepayReceipt.Reason",
  "SepayReceipt.PaymentId",
  "SepayReceipt.CreatedAt",
  "ServiceUsage.RecordedBy",
  "ServiceUsage.InvoiceId",
  "HolidayRate.ScheduleType",
  "HolidayRate.StartMonthDay",
  "HolidayRate.EndMonthDay",
  "HotelSetting.QrImagePath",
  "Room.ImageGalleryJson",
  "Room.ViewName",
  "Room.Amenities",
];
const requiredObjects = [
  "v_StayCurrentRoom",
  "trg_Invoice_Finalize",
  "trg_InvoiceLine_ImmutablePaid",
  "trg_Payment_ImmutablePaid",
  "trg_ServiceUsage_ProtectBilled",
  "trg_PointEntry_Protect",
  "trg_Membership_ProtectPoints",
  "trg_AuditEvent_AppendOnly",
  "CK_PaymentIntent_Token",
  "CK_PaymentIntent_Amount",
  "CK_PaymentIntent_Status",
  "CK_PaymentIntent_Target",
  "CK_SepayReceipt_Amount",
  "CK_SepayReceipt_Outcome",
  "FK_PaymentIntent_Booking",
  "FK_PaymentIntent_Stay",
  "FK_PaymentIntent_Account",
  "FK_PaymentIntent_Invoice",
  "FK_SepayReceipt_Intent",
  "FK_SepayReceipt_Payment",
];
const requiredIndexes = [
  "PaymentIntent.UX_PaymentIntent_PendingBooking",
  "PaymentIntent.UX_PaymentIntent_PendingStay",
  "SepayReceipt.UX_SepayReceipt_AppliedIntent",
  "SepayReceipt.UX_SepayReceipt_Payment",
];

(async () => {
  try {
    if (config.mode !== "sqlserver")
      throw new Error("Đặt DB_MODE=sqlserver trước khi chạy npm run db:check.");
    const pool = await connect();
    const summary = (
      await pool.request().query(`
        SELECT DB_NAME() AS databaseName,
               (SELECT MAX(VersionNo) FROM dbo.SchemaVersion) AS schemaVersion,
               (SELECT COUNT(*) FROM dbo.Room) AS roomCount,
               (SELECT COUNT(*) FROM dbo.HotelSetting) AS settingCount,
               (SELECT COUNT(*) FROM dbo.Invoice
                WHERE StatusCode = 'PAID'
                  AND (CustomerNameSnapshot IS NULL OR RoomNameSnapshot IS NULL OR HotelNameSnapshot IS NULL)
               ) AS missingInvoiceSnapshots,
               (SELECT COUNT(*) FROM dbo.Payment
                WHERE MethodCode IN ('TRANSFER', 'CARD')
                  AND NULLIF(LTRIM(RTRIM(ExternalReference)), '') IS NULL
               ) AS invalidPaymentReferences,
               (SELECT COUNT(*) FROM sys.check_constraints
                WHERE name = N'CK_Payment_Reference'
               ) AS paymentReferenceConstraints,
               (SELECT CASE
                  WHEN EXISTS (SELECT 1 FROM dbo.SeedHistory WHERE SeedName = N'realistic_3roomtypes_v2')
                   AND NOT EXISTS (SELECT 1 FROM dbo.SeedHistory WHERE SeedName = N'pricing_snapshot_v4')
                  THEN 1 ELSE 0 END
               ) AS missingSeedMigration,
               (SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled = 0 AND is_not_trusted = 0) AS trustedForeignKeys;
      `)
    ).recordset[0];
    if (summary.databaseName !== DATABASE)
      throw new Error(
        `Đang kết nối nhầm database ${summary.databaseName}; cần ${DATABASE} theo DB_NAME.`,
      );
    if (summary.schemaVersion !== VERSION)
      throw new Error(
        `SchemaVersion=${summary.schemaVersion ?? "NULL"}; cần ${VERSION}. Với schema 4, chỉ chạy block BEGIN SEPAY SCHEMA V5 trong database/HotelManagerOOAD.sql.`,
      );
    if (summary.settingCount !== 1)
      throw new Error("HotelSetting phải có đúng một dòng.");
    if (summary.missingInvoiceSnapshots)
      throw new Error(
        `${summary.missingInvoiceSnapshots} hóa đơn PAID thiếu snapshot chứng từ.`,
      );
    if (summary.invalidPaymentReferences)
      throw new Error(
        `${summary.invalidPaymentReferences} thanh toán điện tử thiếu mã giao dịch.`,
      );
    if (summary.paymentReferenceConstraints !== 1)
      throw new Error("Thiếu CK_Payment_Reference.");
    if (summary.missingSeedMigration)
      throw new Error("Dữ liệu phát triển chưa chạy migration pricing_snapshot_v4.");

    const columns = await pool.request().query(`
      SELECT OBJECT_NAME(c.object_id) + '.' + c.name AS columnName
      FROM sys.columns AS c
      WHERE c.object_id IN (
        OBJECT_ID(N'dbo.Booking'), OBJECT_ID(N'dbo.Stay'),
        OBJECT_ID(N'dbo.Invoice'), OBJECT_ID(N'dbo.Payment'),
        OBJECT_ID(N'dbo.ServiceUsage'), OBJECT_ID(N'dbo.HolidayRate'),
        OBJECT_ID(N'dbo.HotelSetting'), OBJECT_ID(N'dbo.Room'),
        OBJECT_ID(N'dbo.PaymentIntent'), OBJECT_ID(N'dbo.SepayReceipt')
      );
    `);
    const presentColumns = new Set(columns.recordset.map((x) => x.columnName));
    const missingColumns = requiredColumns.filter((x) => !presentColumns.has(x));
    if (missingColumns.length)
      throw new Error(`Thiếu cột schema: ${missingColumns.join(", ")}.`);

    const objects = await pool.request().query(`
      SELECT name FROM sys.objects
      WHERE schema_id = SCHEMA_ID(N'dbo')
        AND name IN (${requiredObjects.map((x) => `N'${x}'`).join(",")});
    `);
    const presentObjects = new Set(objects.recordset.map((x) => x.name));
    const missingObjects = requiredObjects.filter((x) => !presentObjects.has(x));
    if (missingObjects.length)
      throw new Error(`Thiếu object bảo vệ: ${missingObjects.join(", ")}.`);

    const indexes = await pool.request().query(`
      SELECT OBJECT_NAME(object_id) + '.' + name AS indexName
      FROM sys.indexes
      WHERE object_id IN (OBJECT_ID(N'dbo.PaymentIntent'), OBJECT_ID(N'dbo.SepayReceipt'))
        AND is_unique = 1 AND has_filter = 1 AND is_disabled = 0;
    `);
    const presentIndexes = new Set(indexes.recordset.map((x) => x.indexName));
    const missingIndexes = requiredIndexes.filter((x) => !presentIndexes.has(x));
    if (missingIndexes.length)
      throw new Error(`Missing SePay unique indexes: ${missingIndexes.join(", ")}.`);

    console.log(
      `Kết nối thành công. Database: ${summary.databaseName} | Schema: ${summary.schemaVersion} | Phòng: ${summary.roomCount} | FK tin cậy: ${summary.trustedForeignKeys}`,
    );
  } catch (e) {
    console.error("Kết nối thất bại:", e.message);
    process.exitCode = 1;
  } finally {
    await close();
  }
})();
