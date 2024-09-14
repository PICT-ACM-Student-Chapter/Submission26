const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { postPaper } = require('../controllers/PaperPresentController');
const { postInsight } = require('../controllers/InsightController');

const InsightRouter=new express.Router();
InsightRouter.post('/post',isUserAuthenticated,postInsight);
InsightRouter.get("/",async(req,res)=>{
    res.send("insight");
})

module.exports=InsightRouter;