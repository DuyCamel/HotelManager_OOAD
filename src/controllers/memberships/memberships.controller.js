/** Controller memberships: nhận HTTP, gọi model, render view. TODO TV1: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.memberships;
  return {
    index: page("memberships/index", "cards", "cards", { catalogKind: null }),
    async data(req, res) {
      res.json(await model.data(req.user));
    },
    async issueCard(req, res) {
      await respond(req, res, () => model.issueCard(req.user, req.body));
    },
    async disableCard(req, res) {
      await respond(req, res, () => model.disableCard(req.user, req.body));
    },
    async requestDisable(req, res) {
      await respond(req, res, () => model.requestDisable(req.user, req.body));
    },
    async approveDisable(req, res) {
      await respond(req, res, () => model.approveDisable(req.user, req.body));
    },
    async rejectDisable(req, res) {
      await respond(req, res, () => model.rejectDisable(req.user, req.body));
    },
    async reactivateCard(req, res) {
      await respond(req, res, () => model.reactivateCard(req.user, req.body));
    },
  };
};
