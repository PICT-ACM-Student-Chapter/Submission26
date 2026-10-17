const express = require("express");
const isUserAuthenticated = require("../middleware/userMiddleware");
const { PostFreeze, getFreeze, ResultFreeze, exportFreezeCsv } = require("../controllers/FreezeController");
const { isAdminAuthenticated } = require("../middleware/adminMiddlewares");
const { createS3Uploader } = require("../utils/s3Upload");

const FreezeRouter = new express.Router();
const uploadFreeze = createS3Uploader("freeze", 35, ["image/jpeg", "image/png", "image/jpg"]);

const uploadHandler = (req, res, next) => {
  uploadFreeze.any()(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: "Only JPG, JPEG, and PNG images (max 35MB) are allowed for Freeze the Second." });
    }
    next();
  });
};

// Accepts multipart/form-data with file or JSON submission
FreezeRouter.post("/", isUserAuthenticated, uploadHandler, PostFreeze);
FreezeRouter.post("/post", isUserAuthenticated, uploadHandler, PostFreeze);
FreezeRouter.post("/upload", isUserAuthenticated, uploadHandler, PostFreeze);

FreezeRouter.get("/", isUserAuthenticated, getFreeze);
FreezeRouter.get("/get", isUserAuthenticated, getFreeze);
FreezeRouter.get("/getresult", isAdminAuthenticated, ResultFreeze);
FreezeRouter.get("/csv", isAdminAuthenticated, exportFreezeCsv);
FreezeRouter.get("/export-csv", isAdminAuthenticated, exportFreezeCsv);
FreezeRouter.get("/download-csv", isAdminAuthenticated, exportFreezeCsv);

module.exports = FreezeRouter;