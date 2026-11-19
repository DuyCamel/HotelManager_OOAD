/** Routes công khai. */
const { Router } = require("express");
const { required } = require("../../core/auth/security");
module.exports = (models) => {
  const r = Router(),
    c = require("../../controllers/home/home.controller")(models);
  r.get("/", c.index);
  r.get("/api/availability", required, c.availability);
  return r;
};
