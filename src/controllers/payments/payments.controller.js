module.exports = (models) => ({
  async create(req, res) {
    res.json(await models.payments.create(req.user, req.body));
  },
  async status(req, res) {
    res.json(await models.payments.status(req.user, req.params.id));
  },
  async webhook(req, res) {
    res.json({ success: true, ...await models.payments.receive(req.body, req.get("Authorization")) });
  },
});
