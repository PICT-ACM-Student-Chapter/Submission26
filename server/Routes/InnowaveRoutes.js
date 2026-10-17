const express = require("express");
const {
  postInnowave,
  patchChangelog,
  getInnowave,
  ResultInnowave,
  exportInnowaveCsv,
} = require("../controllers/InnowaveController");
const isUserAuthenticated = require("../middleware/userMiddleware");
const { isAdminAuthenticated } = require("../middleware/adminMiddlewares");
const { createS3Uploader } = require("../utils/s3Upload");

const InnowaveRouter = new express.Router();
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

// Support file upload or direct payload
InnowaveRouter.post("/", isUserAuthenticated, uploadHandler, postInnowave);
InnowaveRouter.post("/post", isUserAuthenticated, uploadHandler, postInnowave);
InnowaveRouter.post("/upload", isUserAuthenticated, uploadHandler, postInnowave);

InnowaveRouter.patch("/changelog", isUserAuthenticated, patchChangelog);
InnowaveRouter.get("/", isUserAuthenticated, getInnowave);
InnowaveRouter.get("/get", isUserAuthenticated, getInnowave);
InnowaveRouter.get("/getresult", isAdminAuthenticated, ResultInnowave);
InnowaveRouter.get("/csv", isAdminAuthenticated, exportInnowaveCsv);
InnowaveRouter.get("/export-csv", isAdminAuthenticated, exportInnowaveCsv);
InnowaveRouter.get("/download-csv", isAdminAuthenticated, exportInnowaveCsv);

module.exports = InnowaveRouter;