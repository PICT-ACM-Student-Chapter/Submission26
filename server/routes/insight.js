// router.js
const express = require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { submitInsight, getInsightSubmission } = require('../controllers/insight/insight');

const router = express.Router();

router.post('/submitInsight', isUserAuthenticated, submitInsight);
router.get('/getInsightSubmission', isUserAuthenticated, getInsightSubmission);

module.exports = router;