/** Controller dashboard: render shell và trả bản tổng hợp chỉ đọc. */
const page = require("../../core/http/page");
module.exports = (models) => {
  const model = models.dashboard;
  return {
    index: page("dashboard/index", "overview", "reports", {
      catalogKind: null,
    }),
    services: page("dashboard/index", "services-read", "services.read", {
      catalogKind: null,
    }),
    async data(req, res) {
      res.json(await model.list(req.user));
    },
  };
};
