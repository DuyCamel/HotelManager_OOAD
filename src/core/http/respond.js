/** Hoàn tất command đổi mật khẩu/khôi phục/chuyển quyền Quản lý và quản lý vòng đời session. */
module.exports = async (req, res, operation, { transfer = false } = {}) => {
  const result = await operation();
  if (result?.logoutAll) global.hotelEpoch++;
  if (result?.logout || result?.logoutAll || transfer)
    await new Promise((resolve, reject) =>
      req.session.destroy((e) => (e ? reject(e) : resolve())),
    );
  res.json(result || { ok: true });
};
