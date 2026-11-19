/** Controller invoices: nhận HTTP, gọi model, render view. TODO TV2: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond"),
  { allow } = require("../../core/auth/rbac");
module.exports = (models) => {
  const model = models.invoices;
  return {
    async print(req, res) {
      allow(req.user, req.user.role === "CUSTOMER" ? "self" : "invoices");
      const { ensure } = require("../../core/errors/AppError");
      const d = await models.workspace.workspace(req.user);
      const invoice = d.invoices?.find((x) => x.id === req.params.id);
      ensure(invoice, "Không tìm thấy hóa đơn.", 404);
      const currentCustomer = d.customers.find(
        (customer) => customer.id === invoice.customerId,
      );
      const currentHotel = d.settings[0] || {};
      res.render("invoices/print", {
        invoice,
        lines: d.lines.filter((l) => l.invoiceId === invoice.id),
        customer: {
          name: invoice.customerName || currentCustomer?.name,
          identityNo:
            invoice.customerIdentity || currentCustomer?.identityNo,
          phone: invoice.customerPhone || currentCustomer?.phone,
        },
        hotel: {
          hotelName: invoice.hotelName || currentHotel.hotelName,
          address: invoice.hotelAddress || currentHotel.address,
          hotline: invoice.hotelHotline || currentHotel.hotline,
        },
      });
    },
    index(req, res) {
      if (req.user.role === "CUSTOMER")
        return res.render("invoices/index", {
          initialPage: "invoices",
          catalogKind: null,
        });
      return page("invoices/index", "invoices", "invoices")(req, res);
    },
    async preview(req, res) {
      await respond(req, res, () => model.preview(req.user, req.body.id));
    },
    async checkout(req, res) {
      await respond(req, res, () => model.checkout(req.user, req.body));
    },
  };
};
