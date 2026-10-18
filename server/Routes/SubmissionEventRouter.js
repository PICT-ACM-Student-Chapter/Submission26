const express = require('express');
const {
    addSubmissonEvent,
    updateSubmissionEvent,
    updateAllSubmissionEvents,
    deleteSubmissionEvent,
    getAllSubmissionEvents,
    FindStatus
} = require('../controllers/SubmissionEventController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');

const SubmissionEventRouter = new express.Router();

// Specific routes first
SubmissionEventRouter.post("/post", isAdminAuthenticated, addSubmissonEvent);
SubmissionEventRouter.patch("/update-all", isAdminAuthenticated, updateAllSubmissionEvents);
SubmissionEventRouter.post("/update-all", isAdminAuthenticated, updateAllSubmissionEvents);
SubmissionEventRouter.patch("/update/:id", isAdminAuthenticated, updateSubmissionEvent);
SubmissionEventRouter.post("/update/:id", isAdminAuthenticated, updateSubmissionEvent);
SubmissionEventRouter.delete("/delete/:id", isAdminAuthenticated, deleteSubmissionEvent);
SubmissionEventRouter.get("/get", isAdminAuthenticated, getAllSubmissionEvents);

// Dynamic route lookup last
SubmissionEventRouter.get("/:route", FindStatus);

module.exports = SubmissionEventRouter;