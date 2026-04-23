// Stub — full implementation in feat/derick-auth-endpoints
const register = (req, res) => res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } });
const login = (req, res) => res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } });
const requestPasswordReset = (req, res) => res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } });
const confirmPasswordReset = (req, res) => res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } });

module.exports = { register, login, requestPasswordReset, confirmPasswordReset };
