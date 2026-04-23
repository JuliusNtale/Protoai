// Stub — full implementation in feat/derick-report-generation
const stub = (req, res) => res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } });
module.exports = { getReport: stub, flagReport: stub, exportCsv: stub };
