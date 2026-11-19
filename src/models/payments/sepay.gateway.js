const { timingSafeEqual } = require("node:crypto");
const { ensure } = require("../../core/errors/AppError");

function configured(config) {
  ensure(
    config.apiKey.length >= 32 &&
      /^[A-Za-z0-9]+$/.test(config.bankId) &&
      /^[A-Za-z0-9]{6,34}$/.test(config.accountNo) &&
      config.accountName.trim(),
    "Chưa cấu hình đầy đủ tài khoản ngân hàng và webhook SePay trên server.",
    503,
  );
}

function receive(config, header, body) {
  configured(config);
  const expected = Buffer.from("Apikey " + config.apiKey);
  const actual = Buffer.from(typeof header === "string" ? header : "");
  ensure(
    actual.length === expected.length && timingSafeEqual(actual, expected),
    "Webhook SePay chưa được xác thực.",
    401,
  );
  ensure(
    body && !Array.isArray(body) &&
      Number.isSafeInteger(body.id) && body.id > 0 &&
      body.transferType === "in" &&
      Number.isSafeInteger(body.transferAmount) && body.transferAmount > 0 &&
      typeof body.content === "string" && body.content.length <= 2000 &&
      body.accountNumber === config.accountNo,
    "Giao dịch SePay không hợp lệ hoặc sai tài khoản nhận.",
  );
  const codes = body.content.toUpperCase().match(/\bHT[A-F0-9]{24}\b/g) || [];
  ensure(codes.length <= 1, "Nội dung chuyển khoản có nhiều mã thanh toán khách sạn.");
  return {
    code: codes[0] || null,
    transactionId: String(body.id),
    amount: body.transferAmount,
    accountNo: body.accountNumber,
  };
}

function qr(config, intent) {
  configured(config);
  const url = new URL("https://vietqr.app/img");
  url.search = new URLSearchParams({
    acc: config.accountNo,
    bank: config.bankId,
    amount: String(intent.amount),
    des: intent.id,
    template: "compact",
    showinfo: "true",
    holder: config.accountName,
  }).toString();
  return url.href;
}

module.exports = { configured, receive, qr };
