const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { PostDataQuest, getLeaderBoard, GetDataQuest } = require('../controllers/DataquestController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');
const DQRouter=new express.Router();


DQRouter.post("/post",isUserAuthenticated,PostDataQuest);
DQRouter.get('/leaderboard',isUserAuthenticated,getLeaderBoard);
DQRouter.get("/get",isUserAuthenticated,GetDataQuest);






module.exports=DQRouter;