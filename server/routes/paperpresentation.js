// routes/paperRoutes.js
const express = require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const paperController = require('../controllers/paperController');

const router = express.Router();

router.post('/submitPaper', isUserAuthenticated, paperController.submitPaper);
router.get('/getPaperSubmission', isUserAuthenticated, paperController.getPaperSubmission);

// Example admin route
// router.get('/admin', paperController.getAllSubmissions); // Uncomment if needed

module.exports = router;
