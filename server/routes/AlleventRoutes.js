const express = require("express");
const { GettingAllEvents, GetAllEventFromEms } = require("../controllers/alleventController");

const alleventRouter=express.Router();
alleventRouter.get("/addevents",GettingAllEvents);
alleventRouter.get("/events",GetAllEventFromEms);
alleventRouter.get("/",async(req,res)=>{
    res.send("allevent");
})
module.exports=alleventRouter;     