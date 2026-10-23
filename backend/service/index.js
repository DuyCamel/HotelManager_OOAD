/** Điểm ghép service. Controller chỉ gọi nghiệp vụ, không viết SQL. */
module.exports = (repo) =>
  Object.fromEntries(
    [
      "auth",
      "read",
      "system",
      "profile",
      "account",
      "catalog",
      "customer",
      "booking",
      "billing",
      "housekeeping",
    ].map((name) => [name, require("./" + name + "Service")(repo)]),
  );
