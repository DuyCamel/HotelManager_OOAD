/** Controller accounts: nhận HTTP, gọi model, render view. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.accounts;
  return {
    index: page("accounts/index", "accounts", "accounts", {
      catalogKind: null,
    }),
    async data(req, res) {
      res.json(await model.overview(req.user));
    },
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
