const express =require('express');
const isUserAuthenticated = require('../middleware/userMiddleware');
const { PostDataQuest, getLeaderBoard, GetDataQuest, GetAllDataQuestSubmissions } = require('../controllers/DataquestController');
const { isAdminAuthenticated } = require('../middleware/adminMiddlewares');
const DQRouter=new express.Router();

DQRouter.post("/post",isUserAuthenticated,PostDataQuest);
DQRouter.get('/leaderboard',isUserAuthenticated,getLeaderBoard);
DQRouter.get("/get",isUserAuthenticated,GetDataQuest);
DQRouter.get("/getresult",isAdminAuthenticated,GetAllDataQuestSubmissions);

module.exports=DQRouter;
