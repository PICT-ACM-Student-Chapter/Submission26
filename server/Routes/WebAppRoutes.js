const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { PostWebApp } = require('../controllers/webappController');


const WebAppRouter=new express.Router();
WebAppRouter.post("/post",isUserAuthenticated,PostWebApp);
WebAppRouter.get("/",async(req,res)=>{
    res.send("webapp");
})

module.exports=WebAppRouter;
