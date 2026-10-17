let express = require("express");
let path = require("path");
let cookieParser = require("cookie-parser");
let logger = require("morgan");
var cors = require("cors");

const fs = require("fs");
const envPath = fs.existsSync(path.join(__dirname, ".env"))
  ? path.join(__dirname, ".env")
  : path.join(__dirname, ".env.dev");
require("dotenv").config({ path: envPath });

const cron = require("node-cron");
const port = process.env.PORT || 3001;
console.log(`Loaded environment from: ${envPath}`);
console.log(`EMS_API: ${process.env.EMS_API || "https://api.pulzion.pictacm.in"}`);

// ==========================================
// Core & Active Event Routers
// ==========================================
const AdminRouter = require("./Routes/adminRoutes");
const UserRouter = require("./Routes/UserRoutes");
const SubmissionEventRouter = require("./Routes/SubmissionEventRouter");
const alleventRouter = require("./Routes/AlleventRoutes");

// 4 Active Events
const FreezeRouter = require("./Routes/FreezeRoutes");       // EMS ID 10
const InnowaveRouter = require("./Routes/InnowaveRoutes");   // EMS ID 12
const HackNovaRouter = require("./Routes/HackNovaRoutes");   // EMS ID 20 (Replaces Web N App)
const RootCauseRouter = require("./Routes/RootCauseRoutes"); // EMS ID 21

// ==========================================
// Disabled / Legacy Routers (Commented Out)
// ==========================================
// const DQRouter = require("./routes/DataquestRoutes");
// const DQ2Router = require("./routes/DataQuest2Routes");
// const InsightRouter = require("./routes/InsightRoutes");
// const WebAppRouter = require("./routes/WebAppRoutes");
// const PhotoShopRouter = require("./routes/PhotoShopRoutes");
// const PaperRouter = require("./routes/PaperPresentRoutes");
// const Innowave2Router = require("./routes/Innowave2Routes");

const pool = require("./db/connect"); // Import the pool from connect.js

// ---------------------------
// Test DB connection on startup
// ---------------------------
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Error connecting to Neon DB:", err);
  } else {
    console.log("Connected to Neon DB at:", res.rows[0].now);
    // Ensure event columns exist
    pool.query(`
      ALTER TABLE rootcause ADD COLUMN IF NOT EXISTS github_repo_url VARCHAR(2048);
      ALTER TABLE hacknova ADD COLUMN IF NOT EXISTS presentation_url VARCHAR(2048);
      ALTER TABLE hacknova ADD COLUMN IF NOT EXISTS project_zip_url VARCHAR(2048);
    `, (migErr) => {
      if (migErr) {
        console.warn("Schema check warning:", migErr.message);
      } else {
        console.log("✓ Event schema columns up-to-date (Root Cause & HackNova).");
      }
    });
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
// Active Routes
// ---------------------------
app.use("/user", UserRouter);
app.use("/admin", AdminRouter);
app.use("/submission", SubmissionEventRouter);
app.use("/allevents", alleventRouter);

// 4 Target Events
app.use("/freeze", FreezeRouter);
app.use("/innowave", InnowaveRouter);
app.use("/hacknova", HackNovaRouter);
app.use("/rootcause", RootCauseRouter);

// ---------------------------
// Disabled Routes (Commented Out)
// ---------------------------
// app.use("/dataquest", DQRouter);
// app.use("/dataquest2", DQ2Router);
// app.use("/insight", InsightRouter);
// app.use("/webapp", WebAppRouter);
// app.use("/photoshop", PhotoShopRouter);
// app.use("/paper", PaperRouter);
// app.use("/innowave2", Innowave2Router);

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
});

// ---------------------------
// Start server
// ---------------------------
app.listen(port, () => {
  console.log(`Server is running on port ${port} http://localhost:${port}`);
});
