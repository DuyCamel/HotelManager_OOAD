/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV3 | Mã việc: C3
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Bổ sung truy vấn nhiệm vụ/hạn dọn/lịch sử ảnh cho sơ đồ tự cập nhật; không chỉ dựa vào trạng thái phòng phía client.
 * Nghiệm thu báo hỏng, sửa xong/dọn xong, không chuyển trống khi còn khách; Buồng phòng chỉ có sơ đồ nghiệp vụ.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Buồng phòng chỉ dùng sơ đồ: hoàn tất dọn hoặc ghi hư hại kèm ảnh. */
const v = require("../../core/validation/fields");
const { ensure } = require("../../core/errors/AppError");
const { allow } = require("../../core/auth/rbac");
const h = require("../_shared/stayRules");
module.exports = (repo) => ({
  async clean(user, b) {
    allow(user, "clean");
    return repo.transaction(async (tx) => {
      const room = await tx.find("rooms", b.id);
      ensure(
        room && ["DIRTY", "MAINTENANCE"].includes(room.status),
        "Phòng không ở trạng thái cần dọn/bảo trì.",
      );
      const activeStays = new Set((await tx.list("stays")).filter((s) => !s.checkOutAt).map((s) => s.id));
      ensure(
        !(await tx.list("history")).some((h) => h.roomId === room.id && !h.toAt && activeStays.has(h.stayId)),
        "Phòng còn khách.",
      );
      for (const task of await tx.list("tasks"))
        if (task.roomId === room.id && task.status !== "DONE")
          await tx.update("tasks", task.id, {
            status: "DONE",
            completedAt: new Date().toISOString(),
          });
      await tx.update("rooms", room.id, { status: "AVAILABLE" });
      await h.audit(tx, user, "Hoàn tất dọn/bảo trì", "ROOM", room.id);
      return { ok: true };
    });
  },
  async damage(user, b) {
    allow(user, "clean");
    return repo.transaction(async (tx) => {
      const room = await tx.find("rooms", b.id);
      ensure(
        room && !["OCCUPIED", "DISABLED"].includes(room.status),
        "Không báo bảo trì cho phòng đang ở hoặc ngừng hoạt động.",
      );
      const task = (await tx.list("tasks")).find(
        (t) => t.roomId === room.id && t.status === "OPEN",
      );
      if (task) await tx.update("tasks", task.id, { status: "MAINTENANCE" });
      const row = {
        id: v.id("HH"),
        roomId: room.id,
        taskId: task?.id || null,
        description: v.text(b.description, "Mô tả hư hại", 1000),
        photoPath: v.text(b.photoPath, "Ảnh đính kèm", 512),
        reportedAt: new Date().toISOString(),
        reportedBy: user.id,
      };
      ensure(
        /^data\/uploads\/[a-f0-9-]+\.(png|jpg)$/.test(row.photoPath),
        "Ảnh chưa được tải lên máy chủ.",
      );
      await tx.insert("damages", row);
      await tx.update("rooms", room.id, {
        status: "MAINTENANCE",
        note: row.description,
      });
      await h.audit(tx, user, "Báo hư hại", "ROOM", room.id);
      return row;
    });
  },
});
