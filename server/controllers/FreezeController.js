const client = require("../db/connect");
const { emsIds } = require("../models/master");
const { isSubmissionActive } = require("../middleware/checkSubmissionActive");

/**
 * Handle Freeze the Second submission (Supports S3 file upload and/or direct URL)
 */
const PostFreeze = async (req, res) => {
  try {
    const ems_id = emsIds.freeze;

    // Check if submission is active for Freeze the Second
    const activeCheck = await isSubmissionActive(ems_id);
    if (!activeCheck.active) {
      return res.status(403).json({
        error: `Submissions for ${activeCheck.eventName || "Freeze the Second"} are currently closed.`,
        message: `Submissions for ${activeCheck.eventName || "Freeze the Second"} are not active at this time.`,
        event_status: false,
      });
    }

    // Check if user is registered for Freeze the Second
    const registrationCheck = await client.query(
      "SELECT * FROM user_events WHERE fk_user = $1 AND fk_event = $2",
      [req.user.id, ems_id]
    );

    if (registrationCheck.rowCount === 0) {
      return res.status(403).json({
        error: "You must be registered for Freeze the Second to submit.",
      });
    }

    // Check if already submitted (Enforce one photograph per participant)
    const query = "SELECT EXISTS (SELECT 1 FROM freeze_submission WHERE fk_user = $1)";
    const result = await client.query(query, [req.user.id]);
    if (result.rows[0].exists) {
      return res.status(400).json({
        error: "Only one photograph per participant is permitted for Freeze the Second. You have already submitted your photograph.",
      });
    }

    // Determine submission URL: either from uploaded S3 image (JPG/JPEG/PNG) or from request body
    const uploadedFile = req.file || (req.files && req.files[0]);
    const submission_url = uploadedFile ? uploadedFile.location : (req.body.submission || req.body.photo_url || null);
    const photo_title = req.body.photo_title || "";
    const camera_device = req.body.camera_device || "";
    const description = req.body.description || "";

    if (!submission_url) {
      return res.status(400).json({
        error: "Please upload your photograph (JPG, JPEG, or PNG) or provide a valid photograph URL.",
      });
    }

    const insertQuery = `
      INSERT INTO freeze_submission (
        submission, photo_title, camera_device, description, active_submission, fk_user, ems_user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *;
    `;
    const response = await client.query(insertQuery, [
      submission_url,
      photo_title,
      camera_device,
      description,
      true,
      req.user.id,
      req.user.ems_id || null,
    ]);

    return res.status(200).json({
      message: "Photo submitted successfully!",
      submission: {
        ...response.rows[0],
        ems_user_id: response.rows[0].ems_user_id || req.user.ems_id,
      },
    });
  } catch (error) {
    console.error("Error in PostFreeze:", error);
    return res.status(500).json({
      error: "Internal Server error: " + error.message,
    });
  }
};

/**
 * Fetch current user's Freeze the Second submission
 */
const getFreeze = async (req, res) => {
  try {
    const response = await client.query(
      "SELECT * FROM freeze_submission WHERE fk_user = $1",
      [req.user.id]
    );
    if (response.rowCount === 0) {
      return res.status(200).json({
        message: "Nothing Submitted",
        submission: null,
      });
    }
    return res.status(200).json({
      submission: {
        ...response.rows[0],
        ems_user_id: response.rows[0].ems_user_id || req.user.ems_id,
      },
    });
  } catch (error) {
    console.error("Error in getFreeze:", error);
    return res.status(500).json({
      error: "Internal Server error",
    });
  }
};

/**
 * Admin view of all Freeze the Second submissions
 */
const ResultFreeze = async (req, res) => {
  try {
    const query = `
      SELECT 
        f.id,
        u.first_name, 
        u.last_name, 
        u.mobile_number, 
        u.year,
        u.email,
        f.photo_title,
        f.camera_device,
        f.description,
        f.submission AS photo_url,
        f.created_at
      FROM users u
      INNER JOIN freeze_submission f ON u.id = f.fk_user
      ORDER BY f.created_at DESC;
    `;
    const result = await client.query(query);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error in ResultFreeze:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

const { generateEventCsv } = require("../utils/csvExporter");

/**
 * Export Freeze the Second submissions as CSV
 * GET /freeze/csv
 */
const exportFreezeCsv = async (req, res) => {
  try {
    const result = await generateEventCsv("freeze");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.status(200).send(result.csv);
  } catch (error) {
    console.error("Error in exportFreezeCsv:", error);
    return res.status(500).json({ error: "Failed to export Freeze CSV" });
  }
};

module.exports = { PostFreeze, getFreeze, ResultFreeze, exportFreezeCsv };