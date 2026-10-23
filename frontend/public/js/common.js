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
  const local = (d) =>
    new Date(d - Date.prototype.getTimezoneOffset.call(new Date()) * 60000)
      .toISOString()
      .slice(0, 16);
  publicSearch.startAt.value = local(Date.now() + 3600000);
  publicSearch.endAt.value = local(Date.now() + 86400000);
  publicSearch.addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(publicSearch));
    b.startAt = new Date(b.startAt).toISOString();
    b.endAt = new Date(b.endAt).toISOString();
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
