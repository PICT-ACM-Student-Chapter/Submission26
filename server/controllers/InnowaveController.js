const client = require("../db/connect");
const { emsIds } = require("../models/master");
const { isSubmissionActive } = require("../middleware/checkSubmissionActive");

/**
 * Innowave Round 1: Idea deck submission (PDF/PPT) & Pitch Video URL
 */
const postInnowave = async (req, res) => {
  try {
    const ems_id = emsIds.innowave;

    // Check if submission is active for Innowave
    const activeCheck = await isSubmissionActive(ems_id);
    if (!activeCheck.active) {
      return res.status(403).json({
        error: `Submissions for ${activeCheck.eventName || "Innowave"} are currently closed.`,
        message: `Submissions for ${activeCheck.eventName || "Innowave"} are not active at this time.`,
        event_status: false,
      });
    }

    // Check if user is registered for Innowave
    const registrationCheck = await client.query(
      "SELECT * FROM user_events WHERE fk_user = $1 AND fk_event = $2",
      [req.user.id, ems_id]
    );

    if (registrationCheck.rowCount === 0) {
      return res.status(403).json({
        error: "You must be registered for Innowave to submit.",
      });
    }

    // Check if already submitted
    const query = "SELECT EXISTS (SELECT 1 FROM innowave WHERE fk_user = $1)";
    const result = await client.query(query, [req.user.id]);
    if (result.rows[0].exists) {
      return res.status(400).json({
        error: "Entry already submitted for Innowave.",
      });
    }

    // Deck URL from S3 upload (PPTX/PDF) or body
    const uploadedFile = req.file || (req.files && req.files[0]);
    const deck_url = uploadedFile ? uploadedFile.location : (req.body.submission || req.body.deck_url || req.body.presentation_url);
    const track = req.body.track || req.body.Innowave_type || "Open Innovation";
    const video_pitch_url = req.body.video_pitch_url || "";
    const team_name = req.body.team_name || "";

    if (!deck_url) {
      return res.status(400).json({
        error: "Please upload your presentation deck (PPTX or PDF) or provide a valid pitch deck URL.",
      });
    }

    const insertQuery = `
      INSERT INTO innowave (
        Innowave_type, submission, video_pitch_url, team_name, active_submission, fk_user, ems_user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *;
    `;
    const response = await client.query(insertQuery, [
      track,
      deck_url,
      video_pitch_url,
      team_name,
      true,
      req.user.id,
      req.user.ems_id || null,
    ]);

    return res.status(200).json({
      message: "Innowave idea submitted successfully!",
      submission: {
        ...response.rows[0],
        ems_user_id: response.rows[0].ems_user_id || req.user.ems_id,
      },
    });
  } catch (error) {
    console.error("Error in postInnowave:", error);
    return res.status(500).json({
      error: "Internal Server error: " + error.message,
    });
  }
};

/**
 * Innowave Round 2: Rebuild Window Changelog submission
 */
const patchChangelog = async (req, res) => {
  try {
    const activeCheck = await isSubmissionActive(emsIds.innowave);
    if (!activeCheck.active) {
      return res.status(403).json({
        error: `Submissions for ${activeCheck.eventName || "Innowave"} are currently closed.`,
        message: `Submissions for ${activeCheck.eventName || "Innowave"} are not active at this time.`,
        event_status: false,
      });
    }

    const { changelog } = req.body;
    if (!changelog) {
      return res.status(400).json({
        error: "Changelog content is required.",
      });
    }

    const updateQuery = `
      UPDATE innowave
      SET changelog = $1, updated_at = NOW()
      WHERE fk_user = $2
      RETURNING *;
    `;
    const response = await client.query(updateQuery, [changelog, req.user.id]);

    if (response.rowCount === 0) {
      return res.status(404).json({
        error: "No prior Innowave Round 1 submission found for this user.",
      });
    }

    return res.status(200).json({
      message: "Changelog updated successfully!",
      submission: response.rows[0],
    });
  } catch (error) {
    console.error("Error in patchChangelog:", error);
    return res.status(500).json({
      error: "Internal Server error",
    });
  }
};

/**
 * Fetch current user's Innowave submission
 */
const getInnowave = async (req, res) => {
  try {
    const activeCheck = await isSubmissionActive(emsIds.innowave);
    const response = await client.query(
      "SELECT * FROM innowave WHERE fk_user = $1",
      [req.user.id]
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
    });
  } catch (error) {
    console.error("Error in getInnowave:", error);
    return res.status(500).json({
      error: "Internal Server error",
    });
  }
};

/**
 * Admin view of all Innowave submissions
 */
const ResultInnowave = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.first_name, 
        u.last_name, 
        u.mobile_number, 
        u.year, 
        u.email,
        i.team_name,
        i.Innowave_type AS track,
        i.submission AS deck_url,
        i.video_pitch_url,
        i.changelog,
        i.created_at
      FROM users u
      INNER JOIN innowave i ON u.id = i.fk_user
      ORDER BY i.created_at DESC;
    `;
    const result = await client.query(query);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error in ResultInnowave:", error);
    return res.status(500).json({
      error: "Internal Server error",
    });
  }
};

const { generateEventCsv } = require("../utils/csvExporter");

/**
 * Export Innowave submissions as CSV
 * GET /innowave/csv
 */
const exportInnowaveCsv = async (req, res) => {
  try {
    const result = await generateEventCsv("innowave");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.status(200).send(result.csv);
  } catch (error) {
    console.error("Error in exportInnowaveCsv:", error);
    return res.status(500).json({ error: "Failed to export Innowave CSV" });
  }
};

module.exports = {
  postInnowave,
  patchChangelog,
  getInnowave,
  ResultInnowave,
  exportInnowaveCsv,
  // Backwards compatibility aliases
  getinnowave1: getInnowave,
  ResultInnoWave: ResultInnowave,
};