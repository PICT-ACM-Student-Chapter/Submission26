const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { postPaper, getPaper, ResultPaper } = require('../controllers/PaperPresentController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');

const PaperRouter=new express.Router();
PaperRouter.post("/post",isUserAuthenticated,postPaper);
PaperRouter.get("/getresult",isAdminAuthenticated,ResultPaper);
PaperRouter.get("/",async(req,res)=>{      
    res.send("paper");
})

module.exports=PaperRouter;
