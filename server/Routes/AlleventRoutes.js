const express = require("express");
const { GettingAllEvents } = require("../controllers/alleventController");
const { GetAllEventFromEms } = require("../controllers/InnowaveController");
const alleventRouter=express.Router();
alleventRouter.get("/addevents",GettingAllEvents);
alleventRouter.get("/events",GetAllEventFromEms);
alleventRouter.get("/",async(req,res)=>{
    res.send("allevent");
})
module.exports=alleventRouter;     