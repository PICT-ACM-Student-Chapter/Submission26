const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { postPaper } = require('../controllers/PaperPresentController');

const PaperRouter=new express.Router();
PaperRouter.post("/post",isUserAuthenticated,postPaper);
PaperRouter.get("/",async(req,res)=>{
    res.send("paper");
})

module.exports=PaperRouter;
