/** Controller reports: render and serve server-derived report data. */
const page = require("../../core/http/page");
module.exports = (models) => {
  const model = models.reports;
  return {
    index: page("reports/index", "reports", "reports", { catalogKind: null }),
    async data(req, res) {
      res.json(await model.report(req.user, req.query));
    },
    async csv(req, res) {
      const file = await model.csv(req.user, req.query);
      res.type("text/csv; charset=utf-8");
      res.attachment(file.filename);
      res.send(file.content);
    },
  };
};
