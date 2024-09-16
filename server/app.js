let express = require("express");
let path = require("path");
let cookieParser = require("cookie-parser");
let logger = require("morgan");
const pool = require("./db/connect");
var cors = require("cors");
const port = 3001;
const cron = require("node-cron");

const AdminRouter = require("../server/Routes/AdminRoutes");
const UserRouter = require("../server/Routes/UserRoutes");
const DQRouter = require("../server/Routes/DataquestRoutes");
const FreezeRouter = require("./Routes/FreezeRoutes");
const alleventRouter = require("./Routes/AlleventRoutes");
const InsightRouter = require("./Routes/InsightRoutes");
const WebAppRouter = require("./Routes/WebAppRoutes");
const PhotoShopRouter = require("./Routes/PhotoShopRoutes");
const SubmissionEventRouter = require("./Routes/SubmissionEventRouter");
const app = express();

pool.connect();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/user", UserRouter);
app.use("/admin", AdminRouter);
app.use("/dataquest", DQRouter);
app.use("/freeze", FreezeRouter);
app.use("/allevents",alleventRouter);
app.use("/insight",InsightRouter);
app.use("/webapp",WebAppRouter);
app.use("/photoshop",PhotoShopRouter);
app.use("/submission",SubmissionEventRouter);

app.get("/", async (req, res) => {
  res.send("pong");
});

// Schedule a cron job to run every day at midnight (example: '0 0 * * *' for midnight)
cron.schedule("* * * * *", async () => {
  console.log("Cron job is running ");
  
  // You can perform your database operations or other tasks here
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
  