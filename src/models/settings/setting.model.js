/** Admin/Manager-managed hotel identity and manual bank-transfer instructions. */
const { allow } = require("../../core/auth/rbac");
const { ensure } = require("../../core/errors/AppError");
const v = require("../../core/validation/fields");
const { audit } = require("../_shared/stayRules");

const optionalText = (value, label, max) => {
  if (value === undefined || value === null || String(value).trim() === "")
    return null;
  return v.text(String(value), label, max);
};

module.exports = (repo) => ({
  async settings(user, body) {
    allow(user, "config");
    const bankCode = optionalText(body.bankCode, "Ngân hàng", 30);
    const bankAccount = optionalText(body.bankAccount, "Số tài khoản", 40);
    const bankOwner = optionalText(body.bankOwner, "Chủ tài khoản", 150);
    const qrImagePath = optionalText(
      body.qrImagePath,
      "Đường dẫn ảnh QR",
      512,
    );
    const bankParts = [bankCode, bankAccount, bankOwner].filter(Boolean).length;
    ensure(
      bankParts === 0 || bankParts === 3,
      "Thông tin chuyển khoản phải có đủ ngân hàng, số tài khoản và chủ tài khoản.",
    );
    ensure(
      !qrImagePath || bankParts === 3,
      "Chỉ cấu hình ảnh QR khi đã có đủ thông tin tài khoản ngân hàng.",
    );
    ensure(
      !qrImagePath ||
        (/^\/assets\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp)$/i.test(
          qrImagePath,
        ) &&
          !qrImagePath.includes("..")),
      "Ảnh QR phải là đường dẫn PNG/JPG/WEBP nội bộ dưới /assets/.",
    );
    const row = {
      hotelName: v.text(body.hotelName, "Tên khách sạn", 200),
      address: v.text(body.address, "Địa chỉ", 512),
      hotline: v.phone(body.hotline),
      checkInTime: "14:00:00",
      checkOutTime: "12:00:00",
      lateFeeFrom: v.text(body.lateFeeFrom, "Giờ phụ thu", 8),
      lateFeePercent: v.number(body.lateFeePercent, "Phụ thu %", 0, 100),
      bankCode,
      bankAccount,
      bankOwner,
      qrImagePath,
    };
    for (const key of ["checkInTime", "checkOutTime", "lateFeeFrom"])
      ensure(
        /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(row[key]),
        "Giờ không hợp lệ.",
      );
    await repo.transaction(async (tx) => {
      await tx.update("settings", 1, row);
      await audit(
        tx,
        user,
        "Cập nhật cấu hình",
        "SETTING",
        "1",
        bankParts === 3
          ? "Đã cấu hình hướng dẫn chuyển khoản thủ công"
          : "Không cấu hình chuyển khoản",
      );
    });
    return { message: "Đã cập nhật cấu hình khách sạn." };
  },
});
