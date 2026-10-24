/** Controller room-types: nhận HTTP, gọi model, render view. TODO TV3: hoàn thiện task tại docs/MODULES.md. */
const page = require("../../core/http/page"),
  respond = require("../../core/http/respond");
module.exports = (models) => {
  const model = models.types;
  return {
    index: page("room-types/index", "catalog", "catalog", {
      catalogKind: "types",
    }),
    async save(req, res) {
      await respond(req, res, () => model.save(req.user, req.body));
    },
  };
};
