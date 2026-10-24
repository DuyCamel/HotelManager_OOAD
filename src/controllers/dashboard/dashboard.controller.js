/** Controller dashboard: nhận HTTP, gọi model, render view. TODO TV3: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.dashboard;
  return {
    index: page("dashboard/index", "overview", "reports", {
      catalogKind: null,
    }),
  };
};
