const express =require('express');
const { postInnowave, ResultInnoWave, postInnowave2, ResultInnoWave2 } = require('../controllers/InnowaveController');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');
const Innowave2Router=new express.Router();
Innowave2Router.post('/post',isUserAuthenticated,postInnowave2);
Innowave2Router.get("/getresult",isAdminAuthenticated,ResultInnoWave2);   
Innowave2Router.get("/",async(req,res)=>{
    res.send("Innowave2");
})

module.exports=Innowave2Router;                            