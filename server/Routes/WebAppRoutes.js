const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { PostWebApp, GetWebApp } = require('../controllers/webappController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');


const WebAppRouter=new express.Router();
WebAppRouter.post("/post",isUserAuthenticated,PostWebApp);
WebAppRouter.get("/get",isAdminAuthenticated,GetWebApp);
WebAppRouter.get("/",async(req,res)=>{
    res.send("webapp");
})

module.exports=WebAppRouter;
