/** Controller settings: render and update hotel settings. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.settings;
  return {
    index: page("settings/index", "settings", "config", { catalogKind: null }),
    async settings(req, res) {
      await respond(req, res, () => model.settings(req.user, req.body));
    },
  };
};
