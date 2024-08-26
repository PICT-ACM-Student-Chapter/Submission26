const express = require("express");
const isUserAuthenticated = require("../middleware/userMiddleware");
const {submitDataquest2 , getDataquest2Submissions , getLeaderboard} = require("../controllers/dataquest/dataquest_round2");

const router = express.Router();

router.post("/submitDataquest2", isUserAuthenticated, submitDataquest2);
router.get("/getsubmission2", isUserAuthenticated, getDataquest2Submissions);
router.get("/leaderboard2", isUserAuthenticated, getLeaderboard);

module.exports = router;