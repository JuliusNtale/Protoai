// Stub — full implementation in feat/derick-exam-endpoints
const stub = (req, res) => res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Coming soon' } });
module.exports = { listExams: stub, getExam: stub, createExam: stub, updateExam: stub, publishExam: stub };
