// router.js
const express = require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { submitFreeze, getFreezeSubmission } = require('../controllers/freezeTheSecond/freezeTheSecond');

const router = express.Router();

router.post('/submitFreeze', isUserAuthenticated, submitFreeze);
router.get('/getFreezeSubmission', isUserAuthenticated, getFreezeSubmission);

module.exports = router;