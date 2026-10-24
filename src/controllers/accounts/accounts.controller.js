/** Controller accounts: nhận HTTP, gọi model, render view. TODO TV1: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.accounts;
  return {
    index: page("accounts/index", "accounts", "accounts", {
      catalogKind: null,
    }),
    async create(req, res) {
      await respond(req, res, () => model.create(req.user, req.body));
    },
    async update(req, res) {
      await respond(req, res, () => model.update(req.user, req.body));
    },
    async toggle(req, res) {
      await respond(req, res, () => model.toggle(req.user, req.body));
    },
    async role(req, res) {
      await respond(req, res, () => model.role(req.user, req.body));
    },
  };
};
