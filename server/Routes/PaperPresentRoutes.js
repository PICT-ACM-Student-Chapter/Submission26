const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { postPaper, getPaper } = require('../controllers/PaperPresentController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');

const PaperRouter=new express.Router();
PaperRouter.post("/post",isUserAuthenticated,postPaper);
PaperRouter.get("/get",isAdminAuthenticated,getPaper);
PaperRouter.get("/",async(req,res)=>{
    res.send("paper");
})

module.exports=PaperRouter;
