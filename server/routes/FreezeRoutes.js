const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { PostFreeze, getFreeze, ResultFreeze } = require('../controllers/FreezeController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');
const FreezeRouter=new express.Router();

FreezeRouter.post("/post",isUserAuthenticated,PostFreeze);
FreezeRouter.get("/getresult",isAdminAuthenticated,ResultFreeze);
FreezeRouter.get("/get",isUserAuthenticated,getFreeze);
FreezeRouter.get("/",async(req,res)=>{
    res.send("freeze");
})





module.exports= FreezeRouter;                      