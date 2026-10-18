const client = require("../db/connect");
const { emsIds } = require("../models/master");
const { isSubmissionActive } = require("../middleware/checkSubmissionActive");
const { FetchUserSubmissionEvents } = require("../utils/fetchEvents");

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === "string" && re.test(email.trim());
};

/**
 * Validate phone number (allows digits, +, -, spaces, parentheses, length 7-15)
 */
const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
};

/**
 * Helper to get ems_token and sync events with EMS
 */
const syncUserEventsFromEMS = async (req) => {
  try {
    let emsToken = req.ems_token;
    if (!emsToken) {
      const tokenRes = await client.query(
        "SELECT ems_token FROM user_token WHERE fk_user = $1 AND is_valid = true ORDER BY created_at DESC LIMIT 1",
        [req.user.id]
      );
      if (tokenRes.rowCount > 0) {
        emsToken = tokenRes.rows[0].ems_token;
      }
    }
    if (emsToken) {
      await FetchUserSubmissionEvents(emsToken, req.user.id);
    }
  } catch (err) {
    console.warn("EMS sync warning in HackNovaTeamController:", err.message);
  }
};

/**
 * 1. Fetch current leader details and existing HackNova team status
 * GET /hacknova/team/me (or /api/hacknova/team/me)
 */
const getHackNovaTeamMe = async (req, res) => {
  try {
    const ems_id = emsIds.hacknova;

    // Check if user is registered for HackNova in user_events (which only contains verified & payment-accepted events)
    let registrationCheck = await client.query(
      "SELECT * FROM user_events WHERE fk_user = $1 AND fk_event = $2",
      [req.user.id, ems_id]
    );

    // If not found in local user_events, attempt live sync with EMS
    if (registrationCheck.rowCount === 0) {
      await syncUserEventsFromEMS(req);
      registrationCheck = await client.query(
        "SELECT * FROM user_events WHERE fk_user = $1 AND fk_event = $2",
        [req.user.id, ems_id]
      );
    }

    const isRegisteredForEvent = registrationCheck.rowCount > 0;
    const isPaymentAccepted = isRegisteredForEvent;

    // Check if squad registration portal is currently active (Event ID 200)
    const activeCheck = await isSubmissionActive(emsIds.hacknova_teams);

    // Format leader details (read-only from database)
    const leader = {
      user_id: req.user.id,
      name: `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim() || req.user.email,
      first_name: req.user.first_name || "",
      last_name: req.user.last_name || "",
      email: req.user.email,
      phone: req.user.mobile_number || "",
      mobile_number: req.user.mobile_number || "",
      college: req.user.college || "",
      year: req.user.year || "",
      ems_id: req.user.ems_id || null,
    };

    // Check if leader has already registered a team
    const teamRes = await client.query(
      "SELECT * FROM hacknova_teams WHERE leader_user_id = $1",
      [req.user.id]
    );

    let team = null;
    let isTeamRegistered = false;

    if (teamRes.rowCount > 0) {
      isTeamRegistered = true;
      const teamData = teamRes.rows[0];

      const membersRes = await client.query(
        "SELECT id, user_name, email, phone, role, created_at FROM hacknova_team_members WHERE team_id = $1 ORDER BY id ASC",
        [teamData.id]
      );

      team = {
        id: teamData.id,
        team_name: teamData.team_name,
        leader_user_id: teamData.leader_user_id,
        created_at: teamData.created_at,
        updated_at: teamData.updated_at,
        members: membersRes.rows,
      };
    }

    return res.status(200).json({
      leader,
      is_registered_for_event: isRegisteredForEvent,
      payment_accepted: isPaymentAccepted,
      can_register_team: isRegisteredForEvent && !isTeamRegistered && activeCheck.active,
      is_team_registered: isTeamRegistered,
      is_locked: isTeamRegistered,
      submission_active: activeCheck.active,
      team,
    });
  } catch (error) {
    console.error("Error in getHackNovaTeamMe:", error);
    return res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
};

/**
 * 2. Check team registration status
 * GET /hacknova/team/status (or /api/hacknova/team/status)
 */
const getHackNovaTeamStatus = async (req, res) => {
  try {
    const teamRes = await client.query(
      "SELECT * FROM hacknova_teams WHERE leader_user_id = $1",
      [req.user.id]
    );

    if (teamRes.rowCount === 0) {
      return res.status(200).json({
        isRegistered: false,
        is_locked: false,
        team: null,
        message: "No team registered yet.",
      });
    }

    const teamData = teamRes.rows[0];
    const membersRes = await client.query(
      "SELECT id, user_name, email, phone, role, created_at FROM hacknova_team_members WHERE team_id = $1 ORDER BY id ASC",
      [teamData.id]
    );

    return res.status(200).json({
      isRegistered: true,
      is_locked: true,
      team: {
        id: teamData.id,
        team_name: teamData.team_name,
        leader_user_id: teamData.leader_user_id,
        created_at: teamData.created_at,
        updated_at: teamData.updated_at,
        members: membersRes.rows,
      },
      message: "HackNova team registration has been completed and is locked.",
    });
  } catch (error) {
    console.error("Error in getHackNovaTeamStatus:", error);
    return res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
};

/**
 * 3. Submit HackNova Team Registration
 * POST /hacknova/team (or /api/hacknova/team)
 *
 * Body format:
 * {
 *   "team_name": "Team CyberKnights",
 *   "members": [
 *     { "name": "Jane Doe", "email": "jane@example.com", "phone": "9876543211" }, // Member 2 (Mandatory)
 *     { "name": "Bob Smith", "email": "bob@example.com", "phone": "9876543212" }, // Member 3 (Optional)
 *     { "name": "Alice Ray", "email": "alice@example.com", "phone": "9876543213" } // Member 4 (Optional, requires M3)
 *   ]
 * }
 */
const postHackNovaTeam = async (req, res) => {
  const ems_id = emsIds.hacknova;

  try {
    // 1. Check if squad registrations are active (Event ID 200)
    const activeCheck = await isSubmissionActive(emsIds.hacknova_teams);
    if (!activeCheck.active) {
      return res.status(403).json({
        error: `HackNova Squad Registrations are currently closed.`,
        message: "Team registration cannot be accepted at this time.",
        event_status: false,
      });
    }

    // 2. Check if user is registered for HackNova and payment is accepted
    let registrationCheck = await client.query(
      "SELECT * FROM user_events WHERE fk_user = $1 AND fk_event = $2",
      [req.user.id, ems_id]
    );

    if (registrationCheck.rowCount === 0) {
      await syncUserEventsFromEMS(req);
      registrationCheck = await client.query(
        "SELECT * FROM user_events WHERE fk_user = $1 AND fk_event = $2",
        [req.user.id, ems_id]
      );
    }

    if (registrationCheck.rowCount === 0) {
      return res.status(403).json({
        error: "Only registered participants with accepted payment can register a HackNova team. Please make sure you are registered for HackNova and your payment has been approved on Pulzion EMS.",
        is_registered_for_event: false,
        payment_accepted: false,
      });
    }

    // 3. Fast check: ensure team leader has not already submitted
    const existingCheck = await client.query(
      "SELECT id FROM hacknova_teams WHERE leader_user_id = $1",
      [req.user.id]
    );
    if (existingCheck.rowCount > 0) {
      return res.status(400).json({
        error: "You have already registered a team for HackNova. Team registration is permanently locked and cannot be modified.",
        is_locked: true,
      });
    }

    // 4. Validate Team Name
    const team_name = (req.body.team_name || req.body.teamName || "").trim();
    if (!team_name) {
      return res.status(400).json({ error: "Team Name is required." });
    }
    if (team_name.length < 2 || team_name.length > 255) {
      return res.status(400).json({ error: "Team Name must be between 2 and 255 characters." });
    }

    // 5. Parse and filter members
    // We expect 1 to 3 additional members (making total team size 2 to 4 including leader).
    let rawMembers = Array.isArray(req.body.members) ? req.body.members : [];

    // Filter out leader if the client included leader with explicit role: "leader"
    const leaderEmail = (req.user.email || "").trim().toLowerCase();
    const leaderPhone = String(req.user.mobile_number || "").replace(/\D/g, "");

    const additionalMembers = rawMembers.filter(m => {
      if (!m) return false;
      const isLeaderRole = m.role === "leader" || m.isLeader === true;
      return !isLeaderRole;
    });

    // Check total count: additional members must be 1, 2, or 3 (Total members: 2, 3, or 4)
    if (additionalMembers.length < 1) {
      return res.status(400).json({
        error: "A minimum of 2 members is required (Team Leader + Member 2). Please provide Member 2 details.",
      });
    }
    if (additionalMembers.length > 3) {
      return res.status(400).json({
        error: "A maximum of 4 members is permitted (Team Leader + up to 3 members).",
      });
    }

    // Rule 1: Member 2 is mandatory
    const m2 = additionalMembers[0];
    const m2Name = (m2.name || m2.user_name || "").trim();
    const m2Email = (m2.email || "").trim().toLowerCase();
    const m2Phone = (m2.phone || m2.mobile_number || "").trim();

    if (!m2Name) {
      return res.status(400).json({ error: "Member 2 Name is required." });
    }
    if (!isValidEmail(m2Email)) {
      return res.status(400).json({ error: "Member 2 has an invalid email address." });
    }
    if (!isValidPhone(m2Phone)) {
      return res.status(400).json({ error: "Member 2 has an invalid phone number." });
    }

    // Member 3 (Optional)
    const m3 = additionalMembers[1] || null;
    let m3Name = "";
    let m3Email = "";
    let m3Phone = "";
    if (m3 && (m3.name || m3.email || m3.phone)) {
      m3Name = (m3.name || m3.user_name || "").trim();
      m3Email = (m3.email || "").trim().toLowerCase();
      m3Phone = (m3.phone || m3.mobile_number || "").trim();

      if (!m3Name) {
        return res.status(400).json({ error: "Member 3 Name is required when Member 3 is added." });
      }
      if (!isValidEmail(m3Email)) {
        return res.status(400).json({ error: "Member 3 has an invalid email address." });
      }
      if (!isValidPhone(m3Phone)) {
        return res.status(400).json({ error: "Member 3 has an invalid phone number." });
      }
    }

    // Member 4 (Optional) - Rule 3: Member 4 cannot be added without Member 3
    const m4 = additionalMembers[2] || null;
    let m4Name = "";
    let m4Email = "";
    let m4Phone = "";
    if (m4 && (m4.name || m4.email || m4.phone)) {
      if (!m3Name) {
        return res.status(400).json({
          error: "Member 4 cannot be added without Member 3. Please fill in Member 3 details first.",
        });
      }
      m4Name = (m4.name || m4.user_name || "").trim();
      m4Email = (m4.email || "").trim().toLowerCase();
      m4Phone = (m4.phone || m4.mobile_number || "").trim();

      if (!m4Name) {
        return res.status(400).json({ error: "Member 4 Name is required when Member 4 is added." });
      }
      if (!isValidEmail(m4Email)) {
        return res.status(400).json({ error: "Member 4 has an invalid email address." });
      }
      if (!isValidPhone(m4Phone)) {
        return res.status(400).json({ error: "Member 4 has an invalid phone number." });
      }
    }

    // Build finalized list of valid extra members
    const validatedMembers = [
      { name: m2Name, email: m2Email, phone: m2Phone, role: "member" },
    ];
    if (m3Name) {
      validatedMembers.push({ name: m3Name, email: m3Email, phone: m3Phone, role: "member" });
    }
    if (m4Name) {
      validatedMembers.push({ name: m4Name, email: m4Email, phone: m4Phone, role: "member" });
    }

    // Rule 4: Duplicate emails within team are not allowed
    const allEmails = [leaderEmail, ...validatedMembers.map(m => m.email)];
    const uniqueEmails = new Set(allEmails);
    if (uniqueEmails.size !== allEmails.length) {
      return res.status(400).json({
        error: "Duplicate email addresses are not permitted within the same team. Each member must have a unique email address.",
      });
    }

    // Rule 5: Duplicate phone numbers check
    if (leaderPhone) {
      const allPhones = [
        leaderPhone,
        ...validatedMembers.map(m => String(m.phone).replace(/\D/g, "")).filter(Boolean),
      ];
      const uniquePhones = new Set(allPhones);
      if (uniquePhones.size !== allPhones.length) {
        return res.status(400).json({
          error: "Duplicate phone numbers are not permitted within the same team.",
        });
      }
    }

    // Rule 6: Check if any member is already registered in another HackNova team
    const memberEmails = validatedMembers.map(m => m.email);
    const existingMemberConflict = await client.query(
      `SELECT htm.email, ht.team_name 
       FROM hacknova_team_members htm
       JOIN hacknova_teams ht ON ht.id = htm.team_id
       WHERE LOWER(htm.email) = ANY($1)
       LIMIT 1`,
      [memberEmails]
    );
    if (existingMemberConflict.rowCount > 0) {
      const conflict = existingMemberConflict.rows[0];
      return res.status(400).json({
        error: `Participant with email "${conflict.email}" is already registered in team "${conflict.team_name}".`,
      });
    }

    // 6. Database Transaction: Insert team and members atomically
    const poolClient = await client.connect();
    try {
      await poolClient.query("BEGIN");

      // Row-level lock / check to prevent concurrent race conditions
      const lockCheck = await poolClient.query(
        "SELECT id FROM hacknova_teams WHERE leader_user_id = $1 FOR UPDATE",
        [req.user.id]
      );
      if (lockCheck.rowCount > 0) {
        await poolClient.query("ROLLBACK");
        return res.status(409).json({
          error: "Team registration already exists for this leader.",
          is_locked: true,
        });
      }

      // Insert Team Record
      const insertTeamSql = `
        INSERT INTO hacknova_teams (team_name, leader_user_id, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING *;
      `;
      const teamInsertRes = await poolClient.query(insertTeamSql, [team_name, req.user.id]);
      const createdTeam = teamInsertRes.rows[0];

      // Insert Member 1 (Team Leader)
      const leaderName = `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim() || req.user.email;
      const insertMemberSql = `
        INSERT INTO hacknova_team_members (team_id, user_name, email, phone, role, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *;
      `;

      const allSavedMembers = [];
      const leaderMemberRes = await poolClient.query(insertMemberSql, [
        createdTeam.id,
        leaderName,
        leaderEmail,
        req.user.mobile_number || "",
        "leader",
      ]);
      allSavedMembers.push(leaderMemberRes.rows[0]);

      // Insert Members 2, 3, 4
      for (const m of validatedMembers) {
        const mRes = await poolClient.query(insertMemberSql, [
          createdTeam.id,
          m.name,
          m.email,
          m.phone,
          m.role,
        ]);
        allSavedMembers.push(mRes.rows[0]);
      }

      await poolClient.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "HackNova team registered successfully!",
        is_locked: true,
        team: {
          id: createdTeam.id,
          team_name: createdTeam.team_name,
          leader_user_id: createdTeam.leader_user_id,
          created_at: createdTeam.created_at,
          members: allSavedMembers,
        },
      });
    } catch (txError) {
      await poolClient.query("ROLLBACK");
      console.error("Transaction error in postHackNovaTeam:", txError);
      if (txError.code === "23505") { // Unique violation
        return res.status(409).json({
          error: "A team has already been registered for this team leader.",
          is_locked: true,
        });
      }
      return res.status(500).json({
        error: "Failed to register team: " + txError.message,
      });
    } finally {
      poolClient.release();
    }
  } catch (error) {
    console.error("Error in postHackNovaTeam:", error);
    return res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
};

/**
 * 4. Admin View: List all registered HackNova teams with full member rosters
 * GET /hacknova/teams (or /admin/hacknova/teams)
 */
const getAllHackNovaTeams = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id AS team_id,
        t.team_name,
        t.leader_user_id,
        t.created_at AS team_created_at,
        u.first_name AS leader_first_name,
        u.last_name AS leader_last_name,
        u.email AS leader_email,
        u.mobile_number AS leader_phone,
        u.college AS leader_college,
        u.year AS leader_year,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'name', m.user_name,
              'email', m.email,
              'phone', m.phone,
              'role', m.role
            ) ORDER BY m.id ASC
          ) FILTER (WHERE m.id IS NOT NULL), '[]'
        ) AS members
      FROM hacknova_teams t
      JOIN users u ON t.leader_user_id = u.id
      LEFT JOIN hacknova_team_members m ON t.id = m.team_id
      GROUP BY t.id, t.team_name, t.leader_user_id, t.created_at, u.id, u.first_name, u.last_name, u.email, u.mobile_number, u.college, u.year
      ORDER BY t.created_at DESC;
    `;

    const result = await client.query(query);
    return res.status(200).json({
      success: true,
      totalTeams: result.rowCount,
      teams: result.rows,
    });
  } catch (error) {
    console.error("Error in getAllHackNovaTeams:", error);
    return res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
};

module.exports = {
  getHackNovaTeamMe,
  getHackNovaTeamStatus,
  postHackNovaTeam,
  getAllHackNovaTeams,
};
