const express = require("express");
const {
  postRootCause,
  getRootCause,
  ResultRootCause,
  exportRootCauseCsv,
} = require("../controllers/RootCauseController");
const isUserAuthenticated = require("../middleware/userMiddleware");
const { isAdminAuthenticated } = require("../middleware/adminMiddlewares");
const { checkSubmissionActive } = require("../middleware/checkSubmissionActive");
const { emsIds } = require("../models/master");
const { createS3Uploader } = require("../utils/s3Upload");

const RootCauseRouter = new express.Router();
const uploadPatch = createS3Uploader("rootcause", 50);

const uploadHandler = (req, res, next) => {
  uploadPatch.single("patch_file")(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Handles patch/zip upload and/or PR URLs (Guarded by checkSubmissionActive)
RootCauseRouter.post("/", isUserAuthenticated, checkSubmissionActive(emsIds.rootcause), uploadHandler, postRootCause);
RootCauseRouter.post("/post", isUserAuthenticated, checkSubmissionActive(emsIds.rootcause), uploadHandler, postRootCause);
RootCauseRouter.post("/upload", isUserAuthenticated, checkSubmissionActive(emsIds.rootcause), uploadHandler, postRootCause);

RootCauseRouter.get("/", isUserAuthenticated, getRootCause);
RootCauseRouter.get("/get", isUserAuthenticated, getRootCause);
RootCauseRouter.get("/getresult", isAdminAuthenticated, ResultRootCause);
RootCauseRouter.get("/csv", isAdminAuthenticated, exportRootCauseCsv);
RootCauseRouter.get("/export-csv", isAdminAuthenticated, exportRootCauseCsv);
RootCauseRouter.get("/download-csv", isAdminAuthenticated, exportRootCauseCsv);

module.exports = RootCauseRouter;
