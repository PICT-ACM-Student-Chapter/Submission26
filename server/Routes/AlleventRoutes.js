const express = require("express");
const { GettingAllEvents, GetAllEventFromEms } = require("../controllers/alleventController");
const { isAdminAuthenticated } = require("../middleware/adminMiddlewares");

const alleventRouter = express.Router();
alleventRouter.get("/addevents", isAdminAuthenticated, GettingAllEvents);
alleventRouter.get("/events", GetAllEventFromEms);
alleventRouter.get("/", async (req, res) => {
    res.send("allevent");
});
module.exports = alleventRouter;     