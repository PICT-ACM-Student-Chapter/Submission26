const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');
const { postDataQuest2, GetLeaderBoard2, GetDataQuest2, GetAllDataQuest2Submissions } = require('../controllers/Dataquest2Controllers');
const DQ2Router=new express.Router();

DQ2Router.post("/post",isUserAuthenticated,postDataQuest2);
DQ2Router.get('/leaderboard',isUserAuthenticated,GetLeaderBoard2);
DQ2Router.get("/get",isUserAuthenticated,GetDataQuest2);
DQ2Router.get("/getresult",isAdminAuthenticated,GetAllDataQuest2Submissions);

module.exports=DQ2Router;
