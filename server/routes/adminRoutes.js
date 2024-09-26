    const express =require('express');
const   AdminRouter=new express.Router();


const {
    signUpAdmin,
    signInAdmin,
    getAdmin,
    logOutAdmin,
    getcsv
} = require("../controllers/adminControllers");
const {isAdminAuthenticated} = require("../middleware/adminMiddlewares");

AdminRouter.post("/signup", signUpAdmin);
AdminRouter.post("/signin",signInAdmin);
AdminRouter.get("/me",isAdminAuthenticated,getAdmin);
AdminRouter.post("/signout",isAdminAuthenticated,logOutAdmin);
AdminRouter.get("/",async(req,res)=>{
    res.send('admin');
})
AdminRouter.get("/csv/:event",getcsv);


//write your routes here 






module.exports=AdminRouter;   