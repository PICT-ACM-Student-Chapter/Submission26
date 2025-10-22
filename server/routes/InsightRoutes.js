const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { postPaper } = require('../controllers/PaperPresentController');
const { postInsight, getInsight, ResultInsight } = require('../controllers/InsightController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');


const InsightRouter=new express.Router();
InsightRouter.post('/post',isUserAuthenticated,postInsight);
InsightRouter.get('/getresult',isAdminAuthenticated,ResultInsight); 
InsightRouter.get("/get",isUserAuthenticated,getInsight);   
InsightRouter.get("/",async(req,res)=>{
    res.send("insight");
})

module.exports=InsightRouter;          