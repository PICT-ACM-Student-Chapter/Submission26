let express = require("express");
let path = require("path");
let cookieParser = require("cookie-parser");
let logger = require("morgan");
var cors = require("cors");

const cron = require("node-cron");
require("dotenv").config();
const port = process.env.PORT || 3001;

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
const PaperRouter = require("./routes/PaperPresentRoutes");
const DQ2Router = require("./routes/DataQuest2Routes");
const Innowave2Router = require("./routes/Innowave2Routes");

const pool = require("./db/connect"); // Import the pool from connect.js

// ---------------------------
// Test DB connection on startup
// ---------------------------
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Error connecting to Neon DB:", err);
  } else {
    console.log("Connected to Neon DB at:", res.rows[0].now);
  }
});

// ---------------------------
// Keep-alive ping (every 4 minutes to prevent auto-pause)
// ---------------------------
setInterval(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("Keep-alive ping successful");
  } catch (err) {
    console.log("Keep-alive ping failed:", err);
  }
}, 4 * 60 * 1000);

// ---------------------------
// Express app setup
// ---------------------------
const app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------
// Routes
// ---------------------------
app.use("/user", UserRouter);
app.use("/admin", AdminRouter);
app.use("/dataquest", DQRouter);
app.use("/freeze", FreezeRouter);
app.use("/allevents", alleventRouter);
app.use("/insight", InsightRouter);
app.use("/webapp", WebAppRouter);
app.use("/photoshop", PhotoShopRouter);
app.use("/submission", SubmissionEventRouter);
app.use("/innowave", InnowaveRouter);
app.use("/paper", PaperRouter);
app.use("/innowave2", Innowave2Router);
app.use("/dataquest2", DQ2Router);

// ---------------------------
// Basic health check endpoint
// ---------------------------
app.get("/", async (req, res) => {
  res.send("pong");
});

// ---------------------------
// Cron job example
// ---------------------------
cron.schedule("* * * * *", async () => {
  console.log("Cron job is running");
  // You can perform your database operations or other tasks here
});

// ---------------------------
// Start server
// ---------------------------
app.listen(port, () => {
  console.log(`Server is running on port ${port} http://localhost:${port}`);
});
