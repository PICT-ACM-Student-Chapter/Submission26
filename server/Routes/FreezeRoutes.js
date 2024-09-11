const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { PostFreeze, getFreeze } = require('../controllers/FreezeController');
const FreezeRouter=new express.Router();

FreezeRouter.post("/post",isUserAuthenticated,PostFreeze);
FreezeRouter.get("/get",isUserAuthenticated,getFreeze);
FreezeRouter.get("/",async(req,res)=>{
    res.send("freeze");
})





module.exports= FreezeRouter;