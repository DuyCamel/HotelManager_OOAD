/** Controller audit: nhận HTTP, gọi model, render view. TODO TV1: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.audit;
  return {
    index: page("audit/index", "audit", "admin", { catalogKind: null }),
    async data(req, res) {
      res.json(await model.list(req.user));
    },
  };
};
