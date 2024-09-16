const express =require('express');
const { addSubmissonEvent, updateSubmissionEvent, deleteSubmissionEvent, getSubmissionEvents, getAllSubmissionEvents } = require('../controllers/SubmissionEventController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');
const SubmissionEventRouter=new express.Router();



//write your routes here 
SubmissionEventRouter.post("/post",isAdminAuthenticated,addSubmissonEvent);
SubmissionEventRouter.patch("/update/:id",isAdminAuthenticated,updateSubmissionEvent);
SubmissionEventRouter.delete("/delete/:id",isAdminAuthenticated,deleteSubmissionEvent);
SubmissionEventRouter.get("/get",isAdminAuthenticated,getAllSubmissionEvents);



module.exports=SubmissionEventRouter;