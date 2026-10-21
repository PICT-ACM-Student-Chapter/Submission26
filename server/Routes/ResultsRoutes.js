const express = require("express");
const pool = require("../db/connect");
const { isAdminAuthenticated } = require("../middleware/adminMiddlewares");

const ResultsRouter = new express.Router();

// ==========================================
// Auto-create event_results table on first load & ensure columns
// ==========================================
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_results (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        event_slug VARCHAR(100) NOT NULL,
        round_name VARCHAR(255) NOT NULL DEFAULT 'Round 1',
        shortlisted_team_ids INT[] NOT NULL DEFAULT '{}',
        show_id BOOLEAN NOT NULL DEFAULT true,
        show_leader_college BOOLEAN NOT NULL DEFAULT true,
        published BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_event_round UNIQUE(event_slug, round_name)
      );
    `);
    await pool.query(`
      ALTER TABLE event_results ADD COLUMN IF NOT EXISTS show_id BOOLEAN NOT NULL DEFAULT true;
    `);
    await pool.query(`
      ALTER TABLE event_results ADD COLUMN IF NOT EXISTS show_leader_college BOOLEAN NOT NULL DEFAULT true;
    `);
    console.log("✓ event_results table ready with show_id and show_leader_college columns.");
  } catch (err) {
    console.warn("event_results table creation warning:", err.message);
  }
})();

// ==========================================
// PUBLIC: GET /results — List all events with published results
// ==========================================
ResultsRouter.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT event_slug, round_name, created_at, updated_at
      FROM event_results
      WHERE published = true AND array_length(shortlisted_team_ids, 1) > 0
      ORDER BY created_at DESC;
    `);
    return res.status(200).json({ success: true, results: result.rows });
  } catch (error) {
    console.error("Error fetching published results:", error);
    return res.status(500).json({ error: "Failed to fetch results." });
  }
});

// ==========================================
// ADMIN ONLY: GET /results/admin/candidates/:event
// Lists all candidate teams/users for the event + current shortlisted IDs & display options
// ==========================================
ResultsRouter.get("/admin/candidates/:event", isAdminAuthenticated, async (req, res) => {
  try {
    const eventSlug = req.params.event.toLowerCase().trim();
    const roundName = (req.query.round_name || "Round 1").trim();

    // 1. Fetch currently shortlisted team IDs & display options for this event and round (if any)
    const existingResult = await pool.query(
      `SELECT shortlisted_team_ids, show_id, show_leader_college FROM event_results
       WHERE event_slug = $1 AND round_name = $2;`,
      [eventSlug, roundName]
    );

    const shortlistedIds =
      existingResult.rowCount > 0 && Array.isArray(existingResult.rows[0].shortlisted_team_ids)
        ? existingResult.rows[0].shortlisted_team_ids
        : [];
    const showId = existingResult.rowCount > 0 ? (existingResult.rows[0].show_id !== false) : true;
    const showLeaderCollege = existingResult.rowCount > 0 ? (existingResult.rows[0].show_leader_college !== false) : true;

    let candidates = [];

    if (eventSlug === "hacknova") {
      const q = `
        SELECT 
          t.id,
          t.team_name,
          u.first_name AS leader_first_name,
          u.last_name AS leader_last_name,
          u.college AS leader_college
        FROM hacknova_teams t
        JOIN users u ON t.leader_user_id = u.id
        ORDER BY t.id ASC;
      `;
      const rows = (await pool.query(q)).rows;
      candidates = rows.map((r) => ({
        id: r.id,
        team_name: r.team_name,
        leader_name: `${r.leader_first_name || ""} ${r.leader_last_name || ""}`.trim() || "—",
        college: r.leader_college || "—",
      }));
    } else if (eventSlug === "innowave") {
      const q = `
        SELECT 
          t.id,
          t.team_name,
          u.first_name AS leader_first_name,
          u.last_name AS leader_last_name,
          u.college AS leader_college
        FROM innowave_teams t
        JOIN users u ON t.leader_user_id = u.id
        ORDER BY t.id ASC;
      `;
      const rows = (await pool.query(q)).rows;
      candidates = rows.map((r) => ({
        id: r.id,
        team_name: r.team_name,
        leader_name: `${r.leader_first_name || ""} ${r.leader_last_name || ""}`.trim() || "—",
        college: r.leader_college || "—",
      }));
    } else if (eventSlug === "freeze") {
      const q = `
        SELECT DISTINCT
          u.id,
          u.first_name,
          u.last_name,
          u.college,
          f.photo_title
        FROM users u
        JOIN user_events ue ON u.id = ue.fk_user
        LEFT JOIN freeze_submission f ON u.id = f.fk_user
        WHERE ue.fk_event = 10
        ORDER BY u.id ASC;
      `;
      const rows = (await pool.query(q)).rows;
      candidates = rows.map((r) => ({
        id: r.id,
        team_name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || `Participant #${r.id}`,
        leader_name: r.photo_title && r.photo_title !== "NA" ? `Photo: ${r.photo_title}` : "Individual",
        college: r.college || "—",
      }));
    } else if (eventSlug === "rootcause") {
      const q = `
        SELECT DISTINCT
          COALESCE(r.id, u.id) AS id,
          COALESCE(r.team_name, u.first_name || ' ' || u.last_name, 'Participant #' || u.id) AS team_name,
          u.first_name,
          u.last_name,
          u.college
        FROM users u
        JOIN user_events ue ON u.id = ue.fk_user
        LEFT JOIN rootcause r ON u.id = r.fk_user
        WHERE ue.fk_event = 21
        ORDER BY id ASC;
      `;
      const rows = (await pool.query(q)).rows;
      candidates = rows.map((r) => ({
        id: r.id,
        team_name: r.team_name,
        leader_name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || "—",
        college: r.college || "—",
      }));
    } else {
      // Generic fallback for any event slug by matching route or name
      const q = `
        SELECT DISTINCT
          u.id,
          u.first_name,
          u.last_name,
          u.college,
          e.event_name
        FROM users u
        JOIN user_events ue ON u.id = ue.fk_user
        JOIN submission_events e ON ue.fk_event = e.event_id
        WHERE LOWER(e.event_route) LIKE $1 OR LOWER(e.event_name) LIKE $1
        ORDER BY u.id ASC;
      `;
      const rows = (await pool.query(q, [`%${eventSlug}%`])).rows;
      candidates = rows.map((r) => ({
        id: r.id,
        team_name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || `User #${r.id}`,
        leader_name: r.event_name || "Participant",
        college: r.college || "—",
      }));
    }

    return res.status(200).json({
      success: true,
      event: eventSlug,
      round_name: roundName,
      total_candidates: candidates.length,
      shortlisted_team_ids: shortlistedIds,
      show_id: showId,
      show_leader_college: showLeaderCollege,
      candidates,
    });
  } catch (error) {
    console.error("Error fetching candidates for admin:", error);
    return res.status(500).json({ error: "Failed to fetch candidates: " + error.message });
  }
});

// ==========================================
// PUBLIC: GET /results/:event — Get shortlisted teams for a specific event
// Resolves team IDs to team_name + leader_name dynamically, including display options
// ==========================================
ResultsRouter.get("/:event", async (req, res) => {
  try {
    const eventSlug = req.params.event.toLowerCase().trim();

    // 1. Fetch all published rounds for this event
    const roundsResult = await pool.query(
      `SELECT id, event_slug, round_name, shortlisted_team_ids, show_id, show_leader_college, created_at, updated_at
       FROM event_results
       WHERE event_slug = $1 AND published = true
       ORDER BY created_at DESC;`,
      [eventSlug]
    );

    if (roundsResult.rowCount === 0) {
      return res.status(404).json({
        error: "No published results found for this event.",
      });
    }

    // 2. Determine which team table to query based on event slug
    let teamTable = null;
    let membersTable = null;
    if (eventSlug === "hacknova") {
      teamTable = "hacknova_teams";
      membersTable = "hacknova_team_members";
    } else if (eventSlug === "innowave") {
      teamTable = "innowave_teams";
      membersTable = "innowave_team_members";
    }

    // 3. For each round, resolve team IDs to team details
    const roundsWithTeams = [];

    for (const round of roundsResult.rows) {
      const teamIds = round.shortlisted_team_ids || [];

      if (teamIds.length === 0) {
        roundsWithTeams.push({
          round_name: round.round_name,
          event_slug: round.event_slug,
          teams: [],
          show_id: round.show_id !== false,
          show_leader_college: round.show_leader_college !== false,
          published_at: round.updated_at,
        });
        continue;
      }

      let teams = [];

      if (teamTable) {
        // Query team table with leader info from users table
        const teamsResult = await pool.query(
          `SELECT 
            t.id AS team_id,
            t.team_name,
            u.first_name AS leader_first_name,
            u.last_name AS leader_last_name,
            u.college AS leader_college
          FROM ${teamTable} t
          JOIN users u ON t.leader_user_id = u.id
          WHERE t.id = ANY($1)
          ORDER BY t.team_name ASC;`,
          [teamIds]
        );
        teams = teamsResult.rows.map((t) => ({
          team_id: t.team_id,
          team_name: t.team_name,
          leader_name: `${t.leader_first_name || ""} ${t.leader_last_name || ""}`.trim() || t.leader_college || "",
          college: t.leader_college || "",
        }));
      } else if (eventSlug === "rootcause") {
        const rcResult = await pool.query(
          `SELECT 
            COALESCE(r.id, u.id) AS team_id,
            COALESCE(r.team_name, u.first_name || ' ' || u.last_name) AS team_name,
            u.first_name AS leader_first_name,
            u.last_name AS leader_last_name,
            u.college
          FROM users u
          LEFT JOIN rootcause r ON u.id = r.fk_user
          WHERE r.id = ANY($1) OR u.id = ANY($1)
          ORDER BY team_name ASC;`,
          [teamIds]
        );
        teams = rcResult.rows.map((r) => ({
          team_id: r.team_id,
          team_name: r.team_name,
          leader_name: `${r.leader_first_name || ""} ${r.leader_last_name || ""}`.trim() || r.college || "—",
          college: r.college || "",
        }));
      } else {
        // For events without team tables (e.g., freeze), show user info directly
        const usersResult = await pool.query(
          `SELECT id, first_name, last_name, college
           FROM users
           WHERE id = ANY($1)
           ORDER BY first_name ASC;`,
          [teamIds]
        );
        teams = usersResult.rows.map((u) => ({
          team_id: u.id,
          team_name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
          leader_name: u.college || "—",
          college: u.college || "",
        }));
      }

      roundsWithTeams.push({
        round_name: round.round_name,
        event_slug: round.event_slug,
        teams,
        show_id: round.show_id !== false,
        show_leader_college: round.show_leader_college !== false,
        published_at: round.updated_at,
      });
    }

    return res.status(200).json({
      success: true,
      event: eventSlug,
      rounds: roundsWithTeams,
    });
  } catch (error) {
    console.error("Error fetching event results:", error);
    return res.status(500).json({ error: "Failed to fetch event results." });
  }
});

// ==========================================
// ADMIN ONLY: POST /results — Publish or update results with display options
// Body: { event_slug, round_name, shortlisted_team_ids: [1,2,3], show_id, show_leader_college }
// ==========================================
ResultsRouter.post("/", isAdminAuthenticated, async (req, res) => {
  try {
    const { event_slug, round_name, shortlisted_team_ids, show_id, show_leader_college } = req.body;

    if (!event_slug || !event_slug.trim()) {
      return res.status(400).json({ error: "event_slug is required." });
    }
    if (!round_name || !round_name.trim()) {
      return res.status(400).json({ error: "round_name is required." });
    }
    if (!Array.isArray(shortlisted_team_ids) || shortlisted_team_ids.length === 0) {
      return res.status(400).json({ error: "shortlisted_team_ids must be a non-empty array of integers." });
    }

    // Validate all IDs are integers
    const validIds = shortlisted_team_ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    if (validIds.length === 0) {
      return res.status(400).json({ error: "No valid integer IDs provided." });
    }

    const slug = event_slug.toLowerCase().trim();
    const rName = round_name.trim();
    const optShowId = show_id !== false;
    const optShowLeader = show_leader_college !== false;

    // Upsert: insert or update on conflict
    const result = await pool.query(
      `INSERT INTO event_results (
        event_slug, round_name, shortlisted_team_ids, show_id, show_leader_college, published, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      ON CONFLICT (event_slug, round_name)
      DO UPDATE SET 
        shortlisted_team_ids = $3,
        show_id = $4,
        show_leader_college = $5,
        published = true,
        updated_at = NOW()
      RETURNING *;`,
      [slug, rName, validIds, optShowId, optShowLeader]
    );

    return res.status(200).json({
      success: true,
      message: `Results published for ${slug} - ${rName} with ${validIds.length} shortlisted entries.`,
      result: result.rows[0],
    });
  } catch (error) {
    console.error("Error publishing results:", error);
    return res.status(500).json({ error: "Failed to publish results: " + error.message });
  }
});

// ==========================================
// ADMIN ONLY: DELETE /results — Unpublish results for an event round
// Body: { event_slug, round_name }
// ==========================================
ResultsRouter.delete("/", isAdminAuthenticated, async (req, res) => {
  try {
    const { event_slug, round_name } = req.body;
    if (!event_slug) {
      return res.status(400).json({ error: "event_slug is required." });
    }

    const slug = event_slug.toLowerCase().trim();
    let result;

    if (round_name) {
      result = await pool.query(
        `UPDATE event_results SET published = false, updated_at = NOW()
         WHERE event_slug = $1 AND round_name = $2
         RETURNING *;`,
        [slug, round_name.trim()]
      );
    } else {
      result = await pool.query(
        `UPDATE event_results SET published = false, updated_at = NOW()
         WHERE event_slug = $1
         RETURNING *;`,
        [slug]
      );
    }

    return res.status(200).json({
      success: true,
      message: `Results unpublished for ${slug}${round_name ? " - " + round_name : ""}.`,
      affected: result.rowCount,
    });
  } catch (error) {
    console.error("Error unpublishing results:", error);
    return res.status(500).json({ error: "Failed to unpublish results." });
  }
});

module.exports = ResultsRouter;
