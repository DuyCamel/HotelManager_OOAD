/**
 * TASK-BAN-GIAO (TODO) | Phụ trách: TV1 | Mã việc: A1, A6, B5
 * Đây là việc còn lại/nghiệm thu, không phải mô tả tính năng đã hoàn tất.
 * Hoàn thiện lỗi mạng/JSON/401/403, loading và chống gửi lặp; TV2 phụ trách trải nghiệm tìm/giữ phòng khách.
 * Không chỉ đổi thông báo UI để che lỗi đặt cùng ngày B1 ở backend.
 * Chi tiết, phụ thuộc và tiêu chí xong: docs/PHAN_CONG_3_NGUOI.md.
 */
/** Tiện ích HTTP dùng CSRF và biểu mẫu tài khoản/trang công khai. */
window.Hotel = {
  async api(url, body) {
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: body
        ? {
            "Content-Type": "application/json",
            "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')
              .content,
          }
        : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Yêu cầu thất bại.");
    return data;
  },
  money: (n) => Number(n || 0).toLocaleString("vi-VN") + " ₫",
  escape: (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
};
document.querySelector("[data-auth]")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target,
    msg = form.querySelector(".form-message"),
    btn = form.querySelector("button");
  btn.disabled = true;
  try {
    const r = await Hotel.api(
      "/api/" + form.dataset.auth,
      Object.fromEntries(new FormData(form)),
    );
    if (r.redirect) location.href = r.redirect;
    else {
      msg.textContent = "Đăng ký thành công. Bạn có thể đăng nhập.";
      setTimeout(() => (location.href = "/login"), 1200);
    }
  } catch (err) {
    msg.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});
document
  .querySelector("#print")
  ?.addEventListener("click", () => window.print());
const publicSearch = document.querySelector("#public-search");
if (publicSearch) {
  const localDate = (d) =>
    new Date(d - Date.prototype.getTimezoneOffset.call(new Date()) * 60000)
      .toISOString()
      .slice(0, 10);
  publicSearch.startAt.value = localDate(Date.now() + 86400000);
  publicSearch.endAt.value = localDate(Date.now() + 2 * 86400000);
  publicSearch.addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(publicSearch));
    try {
      const rows = await Hotel.api(
        "/api/availability?" + new URLSearchParams(b),
      );
      document.querySelector("#search-results").innerHTML =
        "<h3>" +
        rows.length +
        ' phòng phù hợp</h3><div class="search-cards">' +
        rows
          .map(
            (r) =>
              "<article><strong>" +
              Hotel.escape(r.name) +
              "</strong><p>" +
              Hotel.escape(r.type.name) +
              " · " +
              r.type.capacity +
              " khách</p><b>" +
              Hotel.money(r.quote) +
              '</b><a class="primary" href="/portal">Đăng nhập để đặt →</a></article>',
          )
          .join("") +
        "</div>";
      document.querySelector("#rooms").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      document.querySelector(".form-message").textContent = err.message;
    }
  });
}
