/** Tìm phòng/giữ chỗ online. TODO TV2 B5: countdown và chi tiết. */
export default function installSearch(getContext) {
  document.addEventListener("submit", async (e) => {
    const { api, $, E, money, btn, field, actionForm } = getContext();
    if (e.target.id !== "search-form") return;
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    try {
      const rows = await api("/api/availability?" + new URLSearchParams(b));
      $("#available-results").innerHTML =
        rows
          .map(
            (r) =>
              `<article class="room-result-card"><span class="eyebrow">${E(r.type.name)}</span><h3>${E(r.name)}</h3><p>${r.type.capacity} khách · ${r.type.beds} giường</p><strong>${money(r.quote)}</strong>${btn("Đặt phòng", "customer.book", r.id, "primary")}</article>`,
          )
          .join("") ||
        '<p class="empty">Không có phòng phù hợp. Hãy đổi ngày hoặc số khách.</p>';
      document.querySelectorAll('[data-action="customer.book"]').forEach(
        (el) =>
          (el.onclick = async (ev) => {
            ev.stopPropagation();
            actionForm(
              "Đặt phòng",
              [
                field("roomId", "", "hidden", el.dataset.id),
                ...["startAt", "endAt", "guests"].map((k) =>
                  field(k, "", "hidden", b[k]),
                ),
              ],
              "booking.create",
              "Kiểm tra lại thông tin trước khi xác nhận. Sau khi gửi, nhân viên sẽ liên hệ để xác nhận đặt phòng và tiền cọc.",
            );
          }),
      );
    } catch (err) {
      toast(err.message);
    }
  });
}
