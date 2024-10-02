
const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');
const { postDataQuest2, GetLeaderBoard2, GetDataQuest2 } = require('../controllers/Dataquest2Controllers');
const DQ2Router=new express.Router();


DQ2Router.post("/post",isUserAuthenticated,postDataQuest2);
DQ2Router.get('/leaderboard',isUserAuthenticated,GetLeaderBoard2);
DQ2Router.get("/get",isUserAuthenticated,GetDataQuest2);






module.exports=DQ2Router;
