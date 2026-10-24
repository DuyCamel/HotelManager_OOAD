/** Controller profile: nhận HTTP, gọi model, render view. TODO TV1: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.profile;
  return {
    index: page("profile/index", "profile", null, { catalogKind: null }),
    async update(req, res) {
      await respond(req, res, () => model.update(req.user, req.body));
    },
    async password(req, res) {
      await respond(req, res, () => model.password(req.user, req.body));
    },
  };
};
