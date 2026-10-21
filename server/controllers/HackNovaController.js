const client = require("../db/connect");
const { emsIds } = require("../models/master");
const { isSubmissionActive } = require("../middleware/checkSubmissionActive");

// Auto-create hacknova_allowed_submissions table on startup
(async () => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS hacknova_allowed_submissions (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        allowed_leader_ids INT[] NOT NULL DEFAULT '{}',
        is_restricted BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn("hacknova_allowed_submissions table init warning:", err.message);
  }
})();

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
    const finalTeamName = (registeredTeam.team_name || req.body.team_name || "").trim();

    // Check if admin restricted project submissions to specific Team Leader IDs
    const allowedCheck = await client.query(
      "SELECT allowed_leader_ids, is_restricted FROM hacknova_allowed_submissions ORDER BY id DESC LIMIT 1"
    );
    if (allowedCheck.rowCount > 0 && allowedCheck.rows[0].is_restricted) {
      const allowedIds = Array.isArray(allowedCheck.rows[0].allowed_leader_ids)
        ? allowedCheck.rows[0].allowed_leader_ids.map(Number)
        : [];

      const leaderId = Number(registeredTeam.leader_user_id);
      const teamId = Number(registeredTeam.id);
      const userId = Number(req.user.id);

      // Only the Team Leader is authorized to submit for the squad
      if (userId !== leaderId) {
        return res.status(403).json({
          error: `Only the Team Leader (ID #${leaderId}) is authorized to submit project deliverables for "${finalTeamName}".`,
          is_leader: false,
          leader_id: leaderId,
        });
      }

      // Check if team leader ID or team ID is in the approved whitelist
      if (allowedIds.length > 0 && !allowedIds.includes(leaderId) && !allowedIds.includes(teamId)) {
        return res.status(403).json({
          error: `Submission Access Restricted: Team Leader ID #${leaderId} (Team #${teamId}) is not on the admin-approved shortlist to submit for HackNova.`,
          not_shortlisted: true,
          leader_id: leaderId,
          team_id: teamId,
        });
      }
    }

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
      `SELECT ht.* FROM hacknova_teams ht 
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

    const registeredTeam = teamCheck.rows[0];

    // Check if admin restricted submissions to specific Team Leader IDs
    const allowedCheck = await client.query(
      "SELECT allowed_leader_ids, is_restricted FROM hacknova_allowed_submissions ORDER BY id DESC LIMIT 1"
    );
    if (allowedCheck.rowCount > 0 && allowedCheck.rows[0].is_restricted) {
      const allowedIds = Array.isArray(allowedCheck.rows[0].allowed_leader_ids)
        ? allowedCheck.rows[0].allowed_leader_ids.map(Number)
        : [];
      const leaderId = Number(registeredTeam.leader_user_id);
      const teamId = Number(registeredTeam.id);
      const userId = Number(req.user.id);

      if (userId !== leaderId) {
        return res.status(403).json({
          error: `Only the Team Leader (ID #${leaderId}) is authorized to upload files for "${registeredTeam.team_name}".`,
          is_leader: false,
        });
      }

      if (allowedIds.length > 0 && !allowedIds.includes(leaderId) && !allowedIds.includes(teamId)) {
        return res.status(403).json({
          error: `Upload Access Restricted: Team Leader ID #${leaderId} is not approved by admin to submit files.`,
          not_shortlisted: true,
        });
      }
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
 * Get current user's HackNova submission & submission applicability
 */
const getHackNova = async (req, res) => {
  try {
    const activeCheck = await isSubmissionActive(emsIds.hacknova);
    // Look up user registered team (leader or member)
    const teamRes = await client.query(
      `SELECT ht.id, ht.team_name, ht.leader_user_id FROM hacknova_teams ht
       LEFT JOIN hacknova_team_members htm ON htm.team_id = ht.id
       WHERE ht.leader_user_id = $1 OR LOWER(htm.email) = LOWER($2)
       LIMIT 1`,
      [req.user.id, (req.user.email || "").trim()]
    );
    const registeredTeam = teamRes.rows[0] || null;
    const registeredTeamName = registeredTeam?.team_name || null;

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

    // Check if team leader is allowed
    let is_submission_applicable = true;
    let not_applicable_reason = "";
    let leader_user_id = registeredTeam ? Number(registeredTeam.leader_user_id) : null;
    let is_leader = leader_user_id ? Number(req.user.id) === leader_user_id : false;
    let allowed_leader_ids = [];
    let is_restricted = false;

    const allowedCheck = await client.query(
      "SELECT allowed_leader_ids, is_restricted FROM hacknova_allowed_submissions ORDER BY id DESC LIMIT 1"
    );
    if (allowedCheck.rowCount > 0 && allowedCheck.rows[0].is_restricted) {
      is_restricted = true;
      allowed_leader_ids = Array.isArray(allowedCheck.rows[0].allowed_leader_ids)
        ? allowedCheck.rows[0].allowed_leader_ids.map(Number)
        : [];

      if (registeredTeam) {
        const teamId = Number(registeredTeam.id);
        if (!is_leader) {
          is_submission_applicable = false;
          not_applicable_reason = `Only the Team Leader (ID #${leader_user_id}) is authorized to submit project deliverables for "${registeredTeam.team_name}".`;
        } else if (allowed_leader_ids.length > 0 && !allowed_leader_ids.includes(leader_user_id) && !allowed_leader_ids.includes(teamId)) {
          is_submission_applicable = false;
          not_applicable_reason = `Your Team Leader ID #${leader_user_id} (Team #${teamId}) is not on the admin-approved shortlist for HackNova project submissions.`;
        }
      }
    }

    return res.status(200).json({
      message: submission ? "Submission fetched" : "Nothing Submitted",
      submission,
      submission_active: activeCheck.active,
      is_submission_active: activeCheck.active,
      event_status: activeCheck.active,
      event_name: activeCheck.eventName,
      is_team_registered: Boolean(registeredTeamName),
      registered_team_name: registeredTeamName,
      is_submission_applicable,
      not_applicable_reason,
      is_leader,
      leader_user_id,
      is_restricted,
      registered_team: registeredTeam ? {
        id: registeredTeam.id,
        team_name: registeredTeam.team_name,
        leader_user_id: registeredTeam.leader_user_id,
      } : null,
    });
  } catch (error) {
    console.error("Error in getHackNova:", error);
    return res.status(500).json({
      error: "Internal Server error",
    });
  }
};

/**
 * Public/User/Admin: Fetch currently allowed Team Leader IDs and restriction flag
 * GET /hacknova/allowed-leaders
 */
const getAllowedHackNovaLeaders = async (req, res) => {
  try {
    const result = await client.query(
      "SELECT allowed_leader_ids, is_restricted, updated_at FROM hacknova_allowed_submissions ORDER BY id DESC LIMIT 1"
    );
    if (result.rowCount === 0) {
      return res.status(200).json({
        success: true,
        allowed_leader_ids: [],
        is_restricted: true,
      });
    }
    return res.status(200).json({
      success: true,
      allowed_leader_ids: result.rows[0].allowed_leader_ids || [],
      is_restricted: result.rows[0].is_restricted !== false,
      updated_at: result.rows[0].updated_at,
    });
  } catch (error) {
    console.error("Error in getAllowedHackNovaLeaders:", error);
    return res.status(500).json({ error: "Failed to fetch allowed leader IDs." });
  }
};

/**
 * Admin only: Set/update allowed Team Leader IDs and restriction flag
 * POST /hacknova/allowed-leaders
 */
const postAllowedHackNovaLeaders = async (req, res) => {
  try {
    const { allowed_leader_ids, is_restricted } = req.body;
    const ids = Array.isArray(allowed_leader_ids)
      ? allowed_leader_ids.map(Number).filter((n) => !isNaN(n))
      : [];
    const restricted = is_restricted !== false;

    await client.query(`
      CREATE TABLE IF NOT EXISTS hacknova_allowed_submissions (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        allowed_leader_ids INT[] NOT NULL DEFAULT '{}',
        is_restricted BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    const insertResult = await client.query(
      `INSERT INTO hacknova_allowed_submissions (allowed_leader_ids, is_restricted, updated_at)
       VALUES ($1, $2, NOW())
       RETURNING *;`,
      [ids, restricted]
    );

    return res.status(200).json({
      success: true,
      message: "Allowed Team Leader IDs saved successfully.",
      allowed_leader_ids: insertResult.rows[0].allowed_leader_ids,
      is_restricted: insertResult.rows[0].is_restricted,
    });
  } catch (error) {
    console.error("Error in postAllowedHackNovaLeaders:", error);
    return res.status(500).json({ error: "Failed to save allowed leader IDs." });
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
  getAllowedHackNovaLeaders,
  postAllowedHackNovaLeaders,
};
