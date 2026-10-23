/** Dữ liệu giả dùng để duyệt web không cần SQL Server. Không gọi ngân hàng/SMS. */
const { hash } = require("../../shared/passwords");
const { defs } = require("../schema");
module.exports = async function createDemo() {
  const d = {
    meta: { version: 2 },
    ...Object.fromEntries(Object.keys(defs).map((k) => [k, []])),
  };
  const now = new Date();
  const day = (offset, h = 7) => {
    const t = new Date(now);
    t.setUTCHours(h, 0, 0, 0);
    t.setUTCDate(t.getUTCDate() + offset);
    return t.toISOString();
  };
  const stamp = now.toISOString();
  const passwordHash = await hash("Demo@123");
  const roles = [
    ["TK01", "admin", "Admin", "ADMIN"],
    ["TK02", "manager", "Quản lý", "MANAGER"],
    ["TK03", "reception", "Lễ tân", "RECEPTIONIST"],
    ["TK04", "housekeeping", "Buồng phòng", "HOUSEKEEPER"],
  ];
  for (const [id, email, name, role] of roles)
    d.accounts.push({
      id,
      email: email + "@hotel.test",
      name,
      role,
      passwordHash,
      phone: "0901234567",
      isActive: true,
      authVersion: 0,
      createdAt: stamp,
    });
  for (let i = 1; i <= 120; i++) {
    const pad = String(i).padStart(3, "0");
    const accountId = i <= 80 ? "TK_C" + pad : null;
    const name =
      [
        "Nguyễn Minh Anh",
        "Trần Quốc Bảo",
        "Lê Ngọc Hà",
        "Phạm Gia Huy",
        "Hoàng Thu Linh",
        "Vũ Đức Minh",
      ][i % 6] +
      " " +
      pad;
    if (accountId)
      d.accounts.push({
        id: accountId,
        email: (i === 1 ? "customer" : "customer" + pad) + "@hotel.test",
        name,
        role: "CUSTOMER",
        passwordHash,
        phone: "0918" + String(i).padStart(6, "0"),
        isActive: i <= 76,
        authVersion: 0,
        createdAt: stamp,
      });
    d.customers.push({
      id: "KH" + pad,
      name,
      phone: "0918" + String(i).padStart(6, "0"),
      identityNo: "079900" + String(i).padStart(6, "0"),
      address: ["TP. Hồ Chí Minh", "Đà Nẵng", "Hà Nội"][i % 3],
      accountId,
      isActive: i <= 116,
      createdAt: stamp,
    });
    if (i <= 80)
      d.cards.push({
        id: "TV" + pad,
        customerId: "KH" + pad,
        points: 0,
        isActive: i <= 76,
        issuedAt: day(-100),
      });
  }
  const kinds = [
    ["STD", "Standard", 2, 1, 550000],
    ["SUP", "Superior", 2, 1, 650000],
    ["DLX", "Deluxe", 3, 2, 850000],
    ["TWN", "Deluxe Twin", 4, 2, 1000000],
    ["FAM", "Family", 4, 2, 1400000],
    ["STE", "Suite", 6, 3, 2200000],
  ];
  d.types = kinds.map(([id, name, capacity, beds, dailyPrice]) => ({
    id,
    name,
    capacity,
    beds,
    dailyPrice,
    hourlyPrice: Math.round(dailyPrice / 4),
    nightlyPrice: Math.round(dailyPrice * 0.8),
    amenities: "Wi-Fi · TV · Nước suối · Minibar",
  }));
  for (let i = 1; i <= 60; i++) {
    const status =
      i >= 51
        ? "OCCUPIED"
        : i >= 49
          ? "DISABLED"
          : i >= 46
            ? "MAINTENANCE"
            : i >= 41
              ? "DIRTY"
              : "AVAILABLE";
    d.rooms.push({
      id: "P" + (100 + i),
      name: "Phòng " + (100 + i),
      typeId: kinds[Math.floor((i - 1) / 10)][0],
      status,
      imagePath: null,
      note: status === "MAINTENANCE" ? "Đang kiểm tra thiết bị" : "",
    });
    if (status === "DIRTY" || status === "MAINTENANCE")
      d.tasks.push({
        id: "DD" + i,
        roomId: "P" + (100 + i),
        stayId: null,
        checkoutAt: new Date(+now - (i <= 43 ? 120 : 30) * 60000).toISOString(),
        deadlineAt: new Date(+now + (i <= 43 ? -30 : 60) * 60000).toISOString(),
        completedAt: null,
        status: status === "DIRTY" ? "OPEN" : "MAINTENANCE",
        assignedTo: "TK04",
      });
  }
  [
    ["Nước suối minibar", "Chai", 20000],
    ["Nước ngọt minibar", "Lon", 35000],
    ["Snack minibar", "Gói", 40000],
    ["Giặt ủi", "Kg", 50000],
    ["Ăn sáng", "Phần", 120000],
    ["Đón sân bay", "Chuyến", 350000],
    ["Spa", "Lượt", 450000],
    ["Giường phụ", "Đêm", 250000],
  ].forEach(([name, unit, price], i) =>
    d.services.push({
      id: "DV" + String(i + 1).padStart(3, "0"),
      name,
      unit,
      price,
      description: "Dịch vụ khách sạn",
      isActive: true,
    }),
  );
  for (let i = 1; i <= 240; i++) {
    const status =
      i <= 150
        ? "COMPLETED"
        : i <= 180
          ? "CANCELLED"
          : i <= 210
            ? "CONFIRMED"
            : i <= 230
              ? "PENDING"
              : "CHECKED_IN";
    const rindex =
      i <= 150
        ? (i - 1) % 60
        : i <= 180
          ? i - 151
          : i <= 210
            ? i - 181
            : i <= 230
              ? i - 191
              : i - 181;
    const room = d.rooms[rindex];
    const type = d.types.find((t) => t.id === room.typeId);
    const customerId =
      "KH" +
      String(
        status === "PENDING"
          ? i - 210
          : status === "COMPLETED" || status === "CANCELLED"
            ? 1 + ((i - 1) % 120)
            : 1 + ((i - 1) % 116),
      ).padStart(3, "0");
    const offset =
      i <= 150
        ? -65 + Math.floor((i - 1) / 60) * 20 + ((i - 1) % 20)
        : i <= 180
          ? 25
          : i <= 210
            ? 3
            : i <= 230
              ? 10
              : -1;
    const nights = i <= 150 ? 1 + (i % 5) : i > 230 ? 3 : 2;
    const startAt = day(offset),
      endAt = day(offset + nights, 5);
    const roomCharge = type.dailyPrice * nights;
    const deposit = ["PENDING", "CANCELLED"].includes(status)
      ? 0
      : Math.round(roomCharge * 0.3);
    const booking = {
      id: "DP" + String(i).padStart(4, "0"),
      customerId,
      roomId: room.id,
      startAt,
      endAt,
      guests: Math.min(type.capacity, 2),
      status,
      channel: ["PENDING", "CANCELLED"].includes(status) ? "ONLINE" : "COUNTER",
      roomCharge,
      deposit,
      holdUntil: new Date(
        +now + (i >= 211 && i <= 220 ? -30 : 25) * 60000,
      ).toISOString(),
      createdAt: day(-100),
      createdBy: "TK03",
    };
    d.bookings.push(booking);
    if (deposit)
      d.payments.push({
        id: "COC" + i,
        bookingId: booking.id,
        invoiceId: null,
        kind: "DEPOSIT",
        amount: deposit,
        method: "TRANSFER",
        externalReference: "DEMO-DEP-" + i,
        paidAt: day(-100),
        createdBy: "TK03",
      });
    if (status === "COMPLETED" || status === "CHECKED_IN") {
      const st = {
        id: "PT" + String(i).padStart(4, "0"),
        bookingId: booking.id,
        roomId: room.id,
        identityNo: d.customers.find((c) => c.id === customerId).identityNo,
        checkInAt: startAt,
        checkOutAt: status === "COMPLETED" ? endAt : null,
        roomCharge,
        surcharge: i % 10 === 0 ? 100000 : 0,
        createdBy: "TK03",
      };
      d.stays.push(st);
      d.history.push({
        id: i,
        stayId: st.id,
        roomId: room.id,
        fromAt: startAt,
        toAt: st.checkOutAt,
        extraCharge: st.surcharge,
      });
      if (status === "COMPLETED") {
        const inv = {
          id: "HD" + String(i).padStart(4, "0"),
          stayId: st.id,
          customerId,
          issuedAt: endAt,
          roomCharge,
          serviceCharge: i % 3 === 0 ? 90000 : 0,
          surcharge: st.surcharge,
          discount: i % 15 === 0 ? 50000 : 0,
          deposit,
          status: "PAID",
          method: ["CASH", "TRANSFER", "CARD"][i % 3],
          createdBy: "TK03",
        };
        inv.amountDue =
          roomCharge +
          inv.serviceCharge +
          inv.surcharge -
          inv.discount -
          deposit;
        d.invoices.push(inv);
        d.lines.push({
          id: d.lines.length + 1,
          invoiceId: inv.id,
          lineType: "ROOM",
          serviceId: null,
          description: "Tiền lưu trú",
          quantity: 1,
          unitPrice: roomCharge,
          lineAmount: roomCharge,
        });
        if (inv.serviceCharge) {
          d.lines.push({
            id: d.lines.length + 1,
            invoiceId: inv.id,
            lineType: "SERVICE",
            serviceId: "DV001",
            description: "Nước suối",
            quantity: 2,
            unitPrice: 20000,
            lineAmount: 40000,
          });
          d.lines.push({
            id: d.lines.length + 1,
            invoiceId: inv.id,
            lineType: "SERVICE",
            serviceId: "DV004",
            description: "Giặt ủi",
            quantity: 1,
            unitPrice: 50000,
            lineAmount: 50000,
          });
        }
        if (inv.surcharge)
          d.lines.push({
            id: d.lines.length + 1,
            invoiceId: inv.id,
            lineType: "SURCHARGE",
            serviceId: null,
            description: "Phụ thu",
            quantity: 1,
            unitPrice: inv.surcharge,
            lineAmount: inv.surcharge,
          });
        d.payments.push({
          id: "TT" + i,
          bookingId: null,
          invoiceId: inv.id,
          kind: "SETTLEMENT",
          amount: inv.amountDue,
          method: inv.method,
          externalReference: "DEMO-PAY-" + i,
          paidAt: endAt,
          createdBy: "TK03",
        });
        const card = d.cards.find(
          (c) => c.customerId === customerId && c.isActive,
        );
        if (card) {
          const points = Math.floor(
            (roomCharge + inv.serviceCharge + inv.surcharge - inv.discount) /
              10000,
          );
          card.points += points;
          d.points.push({
            id: inv.id,
            cardId: card.id,
            points,
            createdAt: endAt,
          });
        }
      }
    }
  }
  for (const stay of d.stays.filter((s) => !s.checkOutAt)) {
    for (const [serviceId, quantity] of [
      ["DV001", 2],
      ["DV004", 1],
    ]) {
      d.usage.push({
        id: "SD" + stay.id + serviceId,
        stayId: stay.id,
        serviceId,
        quantity,
        unitPrice: d.services.find((s) => s.id === serviceId).price,
        usedAt: stamp,
        recordedBy: "TK03",
        isVoided: false,
        invoiceId: null,
      });
    }
  }
  const sample = d.stays.find((s) => !s.checkOutAt);
  if (sample)
    d.usage.push({
      id: "SD_VOID",
      stayId: sample.id,
      serviceId: "DV001",
      quantity: 1,
      unitPrice: 20000,
      usedAt: stamp,
      recordedBy: "TK03",
      isVoided: true,
      invoiceId: null,
    });
  d.settings = [
    {
      id: 1,
      hotelName: "Aurora Hotel",
      address: "TP. Hồ Chí Minh",
      hotline: "0281234567",
      checkInTime: "14:00:00",
      checkOutTime: "12:00:00",
      lateFeeFrom: "13:00:00",
      lateFeePercent: 30,
      bankCode: "DEMO",
      bankAccount: "000000000000",
      bankOwner: "AURORA DEMO",
      logoPath: null,
    },
  ];
  d.audit = [
    {
      id: 1,
      eventAt: stamp,
      actorId: null,
      action: "Khởi tạo dữ liệu web",
      objectType: "SYSTEM",
      objectId: "DEMO",
      detail: "Dữ liệu giả để duyệt giao diện.",
    },
  ];
  return d;
};
