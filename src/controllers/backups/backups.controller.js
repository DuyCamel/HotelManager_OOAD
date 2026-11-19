/** Controller backups: capabilities, history and destructive commands. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.backups;
  return {
    index: page("backups/index", "backups", "admin", { catalogKind: null }),
    async data(req, res) {
      res.json(await model.overview(req.user));
    },
    async backup(req, res) {
      await respond(req, res, () => model.backup(req.user, req.body));
    },
    async restore(req, res) {
      await respond(req, res, () => model.restore(req.user, req.body));
    },
  };
};
