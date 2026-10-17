const express = require("express");
const {
  postHackNova,
  uploadHackNovaFile,
  getHackNova,
  ResultHackNova,
  exportHackNovaCsv,
} = require("../controllers/HackNovaController");
const isUserAuthenticated = require("../middleware/userMiddleware");
const { isAdminAuthenticated } = require("../middleware/adminMiddlewares");
const { createS3Uploader } = require("../utils/s3Upload");

const HackNovaRouter = new express.Router();

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

// 1. Submit HackNova project (Accepts PPTX/PDF presentation, GitHub link, Project ZIP)
HackNovaRouter.post("/", isUserAuthenticated, uploadHandler, postHackNova);
HackNovaRouter.post("/post", isUserAuthenticated, uploadHandler, postHackNova);

// 2. Direct S3 Upload Helper (upload PPTX/PDF or ZIP and immediately get S3 URL)
HackNovaRouter.post("/upload-file", isUserAuthenticated, singleFileHandler, uploadHackNovaFile);
HackNovaRouter.post("/upload", isUserAuthenticated, uploadHandler, postHackNova);

// 3. User & Admin endpoints
HackNovaRouter.get("/", isUserAuthenticated, getHackNova);
HackNovaRouter.get("/get", isUserAuthenticated, getHackNova);
HackNovaRouter.get("/getresult", isAdminAuthenticated, ResultHackNova);
HackNovaRouter.get("/csv", isAdminAuthenticated, exportHackNovaCsv);
HackNovaRouter.get("/export-csv", isAdminAuthenticated, exportHackNovaCsv);
HackNovaRouter.get("/download-csv", isAdminAuthenticated, exportHackNovaCsv);

module.exports = HackNovaRouter;
