// Stub — full implementation in feat/derick-session-endpoints
const stub = (req, res) => res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } });
module.exports = { startSession: stub, verifyIdentity: stub, submitSession: stub };
