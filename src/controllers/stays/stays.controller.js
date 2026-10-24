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
    async changeRoom(req, res) {
      await respond(req, res, () => model.changeRoom(req.user, req.body));
    },
  };
};
