const express = require("express");
const {
  postHackNova,
  uploadHackNovaFile,
  getHackNova,
  ResultHackNova,
  exportHackNovaCsv,
  getAllowedHackNovaLeaders,
  postAllowedHackNovaLeaders,
} = require("../controllers/HackNovaController");
const {
  getHackNovaTeamMe,
  getHackNovaTeamStatus,
  postHackNovaTeam,
  getAllHackNovaTeams,
} = require("../controllers/HackNovaTeamController");
const isUserAuthenticated = require("../middleware/userMiddleware");
const { isAdminAuthenticated } = require("../middleware/adminMiddlewares");
const { checkSubmissionActive } = require("../middleware/checkSubmissionActive");
const { emsIds } = require("../models/master");
const { createS3Uploader } = require("../utils/s3Upload");

const HackNovaRouter = new express.Router();

// ==========================================
// 1. HackNova Team Registration Endpoints
// ==========================================
// Fetch leader details and check whether team is already registered & locked
HackNovaRouter.get("/team/me", isUserAuthenticated, getHackNovaTeamMe);
HackNovaRouter.get("/team/status", isUserAuthenticated, getHackNovaTeamStatus);

// Submit HackNova team registration (2-4 members, permanent lock)
HackNovaRouter.post("/team", isUserAuthenticated, checkSubmissionActive(emsIds.hacknova_teams), postHackNovaTeam);

// Admin view of all registered HackNova teams & member rosters
HackNovaRouter.get("/teams", isAdminAuthenticated, getAllHackNovaTeams);
HackNovaRouter.get("/team/all", isAdminAuthenticated, getAllHackNovaTeams);

// ==========================================
// 2. HackNova Project Submissions (PPTX/PDF/ZIP/GitHub)
// ==========================================
// Supports PPTX/PDF presentation decks and ZIP/archive project files up to 100MB
const uploadProject = createS3Uploader("hacknova", 100, [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "application/octet-stream",
  "application/x-tar",
  "application/gzip",
]);

// Multi-file handler (accepts presentation_file PPTX/PDF, project_file ZIP, or both)
const uploadHandler = (req, res, next) => {
  uploadProject.any()(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Single file upload helper
const singleFileHandler = (req, res, next) => {
  uploadProject.any()(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Submit HackNova project (Accepts PPTX/PDF presentation, GitHub link, Project ZIP - Guarded by checkSubmissionActive)
HackNovaRouter.post("/", isUserAuthenticated, checkSubmissionActive(emsIds.hacknova), uploadHandler, postHackNova);
HackNovaRouter.post("/post", isUserAuthenticated, checkSubmissionActive(emsIds.hacknova), uploadHandler, postHackNova);

// Direct S3 Upload Helper (upload PPTX/PDF or ZIP and immediately get S3 URL - Guarded by checkSubmissionActive)
HackNovaRouter.post("/upload-file", isUserAuthenticated, checkSubmissionActive(emsIds.hacknova), singleFileHandler, uploadHackNovaFile);
HackNovaRouter.post("/upload", isUserAuthenticated, checkSubmissionActive(emsIds.hacknova), uploadHandler, postHackNova);

// User & Admin submission endpoints
HackNovaRouter.get("/", isUserAuthenticated, getHackNova);
HackNovaRouter.get("/get", isUserAuthenticated, getHackNova);
HackNovaRouter.get("/getresult", isAdminAuthenticated, ResultHackNova);
HackNovaRouter.get("/csv", isAdminAuthenticated, exportHackNovaCsv);
HackNovaRouter.get("/export-csv", isAdminAuthenticated, exportHackNovaCsv);
HackNovaRouter.get("/download-csv", isAdminAuthenticated, exportHackNovaCsv);

// Team Leader Whitelist access control for project submission
HackNovaRouter.get("/allowed-leaders", getAllowedHackNovaLeaders);
HackNovaRouter.post("/allowed-leaders", isAdminAuthenticated, postAllowedHackNovaLeaders);

// HackNova Teams Admin Endpoints (CSV export & Result format for frontend admin)
HackNovaRouter.get("/teams/csv", isAdminAuthenticated, async (req, res) => {
  try {
    const { generateEventCsv } = require("../utils/csvExporter");
    const result = await generateEventCsv("hacknova_teams");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.status(200).send(result.csv);
  } catch (error) {
    console.error("Error in HackNova teams csv:", error);
    return res.status(500).json({ error: "Failed to export HackNova Teams CSV" });
  }
});

HackNovaRouter.get("/teams/getresult", isAdminAuthenticated, async (req, res) => {
  try {
    const { generateEventCsv } = require("../utils/csvExporter");
    const result = await generateEventCsv("hacknova_teams");
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error in HackNova teams getresult:", error);
    return res.status(500).json({ error: "Failed to fetch HackNova Teams results" });
  }
});

HackNovaRouter.get("/getresult/teams", isAdminAuthenticated, async (req, res) => {
  try {
    const { generateEventCsv } = require("../utils/csvExporter");
    const result = await generateEventCsv("hacknova_teams");
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error in HackNova teams getresult:", error);
    return res.status(500).json({ error: "Failed to fetch HackNova Teams results" });
  }
});

module.exports = HackNovaRouter;
