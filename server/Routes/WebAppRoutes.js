const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { PostWebApp, GetWebApp, ResultWebapp } = require('../controllers/webappController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');


const WebAppRouter=new express.Router();
WebAppRouter.post("/post",isUserAuthenticated,PostWebApp);
WebAppRouter.get("/getresult",isAdminAuthenticated,ResultWebapp);
WebAppRouter.get("/",async(req,res)=>{
    res.send("webapp");
})

module.exports=WebAppRouter;
   