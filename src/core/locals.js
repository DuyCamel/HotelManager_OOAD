/** Locals dùng chung cho layout/partial. Không truy vấn database. */
const config = require("../config/env"),
  { has, labels } = require("./auth/rbac");
module.exports = (req, res, next) => {
  res.locals.config = config;
  res.locals.labels = labels;
  res.locals.has = (p) => has(req.user, p);
  next();
};
