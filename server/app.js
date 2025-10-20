let express = require("express");
let path = require("path");
let cookieParser = require("cookie-parser");
let logger = require("morgan");
const pool = require("./db/connect");
var cors = require("cors");

const cron = require("node-cron");
require('dotenv').config();
const port = 3001 || process.env.port;
const AdminRouter = require("./routes/adminRoutes");
const UserRouter = require("./routes/UserRoutes");
const DQRouter = require("./routes/DataquestRoutes");
const FreezeRouter = require("./routes/FreezeRoutes");
const alleventRouter = require("./routes/AlleventRoutes");
const InsightRouter = require("./routes/InsightRoutes");
const WebAppRouter = require("./routes/WebAppRoutes");
const PhotoShopRouter = require("./routes/PhotoShopRoutes");
const SubmissionEventRouter = require("./routes/SubmissionEventRouter");
const InnowaveRouter = require("./routes/InnowaveRoutes");
const { configDotenv } = require("dotenv");
const PaperRouter = require("./routes/PaperPresentRoutes");
const DQ2Router = require("./routes/DataQuest2Routes");
const Innowave2Router = require("./routes/Innowave2Routes");
const client = require("./db/connect");
// const Innowave2Router = require("./Routes/Innnovave2Routes");
// const DQ2Router = require("./routes/DataQuest2Routes");
const app = express();


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
app.use("/innowave",InnowaveRouter);
app.use("/paper",PaperRouter);
app.use("/innowave2",Innowave2Router);
app.use("/dataquest",DQRouter);
app.use("/dataquest2",DQ2Router);
client
  .connect()
  .then(() => console.log("connected"))
  .catch((err) => console.error("connection error", err.stack));
app.get("/", async (req, res) => {
  res.send("pong");
});

// Schedule a cron job to run every day at midnight (example: '0 0 * * *' for midnight)
cron.schedule("* * * * *", async () => {
  console.log("Cron job is running ");

  // You can perform your database operations or other tasks here
});

app.listen(port, () => {
  console.log(`Server is running on port ${port} http://localhost:${port}`);
});