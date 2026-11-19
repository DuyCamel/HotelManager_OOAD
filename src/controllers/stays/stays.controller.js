/** Controller stays: nhận HTTP, gọi model, render view. TODO TV2: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.stays;
  return {
    index: page("stays/index", "stays", "stays", { catalogKind: null }),
    async checkIn(req, res) {
      await respond(req, res, () => model.checkIn(req.user, req.body));
    },
    async walkIn(req, res) {
      await respond(req, res, () => model.walkIn(req.user, req.body));
    },
    async addSurcharge(req, res) {
      await respond(req, res, () => model.addSurcharge(req.user, req.body));
    },
    async changeRoom(req, res) {
      await respond(req, res, () => model.changeRoom(req.user, req.body));
    },
    async previewMove(req, res) {
      await respond(req, res, () => model.previewMove(req.user, req.body));
    },
    async extend(req, res) {
      await respond(req, res, () => model.extend(req.user, req.body));
    },
    async previewExtend(req, res) {
      await respond(req, res, () => model.previewExtend(req.user, req.body));
    },
  };
};
