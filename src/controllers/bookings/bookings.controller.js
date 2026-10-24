/** Controller bookings: nhận HTTP, gọi model, render view. TODO TV2: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.bookings;
  return {
    index: page("bookings/index", "bookings", "bookings", {
      catalogKind: null,
    }),
    async create(req, res) {
      await respond(req, res, () => model.create(req.user, req.body));
    },
    async deposit(req, res) {
      await respond(req, res, () => model.deposit(req.user, req.body));
    },
    async cancel(req, res) {
      await respond(req, res, () => model.cancel(req.user, req.body));
    },
  };
};
