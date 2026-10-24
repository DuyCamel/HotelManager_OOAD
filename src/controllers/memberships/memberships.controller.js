/** Controller memberships: nhận HTTP, gọi model, render view. TODO TV1: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.memberships;
  return {
    index: page("memberships/index", "cards", "cards", { catalogKind: null }),
    async issueCard(req, res) {
      await respond(req, res, () => model.issueCard(req.user, req.body));
    },
    async disableCard(req, res) {
      await respond(req, res, () => model.disableCard(req.user, req.body));
    },
  };
};
