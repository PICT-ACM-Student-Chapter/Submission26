const express =require('express');
const { postInnowave, ResultInnoWave, getinnowave1 } = require('../controllers/InnowaveController');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');
const InnowaveRouter=new express.Router();
InnowaveRouter.post('/post',isUserAuthenticated,postInnowave);
InnowaveRouter.get('/getresult',isAdminAuthenticated,ResultInnoWave);     
InnowaveRouter.get("/",async(req,res)=>{
    res.send("Innowave");
})
InnowaveRouter.get("/get",isUserAuthenticated,getinnowave1);

module.exports=InnowaveRouter;                 