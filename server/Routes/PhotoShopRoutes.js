const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { postPaper } = require('../controllers/PaperPresentController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');
const { GetPhotoShop } = require('../controllers/PhotoShopController');

const PhotoShopRouter=new express.Router();
PhotoShopRouter.post("/post",isUserAuthenticated,postPaper);
PhotoShopRouter.get("/get",isAdminAuthenticated,GetPhotoShop);
PhotoShopRouter.get("/",async(req,res)=>{
    res.send("paper");
})

module.exports=PhotoShopRouter;
