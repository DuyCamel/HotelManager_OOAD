/** Controller services: nhận HTTP, gọi model, render view. TODO TV3: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.services;
  return {
    index: page("services/index", "catalog", "services.read", {
      catalogKind: "services",
    }),
    async save(req, res) {
      await respond(req, res, () => model.save(req.user, req.body));
    },
    async toggle(req, res) {
      await respond(req, res, () => model.toggle(req.user, req.body));
    },
  };
};
