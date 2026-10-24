/** Controller settings: nhận HTTP, gọi model, render view. TODO TV1: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.settings;
  return {
    index: page("settings/index", "settings", "admin", { catalogKind: null }),
    async settings(req, res) {
      await respond(req, res, () => model.settings(req.user, req.body));
    },
  };
};
