/** Controller customers: nhận HTTP, gọi model, render view. TODO TV1: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.customers;
  return {
    index: page("customers/index", "customers", "customers", {
      catalogKind: null,
    }),
    async save(req, res) {
      await respond(req, res, () => model.save(req.user, req.body));
    },
    async archive(req, res) {
      await respond(req, res, () => model.archive(req.user, req.body));
    },
  };
};
