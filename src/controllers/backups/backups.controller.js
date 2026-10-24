/** Controller backups: nhận HTTP, gọi model, render view. TODO TV1: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.backups;
  return {
    index: page("backups/index", "backups", "admin", { catalogKind: null }),
    async backup(req, res) {
      await respond(req, res, () => model.backup(req.user));
    },
    async restore(req, res) {
      await respond(req, res, () => model.restore(req.user, req.body));
    },
  };
};
