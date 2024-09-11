const express = require("express");
const { GettingAllEvents } = require("../controllers/alleventController");
const alleventRouter=express.Router();
alleventRouter.get("/events",GettingAllEvents);
alleventRouter.get("/",async(req,res)=>{
    res.send("allevent");
})
module.exports=alleventRouter;