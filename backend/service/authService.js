/** Đăng nhập bằng EMAIL duy nhất; OTP local có hạn và số lần thử, không có username. */
const v = require("../shared/validation");
const passwords = require("../shared/passwords");
const { ensure } = require("../shared/errors");
const { allow } = require("../shared/permissions");
const { audit } = require("./helpers");
const config = require("../config/env");
const { randomInt, randomUUID } = require("node:crypto");
module.exports = (repo) => {
  const challenges = new Map();
  return {
    epoch: 0,
    async login(body) {
      const email = v.email(body.email);
      const password = v.password(body.password);
      const account = (await repo.list("accounts")).find(
        (a) => a.email.toLowerCase() === email,
      );
      ensure(
        account &&
          account.isActive &&
          (await passwords.verify(password, account.passwordHash)),
        "Email hoặc mật khẩu không đúng, hoặc tài khoản bị khóa.",
        401,
      );
      return account;
    },
    async register(body) {
      const email = v.email(body.email),
        name = v.text(body.name, "Họ tên", 120),
        phone = v.phone(body.phone),
        password = v.password(body.password);
      ensure(password.length >= 8, "Mật khẩu tối thiểu 8 ký tự.");
      ensure(
        password === body.confirmPassword,
        "Mật khẩu nhập lại không khớp.",
      );
      const passwordHash = await passwords.hash(password);
      return repo.transaction(async (tx) => {
        ensure(
          !(await tx.list("accounts")).some(
            (a) => a.email.toLowerCase() === email,
          ),
          "Email đã được sử dụng.",
          409,
        );
        const id = v.id("TK");
        await tx.insert("accounts", {
          id,
          email,
          name,
          phone,
          passwordHash,
          role: "CUSTOMER",
          isActive: true,
          authVersion: 0,
          createdAt: new Date().toISOString(),
        });
        await tx.insert("customers", {
          id: v.id("KH"),
          name,
          phone,
          identityNo: null,
          address: "",
          accountId: id,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
        await audit(tx, { id }, "Đăng ký khách hàng", "ACCOUNT", id);
        return { email };
      });
    },
    async challenge(user, sessionId, body) {
      allow(user, "admin");
      ensure(
        config.otpProvider === "demo" && !config.production,
        "Chưa cấu hình nhà cung cấp SMS. Chuyển Admin chưa khả dụng.",
        503,
      );
      const target = await repo.find("accounts", body.targetId);
      ensure(
        target && target.isActive && target.role === "MANAGER",
        "Người nhận phải là Quản lý đang hoạt động.",
      );
      for (const [id, c] of challenges)
        if (c.actor === user.id || c.expires < Date.now())
          challenges.delete(id);
      const id = randomUUID(),
        code = String(randomInt(1000000)).padStart(6, "0");
      challenges.set(id, {
        actor: user.id,
        sessionId,
        target: target.id,
        code,
        expires: Date.now() + 300000,
        attempts: 0,
      });
      return {
        requestId: id,
        demoCode: code,
        maskedPhone: "*******" + user.phone.slice(-3),
        expiresIn: 300,
        provider: "DEMO",
      };
    },
    async transfer(user, sessionId, body) {
      allow(user, "admin");
      const c = challenges.get(body.requestId);
      ensure(
        c && c.actor === user.id && c.sessionId === sessionId,
        "Yêu cầu OTP không hợp lệ.",
      );
      if (c.expires < Date.now() || c.attempts >= 5) {
        challenges.delete(body.requestId);
        ensure(false, "OTP hết hạn hoặc vượt số lần thử.");
      }
      if (c.code !== String(body.code)) {
        c.attempts++;
        ensure(false, "OTP sai. Còn " + Math.max(0, 5 - c.attempts) + " lần.");
      }
      challenges.delete(body.requestId);
      await repo.transaction(async (tx) => {
        const old = await tx.find("accounts", user.id),
          next = await tx.find("accounts", c.target);
        ensure(
          old?.role === "ADMIN" &&
            old.isActive &&
            next?.role === "MANAGER" &&
            next.isActive,
          "Điều kiện chuyển quyền đã thay đổi.",
        );
        await tx.update("accounts", old.id, {
          role: "MANAGER",
          authVersion: old.authVersion + 1,
        });
        await tx.update("accounts", next.id, {
          role: "ADMIN",
          authVersion: next.authVersion + 1,
        });
        await audit(
          tx,
          user,
          "Chuyển Admin",
          "ACCOUNT",
          next.id,
          "OTP demo local",
        );
      });
      return { message: "Đã chuyển quyền. Vui lòng đăng nhập lại." };
    },
  };
};
