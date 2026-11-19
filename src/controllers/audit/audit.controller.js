/** Controller audit: render, filter, page and export audit events. */
const page = require("../../core/http/page");
module.exports = (models) => {
  const model = models.audit;
  return {
    index: page("audit/index", "audit", "admin", { catalogKind: null }),
    async data(req, res) {
      res.json(await model.list(req.user, req.query));
    },
    async csv(req, res) {
      const file = await model.csv(req.user, req.query);
      res.type("text/csv; charset=utf-8");
      res.attachment(file.filename);
      res.send(file.content);
    },
  };
};
