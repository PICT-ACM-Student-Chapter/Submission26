const express = require('express');
const AdminRouter = new express.Router();

const {
    signUpAdmin,
    signInAdmin,
    getAdmin,
    logOutAdmin,
    getcsv,
    getAllCsv,
    getEventSummaryList,
    getCsvPortal,
} = require("../controllers/adminControllers");
const {
    updateSubmissionEvent,
    updateAllSubmissionEvents,
} = require("../controllers/SubmissionEventController");
const { isAdminAuthenticated } = require("../middleware/adminMiddlewares");

// Public Admin Login Route
AdminRouter.post("/signin", signInAdmin);

// Protected Admin Routes (require valid Admin JWT token via header or ?token=)
AdminRouter.post("/signup", isAdminAuthenticated, signUpAdmin);
AdminRouter.get("/me", isAdminAuthenticated, getAdmin);
AdminRouter.post("/signout", isAdminAuthenticated, logOutAdmin);
AdminRouter.get("/", isAdminAuthenticated, async (req, res) => {
    res.json({ message: "Admin authenticated successfully", admin: req.admin });
});

// Portal Web UI (Serves interactive page with SignIn form & Dashboard)
AdminRouter.get("/portal", getCsvPortal);
AdminRouter.get("/csv-portal", getCsvPortal);

// Protected CSV Export Endpoints (strictly require admin auth)
AdminRouter.get("/csv/summary", isAdminAuthenticated, getEventSummaryList);
AdminRouter.get("/csv", isAdminAuthenticated, getAllCsv);
AdminRouter.get("/submissions/csv", isAdminAuthenticated, getAllCsv);
AdminRouter.get("/csv/:event", isAdminAuthenticated, getcsv);
AdminRouter.get("/export-csv/:event", isAdminAuthenticated, getcsv);

// Submission Status Management Endpoints
AdminRouter.post("/submission-status/toggle-all", isAdminAuthenticated, updateAllSubmissionEvents);
AdminRouter.patch("/submission-status/toggle-all", isAdminAuthenticated, updateAllSubmissionEvents);
AdminRouter.post("/submission-status/:id", isAdminAuthenticated, updateSubmissionEvent);
AdminRouter.patch("/submission-status/:id", isAdminAuthenticated, updateSubmissionEvent);

module.exports = AdminRouter;
