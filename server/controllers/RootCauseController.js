const client = require("../db/connect");
const { emsIds } = require("../models/master");

/**
 * Root Cause Bugathon Submission (GitHub PR URL, Patch file upload to S3, fix explanation)
 */
const postRootCause = async (req, res) => {
  try {
    const ems_id = emsIds.rootcause;

    // Verify user registration for Root Cause
    const registrationCheck = await client.query(
      "SELECT * FROM user_events WHERE fk_user = $1 AND fk_event = $2",
      [req.user.id, ems_id]
    );

    if (registrationCheck.rowCount === 0) {
      return res.status(403).json({
        error: "You must be registered for Root Cause to submit.",
      });
    }

    // Check if already submitted
    const query = "SELECT EXISTS (SELECT 1 FROM rootcause WHERE fk_user = $1)";
    const result = await client.query(query, [req.user.id]);
    if (result.rows[0].exists) {
      return res.status(400).json({
        error: "Entry already submitted for Root Cause.",
      });
    }

    const github_repo_url = req.body.github_repo_url || req.body.repo_url || req.body.fork_url || req.body.github_link || "";
    const github_pr_url = req.body.github_pr_url || req.body.pr_url || req.body.branch_url || req.body.branch_or_pr_url || "";
    const { team_name, notes } = req.body;
    const submission_file_url = req.file ? req.file.location : (req.body.submission_file_url || null);

    if (!github_repo_url && !github_pr_url && !submission_file_url) {
      return res.status(400).json({
        error: "Please provide your GitHub repository/fork link and/or branch or Pull Request (PR) link.",
      });
    }

    const insertQuery = `
      INSERT INTO rootcause (
        team_name, submission_file_url, github_pr_url, github_repo_url, notes, active_submission, fk_user, ems_user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *;
    `;
    const response = await client.query(insertQuery, [
      team_name || "",
      submission_file_url,
      github_pr_url || "",
      github_repo_url || "",
      notes || "",
      true,
      req.user.id,
      req.user.ems_id || null,
    ]);

    return res.status(200).json({
      message: "Root Cause fix submitted successfully!",
      submission: {
        ...response.rows[0],
        ems_user_id: response.rows[0].ems_user_id || req.user.ems_id,
      },
    });
  } catch (error) {
    console.error("Error in postRootCause:", error);
    return res.status(500).json({
      error: "Internal Server error: " + error.message,
    });
  }
};

/**
 * Fetch current user's Root Cause submission
 */
const getRootCause = async (req, res) => {
  try {
    const response = await client.query(
      "SELECT * FROM rootcause WHERE fk_user = $1",
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
    console.error("Error in getRootCause:", error);
    return res.status(500).json({
      error: "Internal Server error",
    });
  }
};

/**
 * Admin view of all Root Cause submissions
 */
const ResultRootCause = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.first_name, 
        u.last_name, 
        u.mobile_number, 
        u.year, 
        u.email,
        r.team_name,
        r.github_repo_url,
        r.github_pr_url,
        r.submission_file_url,
        r.notes,
        r.created_at
      FROM users u
      INNER JOIN rootcause r ON u.id = r.fk_user
      ORDER BY r.created_at DESC;
    `;
    const result = await client.query(query);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error in ResultRootCause:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

const { generateEventCsv } = require("../utils/csvExporter");

/**
 * Export Root Cause submissions as CSV
 * GET /rootcause/csv
 */
const exportRootCauseCsv = async (req, res) => {
  try {
    const result = await generateEventCsv("rootcause");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.status(200).send(result.csv);
  } catch (error) {
    console.error("Error in exportRootCauseCsv:", error);
    return res.status(500).json({ error: "Failed to export Root Cause CSV" });
  }
};

module.exports = { postRootCause, getRootCause, ResultRootCause, exportRootCauseCsv };

