const express =require('express');
const { signInUser, signoutUser, GetUserEvent, me } = require('../controllers/userController');
const isUserAuthenticated = require('../middleware/userMiddleware');
const UserRouter=new express.Router();


//write your routes here 

UserRouter.post('/signin',signInUser);
UserRouter.delete('/signout',isUserAuthenticated,signoutUser);
UserRouter.get("/me",isUserAuthenticated,me)
UserRouter.get("/user_events",isUserAuthenticated,GetUserEvent);
UserRouter.get('/',async(req,res)=>{
    res.send("user");
})


  

module.exports=UserRouter;  