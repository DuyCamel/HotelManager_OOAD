import roomFields from "./fields.js";
import roomTypeFields from "../room-types/fields.js";
import serviceFields from "../services/fields.js";
import holidayFields from "../holiday-rates/fields.js";
import {
  defaultRoomImages,
  effectiveRoomImages,
  galleryFromInput,
  roomDetails,
  safeImageUrl,
} from "./metadata.js";

const fieldBuilders = {
  rooms: roomFields,
  types: roomTypeFields,
  services: serviceFields,
  holidays: holidayFields,
};
const paths = {
  rooms: "rooms",
  types: "room-types",
  services: "services",
  holidays: "holiday-rates",
};
const tabLabels = {
  rooms: "Phòng",
  types: "Loại phòng & giá",
  services: "Dịch vụ",
  holidays: "Lịch giá lễ",
};
let behaviorInstalled = false;

function installCatalogAssets() {
  if (!document.querySelector('link[data-catalog-styles]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/assets/css/workspace/catalog.css";
    link.dataset.catalogStyles = "true";
    document.head.append(link);
  }
  if (behaviorInstalled) return;
  behaviorInstalled = true;
  document.addEventListener(
    "error",
    (event) => {
      if (!event.target.matches?.("img.catalog-image")) return;
      event.target.hidden = true;
      event.target.closest(".catalog-media")?.classList.add("image-missing");
    },
    true,
  );
}

function annualLabel(row) {
  return `${row.startMonthDay || "--"} → ${row.endMonthDay || "--"}`;
}

function availabilityBadge(active) {
  return `<span class="badge ${active ? "ACTIVE" : "DISABLED"}">${active ? "Đang cung cấp" : "Đã ngừng"}</span>`;
}

/** UI riêng cho danh mục quản lý; không dùng sơ đồ phòng vận hành. */
export default function createModule(ctx) {
  const {
    money,
    E,
    name,
    badge,
    btn,
    field,
    opts,
    actionForm,
    table,
    d,
    page,
    query,
    catalog,
    $,
  } = ctx;

  function currentKind() {
    const stored = sessionStorage.getItem("catalogTab") || "rooms";
    return catalog && Object.hasOwn(paths, stored) ? stored : "services";
  }

  function tabs(kind) {
    if (!catalog)
      return '<div class="catalog-readonly"><strong>Danh mục chỉ đọc</strong><span>Đơn giá hiện hành phục vụ ghi nhận phát sinh.</span></div>';
    return `<nav class="catalog-tabs" aria-label="Nhóm danh mục">${Object.entries(
      tabLabels,
    )
      .map(
        ([key, label]) =>
          `<a class="${kind === key ? "active" : ""}" href="/app/${paths[key]}" ${kind === key ? 'aria-current="page"' : ""}>${E(label)}</a>`,
      )
      .join("")}</nav>`;
  }

  function roomCards(rows) {
    const filtered = rows.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
    );
    return `<div class="catalog-toolbar">
      <div class="catalog-toolbar-actions">
        <label class="search-box">⌕ <input id="table-search" aria-label="Tìm phòng" placeholder="Tìm tên, mã, loại, trạng thái…" value="${E(query)}"></label>
        ${catalog ? `<button type="button" class="catalog-btn-quick" data-action="catalog.bulkEditPrompt">⚡ Sửa nhanh</button>` : ""}
      </div>
      <span>${filtered.length} / ${rows.length} phòng</span>
    </div><div class="catalog-room-grid">${
      filtered
        .map((room) => {
          const type = d.types.find((item) => item.id === room.typeId);
          const details = roomDetails(room);
          const images = effectiveRoomImages(room);
          const image = images[0];
          return `<article class="catalog-room-card" data-room-card-id="${E(room.id)}">
            <div class="catalog-media${image ? "" : " image-missing"}">
              <div class="catalog-image-placeholder"><span>AURORA</span><b>${E(room.id)}</b></div>
              ${image ? `<img class="catalog-image" src="${E(image)}" alt="${E(room.name)}" loading="lazy" referrerpolicy="no-referrer">` : ""}
              <span class="catalog-status">${badge(room.status)}</span>
              <span class="gallery-count">${images.length} ảnh</span>
            </div>
            <div class="catalog-room-body">
              <div class="catalog-card-heading"><div><small>${E(room.id)}</small><h3>${E(room.name)}</h3></div><strong>${money(type?.nightlyPrice || 0)}<span>/đêm</span></strong></div>
              <p class="catalog-type-line">${E(type?.name || room.typeId)} · ${type?.capacity || "—"} khách · ${type?.beds || "—"} giường</p>
              <div class="catalog-tags">${details.viewName ? `<span>${E(details.viewName)}</span>` : ""}${type?.amenities ? `<span>${E(type.amenities)}</span>` : ""}</div>
              ${details.note ? `<p class="catalog-note">${E(details.note)}</p>` : ""}
              ${catalog ? `<div class="catalog-card-actions">${btn("Chỉnh sửa", "catalog.edit", room.id, "accent")}${["AVAILABLE", "DISABLED"].includes(room.status) ? btn(room.status === "DISABLED" ? "Mở phòng" : "Khóa phòng", "catalog.toggle", room.id) : ""}</div>` : ""}
            </div>
          </article>`;
        })
        .join("") || '<p class="catalog-empty">Không có phòng phù hợp bộ lọc.</p>'
    }</div>`;
  }

  function typeTable() {
    return table(d.types, [
      ["Loại phòng", (row) => `<strong>${E(row.name)}</strong><small>${E(row.id)}</small>`],
      ["Sức chứa", (row) => `${row.capacity} khách<small>${row.beds} giường</small>`],
      [
        "Giá cơ bản",
        (row) => `<strong>${money(row.nightlyPrice)}</strong><small>mỗi đêm · thuộc loại phòng</small>`,
      ],
      [
        "Tiện nghi & dịch vụ",
        (row) => {
          if (!Array.isArray(row.serviceConfig))
            return `${E(row.amenities || "Chưa mô tả")}<small>Chưa có dữ liệu liên kết dịch vụ từ adapter.</small>`;
          const config = row.serviceConfig;
          const included = config.filter((item) => item.included).length;
          const available = config.length - included;
          return `${E(row.amenities || "Chưa mô tả")}<small>${included} bao gồm · ${available} có tính phí</small>`;
        },
      ],
      ["Thao tác", (row) => (catalog ? btn("Chỉnh sửa", "catalog.edit", row.id) : "")],
    ]);
  }

  function serviceTable() {
    return table(d.services, [
      ["Dịch vụ", (row) => `<strong>${E(row.name)}</strong><small>${E(row.id)}</small>`],
      ["Mô tả", (row) => `${E(row.description || "—")}<small>Đơn vị: ${E(row.unit)}</small>`],
      ["Đơn giá", (row) => `<strong>${money(row.price)}</strong>`],
      ["Trạng thái", (row) => availabilityBadge(row.isActive)],
      [
        "Thao tác",
        (row) =>
          catalog
            ? btn("Chỉnh sửa", "catalog.edit", row.id) +
              btn(row.isActive ? "Ngừng" : "Mở", "catalog.toggle", row.id)
            : '<span class="muted">Chỉ đọc</span>',
      ],
    ]);
  }

  function holidayTable() {
    return table(d.holidays, [
      ["Tên lịch", (row) => `<strong>${E(row.name)}</strong><small>${E(row.id)}</small>`],
      ["Loại phòng", (row) => E(name("types", row.typeId))],
      [
        "Chu kỳ",
        (row) =>
          row.scheduleType === "ANNUAL"
            ? `<span class="schedule-pill annual">Hằng năm</span><small>${E(annualLabel(row))}${row.startMonthDay > row.endMonthDay ? " · qua năm mới" : ""}</small>`
            : `<span class="schedule-pill once">Một lần</span><small>${E(row.startDate?.slice(0, 10) || "—")} → ${E(row.endDate?.slice(0, 10) || "—")}</small>`,
      ],
      ["Điều chỉnh", (row) => `<strong class="rate-up">+${E(row.percent)}%</strong>`],
      ["Trạng thái", (row) => availabilityBadge(row.isActive)],
      [
        "Thao tác",
        (row) =>
          catalog
            ? btn("Chỉnh sửa", "catalog.edit", row.id) +
              btn(row.isActive ? "Ngừng" : "Kích hoạt", "catalog.toggle", row.id)
            : "",
      ],
    ]);
  }

  function catalogPanel() {
    installCatalogAssets();
    const kind = currentKind();
    if (!catalog) $("#page-actions").innerHTML = "";
    const descriptions = {
      rooms: ["Hồ sơ phòng", "Ảnh phòng, hướng nhìn/vị trí và trạng thái quản lý."],
      types: ["Loại phòng", "Nguồn duy nhất của sức chứa và giá cơ bản mỗi đêm."],
      services: ["Danh mục dịch vụ", catalog ? "Quản lý đơn vị, đơn giá và khả năng cung cấp." : "Tra cứu đơn giá hiện hành; không thể thay đổi."],
      holidays: ["Lịch giá lễ", "Tách rõ lịch một lần và ngày lễ lặp hằng năm."],
    };
    const [title, description] = descriptions[kind];
    const body =
      kind === "rooms"
        ? roomCards(d.rooms)
        : kind === "types"
          ? typeTable()
          : kind === "services"
            ? serviceTable()
            : holidayTable();
    return `<section class="catalog-shell">${tabs(kind)}<header class="catalog-intro"><div><span>DANH MỤC KHÁCH SẠN</span><h2>${E(title)}</h2><p>${E(description)}</p></div><div class="catalog-count"><strong>${d[kind].length}</strong><span>bản ghi</span></div></header>${body}</section>`;
  }

  function catalogFields(kind, row = {}) {
    return fieldBuilders[kind](row, field, opts);
  }

  function suggestNextRoomCode(rooms = []) {
    const nums = rooms
      .map((r) => {
        const m = String(r.id || "").match(/^P?(\d+)$/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const max = nums.length ? Math.max(...nums) : 100;
    return `P${max + 1}`;
  }

  function installRoomPreview(row = {}) {
    const codeInput = document.querySelector('[name="code"]');
    const nameInput = document.querySelector('[name="name"]');
    if (!row.id && codeInput && nameInput) {
      let userModifiedCode = false;
      codeInput.placeholder = "Tự động sinh (VD: P201)";
      if (!codeInput.value.trim()) {
        codeInput.value = suggestNextRoomCode(d.rooms || []);
      }
      codeInput.addEventListener("input", () => {
        userModifiedCode = Boolean(codeInput.value.trim());
      });
      nameInput.addEventListener("input", () => {
        if (userModifiedCode) return;
        const nameVal = nameInput.value.trim();
        const numMatch = nameVal.match(/\d+/);
        if (numMatch) {
          codeInput.value = `P${numMatch[0]}`;
        } else if (!nameVal) {
          codeInput.value = suggestNextRoomCode(d.rooms || []);
        }
      });
    }

    const imageInput = document.querySelector('[name="imageUrl"]');
    const galleryInput = document.querySelector('[name="galleryUrls"]');
    const typeSelect = document.querySelector('[name="typeId"]');
    if (!imageInput || !galleryInput) return;
    const preview = document.createElement("section");
    preview.className = "catalog-form-wide catalog-image-editor";
    document.querySelector("#dialog-fields").append(preview);
    const presets = [
      ["/assets/img/room-single.jpg", "Ảnh Phòng đơn"],
      ["/assets/img/room-double.jpg", "Ảnh Phòng đôi"],
      ["/assets/img/room-vip.jpg", "Ảnh Phòng VIP"],
      ["/assets/img/banner-suite.jpg", "Ảnh Master Suite"],
      ["/assets/img/banner-pool.jpg", "Ảnh Hồ bơi"],
    ];
    let selectedSlot = 0;
    let statusText = "";
    const activeDefaults = () =>
      defaultRoomImages(typeSelect?.value || row.typeId);
    const currentImages = () => {
      const defaults = activeDefaults();
      const raw = [
        safeImageUrl(imageInput.value),
        ...galleryFromInput(galleryInput.value),
      ].filter(Boolean);
      const list = [...raw];
      for (const url of defaults) {
        if (list.length >= 5) break;
        if (!list.includes(url)) list.push(url);
      }
      while (list.length < 5) {
        list.push(defaults[list.length % defaults.length]);
      }
      return list.slice(0, 5);
    };
    const syncInputs = (list) => {
      const defaults = activeDefaults();
      const cleaned = list
        .slice(0, 5)
        .map((url, idx) => safeImageUrl(url) || defaults[idx] || defaults[0]);
      while (cleaned.length < 5) {
        cleaned.push(defaults[cleaned.length % defaults.length]);
      }
      imageInput.value = cleaned[0] || "";
      galleryInput.value = cleaned.slice(1, 5).join("\n");
      update();
    };
    const uploadFiles = async (files) => {
      const csrf =
        document.querySelector('meta[name="csrf-token"]')?.content || "";
      const uploaded = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/rooms/upload-image", {
          method: "POST",
          headers: { Accept: "application/json", "X-CSRF-Token": csrf },
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Tải ảnh thất bại.");
        if (data.url) uploaded.push(data.url);
      }
      return uploaded;
    };
    const update = () => {
      const images = currentImages();
      const slotLabel =
        selectedSlot === 0 ? "Ảnh đại diện (Ảnh 1)" : `Ảnh ${selectedSlot + 1}`;
      preview.innerHTML = `
        <div class="catalog-image-head">
          <div>
            <strong>Hình ảnh phòng (${images.length}/5) · Đang chọn: ${E(slotLabel)}</strong>
            <small>${E(statusText || "Bấm trực tiếp vào từng khung ảnh bên dưới để đổi riêng ảnh đó, hoặc bấm Thay thế tất cả.")}</small>
          </div>
          <div class="catalog-image-actions">
            <label class="small primary catalog-upload-btn" title="Chọn 1 ảnh từ máy để đổi cho ${E(slotLabel)}">
              Đổi từng ảnh
              <input type="file" data-room-file-single accept="image/png,image/jpeg,image/webp,image/gif" hidden>
            </label>
            <label class="small catalog-upload-btn catalog-upload-secondary" title="Chọn tới 5 ảnh từ máy để thay thế toàn bộ 5 ảnh">
              Thay thế tất cả
              <input type="file" data-room-file-all accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden>
            </label>
            <button type="button" class="small" data-reset-default-images title="Khôi phục 5 ảnh mặc định theo loại phòng">Mặc định</button>
          </div>
        </div>
        <div class="catalog-preview-strip">${images
          .map(
            (url, index) => `<figure class="catalog-media ${index === 0 ? "is-cover-slot" : ""} ${index === selectedSlot ? "is-selected-slot" : ""}" data-img-index="${index}" title="Bấm vào ảnh này để đổi Ảnh ${index + 1}">
                <img class="catalog-image" src="${E(url)}" alt="Ảnh phòng ${index + 1}" referrerpolicy="no-referrer">
                <span class="catalog-slot-badge">${index === 0 ? "★ Ảnh đại diện" : `Ảnh ${index + 1}`}</span>
                ${index > 0 ? `<button type="button" class="catalog-img-promote" data-make-cover="${index}" title="Đặt ảnh này làm ảnh đại diện">★ Đặt đại diện</button>` : ""}
                <figcaption>${index === selectedSlot ? "Đang chọn · Bấm để đổi ảnh" : "Bấm vào đây để đổi ảnh"}</figcaption>
              </figure>`,
          )
          .join("")}</div>
        <div class="catalog-preset-row">
          <span>Đổi nhanh cho <b>${E(slotLabel)}</b> bằng ảnh mẫu:</span>
          ${presets
            .map(
              ([url, label]) =>
                `<button type="button" class="small" data-preset-url="${E(url)}">${E(label)}</button>`,
            )
            .join("")}
        </div>`;
    };
    preview.addEventListener("click", (event) => {
      const promoteBtn = event.target.closest("[data-make-cover]");
      if (promoteBtn) {
        event.stopPropagation();
        const idx = Number(promoteBtn.dataset.makeCover);
        const next = currentImages();
        if (idx > 0 && idx < next.length) {
          const picked = next[idx];
          next[idx] = next[0];
          next[0] = picked;
          selectedSlot = 0;
          statusText = `Đã đưa Ảnh ${idx + 1} lên làm Ảnh đại diện.`;
          syncInputs(next);
        }
        return;
      }
      const presetBtn = event.target.closest("[data-preset-url]");
      if (presetBtn) {
        const url = presetBtn.dataset.presetUrl;
        const next = currentImages();
        next[selectedSlot] = url;
        statusText = `Đã đổi Ảnh ${selectedSlot + 1} sang ${presetBtn.textContent.trim()}.`;
        syncInputs(next);
        return;
      }
      if (event.target.closest("[data-reset-default-images]")) {
        statusText = "Đã khôi phục 5 ảnh mặc định của hạng phòng.";
        syncInputs(activeDefaults());
        return;
      }
      const figure = event.target.closest("figure[data-img-index]");
      if (figure) {
        selectedSlot = Number(figure.dataset.imgIndex) || 0;
        statusText = `Đang chọn Ảnh ${selectedSlot + 1} — chọn tệp từ máy hoặc bấm ảnh mẫu bên dưới để đổi.`;
        update();
        preview.querySelector("[data-room-file-single]")?.click();
      }
    });
    preview.addEventListener("change", async (event) => {
      const singleInput = event.target.closest("[data-room-file-single]");
      const allInput = event.target.closest("[data-room-file-all]");
      const input = singleInput || allInput;
      if (!input || !input.files?.length) return;
      const files = [...input.files];
      statusText = "Đang tải ảnh lên…";
      update();
      try {
        if (singleInput) {
          const [uploadedUrl] = await uploadFiles(files.slice(0, 1));
          if (uploadedUrl) {
            const next = currentImages();
            next[selectedSlot] = uploadedUrl;
            statusText = `Đã cập nhật ảnh mới cho Ảnh ${selectedSlot + 1}.`;
            syncInputs(next);
          }
        } else {
          const uploaded = await uploadFiles(files.slice(0, 5));
          const next = currentImages();
          uploaded.forEach((url, idx) => {
            next[idx] = url;
          });
          selectedSlot = 0;
          statusText =
            uploaded.length >= 5
              ? "Đã thay thế toàn bộ 5 ảnh phòng."
              : `Đã thay thế ${uploaded.length} ảnh đầu tiên (từ Ảnh 1 đến Ảnh ${uploaded.length}).`;
          syncInputs(next);
        }
      } catch (err) {
        statusText = err.message || "Tải ảnh thất bại.";
        update();
      }
    });
    syncInputs(currentImages());
  }

  function installServiceMatrix(row) {
    const configInput = document.querySelector('[name="serviceConfig"]');
    const touchedInput = document.querySelector('[name="serviceConfigTouched"]');
    if (!configInput || !touchedInput) return;
    const config = new Map(
      (Array.isArray(row.serviceConfig) ? row.serviceConfig : []).map((item) => [
        String(item.serviceId),
        item.included ? "included" : "available",
      ]),
    );
    const section = document.createElement("fieldset");
    section.className = "catalog-form-wide service-matrix";
    const unavailableProjection = row.id && !Array.isArray(row.serviceConfig);
    section.innerHTML = `<legend>Dịch vụ theo loại phòng</legend><p>${unavailableProjection ? "Adapter hiện chưa chiếu các liên kết RoomTypeService đang lưu. Thay đổi tại đây sẽ bị máy chủ từ chối để tránh mất dữ liệu." : "“Bao gồm” nằm trong giá đêm; “Có tính phí” chỉ cho biết dịch vụ có thể đặt thêm."}</p><div>${d.services
      .map(
        (service) => `<label><span><strong>${E(service.name)}</strong><small>${E(service.unit)} · ${money(service.price)}${service.isActive ? "" : " · đang ngừng"}</small></span><select data-service-id="${E(service.id)}"><option value="none" ${!config.has(String(service.id)) ? "selected" : ""}>Không áp dụng</option><option value="available" ${config.get(String(service.id)) === "available" ? "selected" : ""}>Có tính phí</option><option value="included" ${config.get(String(service.id)) === "included" ? "selected" : ""}>Bao gồm</option></select></label>`,
      )
      .join("")}</div>`;
    document.querySelector("#dialog-fields").append(section);
    section.addEventListener("change", () => {
      const next = [...section.querySelectorAll("select[data-service-id]")]
        .filter((select) => select.value !== "none")
        .map((select) => ({
          serviceId: select.dataset.serviceId,
          included: select.value === "included",
        }));
      configInput.value = JSON.stringify(next);
      touchedInput.value = "1";
    });
  }

  function installHolidaySchedule() {
    const schedule = document.querySelector('[name="scheduleType"]');
    if (!schedule) return;
    const names = ["startDate", "endDate", "startMonthDay", "endMonthDay"];
    const update = () => {
      const annual = schedule.value === "ANNUAL";
      for (const name of names) {
        const input = document.querySelector(`[name="${name}"]`);
        const visible = name.includes("MonthDay") === annual;
        input.disabled = !visible;
        input.closest("label").hidden = !visible;
      }
    };
    schedule.addEventListener("change", update);
    update();
  }

  function openBulkEditDialog(ctx, preselectedIds = new Set()) {
    const { d, E, money, command } = ctx;
    const rooms = d.rooms || [];
    const types = d.types || [];
    const selected = new Set(preselectedIds);

    const statusLabels = {
      AVAILABLE: "Sẵn sàng",
      OCCUPIED: "Đang ở",
      DIRTY: "Cần dọn",
      MAINTENANCE: "Bảo trì",
      DISABLED: "Ngừng hoạt động",
    };

    const dialog = document.createElement("dialog");
    dialog.className = "bulk-edit-modal";
    dialog.setAttribute("aria-label", "Sửa nhanh hồ sơ phòng hàng loạt");

    dialog.innerHTML = `
      <div class="bulk-modal-shell">
        <div class="bulk-modal-head">
          <div>
            <span class="bulk-eyebrow">AURORA CATALOG · CHỈNH SỬA HÀNG LOẠT</span>
            <h2>⚡ Sửa nhanh hồ sơ phòng</h2>
            <p>Tích chọn các phòng muốn cập nhật và chọn mục cần sửa (Loại phòng, Trạng thái, Hướng nhìn). Ảnh phòng được giữ nguyên riêng biệt.</p>
          </div>
          <button type="button" class="icon-button bulk-close-btn" data-modal-close aria-label="Đóng">✕</button>
        </div>

        <div class="bulk-modal-grid">
          <!-- CỘT 1: CHỌN PHÒNG -->
          <div class="bulk-rooms-pane">
            <div class="bulk-pane-header">
              <div>
                <h3>1. Chọn phòng áp dụng</h3>
                <span class="bulk-badge">Đã chọn: <b data-selected-badge>${selected.size}</b> / ${rooms.length}</span>
              </div>
              <div class="bulk-pane-actions">
                <button type="button" class="small text-btn" data-action-select-all>Chọn tất cả</button>
                <span class="sep">|</span>
                <button type="button" class="small text-btn" data-action-deselect-all>Bỏ chọn</button>
              </div>
            </div>

            <div class="bulk-search-row">
              <input type="text" class="bulk-filter-input" placeholder="⌕ Tìm nhanh mã, tên, loại phòng..." aria-label="Tìm nhanh phòng">
            </div>

            <div class="bulk-rooms-scroll-list" role="listbox" aria-multiselectable="true">
              ${rooms
                .map((room) => {
                  const type = types.find((t) => t.id === room.typeId);
                  const isChecked = selected.has(String(room.id));
                  const details = roomDetails(room);
                  return `
                  <label class="bulk-room-row ${isChecked ? "is-row-selected" : ""}" data-room-id="${E(room.id)}" data-search="${E(`${room.id} ${room.name} ${type?.name || ""} ${details.viewName || ""}`).toLowerCase()}">
                    <input type="checkbox" value="${E(room.id)}" ${isChecked ? "checked" : ""}>
                    <span class="bulk-row-check"></span>
                    <div class="bulk-row-body">
                      <div class="bulk-row-title">
                        <span class="room-code-tag">${E(room.id)}</span>
                        <strong>${E(room.name)}</strong>
                      </div>
                      <div class="bulk-row-meta">
                        <span class="meta-tag type-tag">${E(type?.name || room.typeId)}</span>
                        <span class="meta-tag status-tag status-${E(room.status)}">${E(statusLabels[room.status] || room.status)}</span>
                        <span class="meta-tag view-tag">${E(details.viewName || "Chưa có view")}</span>
                      </div>
                    </div>
                  </label>
                `;
                })
                .join("")}
            </div>
          </div>

          <!-- CỘT 2: CHỌN MỤC CẦN SỬA -->
          <div class="bulk-fields-pane">
            <div class="bulk-pane-header">
              <div>
                <h3>2. Chọn mục cần sửa</h3>
                <small class="bulk-pane-desc">Tích chọn mục cần sửa và chọn giá trị mới. Mục không tích sẽ giữ nguyên.</small>
              </div>
            </div>

            <div class="bulk-fields-cards">
              <!-- FIELD 1: LOẠI PHÒNG -->
              <div class="bulk-field-card" data-field-card="type">
                <label class="bulk-field-header">
                  <input type="checkbox" name="applyType" class="bulk-toggle-check">
                  <span class="bulk-field-title">
                    <strong>Loại phòng</strong>
                    <small>Đổi hạng phòng, số khách và đơn giá đêm</small>
                  </span>
                </label>
                <div class="bulk-field-control">
                  <select name="typeId" disabled class="bulk-select">
                    ${types.map((t) => `<option value="${E(t.id)}">${E(t.name)} (${E(t.id)}) · ${money(t.nightlyPrice)}/đêm</option>`).join("")}
                  </select>
                  <p class="bulk-field-help">Chỉ đổi được với các phòng không có phiếu đặt phòng/lưu trú đang mở.</p>
                </div>
              </div>

              <!-- FIELD 2: TRẠNG THÁI -->
              <div class="bulk-field-card" data-field-card="status">
                <label class="bulk-field-header">
                  <input type="checkbox" name="applyStatus" class="bulk-toggle-check">
                  <span class="bulk-field-title">
                    <strong>Trạng thái quản lý</strong>
                    <small>Cập nhật trạng thái sẵn sàng, bảo trì hoặc ngừng hoạt động</small>
                  </span>
                </label>
                <div class="bulk-field-control">
                  <select name="status" disabled class="bulk-select">
                    <option value="AVAILABLE">Sẵn sàng (AVAILABLE)</option>
                    <option value="MAINTENANCE">Bảo trì (MAINTENANCE)</option>
                    <option value="DISABLED">Ngừng hoạt động (DISABLED)</option>
                  </select>
                  <p class="bulk-field-help">Phòng đang có khách ở hoặc cần dọn sẽ giữ nguyên trạng thái vận hành trên sơ đồ.</p>
                </div>
              </div>

              <!-- FIELD 3: HƯỚNG NHÌN -->
              <div class="bulk-field-card" data-field-card="view">
                <label class="bulk-field-header">
                  <input type="checkbox" name="applyView" class="bulk-toggle-check">
                  <span class="bulk-field-title">
                    <strong>Hướng nhìn / Vị trí</strong>
                    <small>Cập nhật view phong cảnh hiển thị khi khách tìm phòng</small>
                  </span>
                </label>
                <div class="bulk-field-control">
                  <select name="viewName" disabled class="bulk-select">
                    <option value="Hướng phố">Hướng phố (City View)</option>
                    <option value="Hướng vườn">Hướng vườn (Garden View)</option>
                    <option value="Hướng hồ bơi">Hướng hồ bơi (Pool View)</option>
                    <option value="Hướng biển / Sông">Hướng biển / Sông (Sea/River View)</option>
                    <option value="Hướng nội khu">Hướng nội khu / Giếng trời</option>
                    <option value="Tiêu chuẩn (Không cửa sổ)">Tiêu chuẩn (Không cửa sổ)</option>
                  </select>
                </div>
              </div>

              <!-- EXCLUDED NOTICE -->
              <div class="bulk-notice-card">
                <span class="notice-icon">📷</span>
                <div>
                  <strong>Hình ảnh phòng</strong>
                  <p>Được giữ nguyên theo từng phòng vì mỗi phòng có hình ảnh thực tế riêng biệt.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bulk-modal-foot">
          <div class="bulk-foot-left">
            <span class="bulk-foot-summary" data-foot-summary>Chưa chọn phòng nào</span>
            <p class="bulk-foot-error" data-foot-error role="alert" hidden></p>
          </div>
          <div class="bulk-foot-actions">
            <button type="button" class="bulk-btn-cancel" data-modal-close>Hủy</button>
            <button type="button" class="primary bulk-btn-apply" data-action-apply disabled>Lưu thay đổi</button>
          </div>
        </div>
      </div>
    `;

    const badgeEl = dialog.querySelector("[data-selected-badge]");
    const summaryEl = dialog.querySelector("[data-foot-summary]");
    const errorEl = dialog.querySelector("[data-foot-error]");
    const applyBtn = dialog.querySelector("[data-action-apply]");
    const searchInput = dialog.querySelector(".bulk-filter-input");
    const roomRows = dialog.querySelectorAll(".bulk-room-row");

    const applyTypeCheck = dialog.querySelector('[name="applyType"]');
    const typeSelect = dialog.querySelector('[name="typeId"]');
    const typeCard = dialog.querySelector('[data-field-card="type"]');

    const applyStatusCheck = dialog.querySelector('[name="applyStatus"]');
    const statusSelect = dialog.querySelector('[name="status"]');
    const statusCard = dialog.querySelector('[data-field-card="status"]');

    const applyViewCheck = dialog.querySelector('[name="applyView"]');
    const viewSelect = dialog.querySelector('[name="viewName"]');
    const viewCard = dialog.querySelector('[data-field-card="view"]');

    const updateSummary = () => {
      const roomCount = selected.size;
      badgeEl.textContent = String(roomCount);

      const activeFields = [];
      if (applyTypeCheck.checked) activeFields.push("Loại phòng");
      if (applyStatusCheck.checked) activeFields.push("Trạng thái");
      if (applyViewCheck.checked) activeFields.push("Hướng nhìn");
      const fieldCount = activeFields.length;

      if (roomCount === 0 && fieldCount === 0) {
        summaryEl.textContent = "Chưa chọn phòng nào · Chưa chọn mục sửa nào";
        applyBtn.disabled = true;
        applyBtn.textContent = "Lưu thay đổi";
      } else if (roomCount === 0) {
        summaryEl.textContent =
          "Chưa chọn phòng nào (hãy tích chọn ít nhất 1 phòng bên trái).";
        applyBtn.disabled = true;
        applyBtn.textContent = "Lưu thay đổi";
      } else if (fieldCount === 0) {
        summaryEl.textContent = `Đã chọn ${roomCount} phòng · Hãy tích chọn ít nhất 1 mục cần sửa bên phải.`;
        applyBtn.disabled = true;
        applyBtn.textContent = `Lưu cho ${roomCount} phòng`;
      } else {
        summaryEl.textContent = `Đã chọn ${roomCount} phòng · Sẽ cập nhật ${fieldCount} mục (${activeFields.join(", ")}).`;
        applyBtn.disabled = false;
        applyBtn.textContent = `Lưu thay đổi cho ${roomCount} phòng`;
      }
    };

    const handleFieldToggle = (check, select, card) => {
      select.disabled = !check.checked;
      card.classList.toggle("is-card-active", check.checked);
      updateSummary();
    };

    applyTypeCheck.addEventListener("change", () =>
      handleFieldToggle(applyTypeCheck, typeSelect, typeCard),
    );
    applyStatusCheck.addEventListener("change", () =>
      handleFieldToggle(applyStatusCheck, statusSelect, statusCard),
    );
    applyViewCheck.addEventListener("change", () =>
      handleFieldToggle(applyViewCheck, viewSelect, viewCard),
    );

    searchInput.addEventListener("input", () => {
      const term = searchInput.value.trim().toLowerCase();
      roomRows.forEach((row) => {
        const match = !term || row.dataset.search.includes(term);
        row.hidden = !match;
      });
    });

    dialog.addEventListener("scroll", () => {
      if (dialog.scrollTop !== 0 || dialog.scrollLeft !== 0) {
        dialog.scrollTop = 0;
        dialog.scrollLeft = 0;
      }
    });

    roomRows.forEach((row) => {
      const check = row.querySelector('input[type="checkbox"]');
      check.addEventListener("focus", () => {
        dialog.scrollTop = 0;
      });
      check.addEventListener("change", () => {
        const id = check.value;
        if (check.checked) {
          selected.add(id);
          row.classList.add("is-row-selected");
        } else {
          selected.delete(id);
          row.classList.remove("is-row-selected");
        }
        updateSummary();
      });
    });

    dialog
      .querySelector("[data-action-select-all]")
      .addEventListener("click", () => {
        roomRows.forEach((row) => {
          if (!row.hidden) {
            const check = row.querySelector('input[type="checkbox"]');
            check.checked = true;
            selected.add(check.value);
            row.classList.add("is-row-selected");
          }
        });
        updateSummary();
      });

    dialog
      .querySelector("[data-action-deselect-all]")
      .addEventListener("click", () => {
        roomRows.forEach((row) => {
          const check = row.querySelector('input[type="checkbox"]');
          check.checked = false;
          row.classList.remove("is-row-selected");
        });
        selected.clear();
        updateSummary();
      });

    const closeModal = () => {
      dialog.close();
    };
    dialog
      .querySelectorAll("[data-modal-close]")
      .forEach((btn) => btn.addEventListener("click", closeModal));
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closeModal();
    });
    dialog.addEventListener("close", () => dialog.remove(), { once: true });

    applyBtn.addEventListener("click", async () => {
      if (selected.size === 0) {
        errorEl.textContent = "Vui lòng chọn ít nhất một phòng.";
        errorEl.hidden = false;
        return;
      }
      const hasType = applyTypeCheck.checked;
      const hasStatus = applyStatusCheck.checked;
      const hasView = applyViewCheck.checked;
      if (!hasType && !hasStatus && !hasView) {
        errorEl.textContent = "Vui lòng tích chọn ít nhất một mục cần sửa.";
        errorEl.hidden = false;
        return;
      }

      applyBtn.disabled = true;
      applyBtn.textContent = "Đang lưu thay đổi…";
      errorEl.hidden = true;

      try {
        await command("catalog.bulkEdit", {
          kind: "rooms",
          roomIds: Array.from(selected),
          applyType: hasType,
          typeId: hasType ? typeSelect.value : undefined,
          applyStatus: hasStatus,
          status: hasStatus ? statusSelect.value : undefined,
          applyView: hasView,
          viewName: hasView ? viewSelect.value : undefined,
        });
        dialog.close();
      } catch (err) {
        errorEl.textContent = err.message || "Cập nhật thất bại.";
        errorEl.hidden = false;
        applyBtn.disabled = false;
        applyBtn.textContent = `Lưu thay đổi cho ${selected.size} phòng`;
      }
    });

    document.body.append(dialog);
    updateSummary();
    dialog.showModal();
  }

  return {
    render() {
      return page === "catalog" ? catalogPanel() : "";
    },
    async act(action, id) {
      if (!catalog) return;
      const hidden = () => field("id", "", "hidden", id);
      if (action === "catalog.bulkEditPrompt" || action === "catalog.bulkEdit") {
        openBulkEditDialog(ctx);
        return;
      }
      if (action === "catalog.new" || action === "catalog.edit") {
        const kind = currentKind();
        const row = d[kind].find((item) => String(item.id) === String(id)) || {};
        actionForm(
          `${id ? "Chỉnh sửa" : "Thêm"} ${tabLabels[kind].toLowerCase()}`,
          catalogFields(kind, row),
          "catalog.save",
        );
        if (kind === "rooms") installRoomPreview(row);
        if (kind === "types") installServiceMatrix(row);
        if (kind === "holidays") installHolidaySchedule();
        return;
      }
      if (action === "catalog.toggle")
        return actionForm(
          "Xác nhận đổi trạng thái",
          [hidden(), field("kind", "", "hidden", currentKind())],
          action,
          "Thao tác được ghi vào nhật ký và vẫn chịu các kiểm tra giao dịch liên quan.",
        );
    },
    catalogPanel,
    catalogFields,
  };
}
