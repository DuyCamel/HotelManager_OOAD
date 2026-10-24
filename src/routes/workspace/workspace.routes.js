/** Workspace + đường dẫn tương thích cũ, không dispatch command nghiệp vụ. */
const { Router } = require("express"),
  { required } = require("../../core/auth/security");
module.exports = (models) => {
  const r = Router(),
    c = require("../../controllers/workspace/workspace.controller")(models);
  r.get(["/app", "/portal"], required, c.index);
  r.get("/api/data", required, c.data);
  r.get("/app/search", required, c.search);
  r.get("/app/mybookings", required, c.mybookings);
  r.get("/app/mycard", required, c.mycard);
  r.get("/portal/invoices", required, c.customerInvoices);
  for (const [old, next] of Object.entries({
    board: "housekeeping",
    cards: "memberships",
    catalog: "rooms",
    overview: "dashboard",
    system: "settings",
    usage: "service-usage",
  }))
    r.get("/app/" + old, required, (req, res) => res.redirect("/app/" + next));
  return r;
};
