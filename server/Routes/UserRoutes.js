const express =require('express');
const { signInUser, signoutUser, GetUserEvent } = require('../controllers/userController');
const isUserAuthenticated = require('../middleware/userMiddleware');
const UserRouter=new express.Router();


//write your routes here 

UserRouter.post('/sign',signInUser);
UserRouter.delete('/signout',isUserAuthenticated,signoutUser);
UserRouter.get("/user_events",isUserAuthenticated,GetUserEvent);
UserRouter.get('/',async(req,res)=>{
    res.send("user");
})


 

module.exports=UserRouter;  