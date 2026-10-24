/** Controller invoices: nhận HTTP, gọi model, render view. TODO TV2: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.invoices;
  return {
    async print(req, res) {
      const { ensure } = require("../../core/errors/AppError");
      const d = await models.workspace.workspace(req.user);
      const invoice = d.invoices?.find((x) => x.id === req.params.id);
      ensure(invoice, "Không tìm thấy hóa đơn.", 404);
      res.render("invoices/print", {
        invoice,
        lines: d.lines.filter((l) => l.invoiceId === invoice.id),
        customer: d.customers.find((c) => c.id === invoice.customerId),
        hotel: d.settings[0],
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
