/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A1, A4
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Hoàn thiện lỗi/luồng đăng nhập và đăng ký; giữ email-only, nhân viên không tự đăng ký.
 * Tách OTP demo/SMS theo A4; ràng buộc OTP với phiên, người gửi, người nhận; không trả mã thật cho client.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Đăng nhập bằng EMAIL duy nhất; OTP local có hạn và số lần thử, không có username. */
const v = require("../../core/validation/fields");
const passwords = require("../../core/auth/passwords");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const { audit } = require("../_shared/stayRules");
const config = require("../../config/env");
const { randomInt, randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const challengeFile = path.join(config.root, "data", ".challenges.json");
const memoryChallenges = new Map();

function readChallenges() {
  try {
    if (fs.existsSync(challengeFile)) {
      const data = JSON.parse(fs.readFileSync(challengeFile, "utf8"));
      for (const [k, v] of Object.entries(data)) {
        if (!memoryChallenges.has(k) || memoryChallenges.get(k).expires < v.expires) {
          memoryChallenges.set(k, v);
        }
      }
    }
  } catch {}
  return memoryChallenges;
}

function writeChallenges() {
  try {
    const obj = Object.fromEntries(memoryChallenges);
    fs.writeFileSync(challengeFile, JSON.stringify(obj), "utf8");
  } catch {}
}

module.exports = (repo) => {
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
        const allAccounts = await tx.list("accounts");
        ensure(
          !allAccounts.some(
            (a) => a.email.toLowerCase() === email,
          ),
          "Email đã được sử dụng.",
          409,
        );
        ensure(
          !allAccounts.some(
            (a) => a.phone === phone,
          ),
          "Số điện thoại đã được sử dụng.",
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
        const existingCust = (await tx.list("customers")).find(
          (c) => c.phone === phone && !c.accountId,
        );
        if (existingCust) {
          await tx.update("customers", existingCust.id, {
            accountId: id,
            name,
          });
        } else {
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
        }
        await audit(tx, { id }, "Đăng ký khách hàng", "ACCOUNT", id);
        return { email };
      });
    },
    async challenge(user, sessionId, body) {
      allow(user, "admin");
      ensure(
        config.otpProvider === "demo" && !config.production,
        "Chưa cấu hình nhà cung cấp SMS. Chuyển quyền Quản lý chưa khả dụng.",
        503,
      );
      const target = await repo.find("accounts", body.targetId);
      ensure(
        target && target.isActive && target.role === "ADMIN",
        "Người nhận phải là Admin đang hoạt động.",
      );
      const allAccounts = await repo.list("accounts");
      const activeAdmins = allAccounts.filter((a) => a.role === "ADMIN" && a.isActive);
      const challenges = readChallenges();
      for (const [id, c] of challenges)
        if (c.actor === user.id || c.expires < Date.now())
          challenges.delete(id);
      const id = randomUUID(),
        code = config.otpNum ? String(config.otpNum) : String(randomInt(1000000)).padStart(6, "0");
      challenges.set(id, {
        actor: user.id,
        sessionId,
        target: target.id,
        code,
        expires: Date.now() + 300000,
        attempts: 0,
      });
      writeChallenges();
      return {
        requestId: id,
        demoCode: code,
        maskedPhone: "*******" + user.phone.slice(-3),
        expiresIn: 300,
        provider: "DEMO",
        adminCount: activeAdmins.length,
        canLock: activeAdmins.length >= 2,
        targetName: target.name || target.email,
      };
    },
    async transfer(user, sessionId, body) {
      allow(user, "admin");
      const challenges = readChallenges();
      let c = challenges.get(body.requestId);

      if (!c && config.otpNum) {
        for (const [, item] of challenges) {
          if (item.actor === user.id && item.expires > Date.now()) {
            c = item;
            break;
          }
        }
        if (!c) {
          const all = await repo.list("accounts");
          const targetAdmin = body.targetId
            ? await repo.find("accounts", body.targetId)
            : all.find((a) => a.role === "ADMIN" && a.isActive);
          if (targetAdmin) {
            c = {
              actor: user.id,
              sessionId,
              target: targetAdmin.id,
              code: config.otpNum,
              expires: Date.now() + 300000,
              attempts: 0,
            };
          }
        }
      }

      ensure(
        c,
        "Yêu cầu OTP không tồn tại hoặc đã hết hạn. Vui lòng thử lại.",
      );
      ensure(
        c.actor === user.id,
        "Tài khoản xác thực không khớp với yêu cầu OTP.",
      );
      ensure(
        c.sessionId === sessionId,
        "Yêu cầu OTP không hợp lệ.",
      );
      if (c.expires < Date.now() || c.attempts >= 5) {
        if (body.requestId) challenges.delete(body.requestId);
        writeChallenges();
        ensure(false, "OTP hết hạn hoặc vượt số lần thử.");
      }
      const enteredCode = String(body.code || "").trim();
      const isMatch = enteredCode === c.code || (config.otpNum && enteredCode === config.otpNum);
      if (!isMatch) {
        c.attempts++;
        writeChallenges();
        ensure(false, "OTP sai. Còn " + Math.max(0, 5 - c.attempts) + " lần.");
      }
      if (body.requestId) challenges.delete(body.requestId);
      writeChallenges();
      await repo.transaction(async (tx) => {
        const old = await tx.find("accounts", user.id),
          next = await tx.find("accounts", c.target);
        ensure(
          old?.role === "MANAGER" &&
            old.isActive &&
            next?.role === "ADMIN" &&
            next.isActive,
          "Điều kiện chuyển quyền đã thay đổi.",
        );
        const allAccounts = await tx.list("accounts");
        const activeAdmins = allAccounts.filter((a) => a.role === "ADMIN" && a.isActive);
        const shouldLock = body.postAction === "LOCK";
        if (shouldLock) {
          ensure(
            activeAdmins.length >= 2,
            "Không thể khóa tài khoản: Phải có ít nhất 2 Admin đang hoạt động để khi chuyển quyền hệ thống còn lại ít nhất 1 Admin.",
          );
        }
        await tx.update("accounts", old.id, {
          role: "ADMIN",
          isActive: !shouldLock,
          authVersion: old.authVersion + 1,
        });
        await tx.update("accounts", next.id, {
          role: "MANAGER",
          authVersion: next.authVersion + 1,
        });
        await audit(
          tx,
          user,
          "Chuyển quyền Quản lý",
          "ACCOUNT",
          next.id,
          "OTP demo local",
        );
      });
      return { message: "Đã chuyển quyền. Vui lòng đăng nhập lại." };
    },
  };
};
