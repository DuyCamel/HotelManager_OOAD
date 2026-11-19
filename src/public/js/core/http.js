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
    const hasBody = body !== undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let res;
    try {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
      res = await fetch(url, {
        method: hasBody ? "POST" : "GET",
        headers: hasBody
          ? {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-CSRF-Token": csrf || "",
            }
          : { Accept: "application/json" },
        body: hasBody ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      throw new Error(
        error.name === "AbortError"
          ? "Máy chủ phản hồi quá lâu. Vui lòng thử lại."
          : "Không thể kết nối máy chủ. Kiểm tra kết nối và thử lại.",
      );
    } finally {
      clearTimeout(timeout);
    }

    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      if (
        res.status === 401 &&
        !["/api/login", "/api/register"].includes(new URL(url, location.href).pathname)
      ) {
        const next = encodeURIComponent(location.pathname + location.search);
        location.assign(`/login?next=${next}`);
      }
      const error = new Error(
        data.error ||
          (res.status >= 500
            ? "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."
            : "Yêu cầu không hợp lệ."),
      );
      error.status = res.status;
      throw error;
    }
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
document.querySelector("[data-quick-login]")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-quick-email]");
  const form = document.querySelector('form[data-auth="login"]');
  if (!btn) return;
  if (form) {
    form.elements.email.value = btn.dataset.quickEmail || "";
    form.elements.password.value = btn.dataset.quickPass || "mk1233456";
    const msg = form.querySelector(".form-message");
    if (msg) msg.textContent = "";
  }
  const forgotEmail = document.querySelector("#forgot-email-input");
  if (forgotEmail) {
    forgotEmail.value = btn.dataset.quickEmail || "";
  }
  document
    .querySelectorAll("[data-quick-email]")
    .forEach((el) => el.classList.toggle("is-selected", el === btn));
  if (form && !document.querySelector("#auth-login-panel")?.hidden) {
    form.querySelector('button.primary')?.focus();
  }
});

// Chuyển đổi form Đăng nhập <-> Quên mật khẩu
const loginPanel = document.querySelector("#auth-login-panel");
const forgotPanel = document.querySelector("#auth-forgot-panel");
const forgotForm = document.querySelector("#forgot-password-form");
const forgotMsg = document.querySelector("#forgot-form-message");
const forgotEmailInput = document.querySelector("#forgot-email-input");

function showForgotPanel(prefEmail) {
  if (!forgotPanel || !loginPanel) return;
  const loginEmail = document.querySelector('form[data-auth="login"] input[name="email"]')?.value || "";
  if (forgotEmailInput) {
    forgotEmailInput.value = (prefEmail || loginEmail || "").trim();
  }
  if (forgotMsg) forgotMsg.innerHTML = "";
  loginPanel.hidden = true;
  loginPanel.style.display = "none";
  forgotPanel.hidden = false;
  forgotPanel.style.display = "flex";
  forgotPanel.classList.add("is-active");
  const quickBox = document.querySelector(".quick-login-box");
  if (quickBox) quickBox.style.display = "none";
  forgotEmailInput?.focus();
}

function showLoginPanel() {
  if (!forgotPanel || !loginPanel) return;
  forgotPanel.hidden = true;
  forgotPanel.style.display = "none";
  forgotPanel.classList.remove("is-active");
  loginPanel.hidden = false;
  loginPanel.style.display = "block";
  const quickBox = document.querySelector(".quick-login-box");
  if (quickBox) quickBox.style.display = "block";
  const loginEmailInput = document.querySelector('form[data-auth="login"] input[name="email"]');
  if (loginEmailInput && forgotEmailInput?.value) {
    loginEmailInput.value = forgotEmailInput.value.trim();
  }
  loginEmailInput?.focus();
}

document.querySelectorAll('[data-action="forgot-toggle"]').forEach((el) => {
  el.addEventListener("click", () => showForgotPanel());
});

document.querySelectorAll('[data-action="forgot-back"]').forEach((el) => {
  el.addEventListener("click", () => showLoginPanel());
});

if (location.hash === "#forgot") {
  showForgotPanel();
}

if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (forgotEmailInput?.value || "").trim();
    if (!email || !email.includes("@")) {
      if (forgotMsg) forgotMsg.textContent = "Vui lòng nhập địa chỉ email hợp lệ.";
      return;
    }
    const submitBtn = forgotForm.querySelector("#forgot-submit-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Đang gửi yêu cầu...";
    }
    try {
      await Hotel.api("/api/forgot-password", { email });
    } catch {
      // Thông báo an toàn
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Gửi lại nếu chưa nhận được email";
      }
      if (forgotMsg) {
        forgotMsg.innerHTML = `
          <div class="forgot-notify-box">
            <div class="forgot-notify-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <strong>Đã ghi nhận yêu cầu khôi phục</strong>
            </div>
            <p class="forgot-notify-text">
              Nếu email <strong>${Hotel.escape(email)}</strong> tồn tại trong hệ thống, chúng tôi đã gửi đường dẫn đặt lại mật khẩu tới hòm thư này.
            </p>
            <p class="forgot-notify-sub">
              Vui lòng kiểm tra hộp thư đến (hoặc hòm thư rác/spam). Bạn có thể bấm vào liên kết trong email để đổi mật khẩu mới mà không cần tới khách sạn.
            </p>
            <div class="forgot-notify-actions">
              <button type="button" class="primary" data-action="forgot-back-inline">← Quay lại Đăng nhập ngay</button>
            </div>
          </div>
        `;
        forgotMsg.querySelector('[data-action="forgot-back-inline"]')?.addEventListener("click", showLoginPanel);
      }
    }
  });
}
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
