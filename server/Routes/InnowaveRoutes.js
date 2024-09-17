const express =require('express');
const { postInnowave, ResultInnoWave } = require('../controllers/InnowaveController');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');
const InnowaveRouter=new express.Router();
InnowaveRouter.post('/post',isUserAuthenticated,postInnowave);
InnowaveRouter.get('/getresult/:type',isAdminAuthenticated,ResultInnoWave);     
InnowaveRouter.get("/",async(req,res)=>{
    res.send("Innowave");
})

module.exports=InnowaveRouter;                 