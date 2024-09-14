const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { postPaper } = require('../controllers/PaperPresentController');

const PhotoShopRouter=new express.Router();
PhotoShopRouter.post("/post",isUserAuthenticated,postPaper);
PhotoShopRouter.get("/",async(req,res)=>{
    res.send("paper");
})

module.exports=PhotoShopRouter;
