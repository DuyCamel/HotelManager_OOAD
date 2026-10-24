/** UI reports. TODO TV3: nhiệm vụ cụ thể trong docs/MODULES.md và PHAN_CONG_3_NGUOI.md. */
export default function createModule(ctx) {
  const { money, E, $, btn, field, d, page } = ctx;
  function report() {
    const paid = d.invoices.filter((x) => x.status === "PAID");
    let from = $("#report-from")?.value || "",
      to = $("#report-to")?.value || "";
    const rows = paid.filter(
      (i) =>
        (!from || i.issuedAt.slice(0, 10) >= from) &&
        (!to || i.issuedAt.slice(0, 10) <= to),
    );
    const sum = (k) => rows.reduce((s, r) => s + Number(r[k]), 0);
    const total =
      sum("roomCharge") +
      sum("serviceCharge") +
      sum("surcharge") -
      sum("discount");
    const months = {};
    rows.forEach((r) => {
      const k = r.issuedAt.slice(0, 7);
      months[k] =
        (months[k] || 0) +
        r.roomCharge +
        r.serviceCharge +
        r.surcharge -
        r.discount;
    });
    const max = Math.max(1, ...Object.values(months));
    return `<div class="panel report-filter"><label>Từ ngày<input type="date" id="report-from" value="${E(from)}"></label><label>Đến ngày<input type="date" id="report-to" value="${E(to)}"></label>${btn("Áp dụng", "report.filter")}${btn("Xuất CSV", "report.export")}</div><div class="stats"><article><div><span>Doanh thu đã ghi nhận</span><strong class="money-stat">${money(total)}</strong></div></article><article><div><span>Tiền phòng</span><strong class="money-stat">${money(sum("roomCharge"))}</strong></div></article><article><div><span>Dịch vụ</span><strong class="money-stat">${money(sum("serviceCharge"))}</strong></div></article><article><div><span>Hóa đơn thanh toán</span><strong>${rows.length}</strong></div></article></div><div class="panel chart"><h3>Doanh thu theo tháng</h3>${
      Object.entries(months)
        .sort()
        .map(
          ([m, n]) =>
            `<div class="bar-row"><span>${m}</span><meter min="0" max="${max}" value="${n}"></meter><b>${money(n)}</b></div>`,
        )
        .join("") || '<p class="empty">Chưa có doanh thu trong khoảng này.</p>'
    }</div><p class="muted">Ngày lọc theo UTC trong dữ liệu. Doanh thu = tiền phòng + dịch vụ + phụ thu − giảm giá; tiền cọc không tính hai lần.</p>`;
  }
  return {
    render() {
      let html = "";
      switch (page) {
        case "reports":
          html = report();
          break;
      }
      return html;
    },
    async act(action, id) {
      const hidden = () => field("id", "", "hidden", id);
      if (action === "report.filter") {
        const html = report();
        $("#page-content").innerHTML = html;
        return;
      }
      if (action === "report.export") {
        const from = $("#report-from").value,
          to = $("#report-to").value;
        const rows = d.invoices.filter(
          (r) =>
            r.status === "PAID" &&
            (!from || r.issuedAt.slice(0, 10) >= from) &&
            (!to || r.issuedAt.slice(0, 10) <= to),
        );
        const csv =
          "\uFEFF" +
          [
            [
              "Ma hoa don",
              "Ngay UTC",
              "Tien phong",
              "Dich vu",
              "Phu thu",
              "Giam gia",
              "Doanh thu",
            ],
            ...rows.map((r) => [
              r.id,
              r.issuedAt,
              r.roomCharge,
              r.serviceCharge,
              r.surcharge,
              r.discount,
              r.roomCharge + r.serviceCharge + r.surcharge - r.discount,
            ]),
          ]
            .map((a) =>
              a.map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(","),
            )
            .join("\r\n");
        const url = URL.createObjectURL(
          new Blob([csv], { type: "text/csv;charset=utf-8" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "doanh-thu.csv";
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    },
    report,
  };
}
