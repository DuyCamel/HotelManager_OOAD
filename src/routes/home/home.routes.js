/** Routes công khai. */
const { Router } = require("express");
module.exports = (models) => {
  const r = Router(),
    c = require("../../controllers/home/home.controller")(models);
  r.get("/", c.index);
  r.get("/api/availability", c.availability);
  return r;
};
