const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { postPaper } = require('../controllers/PaperPresentController');
const { postInsight, getInsight } = require('../controllers/InsightController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');

const InsightRouter=new express.Router();
InsightRouter.post('/post',isUserAuthenticated,postInsight);
InsightRouter.get('/get',isAdminAuthenticated,getInsight);
InsightRouter.get("/",async(req,res)=>{
    res.send("insight");
})

module.exports=InsightRouter;