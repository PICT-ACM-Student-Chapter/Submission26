const express = require("express");
const {
  postInnowave,
  patchChangelog,
  getInnowave,
  ResultInnowave,
  exportInnowaveCsv,
} = require("../controllers/InnowaveController");
const {
  getInnoWaveTeamMe,
  getInnoWaveTeamStatus,
  postInnoWaveTeam,
  getAllInnoWaveTeams,
} = require("../controllers/InnoWaveTeamController");
const isUserAuthenticated = require("../middleware/userMiddleware");
const { isAdminAuthenticated } = require("../middleware/adminMiddlewares");
const { checkSubmissionActive } = require("../middleware/checkSubmissionActive");
const { emsIds } = require("../models/master");
const { createS3Uploader } = require("../utils/s3Upload");

const InnowaveRouter = new express.Router();

// ==========================================
// 1. InnoWave Team Registration Endpoints
// ==========================================
// Fetch leader details and check whether team is already registered & locked
InnowaveRouter.get("/team/me", isUserAuthenticated, getInnoWaveTeamMe);
InnowaveRouter.get("/team/status", isUserAuthenticated, getInnoWaveTeamStatus);

// Submit InnoWave team registration (2-4 members, permanent lock)
InnowaveRouter.post("/team", isUserAuthenticated, checkSubmissionActive(emsIds.innowave_teams), postInnoWaveTeam);

// Admin view of all registered InnoWave teams & member rosters
InnowaveRouter.get("/teams", isAdminAuthenticated, getAllInnoWaveTeams);
InnowaveRouter.get("/team/all", isAdminAuthenticated, getAllInnoWaveTeams);

// ==========================================
// 2. InnoWave Idea Deck Submissions (PPT/PDF)
// ==========================================
const uploadDeck = createS3Uploader("innowave", 50, [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const uploadHandler = (req, res, next) => {
  uploadDeck.any()(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: "Only PPTX and PDF presentation decks (max 50MB) are allowed for InnoWave." });
    }
    next();
  });
};

// Support file upload or direct payload (Guarded by checkSubmissionActive)
InnowaveRouter.post("/", isUserAuthenticated, checkSubmissionActive(emsIds.innowave), uploadHandler, postInnowave);
InnowaveRouter.post("/post", isUserAuthenticated, checkSubmissionActive(emsIds.innowave), uploadHandler, postInnowave);
InnowaveRouter.post("/upload", isUserAuthenticated, checkSubmissionActive(emsIds.innowave), uploadHandler, postInnowave);

InnowaveRouter.patch("/changelog", isUserAuthenticated, checkSubmissionActive(emsIds.innowave), patchChangelog);
InnowaveRouter.get("/", isUserAuthenticated, getInnowave);
InnowaveRouter.get("/get", isUserAuthenticated, getInnowave);
InnowaveRouter.get("/getresult", isAdminAuthenticated, ResultInnowave);
InnowaveRouter.get("/csv", isAdminAuthenticated, exportInnowaveCsv);
InnowaveRouter.get("/export-csv", isAdminAuthenticated, exportInnowaveCsv);
InnowaveRouter.get("/download-csv", isAdminAuthenticated, exportInnowaveCsv);

// InnoWave Teams Admin Endpoints (CSV export & result format)
InnowaveRouter.get("/teams/csv", isAdminAuthenticated, async (req, res) => {
  try {
    const { generateEventCsv } = require("../utils/csvExporter");
    const result = await generateEventCsv("innowave_teams");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.status(200).send(result.csv);
  } catch (error) {
    console.error("Error in InnoWave teams csv:", error);
    return res.status(500).json({ error: "Failed to export InnoWave Teams CSV" });
  }
});

InnowaveRouter.get("/teams/getresult", isAdminAuthenticated, async (req, res) => {
  try {
    const { generateEventCsv } = require("../utils/csvExporter");
    const result = await generateEventCsv("innowave_teams");
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error in InnoWave teams getresult:", error);
    return res.status(500).json({ error: "Failed to fetch InnoWave Teams results" });
  }
});

module.exports = InnowaveRouter;