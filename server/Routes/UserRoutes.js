const express =require('express');
const { signInUser } = require('../controllers/userController');
const UserRouter=new express.Router();


//write your routes here 

UserRouter.post('/sign',signInUser);
UserRouter.get('/',async(req,res)=>{
    res.send("user");
})



module.exports=UserRouter;  