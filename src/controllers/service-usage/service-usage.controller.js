/** Controller service-usage: nhận HTTP, gọi model, render view. TODO TV2: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.usage;
  return {
    index: page("service-usage/index", "usage", "usage", { catalogKind: null }),
    async addUsage(req, res) {
      await respond(req, res, () => model.addUsage(req.user, req.body));
    },
    async voidUsage(req, res) {
      await respond(req, res, () => model.voidUsage(req.user, req.body));
    },
  };
};
