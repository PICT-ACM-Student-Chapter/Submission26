// router.js
const express = require("express");
const isUserAuthenticated = require("../middleware/userMiddleware");
const {submitDataquest , getSubmitted , leaderboard} = require("../controllers/dataquest/dataquest");

const router = express.Router();

router.post("/submitDataquest1", isUserAuthenticated, submitDataquest);
router.get("/getsubmission1", isUserAuthenticated, getSubmitted);
router.get("/leaderboard1", isUserAuthenticated, leaderboard);

module.exports = router;