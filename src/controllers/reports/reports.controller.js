/** Controller reports: nhận HTTP, gọi model, render view. TODO TV3: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.reports;
  return {
    index: page("reports/index", "reports", "reports", { catalogKind: null }),
    async data(req, res) {
      res.json(await model.list(req.user));
    },
  };
};
