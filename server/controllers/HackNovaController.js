const client = require("../db/connect");
const { emsIds } = require("../models/master");
const { isSubmissionActive } = require("../middleware/checkSubmissionActive");

/**
 * HackNova Project Submission (Accepts S3 file zip, GitHub URL, Live Demo link)
 */
const postHackNova = async (req, res) => {
  try {
    const ems_id = emsIds.hacknova;

    // Check if submission is active for HackNova
    const activeCheck = await isSubmissionActive(ems_id);
    if (!activeCheck.active) {
      return res.status(403).json({
        error: `Submissions for ${activeCheck.eventName || "HackNova"} are currently closed.`,
        message: `Submissions for ${activeCheck.eventName || "HackNova"} are not active at this time.`,
        event_status: false,
      });
    }

    // Verify registration for HackNova
    const registrationCheck = await client.query(
      "SELECT * FROM user_events WHERE fk_user = $1 AND fk_event = $2",
      [req.user.id, ems_id]
    );

    if (registrationCheck.rowCount === 0) {
      return res.status(403).json({
        error: "You must be registered for HackNova to submit.",
      });
    }

    // Verify that the squad/team is registered in HackNova Squad Registration (hacknova_teams)
    const teamCheck = await client.query(
      `SELECT ht.* FROM hacknova_teams ht 
       WHERE ht.leader_user_id = $1 
          OR ht.id IN (SELECT team_id FROM hacknova_team_members WHERE LOWER(email) = LOWER($2))
       LIMIT 1`,
      [req.user.id, (req.user.email || "").trim()]
    );

    if (teamCheck.rowCount === 0) {
      return res.status(403).json({
        error: "Squad registration required: You must register your squad on the HackNova Team Registration page before project submission.",
        requires_team_registration: true,
      });
    }

    const registeredTeam = teamCheck.rows[0];
    const finalTeamName = (registeredTeam.team_name || team_name || "").trim();

    // Check if entry already submitted for this user or this registered squad
    const query = "SELECT EXISTS (SELECT 1 FROM hacknova WHERE fk_user = $1 OR LOWER(team_name) = LOWER($2))";
    const result = await client.query(query, [req.user.id, finalTeamName]);
    if (result.rows[0].exists) {
      return res.status(400).json({
        error: "Entry already submitted for HackNova for this team.",
      });
    }

    const {
      project_title,
      github_url,
      live_demo_url,
      team_name,
      notes,
    } = req.body;

    // Detect uploaded files (PPTX/PDF presentation, and Project ZIP archive)
    let presentation_url = req.body.presentation_url || req.body.pptx_or_pdf_url || req.body.deck_url || null;
    let project_zip_url = req.body.project_zip_url || req.body.submission_file_url || null;

    if (Array.isArray(req.files)) {
      for (const f of req.files) {
        const ext = (f.originalname ? f.originalname.split(".").pop() : "").toLowerCase();
        const isDeck = ext === "pdf" || ext === "pptx" || ext === "ppt" || f.fieldname === "presentation_file" || f.fieldname === "deck_file";
        const isZip = ext === "zip" || ext === "rar" || ext === "7z" || ext === "tar" || ext === "gz" || f.fieldname === "project_file" || f.fieldname === "project_zip";
        
        if (isDeck && !presentation_url) {
          presentation_url = f.location;
        } else if (isZip && !project_zip_url) {
          project_zip_url = f.location;
        } else if (!presentation_url && (ext === "pdf" || ext === "pptx" || ext === "ppt")) {
          presentation_url = f.location;
        } else if (!project_zip_url) {
          project_zip_url = f.location;
        }
      }
    } else if (req.file) {
      const ext = (req.file.originalname ? req.file.originalname.split(".").pop() : "").toLowerCase();
      if (ext === "pdf" || ext === "pptx" || ext === "ppt" || req.file.fieldname === "presentation_file" || req.file.fieldname === "deck_file") {
        presentation_url = req.file.location;
      } else {
        project_zip_url = req.file.location;
      }
    }

    const submission_file_url = project_zip_url || presentation_url || null;

    if (!github_url && !presentation_url && !project_zip_url && !submission_file_url) {
      return res.status(400).json({
        error: "Please provide your GitHub repository link, presentation deck (PPTX/PDF), or project ZIP archive.",
      });
    }

    const insertQuery = `
      INSERT INTO hacknova (
        team_name, project_title, submission_file_url, github_url, live_demo_url, presentation_url, project_zip_url, notes, active_submission, fk_user, ems_user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *;
    `;
    const response = await client.query(insertQuery, [
      finalTeamName || team_name || "",
      project_title || "HackNova Project",
      submission_file_url,
      github_url || "",
      live_demo_url || "",
      presentation_url,
      project_zip_url,
      notes || "",
      true,
      req.user.id,
      req.user.ems_id || null,
    ]);

    return res.status(200).json({
      message: "HackNova project submitted successfully!",
      submission: {
        ...response.rows[0],
        ems_user_id: response.rows[0].ems_user_id || req.user.ems_id,
      },
    });
  } catch (error) {
    console.error("Error in postHackNova:", error);
    return res.status(500).json({
      error: "Internal Server error: " + error.message,
    });
  }
};

/**
 * Direct file upload helper: Uploads PPTX/PDF or Project ZIP to S3 and returns URL immediately
 */
const uploadHackNovaFile = async (req, res) => {
  try {
    const activeCheck = await isSubmissionActive(emsIds.hacknova);
    if (!activeCheck.active) {
      return res.status(403).json({
        error: `Submissions for ${activeCheck.eventName || "HackNova"} are currently closed.`,
        message: `Submissions for ${activeCheck.eventName || "HackNova"} are not active at this time.`,
        event_status: false,
      });
    }

    // Verify squad registration before file upload
    const teamCheck = await client.query(
      `SELECT ht.id FROM hacknova_teams ht 
       WHERE ht.leader_user_id = $1 
          OR ht.id IN (SELECT team_id FROM hacknova_team_members WHERE LOWER(email) = LOWER($2))
       LIMIT 1`,
      [req.user.id, (req.user.email || "").trim()]
    );
    if (teamCheck.rowCount === 0) {
      return res.status(403).json({
        error: "Squad registration required: You must register your squad before uploading submission files.",
        requires_team_registration: true,
      });
    }

    if (!req.file && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: "No file provided for upload." });
    }
    const uploadedFile = req.file || req.files[0];
    return res.status(200).json({
      message: "File uploaded successfully to S3",
      url: uploadedFile.location,
      original_name: uploadedFile.originalname,
      mime_type: uploadedFile.mimetype,
      size: uploadedFile.size,
    });
  } catch (error) {
    console.error("Error in uploadHackNovaFile:", error);
    return res.status(500).json({ error: "Upload failed: " + error.message });
  }
};

/**
 * Get current user's HackNova submission
 */
const getHackNova = async (req, res) => {
  try {
    const activeCheck = await isSubmissionActive(emsIds.hacknova);
    // Look up user registered team (leader or member)
    const teamRes = await client.query(
      `SELECT ht.team_name FROM hacknova_teams ht
       LEFT JOIN hacknova_team_members htm ON htm.team_id = ht.id
       WHERE ht.leader_user_id = $1 OR LOWER(htm.email) = LOWER($2)
       LIMIT 1`,
      [req.user.id, (req.user.email || "").trim()]
    );
    const registeredTeamName = teamRes.rows[0]?.team_name || null;

    const response = await client.query(
      `SELECT * FROM hacknova 
       WHERE fk_user = $1 
          OR ($2::VARCHAR IS NOT NULL AND LOWER(team_name) = LOWER($2))
       ORDER BY id DESC LIMIT 1`,
      [req.user.id, registeredTeamName]
    );

    const submission = response.rowCount > 0 ? {
      ...response.rows[0],
      ems_user_id: response.rows[0].ems_user_id || req.user.ems_id,
    } : null;

    return res.status(200).json({
      message: submission ? "Submission fetched" : "Nothing Submitted",
      submission,
      submission_active: activeCheck.active,
      is_submission_active: activeCheck.active,
      event_status: activeCheck.active,
      event_name: activeCheck.eventName,
      is_team_registered: Boolean(registeredTeamName),
      registered_team_name: registeredTeamName,
    });
  } catch (error) {
    console.error("Error in getHackNova:", error);
    return res.status(500).json({
      error: "Internal Server error",
    });
  }
};

const { generateEventCsv } = require("../utils/csvExporter");

/**
 * Admin view of all HackNova submissions
 */
const ResultHackNova = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.first_name, 
        u.last_name, 
        u.mobile_number, 
        u.year, 
        u.email,
        h.team_name,
        h.project_title,
        h.github_url,
        h.live_demo_url,
        h.presentation_url,
        h.project_zip_url,
        h.submission_file_url,
        h.notes,
        h.created_at
      FROM users u
      INNER JOIN hacknova h ON u.id = h.fk_user
      ORDER BY h.created_at DESC;
    `;
    const result = await client.query(query);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error in ResultHackNova:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

/**
 * Export HackNova Submissions as CSV
 * GET /hacknova/csv
 */
const exportHackNovaCsv = async (req, res) => {
  try {
    const result = await generateEventCsv("hacknova");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.status(200).send(result.csv);
  } catch (error) {
    console.error("Error in exportHackNovaCsv:", error);
    return res.status(500).json({ error: "Failed to export HackNova CSV" });
  }
};

module.exports = {
  postHackNova,
  uploadHackNovaFile,
  getHackNova,
  ResultHackNova,
  exportHackNovaCsv,
};

