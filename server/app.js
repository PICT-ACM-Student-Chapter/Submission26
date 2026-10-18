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
const AdminRouter = require("./Routes/AdminRoutes");
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
    console.error("Error connecting to PostgreSQL DB:", err);
  } else {
    console.log("Connected to PostgreSQL DB at:", res.rows[0].now);
    // Ensure event columns exist for all 4 active competitions
    pool.query(`
      ALTER TABLE freeze_submission ADD COLUMN IF NOT EXISTS ems_user_id INT;
      ALTER TABLE freeze_submission ADD COLUMN IF NOT EXISTS photo_title VARCHAR(255);
      ALTER TABLE freeze_submission ADD COLUMN IF NOT EXISTS camera_device VARCHAR(255);
      ALTER TABLE freeze_submission ADD COLUMN IF NOT EXISTS description TEXT;

      ALTER TABLE innowave ADD COLUMN IF NOT EXISTS ems_user_id INT;
      ALTER TABLE innowave ADD COLUMN IF NOT EXISTS video_pitch_url VARCHAR(2048);
      ALTER TABLE innowave ADD COLUMN IF NOT EXISTS team_name VARCHAR(255);
      ALTER TABLE innowave ADD COLUMN IF NOT EXISTS changelog TEXT;

      ALTER TABLE hacknova ADD COLUMN IF NOT EXISTS ems_user_id INT;
      ALTER TABLE hacknova ADD COLUMN IF NOT EXISTS presentation_url VARCHAR(2048);
      ALTER TABLE hacknova ADD COLUMN IF NOT EXISTS project_zip_url VARCHAR(2048);

      ALTER TABLE rootcause ADD COLUMN IF NOT EXISTS ems_user_id INT;
      ALTER TABLE rootcause ADD COLUMN IF NOT EXISTS github_repo_url VARCHAR(2048);

      -- HackNova Team Registration Tables
      CREATE TABLE IF NOT EXISTS hacknova_teams (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        team_name VARCHAR(255) NOT NULL,
        leader_user_id INT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_hacknova_leader FOREIGN KEY(leader_user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS hacknova_team_members (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        team_id INT NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_hacknova_team FOREIGN KEY(team_id) REFERENCES hacknova_teams(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_hacknova_team_members_team_id ON hacknova_team_members(team_id);
      CREATE INDEX IF NOT EXISTS idx_hacknova_teams_leader ON hacknova_teams(leader_user_id);

      -- Ensure submission_event can hold distinct portal configs (e.g. HackNova Squads id 200)
      ALTER TABLE submission_event DROP CONSTRAINT IF EXISTS fk_event;
      INSERT INTO submission_event (event_id, event_name, event_route, event_status)
      VALUES (200, 'HACKNOVA SQUAD REGISTRATIONS', '/hacknova-team', true)
      ON CONFLICT (event_id) DO NOTHING;
    `, (migErr) => {
      if (migErr) {
        console.warn("Schema check warning:", migErr.message);
      } else {
        console.log("✓ Event schema columns up-to-date for all 4 competitions (Freeze, Innowave, HackNova, Root Cause).");
        console.log("✓ HackNova team registration tables up-to-date.");
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

// 4 Target Events (Supports both /event and /api/event prefixes)
app.use("/freeze", FreezeRouter);
app.use("/innowave", InnowaveRouter);
app.use("/hacknova", HackNovaRouter);
app.use("/api/hacknova", HackNovaRouter);
app.use("/rootcause", RootCauseRouter);
app.use("/hacknova-teams", HackNovaRouter);
app.use("/api/hacknova-teams", HackNovaRouter);

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
