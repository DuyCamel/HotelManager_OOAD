/** Render view của từng module sau kiểm tra quyền. Controller gọi hàm này, không chứa SQL. */
const { allow } = require("../auth/rbac");
module.exports =
  (view, page, permission, extra = {}) =>
  (req, res) => {
    if (permission) allow(req.user, permission);
    res.render(view, { initialPage: page, catalogKind: null, ...extra });
  };
